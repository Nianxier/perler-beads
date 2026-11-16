const core = require('../../utils/@perler-core/index.js');
const store = require('../../utils/patternStore.js');

function formatDate(ts) {
  const d = new Date(ts);
  const p = (n) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

Page({
  data: {
    works: [],
    shareCode: '',
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    this.setData({
      works: store.listWorks().map((w) => ({
        id: w.id,
        name: w.name,
        width: w.width,
        height: w.height,
        date: formatDate(w.updatedAt),
      })),
    });
  },

  /** 从微信聊天文件选 .json 图纸导入 */
  importJson() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const file = res.tempFiles[0];
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: (r) => {
            try {
              const pattern = core.parsePattern(r.data);
              const id = store.saveWork(pattern);
              wx.navigateTo({ url: '/pages/viewer/viewer?id=' + id });
            } catch (e) {
              wx.showToast({ title: (e && e.message) || '图纸解析失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '读取文件失败', icon: 'none' });
          },
        });
      },
    });
  },

  /** 分享码导入（PB1- 开头，粘贴自电脑端「分享码」） */
  onShareInput(e) {
    this.setData({ shareCode: e.detail.value });
  },

  importShareCode() {
    try {
      const pattern = core.decodeShareCode(this.data.shareCode);
      const id = store.saveWork(pattern);
      this.setData({ shareCode: '' });
      wx.navigateTo({ url: '/pages/viewer/viewer?id=' + id });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '分享码无效', icon: 'none' });
    }
  },

  openWork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/viewer/viewer?id=' + id });
  },

  removeWork(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除图纸',
      content: '删除后无法恢复，确定？',
      success: (r) => {
        if (r.confirm) {
          store.removeWork(id);
          this.refresh();
        }
      },
    });
  },
});
