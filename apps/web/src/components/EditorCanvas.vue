<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getPalette, type Palette } from '@perler/core';
import { editor, bump, showCodes, showGrid, version, viewApi } from '../core/session';
import {
  redo,
  startStroke,
  strokeLine,
  strokeStep,
  undo,
  moveRegion,
  clearRegion,
  stampToolRegion,
  type StrokeSession,
} from '../core/editorState';
import { pendingStamp, selection, selPreview, showToast } from '../core/session';
import { renderPattern, type ViewTransform } from '../core/renderPattern';

const container = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let cssW = 0;
let cssH = 0;
let raf = 0;
const palette: Palette = getPalette('mard');

const view: ViewTransform = { cell: 16, ox: 24, oy: 24 };

function draw(): void {
  if (!ctx || !canvas.value) return;
  renderPattern(
    ctx,
    editor.pattern,
    palette,
    view,
    {
      showGrid: showGrid.value,
      showCodes: showCodes.value,
      selection: selection.value,
      selOffset: selPreview.value,
    },
    cssW,
    cssH,
    dpr,
  );
}

function schedule(): void {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    draw();
  });
}

function resize(): void {
  const el = container.value;
  const cv = canvas.value;
  if (!el || !cv) return;
  dpr = window.devicePixelRatio || 1;
  cssW = el.clientWidth;
  cssH = el.clientHeight;
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.style.width = `${cssW}px`;
  cv.style.height = `${cssH}px`;
  draw();
}

function fit(): void {
  const p = editor.pattern;
  if (!cssW || !cssH) return;
  const cell = Math.min(cssW / p.width, cssH / p.height) * 0.92;
  view.cell = Math.max(2, Math.min(64, cell));
  view.ox = (cssW - p.width * view.cell) / 2;
  view.oy = (cssH - p.height * view.cell) / 2;
  schedule();
}

function zoomBy(factor: number): void {
  const cx = cssW / 2;
  const cy = cssH / 2;
  const cell = Math.max(2, Math.min(64, view.cell * factor));
  const k = cell / view.cell;
  view.ox = cx - (cx - view.ox) * k;
  view.oy = cy - (cy - view.oy) * k;
  view.cell = cell;
  schedule();
}

// ---- 指针交互 ----
let stroke: StrokeSession | null = null;
let lastCell: [number, number] | null = null;
let panning = false;
let selDrag: { mode: 'marquee' | 'move'; startX: number; startY: number; copy: boolean } | null = null;
const panStart = { x: 0, y: 0, ox: 0, oy: 0 };
let spaceDown = false;

function toCell(e: PointerEvent): [number, number] {
  const rect = canvas.value!.getBoundingClientRect();
  return [
    Math.floor((e.clientX - rect.left - view.ox) / view.cell),
    Math.floor((e.clientY - rect.top - view.oy) / view.cell),
  ];
}

function onPointerDown(e: PointerEvent): void {
  const cv = canvas.value;
  if (!cv) return;
  cv.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || spaceDown) {
    panning = true;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    panStart.ox = view.ox;
    panStart.oy = view.oy;
    return;
  }
  const [x, y] = toCell(e);
  if (pendingStamp.value) {
    stampToolRegion(editor, pendingStamp.value, x, y);
    pendingStamp.value = null;
    showToast('已放置（可 Ctrl+Z 撤销）');
    bump();
    return;
  }
  if (editor.tool === 'select') {
    const sel = selection.value;
    if (sel && x >= sel.x && x < sel.x + sel.w && y >= sel.y && y < sel.y + sel.h) {
      selDrag = { mode: 'move', startX: x, startY: y, copy: e.altKey };
    } else {
      selDrag = { mode: 'marquee', startX: x, startY: y, copy: false };
      selection.value = { x, y, w: 1, h: 1 };
      selPreview.value = null;
    }
    bump();
    return;
  }
  stroke = startStroke(editor);
  strokeStep(editor, x, y, stroke);
  lastCell = [x, y];
  bump();
}

function onPointerMove(e: PointerEvent): void {
  if (panning) {
    view.ox = panStart.ox + (e.clientX - panStart.x);
    view.oy = panStart.oy + (e.clientY - panStart.y);
    schedule();
    return;
  }
  const [x, y] = toCell(e);
  if (selDrag) {
    if (selDrag.mode === 'marquee') {
      selection.value = normalizeRect(selDrag.startX, selDrag.startY, x, y);
    } else {
      selPreview.value = { dx: x - selDrag.startX, dy: y - selDrag.startY };
    }
    bump();
    return;
  }
  if (!stroke) return;
  if (lastCell) strokeLine(editor, lastCell[0], lastCell[1], x, y, stroke);
  else strokeStep(editor, x, y, stroke);
  lastCell = [x, y];
  bump();
}

function onPointerUp(): void {
  if (selDrag) {
    const sel = selection.value;
    if (selDrag.mode === 'move' && sel) {
      const pv = selPreview.value;
      if (pv && (pv.dx !== 0 || pv.dy !== 0)) {
        moveRegion(editor, sel, pv.dx, pv.dy, selDrag.copy);
        selection.value = { ...sel, x: sel.x + pv.dx, y: sel.y + pv.dy };
      }
      selPreview.value = null;
    }
    selDrag = null;
    bump();
    return;
  }
  stroke = null;
  lastCell = null;
  panning = false;
}

function normalizeRect(x0: number, y0: number, x1: number, y1: number) {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0) + 1,
    h: Math.abs(y1 - y0) + 1,
  };
}

function onWheel(e: WheelEvent): void {
  const cv = canvas.value;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const cell = Math.max(2, Math.min(64, view.cell * factor));
  const k = cell / view.cell;
  view.ox = mx - (mx - view.ox) * k;
  view.oy = my - (my - view.oy) * k;
  view.cell = cell;
  schedule();
}

// ---- 快捷键 ----
function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
}

function onKeyDown(e: KeyboardEvent): void {
  if (isTyping(e)) return;
  if (e.code === 'Space') {
    spaceDown = true;
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape') {
    if (pendingStamp.value) {
      pendingStamp.value = null;
      showToast('已取消放置');
      bump();
      return;
    }
    if (selection.value) {
      selection.value = null;
      selPreview.value = null;
      bump();
      return;
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selection.value) {
    clearRegion(editor, selection.value);
    selection.value = null;
    selPreview.value = null;
    bump();
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    if (undo(editor)) bump();
    e.preventDefault();
  } else if (
    (e.ctrlKey || e.metaKey) &&
    (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
  ) {
    if (redo(editor)) bump();
    e.preventDefault();
  } else {
    const tools: Record<string, typeof editor.tool> = {
      b: 'pencil',
      e: 'eraser',
      g: 'bucket',
      i: 'picker',
      s: 'select',
    };
    const t = tools[e.key.toLowerCase()];
    if (t) {
      editor.tool = t;
      bump();
    }
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.code === 'Space') spaceDown = false;
}

let ro: ResizeObserver | null = null;

onMounted(() => {
  ctx = canvas.value!.getContext('2d');
  ro = new ResizeObserver(() => resize());
  ro.observe(container.value!);
  resize();
  fit();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  viewApi.value = { fit, zoomIn: () => zoomBy(1.25), zoomOut: () => zoomBy(1 / 1.25) };
});

onBeforeUnmount(() => {
  ro?.disconnect();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  viewApi.value = null;
});

watch([version, showGrid, showCodes], schedule);
</script>

<template>
  <div ref="container" class="canvas-wrap">
    <canvas
      ref="canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
    ></canvas>
  </div>
</template>

<style scoped>
.canvas-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f4f4f5;
}
canvas {
  display: block;
  cursor: crosshair;
  touch-action: none;
}
</style>
