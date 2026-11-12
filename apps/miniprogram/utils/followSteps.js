/** 跟拼会话：按颜色分组出步骤、完成当前色、进度统计（纯逻辑，可单测） */
const core = require('./@perler-core/index.js');

/** 创建跟拼会话：步骤按用豆数降序 */
function createSession(pattern, palette) {
  const steps = core.colorSteps(pattern, palette).map((s) => ({
    index: s.index,
    code: s.code,
    hex: s.hex,
    total: s.cells.length,
    done: false,
  }));
  return { steps, current: steps.length > 0 ? 0 : -1 };
}

function currentStep(session) {
  return session.current >= 0 ? session.steps[session.current] : null;
}

/** 完成当前色并推进到下一个未完成色；全部完成时 current=-1 */
function completeCurrent(session) {
  const cur = currentStep(session);
  if (cur) cur.done = true;
  session.current = session.steps.findIndex((s) => !s.done);
  return session.current;
}

function selectStep(session, i) {
  if (i >= 0 && i < session.steps.length) session.current = i;
  return session.current;
}

function progress(session) {
  const doneSteps = session.steps.filter((s) => s.done);
  const doneCells = doneSteps.reduce((n, s) => n + s.total, 0);
  const allCells = session.steps.reduce((n, s) => n + s.total, 0);
  return {
    doneSteps: doneSteps.length,
    totalSteps: session.steps.length,
    doneCells,
    allCells,
  };
}

/** 导出进度（可存本地） */
function exportState(session) {
  return {
    current: session.current,
    done: session.steps.map((s) => s.done),
  };
}

/** 恢复进度；state 与步骤数不匹配时返回 false 不做改动 */
function restoreState(session, state) {
  if (!state || !Array.isArray(state.done) || state.done.length !== session.steps.length) {
    return false;
  }
  session.steps.forEach((s, i) => {
    s.done = !!state.done[i];
  });
  const cur = state.current;
  session.current =
    typeof cur === 'number' && cur >= 0 && cur < session.steps.length && !session.steps[cur].done
      ? cur
      : session.steps.findIndex((s) => !s.done);
  return true;
}

module.exports = {
  createSession,
  currentStep,
  completeCurrent,
  selectStep,
  progress,
  exportState,
  restoreState,
};
