<script setup lang="ts">
import { computed, ref } from 'vue';
import { getPalette, listPalettes, type Palette } from '@perler/core';
import { bump, editor, switchPalette, version } from '../core/session';
import { setColor } from '../core/editorState';

const palettes = listPalettes();
const query = ref('');
const group = ref('all');

/** 分区中文名（MARD 分组；未知分组回退显示字母） */
const GROUP_NAMES: Record<string, string> = {
  A: '黄橙系',
  B: '绿色系',
  C: '蓝青系',
  D: '蓝紫系',
  E: '粉玫系',
  F: '红色系',
  G: '棕肤系',
  H: '黑白灰系',
  M: '大地系',
};

const currentPalette = computed<Palette>(() => {
  void version.value;
  return getPalette(editor.pattern.paletteId);
});

const groups = computed(() => {
  const seen: string[] = [];
  for (const c of currentPalette.value.colors) {
    const g = c.group ?? '';
    if (g && !seen.includes(g)) seen.push(g);
  }
  return seen;
});

const colors = computed(() => {
  const q = query.value.trim().toLowerCase();
  return currentPalette.value.colors
    .map((c, index) => ({ ...c, index }))
    .filter((c) => group.value === 'all' || (c.group ?? '') === group.value)
    .filter((c) => !q || c.code.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q));
});

const activeIndex = computed(() => {
  void version.value;
  return editor.colorIndex;
});

const current = computed(
  () => currentPalette.value.colors[activeIndex.value] ?? currentPalette.value.colors[0],
);

function pick(index: number): void {
  setColor(editor, index);
  bump();
}

function onPaletteChange(e: Event): void {
  const id = (e.target as HTMLSelectElement).value;
  if (id === currentPalette.value.id) return;
  const ok = window.confirm('更换色卡会把当前图纸按相近颜色转换（历史记录清空），继续？');
  if (ok) switchPalette(id);
}
</script>

<template>
  <div class="palette">
    <select class="sel" :value="currentPalette.id" @change="onPaletteChange">
      <option v-for="p in palettes" :key="p.id" :value="p.id">
        {{ p.name }}（{{ p.colors.length }}色）
      </option>
    </select>

    <div class="current">
      <div class="swatch big" :style="{ background: current.hex }"></div>
      <div class="meta">
        <div class="code">{{ current.code }}</div>
        <div class="hex">{{ current.hex }}</div>
      </div>
    </div>

    <input v-model="query" class="search" type="text" placeholder="搜色号 / HEX" />

    <div v-if="groups.length" class="groups">
      <button class="chip" :class="{ on: group === 'all' }" @click="group = 'all'">全部</button>
      <button
        v-for="g in groups"
        :key="g"
        class="chip"
        :class="{ on: group === g }"
        :title="GROUP_NAMES[g] || g"
        @click="group = g"
      >
        {{ g }}
      </button>
    </div>

    <div class="grid">
      <button
        v-for="c in colors"
        :key="c.index"
        class="swatch"
        :class="{ active: c.index === activeIndex }"
        :style="{ background: c.hex }"
        :title="`${c.code} ${c.hex}${c.group ? ' · ' + (GROUP_NAMES[c.group] || c.group) : ''}`"
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
.sel {
  width: 100%;
  padding: 5px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
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
.groups {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip {
  padding: 2px 8px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  font-size: 12px;
}
.chip.on {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
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
