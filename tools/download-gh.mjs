/** 下载 GitHub CLI 便携版（经 api.github.com 解析最新版资产名，带重试）。用法：node tools/download-gh.mjs */
import { mkdirSync, writeFileSync } from 'node:fs';

const dir = 'C:/Users/Liia/AppData/Local/Programs/gh-cli';
mkdirSync(dir, { recursive: true });

const api = await fetch('https://api.github.com/repos/cli/cli/releases/latest', {
  signal: AbortSignal.timeout(60000),
});
if (!api.ok) {
  console.error('FAIL 查询版本 HTTP', api.status);
  process.exit(1);
}
const rel = await api.json();
const asset = rel.assets.find(
  (a) => /_windows_amd64\.zip$/.test(a.name) && !/checksums/i.test(a.name),
);
if (!asset) {
  console.error('FAIL 未找到 windows_amd64 资产，可用：', rel.assets.map((a) => a.name).join(', '));
  process.exit(1);
}
console.log('版本', rel.tag_name, '资产', asset.name);

for (let i = 1; i <= 4; i++) {
  try {
    console.log(`第 ${i} 次尝试下载…`);
    const res = await fetch(asset.browser_download_url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000000) throw new Error('文件过小，疑似不完整: ' + buf.length);
    writeFileSync(dir + '/gh.zip', buf);
    console.log('已保存', dir + '/gh.zip', buf.length, 'bytes');
    process.exit(0);
  } catch (e) {
    console.log('失败:', e.message);
    await new Promise((s) => setTimeout(s, 3000));
  }
}
console.error('FAIL: 4 次均失败');
process.exit(1);
