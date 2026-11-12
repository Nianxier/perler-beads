/** 跨端文件互通 E2E：web 端（ESM 构建）产出 JSON → 小程序端（CJS 副本）解析跟拼 → 反向回读 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// web 端使用的引擎构建（packages/core/dist ESM）
const webCore = await import('../packages/core/dist/index.js');
// 小程序端使用的引擎构建（utils/@perler-core CJS）
const miniCore = require('../apps/miniprogram/utils/@perler-core/index.js');

// 1. web 端「图片转图纸」：4x4 左红右蓝像素 → 2x2 图纸
const src = new Uint8Array(4 * 4 * 4);
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < 4; x++) {
    const o = (y * 4 + x) * 4;
    if (x < 2) {
      src[o] = 255;
    } else {
      src[o + 2] = 255;
    }
    src[o + 3] = 255;
  }
}
const pat = webCore.pixelsToPattern(src, 4, 4, {
  width: 2,
  height: 2,
  fit: 'stretch',
  name: '互通测试',
});

// 2. web 端「保存 JSON」
const json = webCore.serializePattern(pat);

// 3. 小程序端解析（wx.chooseMessageFile → parsePattern 的等价路径）
const parsed = miniCore.parsePattern(json);
assert.equal(parsed.name, '互通测试');
assert.equal(parsed.grid.length, 4);
assert.deepEqual(parsed.grid, pat.grid, '两端色卡下标语义必须一致');

// 4. 小程序端跟拼
const follow = require('../apps/miniprogram/utils/followSteps.js');
const s = follow.createSession(parsed, miniCore.getPalette(parsed.paletteId));
assert.equal(s.steps.length, 2, '红蓝两色两个跟拼步骤');
assert.equal(s.steps[0].total, 2);

// 5. 反向：小程序端序列化 → web 端解析
const back = webCore.parsePattern(miniCore.serializePattern(parsed));
assert.deepEqual(back.grid, pat.grid);

console.log('E2E INTEROP PASS');
console.log(`  图纸 ${pat.width}×${pat.height}，跟拼步骤 ${s.steps.length} 个；ESM/CJS 构建色卡下标一致`);
