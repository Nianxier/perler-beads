<script setup lang="ts">
import { ref } from 'vue';
import { makeEllipseRegion, makeRectRegion, makeTextRegion, type Pattern } from '@perler/core';
import { editor, pendingStamp, showInsert, showToast } from '../core/session';

const kind = ref<'text' | 'rect' | 'ellipse'>('text');
const text = ref('HELLO');
const textScale = ref(1);
const shapeW = ref(11);
const shapeH = ref(11);
const filled = ref(true);
const thickness = ref(1);

function close(): void {
  showInsert.value = false;
}

function apply(): void {
  const color = editor.colorIndex;
  const paletteId = editor.pattern.paletteId;
  let region: Pattern;
  try {
    if (kind.value === 'text') {
      if (!text.value.trim()) {
        window.alert('请输入文字');
        return;
      }
      region = makeTextRegion(text.value, { color, paletteId, scale: textScale.value });
    } else if (kind.value === 'rect') {
      region = makeRectRegion(shapeW.value, shapeH.value, {
        color,
        paletteId,
        filled: filled.value,
        thickness: thickness.value,
      });
    } else {
      region = makeEllipseRegion(shapeW.value, shapeH.value, {
        color,
        paletteId,
        filled: filled.value,
        thickness: thickness.value,
      });
    }
  } catch (err) {
    window.alert((err as Error).message || '生成失败');
    return;
  }
  pendingStamp.value = region;
  close();
  showToast(`点击画布放置（左上角对齐点击处，Esc 取消）`);
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="card">
      <div class="head">
        <span class="title">插入文字 / 形状</span>
        <button class="close" title="关闭" @click="close">×</button>
      </div>
      <p class="sub">用当前选中的颜色生成图案，然后点画布放置（可撤销）</p>

      <div class="seg">
        <span class="seg-item" :class="{ on: kind === 'text' }" @click="kind = 'text'">文字</span>
        <span class="seg-item" :class="{ on: kind === 'rect' }" @click="kind = 'rect'">矩形</span>
        <span class="seg-item" :class="{ on: kind === 'ellipse' }" @click="kind = 'ellipse'">圆形</span>
      </div>

      <template v-if="kind === 'text'">
        <textarea v-model="text" class="ta" rows="2" placeholder="支持多行；A-Z 0-9 与常用符号"></textarea>
        <div class="form">
          <span class="lbl">放大</span>
          <select v-model.number="textScale" class="sel">
            <option :value="1">1×（5×7 像素字）</option>
            <option :value="2">2×</option>
            <option :value="3">3×</option>
          </select>
        </div>
      </template>

      <template v-else>
        <div class="form">
          <span class="lbl">宽</span>
          <input v-model.number="shapeW" class="num" type="number" min="1" max="200" />
          <span class="lbl">高</span>
          <input v-model.number="shapeH" class="num" type="number" min="1" max="200" />
          <label class="chk"><input v-model="filled" type="checkbox" /> 实心</label>
          <template v-if="!filled">
            <span class="lbl">边粗</span>
            <input v-model.number="thickness" class="num" type="number" min="1" max="10" />
          </template>
        </div>
      </template>

      <div class="actions">
        <button class="btn" @click="close">取消</button>
        <button class="btn primary" @click="apply">生成并放置</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
</style>
