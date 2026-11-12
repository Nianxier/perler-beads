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
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(31, 35, 41, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.card {
  width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.close {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}
.sub {
  margin: 6px 0 12px;
  color: #6b7280;
  font-size: 12px;
}
.list {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
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
  color: #6b7280;
  font-size: 12px;
  margin-top: 2px;
}
.empty {
  text-align: center;
  color: #9ca3af;
  padding: 32px 0;
  font-size: 13px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  font-size: 13px;
}
.btn:hover {
  background: #f3f4f6;
}
.btn.danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}
.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}
</style>
