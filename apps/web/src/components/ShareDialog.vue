<script setup lang="ts">
import { computed, ref } from 'vue';
import { decodeShareCode, encodeShareCode } from '@perler/core';
import { editor, loadDocument, showShare, showToast, version, viewApi } from '../core/session';

const mode = ref<'gen' | 'open'>('gen');
const openCode = ref('');

const code = computed(() => {
  void version.value;
  return encodeShareCode(editor.pattern);
});

function close(): void {
  showShare.value = false;
}

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(code.value);
    showToast('分享码已复制');
  } catch {
    window.prompt('复制下面的分享码：', code.value);
  }
}

function open(): void {
  try {
    const p = decodeShareCode(openCode.value);
    loadDocument(p);
    viewApi.value?.fit();
    close();
    showToast(`已打开分享图纸「${p.name}」`);
  } catch (err) {
    window.alert((err as Error).message || '分享码无效');
  }
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="card">
      <div class="head">
        <span class="title">分享码</span>
        <button class="close" title="关闭" @click="close">×</button>
      </div>
      <p class="sub">把图纸编码成一段文字发给对方，粘贴即可打开（无需后端）</p>
      <div class="seg">
        <span class="seg-item" :class="{ on: mode === 'gen' }" @click="mode = 'gen'">生成分享码</span>
        <span class="seg-item" :class="{ on: mode === 'open' }" @click="mode = 'open'">用分享码打开</span>
      </div>

      <template v-if="mode === 'gen'">
        <textarea class="ta" rows="5" readonly :value="code"></textarea>
        <div class="actions">
          <button class="btn" @click="close">关闭</button>
          <button class="btn primary" @click="copy">复制分享码</button>
        </div>
      </template>

      <template v-else>
        <textarea v-model="openCode" class="ta" rows="5" placeholder="粘贴 PB1- 开头的分享码"></textarea>
        <div class="actions">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" @click="open">打开</button>
        </div>
      </template>
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
  padding: 5px 14px;
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
  font-size: 12px;
  font-family: ui-monospace, Consolas, monospace;
  resize: vertical;
  word-break: break-all;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
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
