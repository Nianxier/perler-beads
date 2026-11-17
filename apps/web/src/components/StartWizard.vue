<script setup lang="ts">
import { ref } from 'vue';
import { createDocument, loadDocument, showStartWizard, viewApi } from '../core/session';
import { imageFileToPattern } from '../core/fileIO';
import { textToPattern } from '../core/textToPattern';

const mode = ref<'menu' | 'text' | 'blank'>('menu');

const text = ref('拼豆');
const textWidth = ref(64);
const textBold = ref(true);

const blankW = ref(32);
const blankH = ref(32);

const imageSize = ref<'auto' | 'custom'>('auto');
const imageWidth = ref(64);
const imageFit = ref<'contain' | 'stretch'>('contain');
const imageDither = ref(false);
const imageMaxColors = ref(64);
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
      sizeMode: imageSize.value,
      width: imageWidth.value,
      fit: imageFit.value,
      dither: imageDither.value,
      maxColors: imageMaxColors.value || undefined,
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
  // 新建空白 = 底部标签栏新增一个文档（Excel 式多文档）
  createDocument(Math.max(1, Math.round(blankW.value)), Math.max(1, Math.round(blankH.value)));
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
          <select v-model="imageSize" class="sel" title="按图片自适应：画布=图片像素尺寸">
            <option value="auto">按图片自适应</option>
            <option value="custom">指定格数</option>
          </select>
          <template v-if="imageSize === 'custom'">
            <span class="lbl">转图宽度</span>
            <input v-model.number="imageWidth" class="num" type="number" min="1" max="500" />
            <span class="lbl">格</span>
            <select v-model="imageFit" class="sel">
              <option value="contain">等比留边</option>
              <option value="stretch">拉伸铺满</option>
            </select>
          </template>
          <label class="chk"><input v-model="imageDither" type="checkbox" /> 抖动</label>
          <select v-model.number="imageMaxColors" class="sel" title="精细度：越粗颜色越少">
            <option :value="0">不限</option>
            <option :value="64">细 64</option>
            <option :value="32">中 32</option>
            <option :value="16">粗 16</option>
          </select>
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
.tiles {
  display: flex;
  gap: 10px;
}
.tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-ctl);
  background: var(--panel);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s;
}
.tile:hover {
  border-color: var(--accent);
}
.tile-title {
  font-weight: 600;
  font-size: 13px;
}
.tile-desc {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.imgopts {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.form {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
