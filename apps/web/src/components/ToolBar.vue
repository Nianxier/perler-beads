<script setup lang="ts">
import { computed, ref } from 'vue';
import { getPalette } from '@perler/core';
import {
  bump,
  createDocument,
  editor,
  loadDocument,
  showCodes,
  showGrid,
  showStartWizard,
  showToast,
  showWorks,
  version,
  viewApi,
} from '../core/session';
import {
  canRedo,
  canUndo,
  redo,
  resizeDocument,
  scaleDocument,
  setTool,
  transformDocument,
  undo,
  type Tool,
} from '../core/editorState';
import {
  exportBoardOverview,
  exportBoardSheets,
  exportConstructionPng,
  exportJson,
  imageFileToPattern,
  openJsonFile,
} from '../core/fileIO';
import { saveWork } from '../core/works';

const palette = getPalette('mard');

const newWidth = ref(32);
const newHeight = ref(32);
const resizeWidth = ref(editor.pattern.width);
const resizeHeight = ref(editor.pattern.height);
const resizeAnchor = ref<'topleft' | 'center' | 'bottomright'>('center');
const resizeMode = ref<'canvas' | 'scale'>('canvas');
const importWidth = ref(64);
const importFit = ref<'contain' | 'stretch'>('contain');
const importDither = ref(false);
const boardSize = ref(29);
const imageInput = ref<HTMLInputElement | null>(null);
const jsonInput = ref<HTMLInputElement | null>(null);

const activeTool = computed(() => {
  void version.value;
  return editor.tool;
});
const undoable = computed(() => {
  void version.value;
  return canUndo(editor);
});
const redoable = computed(() => {
  void version.value;
  return canRedo(editor);
});

const tools: Array<{ id: Tool; label: string; key: string }> = [
  { id: 'pencil', label: '铅笔', key: 'B' },
  { id: 'eraser', label: '橡皮', key: 'E' },
  { id: 'bucket', label: '油漆桶', key: 'G' },
  { id: 'picker', label: '取色', key: 'I' },
];

function pickTool(t: Tool): void {
  setTool(editor, t);
  bump();
}

function doUndo(): void {
  if (undo(editor)) bump();
}
function doRedo(): void {
  if (redo(editor)) bump();
}

function doNew(): void {
  const w = Math.max(1, Math.round(newWidth.value));
  const h = Math.max(1, Math.round(newHeight.value));
  // 新建图纸 = 底部标签栏新增一个文档（Excel 式多文档）
  createDocument(w, h);
}

function doResize(): void {
  const w = Math.max(1, Math.round(resizeWidth.value));
  const h = Math.max(1, Math.round(resizeHeight.value));
  if (resizeMode.value === 'scale') {
    scaleDocument(editor, w, h);
    bump();
    viewApi.value?.fit();
    return;
  }
  const before = editor.pattern.grid.filter((v) => v !== -1).length;
  const oldW = editor.pattern.width;
  const oldH = editor.pattern.height;
  let ox = 0;
  let oy = 0;
  if (resizeAnchor.value === 'center') {
    ox = Math.round((w - oldW) / 2);
    oy = Math.round((h - oldH) / 2);
  } else if (resizeAnchor.value === 'bottomright') {
    ox = w - oldW;
    oy = h - oldH;
  }
  resizeDocument(editor, w, h, ox, oy);
  bump();
  viewApi.value?.fit();
  const cropped = before - editor.pattern.grid.filter((v) => v !== -1).length;
  if (cropped > 0) showToast(`调整大小：已裁掉 ${cropped} 格豆子`);
}

function doSaveWork(): void {
  saveWork(editor.pattern);
  showToast('已保存到作品库（可在「作品库」中打开）');
}

function doTransform(op: 'flipH' | 'flipV' | 'rotateCW' | 'rotateCCW'): void {
  transformDocument(editor, op);
  bump();
  viewApi.value?.fit();
}

async function onImagePicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const pat = await imageFileToPattern(file, {
    width: importWidth.value,
    fit: importFit.value,
    dither: importDither.value,
  });
  loadDocument(pat);
  viewApi.value?.fit();
}

async function onJsonPicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  loadDocument(await openJsonFile(file));
  viewApi.value?.fit();
}
</script>

<template>
  <div class="toolbar">
    <div class="group">
      <button class="btn" title="重新打开开始向导" @click="showStartWizard = true">开始向导</button>
    </div>

    <div class="group">
      <button
        v-for="t in tools"
        :key="t.id"
        class="btn"
        :class="{ active: activeTool === t.id }"
        :title="`快捷键 ${t.key}`"
        @click="pickTool(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="group">
      <button class="btn" :disabled="!undoable" title="Ctrl+Z" @click="doUndo">撤销</button>
      <button class="btn" :disabled="!redoable" title="Ctrl+Y" @click="doRedo">重做</button>
    </div>

    <div class="group">
      <label class="chk"><input v-model="showGrid" type="checkbox" /> 网格</label>
      <label class="chk"><input v-model="showCodes" type="checkbox" /> 色号</label>
      <button class="btn" @click="viewApi?.fit()">适应</button>
      <button class="btn" @click="viewApi?.zoomIn()">＋</button>
      <button class="btn" @click="viewApi?.zoomOut()">－</button>
    </div>

    <div class="group">
      <span class="lbl">新建图纸</span>
      <input v-model.number="newWidth" class="num" type="number" min="1" max="500" /> ×
      <input v-model.number="newHeight" class="num" type="number" min="1" max="500" />
      <button class="btn" title="在底部标签栏新建一个图纸文档" @click="doNew">新建图纸</button>
    </div>

    <div class="group">
      <span class="lbl">调整大小</span>
      <input v-model.number="resizeWidth" class="num" type="number" min="1" max="500" /> ×
      <input v-model.number="resizeHeight" class="num" type="number" min="1" max="500" />
      <select v-model="resizeMode" class="sel" title="扩/裁画布=格子不变；缩放内容=图纸放大/拉伸">
        <option value="canvas">扩/裁画布</option>
        <option value="scale">缩放内容</option>
      </select>
      <select v-if="resizeMode === 'canvas'" v-model="resizeAnchor" class="sel" title="原内容放进新图纸的位置">
        <option value="topleft">左上对齐</option>
        <option value="center">居中</option>
        <option value="bottomright">右下对齐</option>
      </select>
      <button class="btn" title="改变图纸尺寸（可撤销）" @click="doResize">调整</button>
    </div>

    <div class="group">
      <button class="btn" title="左右镜像" @click="doTransform('flipH')">镜像↔</button>
      <button class="btn" title="上下镜像" @click="doTransform('flipV')">镜像↕</button>
      <button class="btn" title="顺时针旋转 90°" @click="doTransform('rotateCW')">旋转↻</button>
      <button class="btn" title="逆时针旋转 90°" @click="doTransform('rotateCCW')">旋转↺</button>
    </div>

    <div class="group">
      <span class="lbl">图片转图纸</span>
      <span class="lbl">宽</span>
      <input v-model.number="importWidth" class="num" type="number" min="1" max="500" />
      <select v-model="importFit" class="sel">
        <option value="contain">等比留边</option>
        <option value="stretch">拉伸铺满</option>
      </select>
      <label class="chk" title="Floyd-Steinberg 抖动，细节更丰富" ><input v-model="importDither" type="checkbox" /> 抖动</label>
      <button class="btn" @click="imageInput?.click()">导入图片…</button>
      <input ref="imageInput" type="file" accept="image/*" hidden @change="onImagePicked" />
    </div>

    <div class="group">
      <button class="btn" @click="exportConstructionPng(editor.pattern, palette)">导出施工图</button>
      <span class="lbl">底板</span>
      <select v-model.number="boardSize" class="sel">
        <option :value="29">29×29</option>
        <option :value="52">52×52</option>
      </select>
      <button class="btn" title="按底板拆成多张施工图 PNG，标注全局位置" @click="exportBoardSheets(editor.pattern, palette, boardSize)">分板导出</button>
      <button class="btn" title="多底板时导出板位示意图" @click="exportBoardOverview(editor.pattern, palette, boardSize)">拼板总览</button>
      <button class="btn" @click="exportJson(editor.pattern)">保存 JSON</button>
      <button class="btn" @click="jsonInput?.click()">打开 JSON</button>
      <input ref="jsonInput" type="file" accept=".json,application/json" hidden @change="onJsonPicked" />
      <button class="btn" @click="doSaveWork">存作品</button>
      <button class="btn" @click="showWorks = true">作品库</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}
.group {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-right: 12px;
  border-right: 1px solid #eef0f3;
}
.group:last-child {
  border-right: none;
}
.btn {
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.btn:hover:not(:disabled) {
  background: #f3f4f6;
}
.btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.num {
  width: 52px;
  padding: 4px 5px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.sel {
  padding: 4px 5px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.chk {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.lbl {
  color: #6b7280;
  font-size: 12px;
}
</style>
