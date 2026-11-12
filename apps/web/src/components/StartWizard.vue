<script setup lang="ts">
import { ref } from 'vue';
import { loadDocument, newDocument, showStartWizard, viewApi } from '../core/session';
import { imageFileToPattern } from '../core/fileIO';
import { textToPattern } from '../core/textToPattern';

const mode = ref<'menu' | 'text' | 'blank'>('menu');

const text = ref('拼豆');
const textWidth = ref(64);
const textBold = ref(true);

const blankW = ref(32);
const blankH = ref(32);

const imageWidth = ref(64);
const imageFit = ref<'contain' | 'stretch'>('contain');
const imageDither = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function close(): void {
  showStartWizard.value = false;
}

function chooseImage(): void {
  fileInput.value?.click();
}

async function onImagePicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const pat = await imageFileToPattern(file, {
      width: imageWidth.value,
      fit: imageFit.value,
      dither: imageDither.value,
    });
    loadDocument(pat);
    viewApi.value?.fit();
    close();
  } catch (err) {
    window.alert((err as Error).message || '图片解析失败');
  }
}

function generateText(): void {
  try {
    const pat = textToPattern(text.value, {
      width: textWidth.value,
      bold: textBold.value,
    });
    loadDocument(pat);
    viewApi.value?.fit();
    close();
  } catch (err) {
    window.alert((err as Error).message || '文字转换失败');
  }
}

function createBlank(): void {
  newDocument(Math.max(1, Math.round(blankW.value)), Math.max(1, Math.round(blankH.value)));
  viewApi.value?.fit();
  close();
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="card">
      <div class="head">
        <span class="title">开始创作</span>
        <button class="close" title="关闭" @click="close">×</button>
      </div>

      <template v-if="mode === 'menu'">
        <p class="sub">选择一种方式，开始你的拼豆图纸</p>
        <div class="tiles">
          <button class="tile" @click="chooseImage">
            <span class="tile-title">图片转图纸</span>
            <span class="tile-desc">照片、插画自动配色成豆图</span>
          </button>
          <button class="tile" @click="mode = 'text'">
            <span class="tile-title">文字转图纸</span>
            <span class="tile-desc">把文字变成像素风豆字</span>
          </button>
          <button class="tile" @click="mode = 'blank'">
            <span class="tile-title">创建空白图纸</span>
            <span class="tile-desc">从零开始自己画</span>
          </button>
        </div>
        <div class="imgopts">
          <span class="lbl">转图宽度</span>
          <input v-model.number="imageWidth" class="num" type="number" min="1" max="500" />
          <span class="lbl">格</span>
          <select v-model="imageFit" class="sel">
            <option value="contain">等比留边</option>
            <option value="stretch">拉伸铺满</option>
          </select>
          <label class="chk"><input v-model="imageDither" type="checkbox" /> 抖动</label>
        </div>
      </template>

      <template v-else-if="mode === 'text'">
        <p class="sub">输入文字，生成像素豆字</p>
        <textarea v-model="text" class="ta" rows="3" placeholder="支持多行文字"></textarea>
        <div class="form">
          <span class="lbl">图纸宽度</span>
          <input v-model.number="textWidth" class="num" type="number" min="8" max="500" />
          <span class="lbl">格</span>
          <label class="chk"><input v-model="textBold" type="checkbox" /> 加粗</label>
        </div>
        <div class="actions">
          <button class="btn" @click="mode = 'menu'">返回</button>
          <button class="btn primary" @click="generateText">生成图纸</button>
        </div>
      </template>

      <template v-else>
        <p class="sub">设定尺寸，创建空白图纸</p>
        <div class="form">
          <input v-model.number="blankW" class="num" type="number" min="1" max="500" />
          <span class="lbl">×</span>
          <input v-model.number="blankH" class="num" type="number" min="1" max="500" />
          <span class="lbl">格</span>
        </div>
        <div class="actions">
          <button class="btn" @click="mode = 'menu'">返回</button>
          <button class="btn primary" @click="createBlank">创建</button>
        </div>
      </template>

      <input ref="fileInput" type="file" accept="image/*" hidden @change="onImagePicked" />
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
  width: 460px;
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
  font-size: 13px;
}
.tiles {
  display: flex;
  gap: 10px;
}
.tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}
.tile:hover {
  border-color: #2563eb;
  background: #f8fafc;
}
.tile-title {
  font-weight: 600;
  font-size: 14px;
}
.tile-desc {
  color: #6b7280;
  font-size: 12px;
}
.imgopts {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}
.form {
  display: flex;
  align-items: center;
  gap: 6px;
}
.num {
  width: 62px;
  padding: 5px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.sel {
  padding: 5px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
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
.lbl {
  color: #6b7280;
  font-size: 12px;
}
.chk {
  font-size: 13px;
  margin-left: 8px;
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
