# 第三方声明（Third-Party Notices）

## 色卡数据源：liangdabiao/perlerBeadsApplet（src/utils/colorData.ts）

- 来源：https://github.com/liangdabiao/perlerBeadsApplet
- 上游：https://github.com/noir017/perlerBeadsApplet
- 许可证：MIT License
- 用途：`tools/colorData.source.ts` 经 `tools/build-palettes.mjs` 生成 `packages/core/src/data/palettes.ts` 的色号/HEX 映射数据
- 说明：HEX 为屏幕近似值，实物颜色以厂商色卡为准

```
MIT License

Copyright (c) noir017/perlerBeadsApplet contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 色卡数据源（MARD 系列 221/291）

- 上游数据：maxcleme/beadcolors（`gen/v1/mard.csv`，MIT License）
- 整理与溯源：zwhy149/bead-grid-studio（`src/palettes/mard221.js`、`docs/palette-provenance.md`，Apache-2.0）
- 交叉核对：Jett-Wu/Perler_Beads_Generator（`src/palette.ts`，MIT License，221/291 逐色 HEX 全等）
- 用途：`tools/research/mard221.json` / `mard291.json` 经 `tools/build-palettes.mjs` 生成 `packages/core/src/data/palettes.ts` 的 MARD 系列色卡；色号已归一化为零填充（A1→A01）

## 算法与格式参考（未复制代码）

- zwhy149/bead-grid-studio（Apache-2.0）：量化引擎架构、开放图纸 JSON 格式思路
- Jett-Wu/Perler_Beads_Generator：编辑器功能清单参考
- Zippland/perler-beads（AGPL-3.0）：仅参考产品思路，未复制其代码
