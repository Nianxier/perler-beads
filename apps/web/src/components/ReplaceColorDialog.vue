<script setup lang="ts">
import { computed, ref } from 'vue';
import { getPalette } from '@perler/core';
import { bump, editor, showReplace, showToast, usage, version, viewApi } from '../core/session';
import { replaceColorDocument } from '../core/editorState';

const fromIdx = ref<number>(-1);
const toIdx = ref<number>(0);

const palette = computed(() => {
  void version.value;
  return getPalette(editor.pattern.paletteId);
});

const used = computed(() => {
  void version.value;
  return usage.value.map((u) => ({ index: u.index, code: u.code, hex: u.hex, count: u.count }));
});

const fromCount = computed(() => used.value.find((u) => u.index === fromIdx.value)?.count ?? 0);

function close(): void {
  showReplace.value = false;
}

function apply(): void {
  if (fromIdx.value < 0) {
    window.alert('请先选择要替换的原颜色');
    return;
  }
  if (fromIdx.value === toIdx.value) {
    window.alert('原颜色和目标颜色相同');
    return;
  }
  // 先取数量：换色后原色计数会变 0，不能事后再读
  const n = fromCount.value;
  replaceColorDocument(editor, fromIdx.value, toIdx.value);
  bump();
  close();
  showToast(`已把 ${n} 格换色（可 Ctrl+Z 撤销）`);
  viewApi.value?.fit();
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="card">
      <div class="head">
        <span class="title">批量换色</span>
        <button class="close" title="关闭" @click="close">×</button>
      </div>
      <p class="sub">把图中某个颜色的豆子全部换成另一个颜色（可撤销）</p>
      <div class="form">
        <span class="lbl">把</span>
        <select v-model.number="fromIdx" class="sel">
          <option :value="-1" disabled>选择原颜色…</option>
          <option v-for="u in used" :key="u.index" :value="u.index">
            {{ u.code }} {{ u.hex }}（{{ u.count }} 格）
          </option>
        </select>
        <span class="lbl">换成</span>
        <select v-model.number="toIdx" class="sel">
          <option v-for="(c, i) in palette.colors" :key="i" :value="i">
            {{ c.code }} {{ c.hex }}
          </option>
        </select>
      </div>
      <div class="actions">
        <button class="btn" @click="close">取消</button>
        <button class="btn primary" @click="apply">换色</button>
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
  width: 520px;
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
  margin: 6px 0 14px;
  color: #6b7280;
  font-size: 12px;
}
.form {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sel {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.lbl {
  color: #6b7280;
  font-size: 12px;
  flex: none;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.btn {
  padding: 7px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  font-size: 13px;
}
.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}
</style>
