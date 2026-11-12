const core = require('../../utils/@perler-core/index.js');
const store = require('../../utils/patternStore.js');
const follow = require('../../utils/followSteps.js');
const render = require('../../utils/render.js');

Page({
  data: {
    name: '',
    width: 0,
    height: 0,
    total: 0,
    tab: 'grid', // grid | follow | usage
    showGrid: true,
    showCodes: false,
    usage: [],
    steps: [],
    currentIndex: -1,
    doneSteps: 0,
    totalSteps: 0,
    doneCells: 0,
    allCells: 0,
  },

  onLoad(query) {
    const pattern = store.getWork(query.id);
    if (!pattern) {
      wx.showToast({ title: '图纸不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.pattern = pattern;
    this.palette = core.getPalette(pattern.paletteId);
    this.workId = query.id;
    this.session = follow.createSession(this.pattern, this.palette);
    follow.restoreState(this.session, store.loadFollow(this.workId));
    this.view = { cell: 16, ox: 12, oy: 12 };

    const usage = core.usageStats(this.pattern, this.palette);
    this.setData({
      name: pattern.name,
      width: pattern.width,
      height: pattern.height,
      total: usage.reduce((n, u) => n + u.count, 0),
      usage: usage.map((u) => ({ code: u.code, hex: u.hex, count: u.count })),
    });
    this.syncFollow();
    wx.setNavigationBarTitle({ title: pattern.name || '拼豆图纸' });
  },

  onReady() {
    wx.createSelectorQuery()
      .select('#board')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return;
        const canvas = res[0].node;
        const width = res[0].width;
        const height = res[0].height;
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cssW = width;
        this.cssH = height;
        this.dpr = dpr;
        this.fit();
        this.draw();
      });
  },

  draw() {
    if (!this.ctx) return;
    const step = follow.currentStep(this.session);
    render.draw(
      this.ctx,
      this.pattern,
      this.palette,
      this.view,
      {
        showGrid: this.data.showGrid,
        showCodes: this.data.showCodes,
        highlightIndex: this.data.tab === 'follow' && step ? step.index : null,
      },
      this.cssW,
      this.cssH,
      this.dpr,
    );
  },

  fit() {
    const cell = Math.min(this.cssW / this.pattern.width, this.cssH / this.pattern.height) * 0.92;
    this.view.cell = Math.max(2, Math.min(64, cell));
    this.view.ox = (this.cssW - this.pattern.width * this.view.cell) / 2;
    this.view.oy = (this.cssH - this.pattern.height * this.view.cell) / 2;
    this.draw();
  },

  zoom(factor) {
    const cx = this.cssW / 2;
    const cy = this.cssH / 2;
    const cell = Math.max(2, Math.min(64, this.view.cell * factor));
    const k = cell / this.view.cell;
    this.view.ox = cx - (cx - this.view.ox) * k;
    this.view.oy = cy - (cy - this.view.oy) * k;
    this.view.cell = cell;
    this.draw();
  },

  zoomIn() {
    this.zoom(1.25);
  },

  zoomOut() {
    this.zoom(1 / 1.25);
  },

  fitView() {
    this.fit();
  },

  // ---- 触摸：单指平移、双指缩放 ----
  onTouchStart(e) {
    this._touchStart = e.touches.map((p) => ({ x: p.clientX, y: p.clientY }));
    if (e.touches.length === 2) {
      this._pinch = { dist: this._dist(e.touches), cell: this.view.cell };
    }
  },

  _dist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  },

  onTouchMove(e) {
    const t = e.touches;
    if (t.length === 2 && this._pinch) {
      const k = this._dist(t) / this._pinch.dist;
      this.view.cell = Math.max(2, Math.min(64, this._pinch.cell * k));
      this.draw();
      return;
    }
    if (t.length === 1 && this._touchStart && this._touchStart.length === 1) {
      this.view.ox += t[0].clientX - this._touchStart[0].x;
      this.view.oy += t[0].clientY - this._touchStart[0].y;
      this._touchStart = [{ x: t[0].clientX, y: t[0].clientY }];
      this.draw();
    }
  },

  onTouchEnd(e) {
    if (e.touches.length === 0) {
      this._touchStart = null;
      this._pinch = null;
    } else {
      this._touchStart = e.touches.map((p) => ({ x: p.clientX, y: p.clientY }));
      if (e.touches.length < 2) this._pinch = null;
    }
  },

  // ---- 视图开关 / 页签 ----
  toggleGrid(e) {
    this.setData({ showGrid: e.detail.value });
    this.draw();
  },

  toggleCodes(e) {
    this.setData({ showCodes: e.detail.value });
    this.draw();
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
    this.draw();
  },

  // ---- 跟拼 ----
  syncFollow() {
    const step = follow.currentStep(this.session);
    const prog = follow.progress(this.session);
    this.setData({
      steps: this.session.steps.map((s, i) => ({
        index: i,
        code: s.code,
        hex: s.hex,
        total: s.total,
        done: s.done,
      })),
      currentIndex: this.session.current,
      doneSteps: prog.doneSteps,
      totalSteps: prog.totalSteps,
      doneCells: prog.doneCells,
      allCells: prog.allCells,
    });
    return step;
  },

  selectStep(e) {
    follow.selectStep(this.session, e.currentTarget.dataset.index);
    store.saveFollow(this.workId, follow.exportState(this.session));
    this.syncFollow();
    this.draw();
  },

  completeCurrent() {
    follow.completeCurrent(this.session);
    store.saveFollow(this.workId, follow.exportState(this.session));
    this.syncFollow();
    this.draw();
  },

  resetFollow() {
    this.session = follow.createSession(this.pattern, this.palette);
    store.clearFollow(this.workId);
    this.syncFollow();
    this.draw();
  },
});
