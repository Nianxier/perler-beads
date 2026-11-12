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
  gap: 8px;
  height: 100%;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.title {
  font-weight: 600;
}
.total {
  color: #6b7280;
  font-size: 12px;
}
.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px;
  font-size: 13px;
}
.row .swatch {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  flex: none;
}
.row .code {
  flex: 1;
}
.row .count {
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}
.empty {
  padding: 12px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}
.btn {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.btn:hover {
  background: #f3f4f6;
}
</style>
