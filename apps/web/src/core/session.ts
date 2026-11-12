/** 应用会话层：全局编辑器实例、版本号（驱动重绘/统计刷新）、视图控制。 */
import { computed, ref } from 'vue';
import { usageStats, type Pattern, type UsageEntry } from '@perler/core';
import { createEditor, replacePattern, type EditorState } from './editorState';

export const editor: EditorState = createEditor(32, 32, 'mard');

/** 变更计数：画布与统计面板据此刷新 */
export const version = ref(0);

export function bump(): void {
  version.value++;
}

export const usage = computed<UsageEntry[]>(() => {
  void version.value;
  return usageStats(editor.pattern);
});

export const totalBeads = computed(() => usage.value.reduce((n, u) => n + u.count, 0));

export function newDocument(width: number, height: number): void {
  replacePattern(editor, createPattern(width, height, 'mard'));
  bump();
}

export function loadDocument(p: Pattern): void {
  replacePattern(editor, p);
  bump();
}

/** 视图开关（画布消费） */
export const showGrid = ref(true);
export const showCodes = ref(false);

/** 首开向导显隐（工具栏「开始向导」可再次打开） */
export const showStartWizard = ref(true);

/** 画布视图控制句柄（EditorCanvas 挂载后注入，工具栏调用） */
export interface ViewApi {
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
}
export const viewApi = ref<ViewApi | null>(null);
