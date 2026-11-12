/** 作品库：多作品管理（localStorage，无后端）。node 环境自动退化为内存实现，便于单测。 */
import { parsePattern, serializePattern, type Pattern } from '@perler/core';

export interface WorkMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
}

interface WorkRecord extends WorkMeta {
  pattern: Pattern;
}

const KEY = 'perler.web.works.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** 浏览器用 localStorage；node 单测退化为挂在 globalThis 的内存表（跨 bundle 共享） */
export function webStorage(): KV {
  if (typeof localStorage !== 'undefined') return localStorage;
  const g = globalThis as Record<string, unknown>;
  let mem = g.__perlerMem as Map<string, string> | undefined;
  if (!mem) {
    mem = new Map<string, string>();
    g.__perlerMem = mem;
  }
  return {
    getItem: (k) => mem!.get(k) ?? null,
    setItem: (k, v) => {
      mem!.set(k, v);
    },
    removeItem: (k) => {
      mem!.delete(k);
    },
  };
}

function loadAll(): WorkRecord[] {
  const raw = webStorage().getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as WorkRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(records: WorkRecord[]): void {
  webStorage().setItem(KEY, JSON.stringify(records));
}

export function listWorks(): WorkMeta[] {
  return loadAll().map(({ id, name, width, height, updatedAt }) => ({
    id,
    name,
    width,
    height,
    updatedAt,
  }));
}

/** 保存作品（新作品或同名覆盖式追加），返回 id */
export function saveWork(pattern: Pattern): string {
  const records = loadAll();
  const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  records.unshift({
    id,
    name: pattern.name || '未命名',
    width: pattern.width,
    height: pattern.height,
    updatedAt: Date.now(),
    pattern: parsePattern(serializePattern(pattern)),
  });
  saveAll(records.slice(0, 100));
  return id;
}

export function getWork(id: string): Pattern | null {
  const rec = loadAll().find((x) => x.id === id);
  return rec ? parsePattern(serializePattern(rec.pattern)) : null;
}

export function removeWork(id: string): void {
  saveAll(loadAll().filter((x) => x.id !== id));
}
