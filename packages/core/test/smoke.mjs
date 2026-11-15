import assert from 'node:assert/strict';
import {
  EMPTY,
  colorSteps,
  createPattern,
  deltaEOK,
  floodFill,
  getCell,
  getPalette,
  hexToRgb,
  listPalettes,
  nearestColorWithDelta,
  parsePattern,
  pixelsToPattern,
  resizePattern,
  convertPatternPalette,
  transformPattern,
  splitByBoards,
  scalePattern,
  mergeSimilarColors,
  replaceColor,
  extractRegion,
  stampRegion,
  makeRectRegion,
  makeEllipseRegion,
  makeTextRegion,
  encodeShareCode,
  decodeShareCode,
  rgbToOklab,
  serializePattern,
  setCell,
  usageStats,
} from '../dist/index.js';

// 1. 色卡加载
const palettes = listPalettes();
assert.ok(palettes.length >= 5, '应有 5 套色系');
const mard = getPalette('mard');
assert.ok(mard.colors.length > 150, `MARD 色卡应有 150+ 色，实际 ${mard.colors.length}`);
assert.match(mard.colors[0].code, /^[A-Z]/);

// 2. 最近色：纯红应匹配到暖色（L 高、a 偏正）
const [r, g, b] = hexToRgb('#FF0000');
const near = nearestColorWithDelta(mard, r, g, b);
assert.ok(near.index >= 0 && near.index < mard.colors.length);
assert.ok(near.delta < 0.2, `红匹配色差应小，实际 ${near.delta}`);
const [nr, ng, nb] = hexToRgb(mard.colors[near.index].hex);
assert.ok(nr > 150 && nr > ng && nr > nb, `红色最近色应偏红，实际 ${mard.colors[near.index].hex}`);

// 3. OKLab 往返 sanity
const lab = rgbToOklab(128, 64, 32);
assert.ok(lab[0] > 0 && lab[0] < 1);
assert.ok(deltaEOK(lab, lab) === 0);

// 4. 量化：4x4 左红右蓝 → 2x2
const src = new Uint8Array(4 * 4 * 4);
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < 4; x++) {
    const o = (y * 4 + x) * 4;
    if (x < 2) {
      src[o] = 255; src[o + 1] = 0; src[o + 2] = 0;
    } else {
      src[o] = 0; src[o + 1] = 0; src[o + 2] = 255;
    }
    src[o + 3] = 255;
  }
}
const pat = pixelsToPattern(src, 4, 4, { width: 2, height: 2, fit: 'stretch' });
assert.equal(pat.grid.length, 4);
assert.equal(pat.schema, 'perler-pattern');
const [redIdx] = pat.grid;
const blueIdx = pat.grid[1];
assert.notEqual(redIdx, EMPTY);
assert.notEqual(blueIdx, EMPTY);
assert.notEqual(redIdx, blueIdx, '左红右蓝应是两种色');
const redHex = mard.colors[redIdx].hex;
const blueHex = mard.colors[blueIdx].hex;
assert.ok(parseInt(redHex.slice(1, 3), 16) > 150, `左列应为红系，实际 ${redHex}`);
assert.ok(parseInt(blueHex.slice(5, 7), 16) > 120, `右列应为蓝系，实际 ${blueHex}`);

// 5. 全透明 → 全空
const blank = new Uint8Array(2 * 2 * 4); // alpha 全 0
const patBlank = pixelsToPattern(blank, 2, 2, { width: 2, height: 2, fit: 'stretch' });
assert.ok(patBlank.grid.every((v) => v === EMPTY), '全透明应全部留空');

// 6. 手动编辑 / 洪泛填充
const p2 = createPattern(3, 3, 'mard');
setCell(p2, 0, 0, 5);
assert.equal(getCell(p2, 0, 0), 5);
const filled = floodFill(p2, 1, 1, 7);
assert.equal(filled, 8, '从中心应填满其余 8 格');
assert.equal(getCell(p2, 2, 2), 7);

// 7. 用量统计与跟拼分色
const usage = usageStats(p2);
const total = usage.reduce((s, u) => s + u.count, 0);
assert.equal(total, 9);
assert.equal(usage.find((u) => u.index === 7).count, 8);
const steps = colorSteps(p2);
assert.equal(steps.length, 2);
assert.equal(steps[0].index, 7, '数量多的色先出步骤');
assert.equal(steps[0].cells.length, 8);

// 8. 序列化往返
const json = serializePattern(pat);
const pat2 = parsePattern(json);
assert.deepEqual(pat2, pat);
assert.throws(() => parsePattern('{"schema":"x"}'), /perler-pattern/);

// 9. 调整图纸大小（保留内容）
const small = createPattern(2, 2, 'mard');
setCell(small, 0, 0, 1);
setCell(small, 1, 1, 2);
const big = resizePattern(small, 4, 4, 1, 1);
assert.equal(big.width, 4);
assert.equal(big.grid[1 * 4 + 1], 1, '内容应随 offset 平移');
assert.equal(big.grid[2 * 4 + 2], 2);
assert.equal(big.grid[0], EMPTY, '新增区域应为空');
const cropped = resizePattern(big, 2, 2, -1, -1);
assert.equal(cropped.grid[0], 1, '左上裁剪后内容回收到原点');
assert.equal(cropped.grid[1 * 2 + 1], 2);
assert.throws(() => resizePattern(big, 0, 4), /正整数/);

// 10. 色卡分组 / 旧别名 / 换色卡
const m221 = getPalette('mard-221');
assert.equal(m221.colors.length, 221);
assert.ok(new Set(m221.colors.map((c) => c.group)).size >= 9, '应有 9 个以上分区');
assert.match(m221.colors[0].code, /^[A-Z]+\d{2}$/, '色号应零填充（A01 风格）');
assert.equal(getPalette('mard').id, 'mard-221', '旧色卡别名应解析到基础221');
const conv = convertPatternPalette(small, 'mard-291');
assert.equal(conv.paletteId, 'mard-291');
assert.equal(conv.grid.length, 4);
assert.notEqual(conv.grid[0], EMPTY);
assert.notEqual(conv.grid[3], EMPTY);
assert.equal(conv.grid[1], EMPTY, '空格转换后仍应为空');

// 11. 镜像 / 旋转
const t0 = createPattern(2, 3, 'mard');
setCell(t0, 0, 0, 1);
setCell(t0, 1, 2, 2);
const fH = transformPattern(t0, 'flipH');
assert.equal(getCell(fH, 1, 0), 1);
assert.equal(getCell(fH, 0, 2), 2);
const fV = transformPattern(t0, 'flipV');
assert.equal(getCell(fV, 0, 2), 1);
assert.equal(getCell(fV, 1, 0), 2);
const rot = transformPattern(t0, 'rotateCW');
assert.equal(rot.width, 3);
assert.equal(rot.height, 2);
assert.equal(getCell(rot, 2, 0), 1);
const rot2 = transformPattern(rot, 'rotateCW');
assert.equal(rot2.width, 2);
assert.equal(getCell(rot2, 1, 2), 1, '转 180° 后 (0,0) 应到 (1,2)');
const back = transformPattern(rot, 'rotateCCW');
assert.equal(getCell(back, 0, 0), 1, 'CW 再 CCW 应还原');

// 12. 抖动（Floyd-Steinberg）
const pal = getPalette('mard-221');
const [c1r, c1g, c1b] = hexToRgb(pal.colors[0].hex);
const [c2r, c2g, c2b] = hexToRgb(pal.colors[1].hex);
const mid = [(c1r + c2r) / 2, (c1g + c2g) / 2, (c1b + c2b) / 2];
const src8 = new Uint8Array(8 * 8 * 4);
for (let i = 0; i < 64; i++) {
  src8[i * 4] = mid[0];
  src8[i * 4 + 1] = mid[1];
  src8[i * 4 + 2] = mid[2];
  src8[i * 4 + 3] = 255;
}
const plain = pixelsToPattern(src8, 8, 8, { width: 8, height: 8, fit: 'stretch' });
const dith = pixelsToPattern(src8, 8, 8, { width: 8, height: 8, fit: 'stretch', dither: true });
const plainSet = new Set(plain.grid);
const dithSet = new Set(dith.grid);
assert.equal(plainSet.size, 1, '纯色不抖动应只用一种豆');
assert.ok(dithSet.size >= 2, `半程色抖动应出现至少两种豆，实际 ${dithSet.size}`);

// 13. 底板拆分（29×29 板）
const m60 = createPattern(60, 60, 'mard');
setCell(m60, 0, 0, 1);
setCell(m60, 29, 29, 2);
setCell(m60, 59, 59, 3);
const sheets = splitByBoards(m60, 29);
assert.equal(sheets.length, 9, '60×60 按 29 板应拆 3×3=9 块');
assert.equal(sheets[0].width, 29);
assert.equal(sheets[0].height, 29);
assert.equal(sheets[2].srcX, 58);
assert.equal(sheets[2].width, 2, '末列只剩 2 列');
assert.equal(sheets[0].grid[0], 1);
assert.equal(sheets[4].grid[0], 2, '(29,29) 应落在第 (1,1) 块首格');
assert.equal(sheets[8].grid[1 * 2 + 1], 3, '右下块末格应是 (59,59)');
assert.throws(() => splitByBoards(m60, 0), /正整数/);

// 14. 内容缩放（最近邻）
const sc0 = createPattern(2, 2, 'mard');
setCell(sc0, 0, 0, 1);
setCell(sc0, 1, 0, 2);
setCell(sc0, 0, 1, 3);
setCell(sc0, 1, 1, 4);
const up = scalePattern(sc0, 4, 4);
assert.deepEqual(up.grid.slice(0, 4), [1, 1, 2, 2], '放大应按块复制铺开');
assert.deepEqual(up.grid.slice(8, 12), [3, 3, 4, 4]);
const down = scalePattern(up, 2, 2);
assert.deepEqual(down.grid, [1, 2, 3, 4], '放大再缩回应还原');
assert.throws(() => scalePattern(up, 0, 2), /正整数/);

// 15. 合并类似色（精细度）
const mc = createPattern(4, 2, 'mard');
for (let i = 0; i < 8; i++) setCell(mc, i % 4, Math.floor(i / 4), i);
const merged = mergeSimilarColors(mc, 3);
assert.ok(new Set(merged.grid).size <= 3, `合并后用色应≤3，实际 ${new Set(merged.grid).size}`);
assert.equal(merged.grid.length, 8);
assert.deepEqual(mergeSimilarColors(mc, 8).grid, mc.grid, '未超上限应原样返回');
assert.throws(() => mergeSimilarColors(mc, 0), /正整数/);
// 量化端到端：maxColors 生效
const limited = pixelsToPattern(src8, 8, 8, {
  width: 8,
  height: 8,
  fit: 'stretch',
  dither: true,
  maxColors: 2,
});
assert.ok(new Set(limited.grid).size <= 2, '量化 maxColors=2 应收敛到 2 色');

// 16. 批量换色
const rc = replaceColor(mc, 0, 7);
assert.equal(rc.grid[0], 7, '原 0 号位应换成 7');
assert.equal(rc.grid[7], 7, '7 号位不变');
assert.equal(rc.grid.filter((v) => v === 0).length, 0, '不应残留 0');

// 17. 分享码往返
const code = encodeShareCode(mc);
assert.match(code, /^PB1-/);
const back2 = decodeShareCode(code);
assert.deepEqual(back2.grid, mc.grid);
assert.equal(back2.width, 4);
assert.equal(back2.name, mc.name);
const named = { ...mc, name: '分享码测试·🎨' };
assert.equal(decodeShareCode(encodeShareCode(named)).name, '分享码测试·🎨', '中文名应无损');
assert.throws(() => decodeShareCode('XX-abc'), /分享码/);
assert.throws(() => decodeShareCode('PB1-!!!!'), /非法字符|失败/);

// 18. 官方品牌色卡与 MARD 套装子集
assert.equal(getPalette('artkal-c').colors.length, 197);
assert.equal(getPalette('artkal-s').colors.length, 225);
assert.equal(getPalette('hama-midi').colors.length, 88);
for (const n of [72, 96, 120, 144]) {
  const set = getPalette(`mard-set-${n}`);
  assert.equal(set.colors.length, n, `MARD 套装${n}色数量应吻合`);
}
assert.equal(listPalettes().length, 13, '应有 13 套色卡');

// 19. 选区提取与盖印
const reg0 = createPattern(3, 3, 'mard');
setCell(reg0, 0, 0, 1);
setCell(reg0, 1, 0, 2);
setCell(reg0, 2, 2, 3);
const ext = extractRegion(reg0, { x: 1, y: 0, w: 2, h: 2 });
assert.equal(ext.width, 2);
assert.equal(ext.grid[0], 2, '(1,0) 应成为提取图左上');
assert.equal(ext.grid[1], EMPTY);
const stamped = stampRegion(createPattern(3, 3, 'mard'), ext, 1, 1, 'replace');
assert.equal(getCell(stamped, 1, 1), 2);
assert.equal(getCell(stamped, 2, 1), EMPTY);
assert.equal(getCell(stamped, 3, 3) === EMPTY, true, '越界盖印应裁掉');
// merge：空格不覆盖
const base2 = createPattern(2, 2, 'mard');
setCell(base2, 0, 0, 5);
setCell(base2, 1, 0, 7);
const half = extractRegion(reg0, { x: 1, y: 0, w: 2, h: 1 }); // [2, EMPTY]
const mg = stampRegion(base2, half, 0, 0, 'merge');
assert.equal(getCell(mg, 0, 0), 2, 'merge 非空格应覆盖');
assert.equal(getCell(mg, 1, 0), 7, 'merge 空格不应覆盖');
assert.throws(() => extractRegion(reg0, { x: 0, y: 0, w: 0, h: 1 }), /选区/);

// 20. 文字与形状区域
const rectF = makeRectRegion(4, 3, { color: 2, filled: true });
assert.equal(rectF.grid.filter((v) => v === 2).length, 12);
const rectO = makeRectRegion(5, 5, { color: 2, filled: false, thickness: 1 });
assert.equal(rectO.grid[0], 2);
assert.equal(rectO.grid[2 * 5 + 2], EMPTY, '描边矩形中心应为空');
assert.equal(rectO.grid.filter((v) => v === 2).length, 16, '5×5 描边应为 16 格');
const ell = makeEllipseRegion(9, 9, { color: 3, filled: true });
assert.equal(ell.grid[4 * 9 + 4], 3, '圆心应填充');
assert.equal(ell.grid[0], EMPTY, '角上应为空');
const ellO = makeEllipseRegion(9, 9, { color: 3, filled: false });
assert.equal(ellO.grid[4 * 9 + 4], EMPTY, '描边圆内部应为空');
assert.equal(ellO.grid[4 * 9 + 0], 3, '描边圆左右端点应有豆');
const txt = makeTextRegion('AB', { color: 5, paletteId: 'mard-221' });
assert.equal(txt.height, 7);
assert.equal(txt.width, 2 * (5 + 1) - 1);
assert.ok(txt.grid.filter((v) => v === 5).length > 10, '文字应有笔画像素');
const txtBig = makeTextRegion('A', { color: 5, paletteId: 'mard-221', scale: 2 });
assert.equal(txtBig.height, 14);
const multi = makeTextRegion('A\nB', { color: 5, paletteId: 'mard-221' });
assert.equal(multi.height, 15, '两行 = 7+1+7');
assert.deepEqual(
  makeTextRegion('a', { color: 5, paletteId: 'mard-221' }).grid,
  makeTextRegion('A', { color: 5, paletteId: 'mard-221' }).grid,
  '小写应映射为大写 A',
);
assert.throws(() => makeRectRegion(0, 3, { color: 1 }), /正整数/);

console.log('SMOKE PASS');
console.log(`  色系数=${palettes.length} MARD=${mard.colors.length} 色`);
console.log(`  红最近色=${mard.colors[near.index].code}(${mard.colors[near.index].hex}) ΔE=${near.delta.toFixed(3)}`);
console.log(`  量化 2x2=${pat.grid.map((v) => mard.colors[v].code).join(',')}`);
