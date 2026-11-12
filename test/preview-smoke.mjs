/** web 预览冒烟：请求页面与 JS 资源，校验构建产物可访问且含编辑器逻辑
 *  用法：node test/preview-smoke.mjs [url]（默认 http://localhost:4173/） */
const url = process.argv[2] || 'http://localhost:4173/';

let ok = false;
for (let i = 0; i < 15; i++) {
  try {
    const r = await fetch(url);
    const t = await r.text();
    if (r.ok && t.includes('拼豆图纸编辑器')) {
      if (t.includes('/src/main.ts')) {
        // dev 服务器模式：入口模块可访问即通过
        const entry = await fetch(url + 'src/main.ts');
        if (!entry.ok) {
          console.log('PREVIEW SMOKE FAIL: dev 入口不可访问');
          process.exit(1);
        }
        console.log('PREVIEW SMOKE PASS (dev)');
        console.log(`  index HTTP ${r.status} | /src/main.ts HTTP ${entry.status}`);
        ok = true;
        break;
      }
      if (t.includes('/assets/')) {
        const m = t.match(/assets\/[^"]+\.js/);
        const js = await fetch(url + m[0]);
        const body = await js.text();
        if (!js.ok || !body.includes('perler-pattern')) {
          console.log('PREVIEW SMOKE FAIL: JS 资源异常');
          process.exit(1);
        }
        console.log('PREVIEW SMOKE PASS');
        console.log(`  index HTTP ${r.status} | JS ${m[0]} ${body.length} bytes | 含编辑器逻辑: true`);
        ok = true;
        break;
      }
    }
    console.log(`retry ${i}: HTTP ${r.status}`);
  } catch (e) {
    console.log(`retry ${i}: ${e.message}`);
  }
  await new Promise((s) => setTimeout(s, 1000));
}
process.exit(ok ? 0 : 1);
