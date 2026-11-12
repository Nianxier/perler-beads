<script setup lang="ts">
import { computed } from 'vue';
import EditorCanvas from './components/EditorCanvas.vue';
import PalettePanel from './components/PalettePanel.vue';
import StartWizard from './components/StartWizard.vue';
import StatsPanel from './components/StatsPanel.vue';
import ToolBar from './components/ToolBar.vue';
import { editor, newDocument, showStartWizard, version } from './core/session';

// 支持 ?new=blank&w=&h=：新标签页直接创建空白图纸（跳过向导）
const params = new URLSearchParams(window.location.search);
if (params.get('new') === 'blank') {
  const w = Math.max(1, Math.round(Number(params.get('w')) || 32));
  const h = Math.max(1, Math.round(Number(params.get('h')) || 32));
  newDocument(w, h);
  showStartWizard.value = false;
}

const docInfo = computed(() => {
  void version.value;
  return `${editor.pattern.name} · ${editor.pattern.width}×${editor.pattern.height}`;
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
</style>
