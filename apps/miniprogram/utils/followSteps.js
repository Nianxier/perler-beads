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

module.exports = { createSession, currentStep, completeCurrent, selectStep, progress };
