/** 编辑器状态机单测：esbuild 打包 TS 后用 node 跑。 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const out = await build({
  entryPoints: [join(appRoot, 'src', 'core', 'editorState.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  absWorkingDir: appRoot,
  logLevel: 'silent',
});
const dir = mkdtempSync(join(tmpdir(), 'perler-web-test-'));
const tmp = join(dir, 'editorState.bundle.mjs');
writeFileSync(tmp, out.outputFiles[0].text, 'utf8');

const m = await import(pathToFileURL(tmp).href);
const {
  createEditor,
  startStroke,
  strokeStep,
  strokeLine,
  undo,
  redo,
  canUndo,
  canRedo,
  setTool,
  setColor,
  resizeDocument,
  transformDocument,
  scaleDocument,
  replaceColorDocument,
} = m;

// 1. 初始状态
const s = createEditor(8, 8, 'mard');
assert.equal(s.pattern.grid.length, 64);
assert.ok(s.pattern.grid.every((v) => v === -1), '新建图纸应全空');
assert.equal(s.tool, 'pencil');

// 2. 铅笔描边：一笔 = 一步撤销
setTool(s, 'pencil');
setColor(s, 3);
let st = startStroke(s);
assert.equal(strokeLine(s, 0, 0, 3, 0, st), 'changed');
assert.equal(st.changed, true);
assert.equal(s.history.length, 1, '一笔应只压一次快照');
for (let x = 0; x <= 3; x++) assert.equal(s.pattern.grid[x], 3);

// 3. 撤销/重做
assert.equal(undo(s), true);
assert.ok(s.pattern.grid.every((v) => v === -1), '撤销后应全空');
assert.equal(canRedo(s), true);
assert.equal(redo(s), true);
assert.equal(s.pattern.grid[3], 3);
assert.equal(undo(s), true);

// 4. 橡皮
setColor(s, 5);
st = startStroke(s);
strokeStep(s, 2, 2, st);
assert.equal(s.pattern.grid[2 * 8 + 2], 5);
setTool(s, 'eraser');
st = startStroke(s);
assert.equal(strokeStep(s, 2, 2, st), 'changed');
assert.equal(s.pattern.grid[2 * 8 + 2], -1);

// 5. 油漆桶：整片填充 + 一次撤销
setTool(s, 'bucket');
setColor(s, 7);
st = startStroke(s);
assert.equal(strokeStep(s, 4, 4, st), 'changed');
assert.ok(s.pattern.grid.every((v) => v === 7), '空图应整片填满');
assert.equal(strokeStep(s, 5, 5, st), 'none', '同一笔第二次不应再动作');
assert.equal(undo(s), true);
assert.ok(s.pattern.grid.every((v) => v === -1));

// 6. 取色
setTool(s, 'pencil');
setColor(s, 9);
st = startStroke(s);
strokeStep(s, 1, 1, st);
setTool(s, 'picker');
setColor(s, 0);
st = startStroke(s);
assert.equal(strokeStep(s, 1, 1, st), 'picked');
assert.equal(s.colorIndex, 9, '取色应拾到 9');

// 7. 历史上限
const s2 = createEditor(4, 4, 'mard', 3);
setTool(s2, 'pencil');
for (let i = 0; i < 5; i++) {
  setColor(s2, i + 1);
  st = startStroke(s2);
  strokeStep(s2, i % 4, 0, st);
}
assert.equal(s2.history.length, 3, '快照应被上限裁剪');
assert.equal(canUndo(s2), true);
assert.equal(canRedo(s2), false);

// 8. 调整图纸大小（保留内容，可撤销）
const s3 = createEditor(4, 4, 'mard');
setTool(s3, 'pencil');
setColor(s3, 2);
st = startStroke(s3);
strokeStep(s3, 0, 0, st);
resizeDocument(s3, 6, 6, 1, 1);
assert.equal(s3.pattern.width, 6);
assert.equal(s3.pattern.grid.length, 36);
assert.equal(s3.pattern.grid[1 * 6 + 1], 2, '内容应随 offset 平移');
assert.equal(s3.history.length, 2, '描边 + 改大小各压一步快照');
assert.equal(undo(s3), true, '改大小应可撤销');
assert.equal(s3.pattern.width, 4);
assert.equal(s3.pattern.grid[0], 2);
assert.equal(redo(s3), true, '改大小应可重做');
assert.equal(s3.pattern.grid[1 * 6 + 1], 2);
resizeDocument(s3, 1, 1, -1, -1);
assert.equal(s3.pattern.grid[0], 2, '裁剪后内容保留');

// 9. 镜像/旋转（可撤销）
const s4 = createEditor(2, 3, 'mard');
setTool(s4, 'pencil');
setColor(s4, 4);
st = startStroke(s4);
strokeStep(s4, 0, 0, st);
transformDocument(s4, 'rotateCW');
assert.equal(s4.pattern.width, 3);
assert.equal(s4.pattern.height, 2);
assert.equal(s4.pattern.grid[2 * 1 + 0], 4, '(0,0) 顺时针后应在 (2,0)');
assert.equal(s4.history.length, 2, '描边 + 变换各压一步快照');
assert.equal(undo(s4), true, '旋转应可撤销');
assert.equal(s4.pattern.width, 2);
assert.equal(s4.pattern.height, 3);
assert.equal(s4.pattern.grid[0], 4, '撤销后回到旋转前');
transformDocument(s4, 'flipH');
assert.equal(s4.pattern.grid[1], 4, '镜像↔ 后内容应从 (0,0) 移到 (1,0)');

// 10. 内容缩放（放大/拉伸，可撤销）
const s5 = createEditor(2, 2, 'mard');
setTool(s5, 'pencil');
setColor(s5, 3);
st = startStroke(s5);
strokeStep(s5, 0, 0, st);
scaleDocument(s5, 4, 4);
assert.equal(s5.pattern.width, 4);
assert.equal(s5.pattern.grid[1 * 4 + 1], 3, '放大后内容应铺开');
assert.equal(s5.pattern.grid[0], 3);
assert.equal(s5.history.length, 2, '描边 + 缩放各压一步快照');
assert.equal(undo(s5), true, '缩放应可撤销');
assert.equal(s5.pattern.width, 2, '撤销后回到原尺寸');
assert.equal(s5.pattern.grid[0], 3);

// 11. 批量换色（可撤销）
const s6 = createEditor(3, 1, 'mard');
setTool(s6, 'pencil');
setColor(s6, 2);
st = startStroke(s6);
strokeStep(s6, 0, 0, st);
strokeStep(s6, 2, 0, st);
const nBefore = s6.pattern.grid.filter((v) => v === 2).length;
replaceColorDocument(s6, 2, 5);
assert.equal(nBefore, 2, '换色前应有 2 格原色（提示文案取数用）');
assert.deepEqual([...s6.pattern.grid], [5, -1, 5], '原 2 号应全换为 5');
assert.equal(s6.pattern.grid.filter((v) => v === 2).length, 0, '换色后原色计数归零');
assert.equal(undo(s6), true, '换色应可撤销');
assert.deepEqual([...s6.pattern.grid], [2, -1, 2]);

// 11. 多文档标签（session 层——防止“点了无反应”类 bug 漏网）
const sOut = await build({
  entryPoints: [join(appRoot, 'src', 'core', 'session.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  absWorkingDir: appRoot,
  logLevel: 'silent',
});
const sTmp = join(dir, 'session.bundle.mjs');
writeFileSync(sTmp, sOut.outputFiles[0].text, 'utf8');
const ses = await import(pathToFileURL(sTmp).href);

assert.equal(ses.tabs.value.length, 0, '初始无标签');
ses.createDocument(8, 8);
assert.equal(ses.tabs.value.length, 1);
assert.equal(ses.editor.pattern.width, 8, '创建后活动文档应为 8×8');
assert.match(ses.editor.pattern.name, /^图纸\d+$/);
ses.createDocument(4, 4);
assert.equal(ses.tabs.value.length, 2);
assert.equal(ses.editor.pattern.width, 4, '新建后活动文档应切换');
const firstId = ses.tabs.value[0].id;
ses.activateTab(firstId);
assert.equal(ses.editor.pattern.width, 8, '点击标签应切换活动文档');
ses.closeTab(ses.tabs.value[1].id);
assert.equal(ses.tabs.value.length, 1);
assert.equal(ses.editor.pattern.width, 8, '关闭非活动标签不影响当前文档');
ses.closeTab(ses.tabs.value[0].id);
assert.equal(ses.tabs.value.length, 1, '始终保留一个标签');
assert.equal(ses.editor.pattern.width, 32);
assert.ok(ses.editor.pattern.grid.every((v) => v === -1), '关最后一个应清空为新空白');

const dir2 = mkdtempSync(join(tmpdir(), 'perler-web-test2-'));

// 12. 作品库 CRUD（node 下退化为内存存储）
const wOut = await build({
  entryPoints: [join(appRoot, 'src', 'core', 'works.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  absWorkingDir: appRoot,
  logLevel: 'silent',
});
const wTmp = join(dir2, 'works.bundle.mjs');
writeFileSync(wTmp, wOut.outputFiles[0].text, 'utf8');
const works = await import(pathToFileURL(wTmp).href);
const wid = works.saveWork(s5.pattern);
assert.ok(wid);
assert.equal(works.listWorks().length, 1);
const loaded = works.getWork(wid);
assert.equal(loaded.width, 2, 's5 末尾已撤销回 2×2');
assert.deepEqual(loaded.grid, s5.pattern.grid);
works.removeWork(wid);
assert.equal(works.listWorks().length, 0);

// 13. 自动暂存与恢复（跨 bundle 共享内存存储）
const buildAuto = (name) =>
  build({
    entryPoints: [join(appRoot, 'src', 'core', 'autoSave.ts')],
    bundle: true,
    format: 'esm',
    write: false,
    absWorkingDir: appRoot,
    logLevel: 'silent',
  }).then((r) => {
    const p = join(dir2, name);
    writeFileSync(p, r.outputFiles[0].text, 'utf8');
    return import(pathToFileURL(p).href);
  });
const a1 = await buildAuto('autoA.mjs');
a1.createDocument(6, 6, '暂存甲');
a1.createDocument(2, 2, '暂存乙');
assert.equal(a1.tabs.value.length, 2);
a1.saveSession();
const a2 = await buildAuto('autoB.mjs');
assert.equal(a2.restoreSession(), true, '应恢复上次会话');
assert.equal(a2.tabs.value.length, 2);
assert.equal(a2.editor.pattern.name, '暂存乙');
assert.equal(a2.editor.pattern.width, 2);
a2.clearSession();
assert.equal(a2.restoreSession(), false, '清除后不再恢复');

// 14. 导入尺寸计算（自适应/指定格数）
const fOut = await build({
  entryPoints: [join(appRoot, 'src', 'core', 'fileIO.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  absWorkingDir: appRoot,
  external: ['jspdf'],
  logLevel: 'silent',
});
const fTmp = join(dir2, 'fileIO.bundle.mjs');
writeFileSync(fTmp, fOut.outputFiles[0].text, 'utf8');
const fio = await import(pathToFileURL(fTmp).href);
assert.deepEqual(fio.computeImportSize(43, 43, { sizeMode: 'auto' }), {
  width: 43,
  height: 43,
  capped: false,
});
assert.deepEqual(fio.computeImportSize(800, 600, { sizeMode: 'auto' }), {
  width: 200,
  height: 150,
  capped: true,
});
assert.deepEqual(fio.computeImportSize(43, 43, { sizeMode: 'custom', width: 50 }), {
  width: 50,
  height: 50,
  capped: false,
});
assert.deepEqual(fio.computeImportSize(100, 50, { sizeMode: 'custom', width: 64 }), {
  width: 64,
  height: 32,
  capped: false,
});

// 15. PDF 页规划（总图 + 每色一页）
const pages = fio.planPdfPages(s5.pattern);
assert.equal(pages[0].type, 'overview', '第一页应为施工总图');
assert.equal(pages.length, 2, 's5 用 1 种色 → 总图 + 1 分色页');
assert.equal(pages[1].type, 'color');
assert.equal(pages[1].count, 1);
assert.match(pages[1].code, /^[A-Z]+\d{2}$/);

rmSync(dir2, { recursive: true, force: true });
console.log('WEB STATE TEST PASS');
