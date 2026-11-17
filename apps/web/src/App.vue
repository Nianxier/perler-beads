<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import EditorCanvas from './components/EditorCanvas.vue';
import InsertDialog from './components/InsertDialog.vue';
import PalettePanel from './components/PalettePanel.vue';
import ReplaceColorDialog from './components/ReplaceColorDialog.vue';
import ShareDialog from './components/ShareDialog.vue';
import StartWizard from './components/StartWizard.vue';
import StatsPanel from './components/StatsPanel.vue';
import ThreePreview from './components/ThreePreview.vue';
import ToolBar from './components/ToolBar.vue';
import WorksPanel from './components/WorksPanel.vue';
import {
  activateTab,
  closeTab,
  createDocument,
  editor,
  activeTabId,
  show3d,
  showInsert,
  showReplace,
  showShare,
  showStartWizard,
  showWorks,
  tabs,
  toast,
  version,
  type DocumentTab,
} from './core/session';
import { restoreSession, startAutoSave } from './core/autoSave';

// 启动：恢复上次会话，否则开一个空白文档（底部至少一个标签）
if (!restoreSession() && tabs.value.length === 0) createDocument(32, 32);

const docInfo = computed(() => {
  void version.value;
  return `${editor.pattern.name} · ${editor.pattern.width}×${editor.pattern.height}`;
});

function tabLabel(t: DocumentTab): string {
  void version.value;
  return t.state.pattern.name;
}

let stopAutoSave: (() => void) | null = null;
onMounted(() => {
  stopAutoSave = startAutoSave();
});
onBeforeUnmount(() => {
  stopAutoSave?.();
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>拼豆图纸编辑器</h1>
      <span class="doc">{{ docInfo }}</span>
    </header>
    <ToolBar />
    <main class="main">
      <aside class="side"><PalettePanel /></aside>
      <section class="center"><EditorCanvas /></section>
      <aside class="side"><StatsPanel /></aside>
    </main>
    <StartWizard v-if="showStartWizard" />
    <WorksPanel v-if="showWorks" />
    <ReplaceColorDialog v-if="showReplace" />
    <ShareDialog v-if="showShare" />
    <InsertDialog v-if="showInsert" />
    <ThreePreview v-if="show3d" />
    <div v-if="toast" class="toast">{{ toast }}</div>
    <div class="tabbar">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ on: t.id === activeTabId }"
        @click="activateTab(t.id)"
      >
        <span class="name">{{ tabLabel(t) }}</span>
        <span class="close" title="关闭" @click.stop="closeTab(t.id)">×</span>
      </button>
      <button class="tab add" title="新建图纸" @click="createDocument()">＋ 新建</button>
    </div>
  </div>
</template>

<style>
:root {
  --bg: #f5f6f8;
  --panel: #ffffff;
  --line: #e4e7ec;
  --line-strong: #d0d5dd;
  --text: #1d2939;
  --muted: #667085;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --danger: #d92d20;
  --radius-card: 12px;
  --radius-ctl: 6px;
  --radius-sm: 4px;
  --shadow-dialog: 0 16px 48px rgba(16, 24, 40, 0.18);
}
* {
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
  margin: 0;
}
body {
  font-family: system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

/* ---- 弹窗与通用控件（各弹窗共用，勿在组件内重复定义） ---- */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.card {
  width: 480px;
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: var(--radius-card);
  padding: 20px 24px;
  box-shadow: var(--shadow-dialog);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 15px;
  font-weight: 600;
}
.close {
  border: none;
  background: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--muted);
  line-height: 1;
  padding: 4px;
}
.close:hover {
  color: var(--text);
}
.sub {
  margin: 6px 0 16px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-ctl);
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.btn:hover:not(:disabled) {
  background: #f9fafb;
}
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}
.btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}
.btn.danger:hover {
  background: #fef3f2;
  border-color: var(--danger);
  color: var(--danger);
}
.num,
.sel {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-ctl);
  background: var(--panel);
  color: var(--text);
  font-size: 13px;
}
.num {
  width: 56px;
}
.ta {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-ctl);
  font-size: 13px;
  resize: vertical;
}
.lbl {
  color: var(--muted);
  font-size: 12px;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.seg {
  display: inline-flex;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-ctl);
  overflow: hidden;
  margin-bottom: 12px;
}
.seg-item {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--muted);
  background: var(--panel);
}
.seg-item:hover {
  color: var(--text);
}
.seg-item.on {
  background: var(--accent);
  color: #ffffff;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 20px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
.doc {
  color: var(--muted);
  font-size: 12px;
}
.main {
  flex: 1;
  display: flex;
  min-height: 0;
}
.side {
  width: 248px;
  flex: none;
  padding: 14px 16px;
  background: var(--panel);
  border-right: 1px solid var(--line);
  min-height: 0;
  overflow: hidden;
}
.side:last-child {
  border-right: none;
  border-left: 1px solid var(--line);
}
.center {
  flex: 1;
  min-width: 0;
}
.tabbar {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 4px 12px 0;
  background: var(--bg);
  border-top: 1px solid var(--line);
  overflow-x: auto;
  flex: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: var(--radius-ctl) var(--radius-ctl) 0 0;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}
.tab:hover {
  color: var(--text);
}
.tab.on {
  background: var(--panel);
  color: var(--text);
  font-weight: 500;
  border-bottom-color: var(--accent);
}
.tab .close {
  color: var(--line-strong);
  font-size: 13px;
  line-height: 1;
  padding: 0 2px;
}
.tab .close:hover {
  color: var(--danger);
}
.tab.add {
  color: var(--muted);
  border: none;
  background: transparent;
  cursor: pointer;
}
.toast {
  position: fixed;
  right: 20px;
  bottom: 56px;
  z-index: 30;
  background: rgba(29, 41, 57, 0.92);
  color: #ffffff;
  font-size: 13px;
  padding: 9px 16px;
  border-radius: var(--radius-ctl);
  pointer-events: none;
}
</style>
