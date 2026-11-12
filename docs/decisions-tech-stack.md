# 技术选型决策：拼豆图纸软件（电脑端网页 + 微信小程序）

日期：2026-11-11
状态：已定稿（按推荐方案 A 推进；如需改选 B/C，当前仅核心引擎可复用，代价可控）

## 约束（来自需求确认问卷）

| 项 | 结论 |
| --- | --- |
| 电脑端形态 | 电脑浏览器网页（暂不做桌面安装包） |
| 小程序 | 微信小程序 |
| 数据 | 纯本地存储 + JSON 工程文件互通，无账号、无云同步、无社区 |
| 地区 | 中国大陆为主 |
| 规模/预算 | 自用/小圈子，尽量 0 持续成本 |
| 维护经历 | 未部署过网站、未管过数据库/服务器 → 必须零运维 |
| 硬约束 | 微信个人主体小程序不支持 web-view（官方文档：https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html ），业务域名需 ICP 备案 |

## 参考项目结论

| 项目 | 取经点 | 许可证 |
| --- | --- | --- |
| zwhy149/bead-grid-studio | 量化引擎抽独立包、开放图纸 JSON 格式、施工图导出、local-first | Apache-2.0 |
| Jett-Wu/Perler_Beads_Generator | 编辑器功能清单（图层/文字/形状/3D 预览/多格式导出） | 未标注 |
| Zippland/perler-beads | 多色系色卡、多底板拼接、自动分组编号 | **AGPL-3.0（不抄代码，只参考思路）** |
| liangdabiao/perlerBeadsApplet | 小程序端落地（Taro+Vue3）、色卡数据、Taro Canvas 踩坑记录 | MIT（可复用，需保留版权声明） |

## 方案对比

- **方案 A（选定）：共享核心引擎 + 双端各自 UI（monorepo）**
  - `packages/core` 纯 TS 引擎（量化配色、色卡、图纸模型、用量统计）；`apps/web` Vite + Vue3 + Canvas 桌面编辑器；`apps/miniprogram` Taro 4 + Vue3 小程序（导入图纸/施工图/跟拼模式/轻编辑）。
- 方案 B：Taro + Vue3 一套代码跑两端（二开 perlerBeadsApplet）。起步快，但电脑端编辑器体验打折（快捷键/右键/大画布性能）。
- 方案 C：Web + 小程序 web-view 壳。个人主体不支持 web-view + 需备案域名，**出局**。

## 决定与理由

**采用方案 A。** 决定性理由：电脑端是创作主场，像素编辑器需要完整的鼠标键盘体验；量化引擎/色卡/图纸格式做成一份共享核心，保证两端图纸严格互通（文件互通 = 同一 JSON 格式），且全程零后端零运维、零持续成本，匹配现有维护经历。

## 架构落点

- monorepo（pnpm workspace）：`packages/core`（纯 TS，无 DOM 依赖，Node/浏览器/小程序通用）、`apps/web`、`apps/miniprogram`。
- 小程序实现选型：**原生微信小程序**（决策原文「Taro 4 + Vue3（或原生小程序）」中的后者）。理由：定位是查看/跟拼轻端，原生 Canvas 2D 足够且规避 Taro Canvas 兼容坑（参考项目踩坑记录）；零构建链，微信开发者工具直接打开 `apps/miniprogram` 即可预览；`@perler/core` 以 tsc 编译为 CommonJS 复用（`utils/@perler-core`）。若日后要多端（抖音/QQ）再迁 Taro。
- 图纸交换格式：`perler-pattern` JSON（schema 版本化），两端读写同一格式。
- 色卡数据：JSON 数据文件，首发 MARD/曼陀罗体系；色卡数据参考 MIT 项目整理值，实物色差以厂商色卡为准。
- 部署：电脑网页 → GitHub Pages（免费）；小程序 → 微信开发者工具上传（个人主体免费）。无服务器/数据库/密钥。
- 本地存储：web 端 IndexedDB 草稿；小程序端 wx.setStorage；互通靠导出/导入 JSON 文件（小程序用 wx.chooseMessageFile 从聊天文件选）。

## 许可证注意

- 自家代码建议 MIT。
- 复用 liangdabiao/perlerBeadsApplet（MIT）的色卡数据需保留版权声明（见 THIRD_PARTY_NOTICES.md）。
- 不复制 Zippland/perler-beads 的代码（AGPL-3.0 传染）。

## 待定问题（会改变范围，不改变主选型）

1. 小程序端是否要「拍照/相册图片转图纸」（量化计算在小程序内跑性能受限，倾向放电脑端）。
2. 电脑端以后是否要 .exe 离线安装包（可后补 Tauri 打包）。
3. 色卡范围：仅 MARD 221，还是扩展多色系（COCO/三丽鸥/萌萌/大嘴鸭）。
