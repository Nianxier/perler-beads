/** 图纸模型操作：创建/读写格子/填充/用量统计/跟拼分色/序列化。 */
import { EMPTY, type ColorStep, type Palette, type Pattern, type UsageEntry } from './types.js';
import { getPalette, nearestColorIndex } from './palette.js';
import { deltaEOK, hexToRgb, rgbToOklab } from './color.js';

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

export type PatternTransform = 'flipH' | 'flipV' | 'rotateCW' | 'rotateCCW';

/** 缩放图纸内容（最近邻重采样）到新尺寸：放大=色块复制铺开，缩小=抽样合并 */
export function scalePattern(p: Pattern, width: number, height: number): Pattern {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('图纸尺寸必须是正整数');
  }
  const next = createPattern(width, height, p.paletteId, p.name);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(p.height - 1, Math.floor(((y + 0.5) * p.height) / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(p.width - 1, Math.floor(((x + 0.5) * p.width) / width));
      next.grid[y * width + x] = p.grid[sy * p.width + sx];
    }
  }
  return next;
}

/** 合并类似色（精细度）：按用量保留 maxColors 个代表色，其余并入色差最近的代表色。
 *  色号始终是色卡中的真实豆色；返回新图纸。 */
export function mergeSimilarColors(p: Pattern, maxColors: number): Pattern {
  if (!Number.isInteger(maxColors) || maxColors < 1) {
    throw new Error('颜色数上限必须是正整数');
  }
  const pal = getPalette(p.paletteId);
  const counts = new Map<number, number>();
  for (const v of p.grid) {
    if (v !== EMPTY) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size <= maxColors) return { ...p, grid: [...p.grid] };

  // 用量降序取前 N 个作代表色
  const seeds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map((e) => e[0]);
  const remap = new Map<number, number>();
  for (const idx of counts.keys()) {
    if (seeds.includes(idx)) {
      remap.set(idx, idx);
      continue;
    }
    const [r, g, b] = hexToRgb(pal.colors[idx].hex);
    remap.set(idx, nearestColorIndexInSet(pal, r, g, b, seeds));
  }
  const next = createPattern(p.width, p.height, p.paletteId, p.name);
  for (let i = 0; i < p.grid.length; i++) {
    const v = p.grid[i];
    next.grid[i] = v === EMPTY ? EMPTY : (remap.get(v) ?? v);
  }
  return next;
}

/** 在指定候选下标集合内找最近色 */
function nearestColorIndexInSet(
  pal: Palette,
  r: number,
  g: number,
  b: number,
  candidates: number[],
): number {
  const target = rgbToOklab(r, g, b);
  let best = candidates[0];
  let bestD = Infinity;
  for (const idx of candidates) {
    const [pr, pg, pb] = hexToRgb(pal.colors[idx].hex);
    const d = deltaEOK(target, rgbToOklab(pr, pg, pb));
    if (d < bestD) {
      bestD = d;
      best = idx;
    }
  }
  return best;
}

/** 分板结果：一块底板覆盖的格子区域（局部 grid 行优先） */
export interface BoardSheet {
  /** 底板在整图中的列/行号（0 起） */
  boardX: number;
  boardY: number;
  /** 该板左上角在整图中的格坐标 */
  srcX: number;
  srcY: number;
  /** 该板实际覆盖的格数（右/下边缘可能不满一板） */
  width: number;
  height: number;
  grid: number[];
}

/** 按底板尺寸拆分图纸（左上为原点，行优先），用于多板拼接打印 */
export function splitByBoards(p: Pattern, boardSize: number): BoardSheet[] {
  if (!Number.isInteger(boardSize) || boardSize < 1) {
    throw new Error('底板尺寸必须是正整数');
  }
  const sheets: BoardSheet[] = [];
  const cols = Math.ceil(p.width / boardSize);
  const rows = Math.ceil(p.height / boardSize);
  for (let br = 0; br < rows; br++) {
    for (let bc = 0; bc < cols; bc++) {
      const srcX = bc * boardSize;
      const srcY = br * boardSize;
      const width = Math.min(boardSize, p.width - srcX);
      const height = Math.min(boardSize, p.height - srcY);
      const grid: number[] = new Array(width * height).fill(EMPTY);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          grid[y * width + x] = p.grid[(srcY + y) * p.width + (srcX + x)];
        }
      }
      sheets.push({ boardX: bc, boardY: br, srcX, srcY, width, height, grid });
    }
  }
  return sheets;
}

/** 镜像 / 旋转（90°），返回新图纸；rotate 时宽高互换 */
export function transformPattern(p: Pattern, op: PatternTransform): Pattern {
  const rotate = op === 'rotateCW' || op === 'rotateCCW';
  const w = rotate ? p.height : p.width;
  const h = rotate ? p.width : p.height;
  const next = createPattern(w, h, p.paletteId, p.name);
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const v = p.grid[y * p.width + x];
      if (v === EMPTY) continue;
      let nx = x;
      let ny = y;
      switch (op) {
        case 'flipH':
          nx = p.width - 1 - x;
          break;
        case 'flipV':
          ny = p.height - 1 - y;
          break;
        case 'rotateCW':
          nx = p.height - 1 - y;
          ny = x;
          break;
        case 'rotateCCW':
          nx = y;
          ny = p.width - 1 - x;
          break;
      }
      next.grid[ny * w + nx] = v;
    }
  }
  return next;
}

/** 换色卡（近似换色）：源色 HEX 在目标色卡里取最近色，返回转换后的新图纸 */
export function convertPatternPalette(p: Pattern, targetPaletteId: string): Pattern {  const target = getPalette(targetPaletteId);
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
