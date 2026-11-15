<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import EditorCanvas from './components/EditorCanvas.vue';
import InsertDialog from './components/InsertDialog.vue';
import PalettePanel from './components/PalettePanel.vue';
import ReplaceColorDialog from './components/ReplaceColorDialog.vue';
import ShareDialog from './components/ShareDialog.vue';
import StartWizard from './components/StartWizard.vue';
import StatsPanel from './components/StatsPanel.vue';
import ToolBar from './components/ToolBar.vue';
import WorksPanel from './components/WorksPanel.vue';
import {
  activateTab,
  closeTab,
  createDocument,
  editor,
  activeTabId,
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
  color: #1f2329;
  background: #f7f8fa;
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
  padding: 10px 16px 8px;
  background: #ffffff;
}
.header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
.doc {
  color: #6b7280;
  font-size: 12px;
}
.main {
  flex: 1;
  display: flex;
  min-height: 0;
}
.side {
  width: 250px;
  flex: none;
  padding: 10px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  min-height: 0;
  overflow: hidden;
}
.side:last-child {
  border-right: none;
  border-left: 1px solid #e5e7eb;
}
.center {
  flex: 1;
  min-width: 0;
}
.tabbar {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 4px 8px 0;
  background: #e9edf2;
  border-top: 1px solid #d7dce3;
  overflow-x: auto;
  flex: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid #d7dce3;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #f4f6f9;
  cursor: pointer;
  font-size: 12px;
  color: #4b5563;
  white-space: nowrap;
}
.tab.on {
  background: #ffffff;
  color: #1f2329;
  border-color: #c3cad4;
}
.tab .close {
  color: #9ca3af;
  font-size: 13px;
  line-height: 1;
  padding: 0 2px;
}
.tab .close:hover {
  color: #dc2626;
}
.tab.add {
  color: #6b7280;
  border: none;
  background: transparent;
  cursor: pointer;
}
.toast {
  position: fixed;
  right: 20px;
  bottom: 52px;
  z-index: 30;
  background: rgba(31, 35, 41, 0.92);
  color: #ffffff;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 6px;
  pointer-events: none;
}
</style>
