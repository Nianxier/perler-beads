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

console.log('SMOKE PASS');
console.log(`  色系数=${palettes.length} MARD=${mard.colors.length} 色`);
console.log(`  红最近色=${mard.colors[near.index].code}(${mard.colors[near.index].hex}) ΔE=${near.delta.toFixed(3)}`);
console.log(`  量化 2x2=${pat.grid.map((v) => mard.colors[v].code).join(',')}`);
