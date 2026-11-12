/** 从 tools/colorData.source.ts 生成 packages/core/src/data/palettes.ts
 *  用法：node tools/build-palettes.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(join(root, 'tools', 'colorData.source.ts'), 'utf8');

const systems = [
  { key: 'MARD', id: 'mard', name: 'MARD/曼陀罗' },
  { key: 'COCO', id: 'coco', name: 'COCO' },
  { key: '漫漫', id: 'manman', name: '漫漫' },
  { key: '盼盼', id: 'panpan', name: '盼盼' },
  { key: '咪小窝', id: 'mixiaowo', name: '咪小窝' },
];

const entryRe = /"(#[0-9A-Fa-f]{6})":\s*\{([^}]*)\}/g;
const codeRe = /"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g;

const bySystem = Object.fromEntries(systems.map((s) => [s.key, []]));
let count = 0;
let m;
while ((m = entryRe.exec(src))) {
  const hex = m[1].toUpperCase();
  const body = m[2];
  const codes = {};
  let c;
  codeRe.lastIndex = 0;
  while ((c = codeRe.exec(body))) codes[c[1]] = c[2];
  count++;
  for (const s of systems) {
    const code = codes[s.key];
    if (code) bySystem[s.key].push({ code, hex });
  }
}

const entries = systems.map((s) => {
  const colors = bySystem[s.key];
  return `  {
    id: ${JSON.stringify(s.id)},
    name: ${JSON.stringify(s.name)},
    system: ${JSON.stringify(s.key)},
    colors: [
${colors.map((c) => `      { code: ${JSON.stringify(c.code)}, hex: ${JSON.stringify(c.hex)} },`).join('\n')}
    ],
  },`;
});

const out = `/** 色卡数据 —— 由 tools/build-palettes.mjs 生成，请勿手改。
 *  数据参考 liangdabiao/perlerBeadsApplet（MIT License）整理的多色系色号映射。
 *  HEX 为屏幕近似值，实物颜色以厂商色卡为准。
 */
import type { Palette } from '../types.js';

export const PALETTES: Palette[] = [
${entries.join('\n')}
];
`;

const outPath = join(root, 'packages', 'core', 'src', 'data', 'palettes.ts');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out, 'utf8');
console.log(`源色数: ${count}`);
for (const s of systems) console.log(`${s.key}: ${bySystem[s.key].length} 色`);
console.log(`已写入 ${outPath}`);
