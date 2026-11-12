/** 生成 packages/core/src/data/palettes.ts
 *  数据源：
 *  - tools/research/mard221.json / mard291.json（MARD 基础221/全套291，溯源 maxcleme/beadcolors(MIT) ← zwhy149/bead-grid-studio(Apache-2.0)）
 *  - tools/colorData.source.ts（COCO/漫漫/盼盼/咪小窝 品牌色号映射，liangdabiao/perlerBeadsApplet, MIT）
 *  用法：node tools/build-palettes.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** A1 → A01（与用户习惯的零填充色号对齐） */
function normalizeCode(code) {
  const m = /^([A-Za-z]+)0*(\d+)$/.exec(code);
  return m ? m[1].toUpperCase() + String(Number(m[2])).padStart(2, '0') : code;
}

const palettes = [];

// ---- MARD 系列（research 数据） ----
for (const spec of [
  { file: 'mard221.json', id: 'mard-221', name: 'MARD/曼陀罗 基础221色' },
  { file: 'mard291.json', id: 'mard-291', name: 'MARD/曼陀罗 全套291色' },
]) {
  const p = join(root, 'tools', 'research', spec.file);
  if (!existsSync(p)) {
    console.warn(`跳过 ${spec.file}（不存在）`);
    continue;
  }
  const j = JSON.parse(readFileSync(p, 'utf8'));
  palettes.push({
    id: spec.id,
    name: spec.name,
    system: 'MARD',
    colors: j.colors.map((c) => ({
      code: normalizeCode(c.code),
      hex: c.hex.toUpperCase(),
      group: c.group,
    })),
  });
  console.log(`${spec.id}: ${j.colors.length} 色`);
}

// ---- 品牌色系（HEX → 色号 映射表） ----
const src = readFileSync(join(root, 'tools', 'colorData.source.ts'), 'utf8');
const systems = [
  { key: 'COCO', id: 'coco', name: 'COCO' },
  { key: '漫漫', id: 'manman', name: '漫漫' },
  { key: '盼盼', id: 'panpan', name: '盼盼' },
  { key: '咪小窝', id: 'mixiaowo', name: '咪小窝' },
];
const entryRe = /"(#[0-9A-Fa-f]{6})":\s*\{([^}]*)\}/g;
const codeRe = /"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g;
const bySystem = Object.fromEntries(systems.map((s) => [s.key, []]));
let m;
while ((m = entryRe.exec(src))) {
  const hex = m[1].toUpperCase();
  const body = m[2];
  const codes = {};
  let c;
  codeRe.lastIndex = 0;
  while ((c = codeRe.exec(body))) codes[c[1]] = c[2];
  for (const s of systems) {
    const code = codes[s.key];
    if (code) bySystem[s.key].push({ code, hex });
  }
}
for (const s of systems) {
  palettes.push({
    id: s.id,
    name: s.name,
    system: s.key,
    colors: bySystem[s.key].map((c) => ({ code: c.code, hex: c.hex })),
  });
  console.log(`${s.id}: ${bySystem[s.key].length} 色`);
}

const entries = palettes.map((p) => `  ${JSON.stringify(p, null, 2).replace(/\n/g, '\n  ')},`);
const out = `/** 色卡数据 —— 由 tools/build-palettes.mjs 生成，请勿手改。
 *  MARD 系列溯源：maxcleme/beadcolors(MIT) / zwhy149/bead-grid-studio(Apache-2.0)；
 *  品牌色系来源：liangdabiao/perlerBeadsApplet(MIT)。HEX 为屏幕近似值，实物以厂商色卡为准。
 */
import type { Palette } from '../types.js';

export const PALETTES: Palette[] = [
${entries.join('\n')}
];
`;

const outPath = join(root, 'packages', 'core', 'src', 'data', 'palettes.ts');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out, 'utf8');
console.log(`已写入 ${outPath}`);
