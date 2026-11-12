/** 色卡：加载、查询、最近色匹配（OKLab 色差）。 */
import { PALETTES } from './data/palettes.js';
import type { Palette } from './types.js';
import { deltaEOK, hexToRgb, rgbToOklab, type Oklab } from './color.js';

const oklabCache = new Map<string, Oklab[]>();

export function listPalettes(): Palette[] {
  return [...PALETTES];
}

export function getPalette(id: string): Palette {
  const p = PALETTES.find((x) => x.id === id);
  if (!p) {
    throw new Error(`未找到色卡: ${id}（可用: ${PALETTES.map((x) => x.id).join(', ')}）`);
  }
  return p;
}

function paletteOklab(p: Palette): Oklab[] {
  let t = oklabCache.get(p.id);
  if (!t) {
    t = p.colors.map((c) => {
      const [r, g, b] = hexToRgb(c.hex);
      return rgbToOklab(r, g, b) as Oklab;
    });
    oklabCache.set(p.id, t);
  }
  return t;
}

/** 返回色卡中与给定 RGB 最接近的颜色下标（OKLab 色差最小） */
export function nearestColorIndex(palette: Palette, r: number, g: number, b: number): number {
  const target = rgbToOklab(r, g, b);
  const table = paletteOklab(palette);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < table.length; i++) {
    const d = deltaEOK(target, table[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** 最近色匹配并返回色差值（用于提示配色质量） */
export function nearestColorWithDelta(
  palette: Palette,
  r: number,
  g: number,
  b: number,
): { index: number; delta: number } {
  const target = rgbToOklab(r, g, b);
  const table = paletteOklab(palette);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < table.length; i++) {
    const d = deltaEOK(target, table[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { index: best, delta: bestD };
}
