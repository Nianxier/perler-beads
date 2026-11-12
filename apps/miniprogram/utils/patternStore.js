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

/** 跟拼进度（每张图纸一份） */
function followKey(id) {
  return 'perler.follow.' + id;
}

function saveFollow(id, state) {
  wx.setStorageSync(followKey(id), state);
}

function loadFollow(id) {
  return wx.getStorageSync(followKey(id)) || null;
}

function clearFollow(id) {
  wx.removeStorageSync(followKey(id));
}

module.exports = {
  listWorks,
  saveWork,
  getWork,
  removeWork,
  saveFollow,
  loadFollow,
  clearFollow,
};
