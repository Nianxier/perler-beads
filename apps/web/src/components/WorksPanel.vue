<script setup lang="ts">
import { computed, ref } from 'vue';
import { getWork, listWorks, removeWork, saveWork, type WorkMeta } from '../core/works';
import { editor, loadDocument, showWorks, showToast, version, viewApi } from '../core/session';

const tick = ref(0);
const works = computed<WorkMeta[]>(() => {
  void tick.value;
  return listWorks();
});

function refresh(): void {
  tick.value++;
}

function close(): void {
  showWorks.value = false;
}

function saveCurrent(): void {
  saveWork(editor.pattern);
  refresh();
  showToast('已保存到作品库');
}

function openWork(id: string): void {
  const p = getWork(id);
  if (!p) return;
  loadDocument(p);
  viewApi.value?.fit();
  close();
  showToast(`已打开「${p.name}」`);
}

function remove(id: string): void {
  const ok = window.confirm('删除该作品？无法恢复');
  if (!ok) return;
  removeWork(id);
  refresh();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getMonth() + 1}-${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

void version.value;
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="card">
      <div class="head">
        <span class="title">作品库</span>
        <button class="close" title="关闭" @click="close">×</button>
      </div>
      <p class="sub">保存的作品都在本机浏览器里，不会上传</p>
      <div class="list">
        <div v-for="w in works" :key="w.id" class="row">
          <div class="meta">
            <div class="name">{{ w.name }}</div>
            <div class="info">{{ w.width }}×{{ w.height }} · {{ formatDate(w.updatedAt) }}</div>
          </div>
          <button class="btn" @click="openWork(w.id)">打开</button>
          <button class="btn danger" @click="remove(w.id)">删除</button>
        </div>
        <div v-if="works.length === 0" class="empty">还没有保存过作品</div>
      </div>
      <div class="actions">
        <button class="btn" @click="refresh">刷新</button>
        <button class="btn primary" @click="saveCurrent">保存当前图纸</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-ctl);
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}
.row:last-child {
  border-bottom: none;
}
.row .meta {
  flex: 1;
  min-width: 0;
}
.row .name {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row .info {
  color: var(--muted);
  font-size: 12px;
  margin-top: 2px;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 32px 0;
  font-size: 13px;
}
</style>
