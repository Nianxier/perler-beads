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
.seg {
  display: inline-flex;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}
.seg-item {
  padding: 5px 16px;
  cursor: pointer;
  font-size: 13px;
}
.seg-item.on {
  background: #2563eb;
  color: #ffffff;
}
.ta {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
}
.form {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.num {
  width: 58px;
  padding: 5px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.sel {
  padding: 5px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.chk {
  font-size: 13px;
}
.lbl {
  color: #6b7280;
  font-size: 12px;
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
