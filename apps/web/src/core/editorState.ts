/** 编辑器状态机：工具语义、描边会话、撤销重做。框架无关，可单测。 */
import {
  EMPTY,
  createPattern,
  floodFill,
  getCell,
  resizePattern,
  setCell,
  transformPattern,
  type Pattern,
  type PatternTransform,
} from '@perler/core';

export type Tool = 'pencil' | 'eraser' | 'bucket' | 'picker';

export interface EditorState {
  pattern: Pattern;
  tool: Tool;
  colorIndex: number;
  /** 撤销栈：格子快照 */
  history: number[][];
  /** 重做栈 */
  future: number[][];
  maxHistory: number;
}

export interface StrokeSession {
  /** 本次描边是否已产生变更（决定何时压快照，保证一笔=一步撤销） */
  changed: boolean;
  /** 取色是否已执行（一笔只取一次） */
  picked: boolean;
}

export type StrokeResult = 'changed' | 'picked' | 'none';

export function createEditor(
  width = 32,
  height = 32,
  paletteId = 'mard-221',
  maxHistory = 50,
): EditorState {
  return {
    pattern: createPattern(width, height, paletteId),
    tool: 'pencil',
    colorIndex: 0,
    history: [],
    future: [],
    maxHistory,
  };
}

export function snapshot(s: EditorState): void {
  s.history.push([...s.pattern.grid]);
  if (s.history.length > s.maxHistory) s.history.shift();
  s.future.length = 0;
}

export function canUndo(s: EditorState): boolean {
  return s.history.length > 0;
}

export function canRedo(s: EditorState): boolean {
  return s.future.length > 0;
}

export function undo(s: EditorState): boolean {
  if (!canUndo(s)) return false;
  s.future.push([...s.pattern.grid]);
  s.pattern.grid = s.history.pop()!;
  return true;
}

export function redo(s: EditorState): boolean {
  if (!canRedo(s)) return false;
  s.history.push([...s.pattern.grid]);
  s.pattern.grid = s.future.pop()!;
  return true;
}

export function setTool(s: EditorState, t: Tool): void {
  s.tool = t;
}

export function setColor(s: EditorState, index: number): void {
  if (!Number.isInteger(index) || index < 0) throw new Error(`非法颜色下标: ${index}`);
  s.colorIndex = index;
}

export function replacePattern(s: EditorState, p: Pattern): void {
  s.pattern = p;
  s.history.length = 0;
  s.future.length = 0;
}

/** 调整图纸大小（保留内容）。结构变更，历史栈清空重新开始 */
export function resizeDocument(
  s: EditorState,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
): void {
  replacePattern(s, resizePattern(s.pattern, width, height, offsetX, offsetY));
}

/** 镜像/旋转。结构变更（旋转换向），历史栈清空 */
export function transformDocument(s: EditorState, op: PatternTransform): void {
  replacePattern(s, transformPattern(s.pattern, op));
}

export function startStroke(_s: EditorState): StrokeSession {
  return { changed: false, picked: false };
}

/** 单格工具动作（描边中的每一步）；一笔 = 一次撤销 */
export function strokeStep(s: EditorState, x: number, y: number, st: StrokeSession): StrokeResult {
  const cur = getCell(s.pattern, x, y);
  switch (s.tool) {
    case 'picker':
      if (st.picked) return 'none';
      st.picked = true;
      if (cur !== EMPTY) s.colorIndex = cur;
      return 'picked';
    case 'bucket': {
      if (st.changed || cur === s.colorIndex) return 'none';
      snapshot(s);
      const n = floodFill(s.pattern, x, y, s.colorIndex);
      if (n === 0) {
        s.history.pop();
        return 'none';
      }
      st.changed = true;
      return 'changed';
    }
    case 'eraser':
    case 'pencil': {
      const target = s.tool === 'eraser' ? EMPTY : s.colorIndex;
      if (cur === target) return 'none';
      if (!st.changed) {
        snapshot(s);
        st.changed = true;
      }
      setCell(s.pattern, x, y, target);
      return 'changed';
    }
  }
}

/** 描边连线（Bresenham），拖动时避免断点 */
export function strokeLine(
  s: EditorState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  st: StrokeSession,
): StrokeResult {
  let result: StrokeResult = 'none';
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    const r = strokeStep(s, x, y, st);
    if (r === 'picked') result = 'picked';
    else if (r === 'changed') result = 'changed';
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return result;
}
