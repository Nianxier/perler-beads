/** 文字转图纸：把文字栅格化后量化成拼豆图纸（浏览器画布能力，小程序端不复用）。 */
import { pixelsToPattern, type Pattern } from '@perler/core';

export interface TextToPatternOptions {
  /** 目标格数（宽），高度按文字宽高比自动 */
  width: number;
  paletteId?: string;
  bold?: boolean;
  /** 行距系数，默认 1.25 */
  lineHeight?: number;
}

export function textToPattern(text: string, options: TextToPatternOptions): Pattern {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines.every((l) => l.trim() === '')) {
    throw new Error('请输入文字');
  }
  const weight = options.bold === false ? 400 : 700;
  const fontFamily = 'system-ui, "Microsoft YaHei", sans-serif';
  const fontSize = 200;
  const padding = 24;
  const lineH = fontSize * (options.lineHeight ?? 1.25);

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('无法创建画布');
  measure.font = `${weight} ${fontSize}px ${fontFamily}`;
  const widths = lines.map((l) => measure.measureText(l).width);
  const w = Math.ceil(Math.max(1, ...widths)) + padding * 2;
  const h = Math.ceil(lineH * lines.length) + padding * 2;

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.fillText(l, padding, padding + lineH * i + lineH / 2);
  });

  const { data } = ctx.getImageData(0, 0, w, h);
  const targetW = Math.max(1, Math.round(options.width));
  const targetH = Math.max(1, Math.round((targetW * h) / w));
  return pixelsToPattern(data, w, h, {
    width: targetW,
    height: targetH,
    paletteId: options.paletteId,
    fit: 'contain',
    name: lines.join(' ').trim().slice(0, 20) || '文字图纸',
    // 抗锯齿边缘按较低阈值计入，笔画更连贯
    alphaThreshold: 64,
  });
}
