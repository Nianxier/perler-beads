/** 图片像素 → 拼豆图纸：面积平均降采样 + OKLab 最近色映射。 */
import { getPalette, nearestColorIndex } from './palette.js';
import { EMPTY, type Pattern } from './types.js';

export const DEFAULT_PALETTE_ID = 'mard-221';

export interface QuantizeOptions {
  /** 目标格数（宽） */
  width: number;
  /** 目标格数（高） */
  height: number;
  /** 色卡 id，默认 mard */
  paletteId?: string;
  /** contain=保持比例居中、四周留空；stretch=拉伸铺满 */
  fit?: 'contain' | 'stretch';
  /** 图纸名称 */
  name?: string;
  /** 透明像素阈值：alpha < 该值视为无豆（默认 128） */
  alphaThreshold?: number;
}

/**
 * 把 RGBA 像素（行优先，srcWidth*srcHeight*4）量化成图纸。
 * 每个目标格对源图对应区域做面积平均，再映射到色卡最近色。
 */
export function pixelsToPattern(
  rgba: Uint8Array | Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  options: QuantizeOptions,
): Pattern {
  if (srcWidth < 1 || srcHeight < 1) throw new Error('源图尺寸无效');
  if (rgba.length !== srcWidth * srcHeight * 4) {
    throw new Error(`像素长度不匹配: ${rgba.length} != ${srcWidth * srcHeight * 4}`);
  }
  const w = options.width;
  const h = options.height;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    throw new Error('目标格数必须是正整数');
  }
  const palette = getPalette(options.paletteId ?? DEFAULT_PALETTE_ID);
  const fit = options.fit ?? 'contain';
  const alphaThreshold = options.alphaThreshold ?? 128;

  // contain：等比缩放后的有效区域（以目标格为单位）
  let ox = 0;
  let oy = 0;
  let boxW = w;
  let boxH = h;
  if (fit === 'contain') {
    const k = Math.min(w / srcWidth, h / srcHeight);
    boxW = srcWidth * k;
    boxH = srcHeight * k;
    ox = (w - boxW) / 2;
    oy = (h - boxH) / 2;
  }

  const grid: number[] = new Array(w * h).fill(EMPTY);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 目标格中心不在有效区域内 → 留空
      if (x + 0.5 < ox || x + 0.5 >= ox + boxW || y + 0.5 < oy || y + 0.5 >= oy + boxH) {
        continue;
      }
      // 反算源图像素范围（面积平均）
      const sx0 = Math.max(0, Math.floor((x - ox) * (srcWidth / boxW)));
      const sx1 = Math.min(srcWidth, Math.ceil((x + 1 - ox) * (srcWidth / boxW)));
      const sy0 = Math.max(0, Math.floor((y - oy) * (srcHeight / boxH)));
      const sy1 = Math.min(srcHeight, Math.ceil((y + 1 - oy) * (srcHeight / boxH)));

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const o = (sy * srcWidth + sx) * 4;
          if (rgba[o + 3] < alphaThreshold) continue;
          rSum += rgba[o];
          gSum += rgba[o + 1];
          bSum += rgba[o + 2];
          n++;
        }
      }
      if (n === 0) continue; // 全透明 → 留空
      grid[y * w + x] = nearestColorIndex(
        palette,
        rSum / n,
        gSum / n,
        bSum / n,
      );
    }
  }

  return {
    schema: 'perler-pattern',
    version: 1,
    name: options.name ?? '未命名',
    paletteId: palette.id,
    width: w,
    height: h,
    grid,
  };
}
