/** 图纸作品本地存储（wx.setStorage，单机无后端） */
const KEY = 'perler.works.v1';

function listWorks() {
  return wx.getStorageSync(KEY) || [];
}

function saveWork(pattern) {
  const works = listWorks();
  const id = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  works.unshift({
    id,
    name: pattern.name,
    width: pattern.width,
    height: pattern.height,
    updatedAt: Date.now(),
    pattern,
  });
  wx.setStorageSync(KEY, works);
  return id;
}

function getWork(id) {
  const w = listWorks().find((x) => x.id === id);
  return w ? w.pattern : null;
}

function removeWork(id) {
  wx.setStorageSync(
    KEY,
    listWorks().filter((x) => x.id !== id),
  );
}

module.exports = { listWorks, saveWork, getWork, removeWork };
