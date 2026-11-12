/** 图纸模型操作：创建/读写格子/填充/用量统计/跟拼分色/序列化。 */
import { EMPTY, type ColorStep, type Palette, type Pattern, type UsageEntry } from './types.js';
import { getPalette, nearestColorIndex } from './palette.js';
import { hexToRgb } from './color.js';

export function createPattern(
  width: number,
  height: number,
  paletteId = 'mard-221',
  name = '未命名',
): Pattern {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('图纸尺寸必须是正整数');
  }
  // 校验色卡存在
  getPalette(paletteId);
  return {
    schema: 'perler-pattern',
    version: 1,
    name,
    paletteId,
    width,
    height,
    grid: new Array(width * height).fill(EMPTY),
  };
}

export function cellIndex(p: Pattern, x: number, y: number): number {
  return y * p.width + x;
}

export function inBounds(p: Pattern, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < p.width && y < p.height;
}

export function getCell(p: Pattern, x: number, y: number): number {
  return inBounds(p, x, y) ? p.grid[cellIndex(p, x, y)] : EMPTY;
}

export function setCell(p: Pattern, x: number, y: number, color: number): void {
  if (!inBounds(p, x, y)) return;
  if (color !== EMPTY && (!Number.isInteger(color) || color < 0)) {
    throw new Error(`非法颜色下标: ${color}`);
  }
  p.grid[cellIndex(p, x, y)] = color;
}

/** 四向洪泛填充，返回填充格数 */
export function floodFill(p: Pattern, x: number, y: number, color: number): number {
  if (!inBounds(p, x, y)) return 0;
  const target = p.grid[cellIndex(p, x, y)];
  if (target === color) return 0;
  const stack: Array<[number, number]> = [[x, y]];
  let filled = 0;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (!inBounds(p, cx, cy)) continue;
    const i = cellIndex(p, cx, cy);
    if (p.grid[i] !== target) continue;
    p.grid[i] = color;
    filled++;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return filled;
}

/** 各颜色用量统计（按数量降序） */
export function usageStats(p: Pattern, palette?: Palette): UsageEntry[] {
  const pal = palette ?? getPalette(p.paletteId);
  const counts = new Map<number, number>();
  for (const v of p.grid) {
    if (v === EMPTY) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([index, count]) => ({
      index,
      code: pal.colors[index]?.code ?? `#${index}`,
      hex: pal.colors[index]?.hex ?? '#000000',
      count,
    }));
}

/** 跟拼模式：按颜色分组出步骤（按数量降序） */
export function colorSteps(p: Pattern, palette?: Palette): ColorStep[] {
  const pal = palette ?? getPalette(p.paletteId);
  const cells = new Map<number, Array<[number, number]>>();
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const v = p.grid[cellIndex(p, x, y)];
      if (v === EMPTY) continue;
      let arr = cells.get(v);
      if (!arr) {
        arr = [];
        cells.set(v, arr);
      }
      arr.push([x, y]);
    }
  }
  return [...cells.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([index, list]) => ({
      index,
      code: pal.colors[index]?.code ?? `#${index}`,
      hex: pal.colors[index]?.hex ?? '#000000',
      cells: list,
    }));
}

export function serializePattern(p: Pattern): string {
  return JSON.stringify(p);
}

/** 调整图纸大小并保留内容：原内容按 (offsetX, offsetY) 平移拷入新图纸；
 *  offset 为负表示向左/上裁剪，超出新边界的部分丢弃。 */
export function resizePattern(
  p: Pattern,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
): Pattern {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('图纸尺寸必须是正整数');
  }
  const next = createPattern(width, height, p.paletteId, p.name);
  for (let y = 0; y < p.height; y++) {
    const ny = y + offsetY;
    if (ny < 0 || ny >= height) continue;
    for (let x = 0; x < p.width; x++) {
      const nx = x + offsetX;
      if (nx < 0 || nx >= width) continue;
      const v = p.grid[y * p.width + x];
      if (v !== EMPTY) next.grid[ny * width + nx] = v;
    }
  }
  return next;
}

/** 换色卡（近似换色）：源色 HEX 在目标色卡里取最近色，返回转换后的新图纸 */
export function convertPatternPalette(p: Pattern, targetPaletteId: string): Pattern {
  const target = getPalette(targetPaletteId);
  const source = getPalette(p.paletteId);
  const map = source.colors.map((c) => {
    const [r, g, b] = hexToRgb(c.hex);
    return nearestColorIndex(target, r, g, b);
  });
  const next = createPattern(p.width, p.height, target.id, p.name);
  for (let i = 0; i < p.grid.length; i++) {
    const v = p.grid[i];
    if (v !== EMPTY) next.grid[i] = map[v] ?? EMPTY;
  }
  return next;
}

export function parsePattern(json: string): Pattern {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('图纸 JSON 解析失败');
  }
  const p = raw as Partial<Pattern>;
  if (p?.schema !== 'perler-pattern') throw new Error('不是 perler-pattern 图纸文件');
  if (p.version !== 1) throw new Error(`不支持的图纸版本: ${p.version}`);
  if (!Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width! < 1 || p.height! < 1) {
    throw new Error('图纸尺寸无效');
  }
  if (!Array.isArray(p.grid) || p.grid.length !== p.width! * p.height!) {
    throw new Error('图纸网格数据损坏');
  }
  if (typeof p.paletteId !== 'string') throw new Error('图纸缺少色卡标识');
  for (const v of p.grid) {
    if (!Number.isInteger(v) || (v as number) < EMPTY) throw new Error('图纸网格含非法值');
  }
  return {
    schema: 'perler-pattern',
    version: 1,
    name: typeof p.name === 'string' ? p.name : '未命名',
    paletteId: p.paletteId,
    width: p.width!,
    height: p.height!,
    grid: [...(p.grid as number[])],
  };
}
