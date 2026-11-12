/** 文件 IO：图片导入、JSON/CSV/施工图 PNG 导出、本地草稿。 */
import {
  getPalette,
  parsePattern,
  pixelsToPattern,
  serializePattern,
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
export function exportConstructionPng(pattern: Pattern, palette?: Palette, cellSize = 28): void {
  const pal = palette ?? getPalette(pattern.paletteId);
  const usage = usageStats(pattern, pal);
  const total = usage.reduce((n, u) => n + u.count, 0);
  const margin = 44;
  const headerH = 56;
  const legendRows = Math.max(1, Math.ceil(usage.length / 4));
  const legendH = 54 + legendRows * 22;
  const gridW = pattern.width * cellSize;
  const w = Math.max(gridW + margin * 2, margin * 2 + 4 * 170);
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
    headerH - 16,
  );

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

  // 坐标标记（每 5 格）
  ctx.fillStyle = '#4B5563';
  ctx.font = '500 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let x = 0; x < pattern.width; x += 5) {
    ctx.fillText(String(x + 1), ox + (x + 0.5) * cellSize, oy - 14);
  }
  ctx.textAlign = 'right';
  for (let y = 0; y < pattern.height; y += 5) {
    ctx.fillText(String(y + 1), ox - 10, oy + (y + 0.5) * cellSize);
  }

  // 用量图例：色块 + 色号 × 数量（每行 4 项）
  const legendTop = oy + pattern.height * cellSize + 34;
  const legendW = Math.max(gridW, 4 * 170);
  const colW = legendW / 4;
  ctx.fillStyle = '#1F2329';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`用量明细（共 ${total} 颗，${usage.length} 种颜色）`, ox, legendTop);
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  usage.forEach((u, i) => {
    const cx = ox + (i % 4) * colW;
    const cy = legendTop + 26 + Math.floor(i / 4) * 22;
    ctx.fillStyle = u.hex;
    ctx.fillRect(cx, cy - 7, 14, 14);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(cx + 0.5, cy - 6.5, 13, 13);
    ctx.fillStyle = '#374151';
    ctx.fillText(`${u.code} × ${u.count}`, cx + 20, cy);
  });

  cv.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${pattern.name || '拼豆图纸'}-施工图.png`);
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
