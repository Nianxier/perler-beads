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
  showReplace,
  showShare,
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
  exportPdf,
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
const resizeMode = ref<'canvas' | 'scale'>('scale');
const importSize = ref<'auto' | 'custom'>('auto');
const importWidth = ref(64);
const importFit = ref<'contain' | 'stretch'>('contain');
const importDither = ref(false);
const importMaxColors = ref(64);
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
  { id: 'select', label: '选区', key: 'S' },
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
  const centerOff = (n: number) => (n >= 0 ? Math.round(n) : -Math.round(-n));
  let ox = 0;
  let oy = 0;
  if (resizeAnchor.value === 'center') {
    ox = centerOff((w - oldW) / 2);
    oy = centerOff((h - oldH) / 2);
  } else if (resizeAnchor.value === 'bottomright') {
    ox = w - oldW;
    oy = h - oldH;
  }
  // 裁剪前确认
  let willCrop = 0;
  const p0 = editor.pattern;
  for (let y = 0; y < p0.height; y++) {
    for (let x = 0; x < p0.width; x++) {
      if (p0.grid[y * p0.width + x] === -1) continue;
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) willCrop++;
    }
  }
  if (willCrop > 0) {
    const ok = window.confirm(`扩/裁画布会裁掉 ${willCrop} 格豆子，确定继续？（推荐改用「缩放内容」）`);
    if (!ok) return;
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

async function doExportPdf(): Promise<void> {
  try {
    await exportPdf(editor.pattern, palette);
    showToast('PDF 已导出（施工总图 + 每色一页）');
  } catch (err) {
    window.alert((err as Error).message || 'PDF 导出失败');
  }
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
    sizeMode: importSize.value,
    width: importWidth.value,
    fit: importFit.value,
    dither: importDither.value,
    maxColors: importMaxColors.value || undefined,
  });
  loadDocument(pat);
  viewApi.value?.fit();
  if (importSize.value === 'auto' && (pat.width === 200 || pat.height === 200)) {
    showToast('图片较大，已按长边 200 格自适应（可用「调整大小」再改）');
  }
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
      <select v-model="resizeMode" class="sel" title="缩放内容=图纸随尺寸放大缩小；扩/裁画布=仅增减空格、超出会裁">
        <option value="scale">缩放内容（推荐）</option>
        <option value="canvas">扩/裁画布</option>
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
      <select v-model="importSize" class="sel" title="按图片自适应：画布=图片像素尺寸；指定格数：图片缩放进画布">
        <option value="auto">按图片自适应</option>
        <option value="custom">指定格数</option>
      </select>
      <template v-if="importSize === 'custom'">
        <span class="lbl">宽</span>
        <input v-model.number="importWidth" class="num" type="number" min="1" max="500" />
        <select v-model="importFit" class="sel">
          <option value="contain">等比留边</option>
          <option value="stretch">拉伸铺满</option>
        </select>
      </template>
      <label class="chk" title="Floyd-Steinberg 抖动，细节更丰富"><input v-model="importDither" type="checkbox" /> 抖动</label>
      <select v-model.number="importMaxColors" class="sel" title="精细度：越粗颜色越少（合并类似色）">
        <option :value="0">精细度·不限</option>
        <option :value="64">精细·64色</option>
        <option :value="32">中·32色</option>
        <option :value="16">粗·16色</option>
      </select>
      <button class="btn" @click="imageInput?.click()">导入图片…</button>
      <input ref="imageInput" type="file" accept="image/*" hidden @change="onImagePicked" />
    </div>

    <div class="group">
      <button class="btn" @click="exportConstructionPng(editor.pattern, palette)">导出施工图</button>
      <button class="btn" title="多页 PDF：施工总图 + 每色一页分色施工页" @click="doExportPdf">导出 PDF</button>
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
      <button class="btn" title="把图中某色全部换成另一色" @click="showReplace = true">批量换色</button>
      <button class="btn" title="生成/打开图纸分享码" @click="showShare = true">分享码</button>
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
