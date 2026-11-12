/** 小程序 Canvas2D 图纸渲染：色块、网格、色号、跟拼高亮（其余色变灰） */

function contrastText(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1F2329' : '#FFFFFF';
}

/**
 * @param ctx   Canvas2D 上下文（画布物理尺寸 = cssW*dpr × cssH*dpr）
 * @param opts  { showGrid, showCodes, highlightIndex|null }
 */
function draw(ctx, pattern, palette, view, opts, cssW, cssH, dpr) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#EEF0F3';
  ctx.fillRect(0, 0, cssW, cssH);

  const cell = view.cell;
  const ox = view.ox;
  const oy = view.oy;
  const x0 = Math.max(0, Math.floor(-ox / cell));
  const y0 = Math.max(0, Math.floor(-oy / cell));
  const x1 = Math.min(pattern.width, Math.ceil((cssW - ox) / cell));
  const y1 = Math.min(pattern.height, Math.ceil((cssH - oy) / cell));
  const hi = opts.highlightIndex;

  for (let y = y0; y < y1; y++) {
    const rowBase = y * pattern.width;
    for (let x = x0; x < x1; x++) {
      const v = pattern.grid[rowBase + x];
      let fill = '#FFFFFF';
      if (v !== -1) {
        const dimmed = hi != null && hi !== v;
        fill = dimmed ? '#E5E7EB' : (palette.colors[v] ? palette.colors[v].hex : '#FF00FF');
      }
      ctx.fillStyle = fill;
      ctx.fillRect(ox + x * cell, oy + y * cell, cell + 0.5, cell + 0.5);
    }
  }

  if (opts.showGrid && cell >= 3) {
    ctx.lineWidth = 1;
    for (let x = x0; x <= x1; x++) {
      ctx.strokeStyle = x % 10 === 0 ? '#98A2B0' : '#D9DEE5';
      ctx.beginPath();
      const px = Math.round(ox + x * cell) + 0.5;
      ctx.moveTo(px, oy + y0 * cell);
      ctx.lineTo(px, oy + y1 * cell);
      ctx.stroke();
    }
    for (let y = y0; y <= y1; y++) {
      ctx.strokeStyle = y % 10 === 0 ? '#98A2B0' : '#D9DEE5';
      ctx.beginPath();
      const py = Math.round(oy + y * cell) + 0.5;
      ctx.moveTo(ox + x0 * cell, py);
      ctx.lineTo(ox + x1 * cell, py);
      ctx.stroke();
    }
  }

  if (opts.showCodes && cell >= 14) {
    const fontPx = Math.min(12, Math.floor(cell * 0.42));
    ctx.font = '500 ' + fontPx + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = y0; y < y1; y++) {
      const rowBase = y * pattern.width;
      for (let x = x0; x < x1; x++) {
        const v = pattern.grid[rowBase + x];
        if (v === -1 || !palette.colors[v]) continue;
        if (hi != null && hi !== v) continue;
        const hex = palette.colors[v].hex;
        ctx.fillStyle = contrastText(hex);
        ctx.fillText(palette.colors[v].code, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell);
      }
    }
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#98A2B0';
  ctx.strokeRect(ox + 0.5, oy + 0.5, pattern.width * cell, pattern.height * cell);
  ctx.restore();
}

module.exports = { draw, contrastText };
