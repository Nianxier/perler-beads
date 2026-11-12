/** 画布渲染：网格、色块、色号文字、坐标线。纯绘制，不做业务。 */
import { EMPTY, hexToRgb, rgbToOklab, type Palette, type Pattern } from '@perler/core';

export interface ViewTransform {
  /** 每格像素 */
  cell: number;
  /** 图纸原点在画布 CSS 像素中的位置 */
  ox: number;
  oy: number;
}

export interface RenderOptions {
  showGrid: boolean;
  showCodes: boolean;
}

const BG = '#EEF0F3';
const EMPTY_FILL = '#FFFFFF';
const GRID_COLOR = '#D9DEE5';
const GRID_HEAVY = '#98A2B0';

/** 按亮度取黑/白文字 */
export function contrastText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [L] = rgbToOklab(r, g, b);
  return L > 0.55 ? '#1F2329' : '#FFFFFF';
}

export function renderPattern(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  palette: Palette,
  view: ViewTransform,
  opts: RenderOptions,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): void {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const { cell, ox, oy } = view;
  const x0 = Math.max(0, Math.floor(-ox / cell));
  const y0 = Math.max(0, Math.floor(-oy / cell));
  const x1 = Math.min(pattern.width, Math.ceil((cssWidth - ox) / cell));
  const y1 = Math.min(pattern.height, Math.ceil((cssHeight - oy) / cell));

  // 色块
  for (let y = y0; y < y1; y++) {
    const rowBase = y * pattern.width;
    for (let x = x0; x < x1; x++) {
      const v = pattern.grid[rowBase + x];
      ctx.fillStyle =
        v === EMPTY ? EMPTY_FILL : (palette.colors[v]?.hex ?? '#FF00FF');
      ctx.fillRect(ox + x * cell, oy + y * cell, cell + 0.5, cell + 0.5);
    }
  }

  // 网格线：每格细线、每 10 格粗线
  if (opts.showGrid && cell >= 3) {
    ctx.lineWidth = 1;
    for (let x = x0; x <= x1; x++) {
      ctx.strokeStyle = x % 10 === 0 ? GRID_HEAVY : GRID_COLOR;
      ctx.beginPath();
      const px = Math.round(ox + x * cell) + 0.5;
      ctx.moveTo(px, oy + y0 * cell);
      ctx.lineTo(px, oy + y1 * cell);
      ctx.stroke();
    }
    for (let y = y0; y <= y1; y++) {
      ctx.strokeStyle = y % 10 === 0 ? GRID_HEAVY : GRID_COLOR;
      ctx.beginPath();
      const py = Math.round(oy + y * cell) + 0.5;
      ctx.moveTo(ox + x0 * cell, py);
      ctx.lineTo(ox + x1 * cell, py);
      ctx.stroke();
    }
  }

  // 色号文字
  if (opts.showCodes && cell >= 14) {
    const fontPx = Math.min(12, Math.floor(cell * 0.42));
    ctx.font = `500 ${fontPx}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = y0; y < y1; y++) {
      const rowBase = y * pattern.width;
      for (let x = x0; x < x1; x++) {
        const v = pattern.grid[rowBase + x];
        if (v === EMPTY) continue;
        const hex = palette.colors[v]?.hex ?? '#FF00FF';
        const code = palette.colors[v]?.code ?? '?';
        ctx.fillStyle = contrastText(hex);
        ctx.fillText(code, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell);
      }
    }
  }

  // 图纸外框
  ctx.lineWidth = 2;
  ctx.strokeStyle = GRID_HEAVY;
  ctx.strokeRect(ox + 0.5, oy + 0.5, pattern.width * cell, pattern.height * cell);
  ctx.restore();
}
