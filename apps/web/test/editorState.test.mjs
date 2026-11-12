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

rmSync(dir, { recursive: true, force: true });
console.log('WEB STATE TEST PASS');
