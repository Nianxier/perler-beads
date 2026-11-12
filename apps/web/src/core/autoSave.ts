/** 自动暂存：多文档会话定期存本地，刷新/意外关闭后可恢复（防丢）。 */
import { parsePattern, type Pattern } from '@perler/core';
import {
  createDocument,
  loadDocument,
  showStartWizard,
  tabs,
  showToast,
} from './session';
import { webStorage } from './works';

export * from './session';

const KEY = 'perler.web.autosave.v1';

interface SessionDoc {
  name: string;
  pattern: Pattern;
}

export function saveSession(): void {
  if (tabs.value.length === 0) return;
  const docs: SessionDoc[] = tabs.value.map((t) => ({
    name: t.state.pattern.name,
    pattern: t.state.pattern,
  }));
  try {
    webStorage().setItem(KEY, JSON.stringify({ v: 1, savedAt: Date.now(), docs }));
  } catch {
    // 存储满等情况忽略，不打断编辑
  }
}

/** 启动时恢复上次会话；无可恢复数据返回 false */
export function restoreSession(): boolean {
  const raw = webStorage().getItem(KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as { docs?: SessionDoc[] };
    const docs = (data.docs ?? []).filter((d) => d && d.pattern);
    if (docs.length === 0) return false;
    for (const d of docs) {
      const p = parsePattern(JSON.stringify(d.pattern));
      createDocument(p.width, p.height, d.name || p.name);
      loadDocument(p);
    }
    showStartWizard.value = false;
    showToast(`已恢复上次会话（${docs.length} 个文档）`);
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  webStorage().removeItem(KEY);
}

/** 启动自动暂存：定期保存 + 关页前保存；返回停止函数 */
export function startAutoSave(intervalMs = 4000): () => void {
  const timer = setInterval(saveSession, intervalMs);
  const onUnload = () => saveSession();
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', onUnload);
  }
  return () => {
    clearInterval(timer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', onUnload);
    }
  };
}
