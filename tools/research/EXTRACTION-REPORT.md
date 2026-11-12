# 官方色卡数据提取报告（2026-11-12）

只提取「色号 ↔ HEX」事实数据；未复制任何图表版式/图片素材/代码。所有 hex 为 `#RRGGBB` 大写；code 保留官方写法不归一化（MARD 为 A3 风格，Artkal 为 C01/CE01 风格，Hama 为 01/122 数字编号）。

## 交付文件

| 文件 | 条数 | 来源 | 提取方式 |
| --- | --- | --- | --- |
| `mard-sets.json` | 72/96/120/144/221 各套装色号清单 | pixelbead.art 两个 guide 页 + 站点 `assets/palettes-BOMMp0WT.js`（导出对象 `M`） | HTML 页面 + 站点 JS 数据 chunk（ESM 解析） |
| `artkal-c.json` | 197（C01-C157、CE01-17、CT1-9、CG1-7、CP1-7） | artkalfusebeads.com C 系列色卡图（JPG，含印刷 RGB） | OCR 印刷 RGB（RapidOCR 逐色格）157 条；照片色块 Pillow 采样 40 条 |
| `artkal-s.json` | 225（S01-S159、SE01-17、ST1-8、SL1-6、SG1-7、SN1-4、SP1-8、SUV1-4、SD1-12） | artkalfusebeads.com S 系列色卡图（实为 JPEG） | OCR 印刷 RGB 176 条（含 SE11 单区域补读）；照片采样 49 条 |
| `hama-midi.json` | 88（01-122 编号，缺 23/25 等空号） | hamabeads.com 官方 2026 色卡 PDF（Art. 99198）+ hama.dk 同版核对 | PyMuPDF 文本层定位色号 + 矢量标签条定位 + Pillow 照片采样（近似值） |
| `perler.json` | 0（status=unavailable） | perler.com | 未能提取，卡点见文件 `blocked` 字段 |

## 任务一 MARD 套装（mard-sets.json）

- 页面原文只写「72 个套装色号，可在编辑器中单独筛选」等规则性描述，**未逐个列出**；逐条清单来自像素站打包的数据 chunk `palettes-BOMMp0WT.js`（键 `M`，值为 72/96/120/144/221 五个色号数组）。
- 校验：五套数量与键名完全吻合（72/96/120/144/221）；全部色号是色卡页 291 色表的子集（291 表从 HTML 表格提取验证）。
- 附带交付了 221 套清单（同源），便于与项目 mard-221 对照。色号写法为 A3 风格（非 A01）。

## 任务二 Artkal（artkal-c.json / artkal-s.json）

- 官网实际结构：artkalfusebeads.com → Blog「Artkal Color Chart」→ C/S 子页；**没有 PDF**，官方色卡是图片（C=197 角标 JPG；S=225 角标 JPEG；另有 C&M 395 色、S&J 443 色两张平涂新版图）。
- 命名说明（与任务描述有出入，按官网为准）：官网 C 系列=Hard Mini 2.6mm、S 系列=Hard Midi 5mm、R=Soft Midi、A=Soft Mini；任务里「软豆 C / 硬豆 S」的材质描述与官网相反，本交付按系列字母 C/S 分文件。
- C197/S225 色卡图每个实色色块下方**印有官方 RGB 值**，用 RapidOCR 逐色格识别（C 157/157 全中；S 172/175，S16/S45/S116 用整图合并 OCR 兜底），该值视为官方参考值。
- 特殊色（C：CE/CT/CG/CP 共 40；S：ST/SL/SG/SN/SP/SUV/SD 共 49）色卡上蓝条无印刷值，用照片色块 Pillow 中位数采样，全部 `needsReview=true`。
- 采样方法验证：C&M/S&J 平涂图采样与印刷 RGB 平均差 44-51/通道（平涂图是设计渲染，系统性偏艳），照片采样偶有对齐失误；故一律以印刷 RGB 优先、照片采样只用于无印刷值的特殊色。
- 色号写法差异备忘：S225 图写 `SD1…SD12`、`SE01…SE17`；S&J 合并图写 `SD01`、`SE1…SE9`；C&M 合并图写 `CE1…CE17`。交付保留 C197/S225 原版图写法。SE11 标签在整图 OCR 中漏识，单独区域补读（R:173 G:26 B:172）。

## 任务三 Hama（hama-midi.json）

- 来源：https://www.hamabeads.com/ 首页直链 `Colour-Chart-26.pdf`（2026 版，Art.-nr. 99198，2 页同色系不同排版）；hama.dk 的「Mini og Midi farvekort i nummerorden / i farveorden」两份 PDF 同版核对。
- 色号为官方数字编号（01…122，含 07/04 等两位写法），共 **88 色**。PDF 无印刷 RGB，色块是散珠实拍照片，hex 全部为照片采样近似值（两页独立采样交叉验证，绝大多数 ±2 内一致）。
- **两种状态只拿到一种**：官方 4 份色卡（丹麦站编号序/色序/Maxi/Nova）全部是未熨烫散珠实拍，**没有任何官方「已熨烫」对照色卡**；`states.ironed` 置空数组并在 `missingStates` 标注 `['ironed']`。
- Maxi 色卡（colour-palette-maxi.pdf）与 Nova 色卡未提取（任务只要 Midi）。

## 任务四 Perler（perler.json）——未能提取，如实报告

- 用户给的路径「Resources → Color Charts → 高清图档」属于 Perler **旧官网**。现站（Shopify 重构版）sitemap 的全部页面（12 个）、全部文章、全部集合逐一核查，均无 color chart / resources 类目；FAQ 也无下载链接。
- web.archive.org 与 archive.org 本网络不可达（超时）；DuckDuckGo 不可达；cn.bing.com 把查询重写为无关结果——旧官网图档无法取回。
- perler.com 对脚本访问持续 429（web_fetch 与 Python urllib 都被限流），连 `/products.json`（仅官方色名、无 hex）都拉不到；perlerbeads.com 域名已失效，perler.eu 无 DNS。
- GitHub 上 Perler 色卡数据均为社区自制近似值（如 jsspace/bead-colors 自述 approximate HEX），非官方，未采用、未充数。
- 后续：需人工从 Perler 官方纸质/图档色卡录入；快照数 103 可作录入后的数量基准；荧光/珠光/透明色屏幕显示误差大需注明。

## 任务五 交叉核对（只核对数量，未抄任何数据）

| 项目 | beadpatternapp 快照 | 本次提取 | 差异 |
| --- | --- | --- | --- |
| Artkal C | 197 | 197 | 0 ✓（官方色卡角标亦为 197） |
| M221 | 221 | MARD 221 套装=221 | 0 ✓（快照的 M221 若指 Artkal M 系 221 色，则本次未提取该系列，任务未要求） |
| Perler | 103 | 未提取 | 无法核对（受阻，见上） |
| Hama Midi | 92 | 88 | -4（2026 新版官方色卡为 88 色，可能因停产/新增的版本差异，如实列出） |
| Artkal S | —（快照未列） | 225 | 官方角标 225 ✓ |
| MARD 全集 | — | 291（色卡页 HTML 表） | 与站点数据 chunk 291 条一致 |

## 待人工核对清单

1. **照片采样值（近似，建议抽查）**：Artkal C 40 条特殊色（CE/CT/CG/CP）+ Artkal S 49 条特殊色（ST/SL/SG/SN/SP/SUV/SD）+ Hama 全部 88 条。透明/珠光/荧光/亮片/UV/双色珠屏幕显示误差大。
2. **双源不一致（>60/通道，以印刷 RGB 为准，照片采样对齐偶发失误）**：C04、C19、C35、C40、C45、C82、C118、C145；S08、S42、S61、S103、S107、S119、S142、S146、SE06（详见各 JSON 的 `detail[].photoSample/photoDiff`）。
3. **合并 OCR 兜底值（建议抽查）**：S16、S45、S116；SE11 为单区域补读。
4. **Hama 数量差 4 色**与快照 92 的差异原因未查实（快照版本未知）。

## 环境/工具备注（供复现）

- pwsh `Invoke-WebRequest` 在本机 .NET TLS 握手失败，一律用 Python urllib（`tmp/fetch.py`）下载。
- `pip install` 在沙箱下因临时目录权限必失败（即使 TEMP 指向工作区）；改为按 wheel 手动下载解包到 `tmp/pylibs`（`tmp/manual_pip.py`，含 cp3XX/abi3 标签匹配）：pypdf、PyMuPDF 2.1、rapidocr-onnxruntime（含 onnxruntime/opencv 等全部依赖）。
- pwsh 传含双引号的 argv 会被 Windows 原生转义吞掉（JSON 参数报错），复杂参数走文件或固定字符串。
- 中间产物全部在 `tools/research/tmp/`（含 OCR 中间 JSON、下载的原始图/PDF、脚本），可复跑：`artkal_extract.py → artkal_pair.py → percell_ocr.py → artkal_photo_all.py → assemble_artkal.py`；`hama_extract.py`；`flat_sample.py`。
