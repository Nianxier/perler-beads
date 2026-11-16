/** 3D 预览数据层（纯函数，可单测）：把图纸展开为圆珠实例列表（不含 three.js 依赖）。 */
import { EMPTY, getPalette, usageStats, type Palette, type Pattern } from '@perler/core';

export interface BeadInstance {
  /** 以图纸中心为原点的平面坐标（格） */
  x: number;
  y: number;
  hex: string;
}

export interface BeadScene {
  beads: BeadInstance[];
  width: number;
  height: number;
}

/** 只取有豆的格子；坐标居中（Three.js 场景原点=图纸中心） */
export function buildBeadScene(pattern: Pattern, palette?: Palette): BeadScene {
  const pal = palette ?? getPalette(pattern.paletteId);
  const beads: BeadInstance[] = [];
  const cx = pattern.width / 2;
  const cy = pattern.height / 2;
  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const v = pattern.grid[y * pattern.width + x];
      if (v === EMPTY) continue;
      beads.push({
        x: x - cx + 0.5,
        y: y - cy + 0.5,
        hex: pal.colors[v]?.hex ?? '#FF00FF',
      });
    }
  }
  return { beads, width: pattern.width, height: pattern.height };
}

/** 实例数量（用于超量提示） */
export function beadCount(pattern: Pattern): number {
  return usageStats(pattern).reduce((n, u) => n + u.count, 0);
}
