"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPalettes = listPalettes;
exports.getPalette = getPalette;
exports.nearestColorIndex = nearestColorIndex;
exports.nearestColorWithDelta = nearestColorWithDelta;
/** 色卡：加载、查询、最近色匹配（OKLab 色差）。 */
const palettes_js_1 = require("./data/palettes.js");
const color_js_1 = require("./color.js");
const oklabCache = new Map();
/** 旧色卡 id 兼容（早期图纸文件的 paletteId='mard'） */
const ALIASES = { mard: 'mard-221' };
function listPalettes() {
    return [...palettes_js_1.PALETTES];
}
function getPalette(id) {
    const resolved = ALIASES[id] ?? id;
    const p = palettes_js_1.PALETTES.find((x) => x.id === resolved);
    if (!p) {
        throw new Error(`未找到色卡: ${id}（可用: ${palettes_js_1.PALETTES.map((x) => x.id).join(', ')}）`);
    }
    return p;
}
function paletteOklab(p) {
    let t = oklabCache.get(p.id);
    if (!t) {
        t = p.colors.map((c) => {
            const [r, g, b] = (0, color_js_1.hexToRgb)(c.hex);
            return (0, color_js_1.rgbToOklab)(r, g, b);
        });
        oklabCache.set(p.id, t);
    }
    return t;
}
/** 返回色卡中与给定 RGB 最接近的颜色下标（OKLab 色差最小） */
function nearestColorIndex(palette, r, g, b) {
    const target = (0, color_js_1.rgbToOklab)(r, g, b);
    const table = paletteOklab(palette);
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < table.length; i++) {
        const d = (0, color_js_1.deltaEOK)(target, table[i]);
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return best;
}
/** 最近色匹配并返回色差值（用于提示配色质量） */
function nearestColorWithDelta(palette, r, g, b) {
    const target = (0, color_js_1.rgbToOklab)(r, g, b);
    const table = paletteOklab(palette);
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < table.length; i++) {
        const d = (0, color_js_1.deltaEOK)(target, table[i]);
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return { index: best, delta: bestD };
}
