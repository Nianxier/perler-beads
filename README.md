# 拼豆图纸软件（perler-beads）

电脑端网页 + 微信小程序的拼豆图纸工具：图片转图纸、像素编辑、色号/用量统计、施工图导出、小程序跟拼。
纯本地数据、JSON 工程文件互通、零后端零成本。

## 项目结构

```
packages/core/        共享核心引擎 @perler/core（纯 TS，无 DOM 依赖）
  src/color.ts        HEX/OKLab 色彩与色差
  src/palette.ts      色卡加载与最近色匹配
  src/quantize.ts     图片 → 图纸（面积平均 + 最近色）
  src/pattern.ts      图纸模型：编辑/填充/用量/跟拼分色/序列化
  src/data/palettes.ts  色卡数据（5 套色系 × 205 色，生成文件）
apps/web/             电脑端编辑器：Vite + Vue3 + Canvas
apps/miniprogram/     微信小程序（原生）：JSON 图纸导入、施工图查看、跟拼模式、用量统计
tools/                色卡数据构建脚本
docs/                 决策与设计文档
```

## 开发

本机 Node 为 DSH 运行时捆绑版本（`C:\Users\Liia\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin`），
不在 PATH 中，命令前需把它加入 PATH 或使用完整路径。

```powershell
# 安装依赖
node <pnpm.mjs 路径> install
# 编译核心引擎
node <pnpm.mjs 路径> --filter @perler/core build
# 冒烟测试
node packages/core/test/smoke.mjs
# 重新生成色卡数据（改了 tools/colorData.source.ts 后）
node tools/build-palettes.mjs

# 电脑端网页（apps/web）
node <pnpm.mjs 路径> --filter @perler/web test    # 编辑器状态机单测
node <pnpm.mjs 路径> --filter @perler/web build   # 产物在 apps/web/dist（可静态托管）
node <pnpm.mjs 路径> --filter @perler/web dev     # 本地开发服务器

# 微信小程序（apps/miniprogram）
node <pnpm.mjs 路径> --filter @perler/miniprogram build   # 把 @perler/core 编译成 CommonJS（utils/@perler-core）
node <pnpm.mjs 路径> --filter @perler/miniprogram test    # 跟拼逻辑 + 工程结构测试
# 用微信开发者工具打开 apps/miniprogram 目录（appid 用 touristappid 体验版）
```

注意：esbuild/Vite 构建会拉起编译服务子进程，在禁管道子进程的受限沙箱里需不受限执行（EPERM 边界）。

## 图纸交换格式

`perler-pattern` v1 JSON：`{ schema, version, name, paletteId, width, height, grid }`，
`grid` 为行优先的一维数组，值为色卡下标，`-1` 表示空格。两端读写同一格式即完成文件互通。

## 许可证

MIT。第三方数据与参考见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
