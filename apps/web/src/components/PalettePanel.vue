<script setup lang="ts">
import { computed, ref } from 'vue';
import { getPalette } from '@perler/core';
import { bump, editor, version } from '../core/session';
import { setColor } from '../core/editorState';

const palette = getPalette('mard');
const query = ref('');

const colors = computed(() => {
  const q = query.value.trim().toLowerCase();
  return palette.colors
    .map((c, index) => ({ ...c, index }))
    .filter((c) => !q || c.code.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q));
});

const activeIndex = computed(() => {
  void version.value;
  return editor.colorIndex;
});

const current = computed(() => palette.colors[activeIndex.value]);

function pick(index: number): void {
  setColor(editor, index);
  bump();
}
</script>

<template>
  <div class="palette">
    <div class="current">
      <div class="swatch big" :style="{ background: current.hex }"></div>
      <div class="meta">
        <div class="code">{{ current.code }}</div>
        <div class="hex">{{ current.hex }}</div>
      </div>
    </div>
    <input v-model="query" class="search" type="text" placeholder="搜色号 / HEX" />
    <div class="grid">
      <button
        v-for="c in colors"
        :key="c.index"
        class="swatch"
        :class="{ active: c.index === activeIndex }"
        :style="{ background: c.hex }"
        :title="`${c.code} ${c.hex}`"
        @click="pick(c.index)"
      ></button>
    </div>
    <div class="count">{{ colors.length }} 色</div>
  </div>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}
.current {
  display: flex;
  align-items: center;
  gap: 10px;
}
.swatch {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
}
.swatch.big {
  width: 40px;
  height: 40px;
  cursor: default;
}
.swatch.active {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.meta .code {
  font-weight: 600;
}
.meta .hex {
  color: #6b7280;
  font-size: 12px;
}
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(22px, 1fr));
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}
.count {
  color: #6b7280;
  font-size: 12px;
}
</style>
