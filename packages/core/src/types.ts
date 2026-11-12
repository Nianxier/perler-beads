/** 核心数据类型：色卡、图纸（perler-pattern JSON 格式）。 */

/** 空格子（未放豆） */
export const EMPTY = -1;

export interface PaletteColor {
  /** 色号，如 "A01" */
  code: string;
  /** 屏幕近似色 "#RRGGBB" */
  hex: string;
  /** 可选中文名 */
  name?: string;
}

export interface Palette {
  /** 色卡 id，如 "mard" */
  id: string;
  /** 展示名 */
  name: string;
  /** 色系标识 */
  system: string;
  colors: PaletteColor[];
}

/**
 * 图纸数据模型。交换格式 `perler-pattern` v1：
 * grid 为 width*height 的一维数组（行优先），值为色卡 colors 下标，EMPTY(-1) 表示空格。
 */
export interface Pattern {
  schema: 'perler-pattern';
  version: 1;
  name: string;
  paletteId: string;
  width: number;
  height: number;
  grid: number[];
}

export interface UsageEntry {
  index: number;
  code: string;
  hex: string;
  count: number;
}

/** 跟拼模式的单色步骤 */
export interface ColorStep {
  index: number;
  code: string;
  hex: string;
  cells: Array<[number, number]>;
}
