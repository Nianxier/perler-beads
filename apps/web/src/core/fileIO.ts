/** 文件 IO：图片导入、JSON/CSV/施工图 PNG 导出、本地草稿。 */
import {
  getPalette,
  parsePattern,
  pixelsToPattern,
  serializePattern,
  splitByBoards,
  usageStats,
  type Palette,
  type Pattern,
} from '@perler/core';
import { contrastText } from './renderPattern';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportImageOptions {
  width: number;
  /** 0 = 按宽度和原图比例自动算高度 */
  height?: number;
  fit?: 'contain' | 'stretch';
  /** Floyd-Steinberg 抖动 */
  dither?: boolean;
}

/** 图片文件 → 图纸（浏览器内解码，不上传） */
export async function imageFileToPattern(
  file: File,
  options: ImportImageOptions,
): Promise<Pattern> {
  const bitmap = await createImageBitmap(file);
  try {
    const cv = document.createElement('canvas');
    cv.width = bitmap.width;
    cv.height = bitmap.height;
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('无法创建画布');
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
    const width = Math.max(1, Math.round(options.width));
    const height =
      options.height && options.height > 0
        ? Math.round(options.height)
        : Math.max(1, Math.round((width * bitmap.height) / bitmap.width));
    return pixelsToPattern(data, cv.width, cv.height, {
      width,
      height,
      fit: options.fit ?? 'contain',
      dither: options.dither ?? false,
      name: file.name.replace(/\.[^.]+$/, ''),
    });
  } finally {
    bitmap.close();
  }
}

export function exportJson(pattern: Pattern): void {
  downloadBlob(
    new Blob([serializePattern(pattern)], { type: 'application/json' }),
    `${pattern.name || '拼豆图纸'}.json`,
  );
}

export async function openJsonFile(file: File): Promise<Pattern> {
  return parsePattern(await file.text());
}

export function exportCsv(pattern: Pattern, palette?: Palette): void {
  const pal = palette ?? getPalette(pattern.paletteId);
  const rows: string[][] = [['色号', '颜色', '数量']];
  for (const u of usageStats(pattern, pal)) {
    rows.push([u.code, u.hex, String(u.count)]);
  }
  // BOM：让 Excel 正确识别 UTF-8 中文
  const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `${pattern.name || '拼豆图纸'}-用量.csv`);
}

/** 施工图 PNG：色块 + 逐格色号 + 每 5 格坐标标记 + 标题栏 */
function buildConstructionCanvas(
  pattern: Pattern,
  palette: Palette | undefined,
  cellSize: number,
  subtitle = '',
  coord: { x: number; y: number } = { x: 0, y: 0 },
): HTMLCanvasElement {
  const pal = palette ?? getPalette(pattern.paletteId);
  const usage = usageStats(pattern, pal);
  const total = usage.reduce((n, u) => n + u.count, 0);
  const margin = 44;
  const headerH = subtitle ? 80 : 56;
  const gridW = pattern.width * cellSize;
  const legendW = Math.max(gridW, 4 * 170);
  const chipW = 72;
  const chipH = 30;
  const chipGap = 4;
  const legendCols = Math.max(4, Math.floor(legendW / (chipW + chipGap)));
  const legendRows = Math.max(1, Math.ceil(usage.length / legendCols));
  const legendH = 52 + legendRows * (chipH + chipGap);
  const w = legendW + margin * 2;
  const h = headerH + margin + pattern.height * cellSize + legendH + margin;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 标题栏
  ctx.fillStyle = '#1F2329';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    `${pattern.name || '拼豆图纸'} · ${pal.name} · ${pattern.width}×${pattern.height} · 共 ${total} 颗`,
    margin,
    subtitle ? 30 : headerH - 16,
  );
  if (subtitle) {
    ctx.fillStyle = '#6B7280';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText(subtitle, margin, 56);
  }

  const ox = margin;
  const oy = headerH + margin;

  // 色块 + 色号
  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const v = pattern.grid[y * pattern.width + x];
      const px = ox + x * cellSize;
      const py = oy + y * cellSize;
      if (v === -1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        const hex = pal.colors[v]?.hex ?? '#FF00FF';
        ctx.fillStyle = hex;
        ctx.fillRect(px, py, cellSize, cellSize);
        if (cellSize >= 16) {
          ctx.fillStyle = contrastText(hex);
          ctx.font = `500 ${Math.floor(cellSize * 0.36)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pal.colors[v]?.code ?? '?', px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
  }

  // 网格线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#C9CFD8';
  for (let x = 0; x <= pattern.width; x++) {
    ctx.beginPath();
    const px = Math.round(ox + x * cellSize) + 0.5;
    ctx.moveTo(px, oy);
    ctx.lineTo(px, oy + pattern.height * cellSize);
    ctx.stroke();
  }
  for (let y = 0; y <= pattern.height; y++) {
    ctx.beginPath();
    const py = Math.round(oy + y * cellSize) + 0.5;
    ctx.moveTo(ox, py);
    ctx.lineTo(ox + pattern.width * cellSize, py);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#6B7280';
  ctx.strokeRect(ox, oy, pattern.width * cellSize, pattern.height * cellSize);

  // 坐标标记（每 5 格；coord 为全局偏移，分板图纸显示全局行列号）
  ctx.fillStyle = '#4B5563';
  ctx.font = '500 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let x = 0; x < pattern.width; x += 5) {
    ctx.fillText(String(x + 1 + coord.x), ox + (x + 0.5) * cellSize, oy - 14);
  }
  ctx.textAlign = 'right';
  for (let y = 0; y < pattern.height; y += 5) {
    ctx.fillText(String(y + 1 + coord.y), ox - 10, oy + (y + 0.5) * cellSize);
  }

  // 行分组编号（每 5 行一组，右侧编号片，方便分段拼）
  if (pattern.height >= 10) {
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < pattern.height; y += 5) {
      const endY = Math.min(y + 5, pattern.height);
      const gIdx = Math.floor((y + coord.y) / 5) + 1;
      const cx = ox + pattern.width * cellSize + 10;
      const cy = oy + ((y + endY) / 2) * cellSize;
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(cx, cy - 10, 22, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(String(gIdx), cx + 11, cy);
    }
  }

  // 用量图例：紧凑色片（色号 + 数量堆叠在色片内，多列排布，省空间）
  const legendTop = oy + pattern.height * cellSize + 34;
  ctx.fillStyle = '#1F2329';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`用量明细（共 ${total} 颗 · ${usage.length} 种颜色）`, ox, legendTop);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  usage.forEach((u, i) => {
    const cx = ox + (i % legendCols) * (chipW + chipGap);
    const cy = legendTop + 22 + Math.floor(i / legendCols) * (chipH + chipGap);
    ctx.fillStyle = u.hex;
    ctx.fillRect(cx, cy, chipW, chipH);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(cx + 0.5, cy + 0.5, chipW - 1, chipH - 1);
    ctx.fillStyle = contrastText(u.hex);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(u.code, cx + chipW / 2, cy + chipH / 2 - 7);
    ctx.fillText(`× ${u.count}`, cx + chipW / 2, cy + chipH / 2 + 8);
  });

  return cv;
}

export function exportConstructionPng(pattern: Pattern, palette?: Palette, cellSize = 28): void {
  const cv = buildConstructionCanvas(pattern, palette, cellSize);
  cv.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${pattern.name || '拼豆图纸'}-施工图.png`);
  }, 'image/png');
}

/** 分板导出：按底板（29×29 / 52×52）拆成多张施工图 PNG，每张标注全局位置 */
export function exportBoardSheets(pattern: Pattern, palette?: Palette, boardSize = 29): void {
  const pal = palette ?? getPalette(pattern.paletteId);
  const sheets = splitByBoards(pattern, boardSize);
  for (const s of sheets) {
    const sub: Pattern = {
      schema: 'perler-pattern',
      version: 1,
      name: `${pattern.name || '拼豆图纸'}·板${s.boardY + 1}-${s.boardX + 1}`,
      paletteId: pattern.paletteId,
      width: s.width,
      height: s.height,
      grid: s.grid,
    };
    const x0 = s.srcX + 1;
    const x1 = s.srcX + s.width;
    const y0 = s.srcY + 1;
    const y1 = s.srcY + s.height;
    const subtitle = `整图位置：第 ${s.boardY + 1} 行 第 ${s.boardX + 1} 列（全局列 ${x0}~${x1}、行 ${y0}~${y1}） · 共 ${sheets.length} 块板`;
    const cv = buildConstructionCanvas(sub, pal, 28, subtitle, { x: s.srcX, y: s.srcY });
    cv.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${pattern.name || '拼豆图纸'}-板${s.boardY + 1}-${s.boardX + 1}.png`);
      }
    }, 'image/png');
  }
}

/** 拼板总览图：多底板时导出板位示意图（每块板缩略图 + 全局位置标注） */
export function exportBoardOverview(pattern: Pattern, palette?: Palette, boardSize = 29): void {
  const pal = palette ?? getPalette(pattern.paletteId);
  const sheets = splitByBoards(pattern, boardSize);
  const cols = Math.ceil(pattern.width / boardSize);
  const rows = Math.ceil(pattern.height / boardSize);
  const boxW = 150;
  const boxH = 132;
  const gap = 12;
  const margin = 36;
  const headerH = 50;
  const w = margin * 2 + cols * boxW + (cols - 1) * gap;
  const h = headerH + margin + rows * boxH + (rows - 1) * gap + margin;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1F2329';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    `${pattern.name || '拼豆图纸'} · 拼板总览 ${rows}×${cols}=${sheets.length} 块 · 底板 ${boardSize}×${boardSize}`,
    margin,
    headerH - 14,
  );

  for (const s of sheets) {
    const bx = margin + s.boardX * (boxW + gap);
    const by = headerH + margin + s.boardY * (boxH + gap);
    // 缩略图
    const cell = Math.min((boxW - 16) / s.width, (boxH - 42) / s.height);
    const tx = bx + (boxW - s.width * cell) / 2;
    const ty = by + 8;
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const v = s.grid[y * s.width + x];
        ctx.fillStyle = v === -1 ? '#F3F4F6' : (pal.colors[v] ? pal.colors[v].hex : '#FF00FF');
        ctx.fillRect(tx + x * cell, ty + y * cell, cell + 0.4, cell + 0.4);
      }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#C9CFD8';
    ctx.strokeRect(tx, ty, s.width * cell, s.height * cell);
    // 标注
    ctx.fillStyle = '#1F2329';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`板 ${s.boardY + 1}-${s.boardX + 1}`, bx + boxW / 2, by + boxH - 26);
    ctx.fillStyle = '#6B7280';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillText(
      `列 ${s.srcX + 1}~${s.srcX + s.width} · 行 ${s.srcY + 1}~${s.srcY + s.height}`,
      bx + boxW / 2,
      by + boxH - 11,
    );
  }

  cv.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${pattern.name || '拼豆图纸'}-拼板总览.png`);
  }, 'image/png');
}

const DRAFT_KEY = 'perler.web.draft';

export function saveDraft(pattern: Pattern): void {
  localStorage.setItem(DRAFT_KEY, serializePattern(pattern));
}

export function loadDraft(): Pattern | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  return parsePattern(raw);
}
