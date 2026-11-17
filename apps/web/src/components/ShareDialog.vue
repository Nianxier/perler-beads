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
.ta {
  font-family: ui-monospace, Consolas, monospace;
  word-break: break-all;
  min-height: 96px;
}
</style>
