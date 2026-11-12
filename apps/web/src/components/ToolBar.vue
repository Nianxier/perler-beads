<script setup lang="ts">
import { computed, ref } from 'vue';
import { getPalette } from '@perler/core';
import {
  bump,
  editor,
  loadDocument,
  newDocument,
  showCodes,
  showGrid,
  showStartWizard,
  totalBeads,
  version,
  viewApi,
} from '../core/session';
import {
  canRedo,
  canUndo,
  redo,
  resizeDocument,
  setTool,
  undo,
  type Tool,
} from '../core/editorState';
import {
  exportConstructionPng,
  exportJson,
  imageFileToPattern,
  loadDraft,
  openJsonFile,
  saveDraft,
} from '../core/fileIO';

const palette = getPalette('mard');

const newWidth = ref(32);
const newHeight = ref(32);
const resizeWidth = ref(32);
const resizeHeight = ref(32);
const resizeAnchor = ref<'topleft' | 'center' | 'bottomright'>('center');
const importWidth = ref(64);
const importFit = ref<'contain' | 'stretch'>('contain');
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
  if (totalBeads.value > 0) {
    const ok = window.confirm('新建空白图纸会清空当前画面且不可撤销，确定继续？');
    if (!ok) return;
  }
  newDocument(w, h);
  viewApi.value?.fit();
}

function doResize(): void {
  const w = Math.max(1, Math.round(resizeWidth.value));
  const h = Math.max(1, Math.round(resizeHeight.value));
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
}

async function onImagePicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const pat = await imageFileToPattern(file, {
    width: importWidth.value,
    fit: importFit.value,
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

function doSaveDraft(): void {
  saveDraft(editor.pattern);
}
function doLoadDraft(): void {
  const p = loadDraft();
  if (p) {
    loadDocument(p);
    viewApi.value?.fit();
  }
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
      <button class="btn" title="清空当前画面，创建空白图纸" @click="doNew">新建空白</button>
    </div>

    <div class="group">
      <span class="lbl">调整大小（保留内容）</span>
      <input v-model.number="resizeWidth" class="num" type="number" min="1" max="500" /> ×
      <input v-model.number="resizeHeight" class="num" type="number" min="1" max="500" />
      <select v-model="resizeAnchor" class="sel" title="原内容放进新图纸的位置">
        <option value="topleft">左上对齐</option>
        <option value="center">居中</option>
        <option value="bottomright">右下对齐</option>
      </select>
      <button class="btn" title="改变图纸尺寸并保留已有内容" @click="doResize">调整</button>
    </div>

    <div class="group">
      <span class="lbl">图片转图纸</span>
      <span class="lbl">宽</span>
      <input v-model.number="importWidth" class="num" type="number" min="1" max="500" />
      <select v-model="importFit" class="sel">
        <option value="contain">等比留边</option>
        <option value="stretch">拉伸铺满</option>
      </select>
      <button class="btn" @click="imageInput?.click()">导入图片…</button>
      <input ref="imageInput" type="file" accept="image/*" hidden @change="onImagePicked" />
    </div>

    <div class="group">
      <button class="btn" @click="exportConstructionPng(editor.pattern, palette)">导出施工图</button>
      <button class="btn" @click="exportJson(editor.pattern)">保存 JSON</button>
      <button class="btn" @click="jsonInput?.click()">打开 JSON</button>
      <input ref="jsonInput" type="file" accept=".json,application/json" hidden @change="onJsonPicked" />
      <button class="btn" @click="doSaveDraft">存草稿</button>
      <button class="btn" @click="doLoadDraft">读草稿</button>
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
