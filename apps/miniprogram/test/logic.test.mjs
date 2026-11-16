/** 小程序端验证：core CJS 包可用、跟拼逻辑正确、页面 JS 语法、工程结构完整 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));

// 1. core CJS 包可加载并工作
const core = require('../utils/@perler-core/index.js');
assert.equal(typeof core.parsePattern, 'function');
assert.equal(typeof core.colorSteps, 'function');
assert.equal(typeof core.decodeShareCode, 'function');
const p = core.createPattern(4, 4, 'mard');
core.setCell(p, 0, 0, 2);
core.setCell(p, 1, 0, 2);
core.setCell(p, 0, 1, 3);
assert.equal(core.usageStats(p).length, 2);
const steps = core.colorSteps(p);
assert.equal(steps.length, 2);
const json = core.serializePattern(p);
assert.equal(core.parsePattern(json).grid.length, 16);

// 1b. 分享码在小程序端可解（电脑生成 → 小程序打开的链路）
const share = core.encodeShareCode(p);
assert.match(share, /^PB1-/);
assert.deepEqual(core.decodeShareCode(share).grid, p.grid);

// 2. 跟拼会话逻辑
const follow = require('../utils/followSteps.js');
const s = follow.createSession(p, core.getPalette('mard'));
assert.equal(s.steps.length, 2);
assert.equal(s.steps[0].total, 2, '用豆多的色排前面');
assert.equal(follow.currentStep(s).index, 2);
follow.completeCurrent(s);
assert.equal(follow.currentStep(s).index, 3);
let prog = follow.progress(s);
assert.equal(prog.doneSteps, 1);
assert.equal(prog.doneCells, 2);
assert.equal(prog.allCells, 3);
follow.selectStep(s, 1);
assert.equal(follow.currentStep(s).index, 3, '选回最后一步');
follow.completeCurrent(s);
assert.equal(follow.currentStep(s), null, '全部完成后无当前步');
prog = follow.progress(s);
assert.equal(prog.doneSteps, 2);
assert.equal(prog.doneCells, 3);

// 2b. 跟拼进度导出/恢复
const s2 = follow.createSession(p, core.getPalette('mard'));
assert.equal(follow.restoreState(s2, { current: 0, done: [true, false] }), true);
assert.equal(s2.steps[0].done, true);
assert.equal(follow.currentStep(s2).index, 3, '当前步已完成后应推进到未完成的下一步');
const st = follow.exportState(s2);
assert.deepEqual(st.done, [true, false]);
const s3 = follow.createSession(p, core.getPalette('mard'));
assert.equal(follow.restoreState(s3, { current: 0, done: [true] }), false, '长度不匹配应拒绝');
assert.equal(s3.steps[0].done, false, '拒绝时不应改动会话');

// 3. 所有小程序 JS 语法检查（模块体不执行 wx 调用，可安全编译）
const jsFiles = [
  'app.js',
  'utils/patternStore.js',
  'utils/followSteps.js',
  'utils/render.js',
  'pages/index/index.js',
  'pages/viewer/viewer.js',
];
for (const f of jsFiles) {
  const src = readFileSync(join(root, f), 'utf8');
  new Function('require', 'module', 'exports', 'wx', 'Page', 'App', 'getApp', src);
}

// 4. 工程结构校验：app.json 页面四件套齐全、配置合法
const appJson = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
assert.ok(Array.isArray(appJson.pages) && appJson.pages.length >= 2);
for (const page of appJson.pages) {
  for (const ext of ['js', 'wxml', 'wxss', 'json']) {
    assert.ok(existsSync(join(root, `${page}.${ext}`)), `缺少 ${page}.${ext}`);
  }
}
const proj = JSON.parse(readFileSync(join(root, 'project.config.json'), 'utf8'));
assert.equal(proj.compileType, 'miniprogram');

console.log('MINIAPP LOGIC TEST PASS');
console.log(`  core CJS 可用；跟拼步骤 ${s.steps.length} 个、总豆 ${prog.allCells} 颗`);
console.log(`  页面结构：${appJson.pages.join(', ')}`);
