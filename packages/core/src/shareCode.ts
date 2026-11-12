/** 分享码：图纸 ↔ 可复制短文本码（RLE + base64url），无后端互传。
 *  码格式：`PB1-` + base64url(UTF-8 JSON)；JSON 的 grid 用 [值,个数] 游程压缩。 */
import { EMPTY, type Pattern } from './types.js';
import { getPalette } from './palette.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function b64encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64[((b1 & 15) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64[b2 & 63];
  }
  return out;
}

function b64decode(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '');
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('分享码含非法字符');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

interface SharePayload {
  v: 1;
  n: string;
  p: string;
  w: number;
  h: number;
  g: Array<[number, number]>;
}

export function encodeShareCode(p: Pattern): string {
  const pairs: Array<[number, number]> = [];
  let last = p.grid.length > 0 ? p.grid[0] : EMPTY;
  let count = 0;
  for (const v of p.grid) {
    if (v === last) {
      count++;
    } else {
      pairs.push([last, count]);
      last = v;
      count = 1;
    }
  }
  if (count > 0) pairs.push([last, count]);
  const payload: SharePayload = {
    v: 1,
    n: p.name,
    p: p.paletteId,
    w: p.width,
    h: p.height,
    g: pairs,
  };
  return 'PB1-' + b64encode(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeShareCode(code: string): Pattern {
  const s = (code ?? '').trim();
  if (!s.startsWith('PB1-')) throw new Error('不是有效的分享码（应以 PB1- 开头）');
  let d: SharePayload;
  try {
    d = JSON.parse(new TextDecoder().decode(b64decode(s.slice(4)))) as SharePayload;
  } catch {
    throw new Error('分享码解析失败');
  }
  if (d.v !== 1 || !Number.isInteger(d.w) || !Number.isInteger(d.h) || d.w < 1 || d.h < 1) {
    throw new Error('分享码数据无效');
  }
  getPalette(String(d.p));
  const grid: number[] = [];
  if (!Array.isArray(d.g)) throw new Error('分享码数据损坏');
  for (const pair of d.g) {
    const [v, c] = pair;
    if (!Number.isInteger(v) || v < EMPTY || !Number.isInteger(c) || c < 1) {
      throw new Error('分享码数据损坏');
    }
    for (let i = 0; i < c; i++) grid.push(v);
  }
  if (grid.length !== d.w * d.h) throw new Error('分享码数据损坏');
  return {
    schema: 'perler-pattern',
    version: 1,
    name: String(d.n ?? '未命名').slice(0, 40) || '未命名',
    paletteId: String(d.p),
    width: d.w,
    height: d.h,
    grid,
  };
}
