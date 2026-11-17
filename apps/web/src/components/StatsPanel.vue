<script setup lang="ts">
import { getPalette } from '@perler/core';
import { totalBeads, usage } from '../core/session';
import { exportCsv } from '../core/fileIO';
import { editor } from '../core/session';

const palette = getPalette('mard');
</script>

<template>
  <div class="stats">
    <div class="head">
      <span class="title">用量统计</span>
      <span class="total">共 {{ totalBeads }} 颗</span>
    </div>
    <div class="list">
      <div v-for="u in usage" :key="u.index" class="row">
        <span class="swatch" :style="{ background: u.hex }"></span>
        <span class="code">{{ u.code }}</span>
        <span class="count">{{ u.count }}</span>
      </div>
      <div v-if="usage.length === 0" class="empty">还没有放豆子</div>
    </div>
    <button class="btn" @click="exportCsv(editor.pattern, palette)">导出用量 CSV</button>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.title {
  font-size: 15px;
  font-weight: 600;
}
.total {
  color: var(--muted);
  font-size: 12px;
}
.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-ctl);
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  font-size: 13px;
}
.row:hover {
  background: #f9fafb;
}
.row .swatch {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(16, 24, 40, 0.14);
  border-radius: var(--radius-sm);
  flex: none;
}
.row .code {
  flex: 1;
}
.row .count {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.empty {
  padding: 16px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-ctl);
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.btn:hover {
  background: #f9fafb;
}
</style>
