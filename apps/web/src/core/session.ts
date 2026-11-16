/** 应用会话层：多文档标签（Excel 式）、活动编辑器、版本号、视图控制。 */
import { computed, ref } from 'vue';
import {
  convertPatternPalette,
  getPalette,
  usageStats,
  type Pattern,
  type UsageEntry,
} from '@perler/core';
import { createEditor, replacePattern, type EditorState } from './editorState';

export interface DocumentTab {
  id: string;
  state: EditorState;
}

/** 文档标签列表（底部标签栏） */
export const tabs = ref<DocumentTab[]>([]);
export const activeTabId = ref('');

/** 当前活动文档的编辑器状态（ESM 实时绑定：切换标签后各组件自动读到新文档） */
export let editor: EditorState = createEditor(32, 32, 'mard-221');

let tabSeq = 0;

/** 变更计数：画布与统计面板据此刷新 */
export const version = ref(0);

export function bump(): void {
  version.value++;
}

/** 新建文档并切过去（底部新增一个标签） */
export function createDocument(width = 32, height = 32, name?: string): void {
  tabSeq += 1;
  const state = createEditor(width, height, 'mard-221');
  state.pattern.name = name ?? `图纸${tabSeq}`;
  const id = `doc${tabSeq}-${Date.now().toString(36)}`;
  tabs.value.push({ id, state });
  activateTab(id);
}

export function activateTab(id: string): void {
  const t = tabs.value.find((x) => x.id === id);
  if (!t) return;
  activeTabId.value = id;
  editor = t.state;
  bump();
  viewApi.value?.fit();
}

/** 关闭标签；始终保留至少一个文档（关最后一个 = 清空为新空白） */
export function closeTab(id: string): void {
  const idx = tabs.value.findIndex((x) => x.id === id);
  if (idx < 0) return;
  if (tabs.value.length === 1) {
    tabSeq += 1;
    tabs.value[0].state = createEditor(32, 32, 'mard-221');
    tabs.value[0].state.pattern.name = `图纸${tabSeq}`;
    editor = tabs.value[0].state;
    bump();
    viewApi.value?.fit();
    return;
  }
  tabs.value.splice(idx, 1);
  if (activeTabId.value === id) {
    const next = tabs.value[Math.min(idx, tabs.value.length - 1)];
    activateTab(next.id);
  } else {
    bump();
  }
}

export const usage = computed<UsageEntry[]>(() => {
  void version.value;
  return usageStats(editor.pattern);
});

export const totalBeads = computed(() => usage.value.reduce((n, u) => n + u.count, 0));

/** 把新图纸载入当前文档（导入图片/打开 JSON 用） */
export function loadDocument(p: Pattern): void {
  replacePattern(editor, p);
  bump();
}

/** 换色卡：当前图纸按相近颜色转换到目标色卡（结构变更，历史清空） */
export function switchPalette(targetPaletteId: string): void {
  const next = convertPatternPalette(editor.pattern, targetPaletteId);
  const colorCount = getPalette(next.paletteId).colors.length;
  if (editor.colorIndex >= colorCount) editor.colorIndex = 0;
  loadDocument(next);
}

/** 视图开关（画布消费） */
export const showGrid = ref(true);
export const showCodes = ref(false);

/** 首开向导显隐（工具栏「开始向导」可再次打开） */
export const showStartWizard = ref(true);

/** 作品库弹窗显隐 */
export const showWorks = ref(false);

/** 批量换色弹窗显隐 */
export const showReplace = ref(false);

/** 分享码弹窗显隐 */
export const showShare = ref(false);

/** 当前选区（null=无）与拖动预览偏移 */
export const selection = ref<{ x: number; y: number; w: number; h: number } | null>(null);
export const selPreview = ref<{ dx: number; dy: number } | null>(null);

/** 插入文字/形状弹窗显隐；待放置的区域（点画布放置） */
export const showInsert = ref(false);
export const pendingStamp = ref<Pattern | null>(null);

/** 3D 预览弹窗显隐 */
export const show3d = ref(false);

/** 轻量提示（右下角，自动消失） */
export const toast = ref('');
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(msg: string, ms = 3000): void {
  toast.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, ms);
}

/** 画布视图控制句柄（EditorCanvas 挂载后注入，工具栏/标签栏调用） */
export interface ViewApi {
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
}
export const viewApi = ref<ViewApi | null>(null);
