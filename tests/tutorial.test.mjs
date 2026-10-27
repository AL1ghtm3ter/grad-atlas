import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_KEY, LESSONS, blankTutorial, validateTutorial, addFlag, lessonComplete, moveLesson } from '../src/tutorial-state.mjs';
import { practiceWorkspace } from '../src/tutorial-data.mjs';
import { createTutorial } from '../src/tutorial.mjs';

function setup(initial = new Map(), copyText = async () => true) {
  const writes = [], storage = { getItem: key => initial.get(key) ?? null, setItem: (key, value) => { writes.push(key); initial.set(key, value); } };
  const controller = createTutorial({ storage, copyText, repaint() {} });
  const action = async name => { const target = { dataset: { tourAction: name }, matches: () => false, closest: selector => selector === 'button, a' ? target : null }; return controller.handleClick({ target, preventDefault() {} }); };
  const lesson = async index => { const target = { dataset: { tourLesson: String(index) }, matches: s => s === '[data-tour-lesson]', closest: s => s === 'button, a' ? target : null }; return controller.handleClick({ target }); };
  return { controller, action, lesson, writes, initial, storage };
}
test('硕士与博士练习数据合法，练习提交和接受不改变其他项目或资助', () => {
  for (const track of ['master', 'phd']) {
    const before = practiceWorkspace(track), after = practiceWorkspace(track, ['materialReady', 'referenceConfirmed', 'offerAccepted']);
    assert.equal(before.programs[0].application.references[0].status, '已同意');
    assert.equal(after.programs[0].application.references[0].status, '已提交');
    assert.equal(after.programs[1].application.references[0].status, '已同意');
    assert.equal(after.programs[0].application.decision.status, '已接受');
    assert.equal(after.programs[0].application.funding.status, '待核对');
    assert.equal(before.materials[0].status, '准备中');
  }
});
test('跳过不计完成，达成目标后可回看且两个方向分别保存', () => {
  const state = blankTutorial(), p = state.tracks.master;
  moveLesson(p, 1, true); assert.deepEqual(p.skipped, ['agent']); assert.deepEqual(p.done, []);
  addFlag(p, 'searched'); assert.equal(lessonComplete(p, 'targets'), false);
  addFlag(p, 'compared'); assert.equal(lessonComplete(p, 'targets'), true); assert.ok(p.done.includes('targets'));
  moveLesson(p, 0); addFlag(p, 'promptCopied'); assert.ok(!p.skipped.includes('agent')); assert.ok(p.done.includes('agent'));
  assert.deepEqual(state.tracks.phd.done, []); assert.equal(validateTutorial(state), state);
});
test('教程拒绝损坏进度、重复标识和不受支持的预览状态', () => {
  let state = blankTutorial(); state.tracks.master.current = 100; assert.throws(() => validateTutorial(state));
  state = blankTutorial(); state.tracks.master.done = ['agent', 'agent']; assert.throws(() => validateTutorial(state));
  state = blankTutorial(); state.tracks.phd.preview = 'javascript:alert(1)'; assert.throws(() => validateTutorial(state));
});
test('教程只写专用进度键，损坏旧进度在主动重置之前保留', async () => {
  const initial = new Map([['gradatlas.theme.v1', 'dark'], ['personal-marker', '真实记录标记']]);
  const a = setup(initial); await a.action('copy'); assert.deepEqual([...new Set(a.writes)], [TUTORIAL_KEY]);
  assert.equal(initial.get('gradatlas.theme.v1'), 'dark'); assert.equal(initial.get('personal-marker'), '真实记录标记');
  const reloaded = createTutorial({ storage: a.storage, repaint() {}, copyText: async () => true }); assert.ok(reloaded.getState().tracks.master.done.includes('agent'));
  const broken = setup(new Map([[TUTORIAL_KEY, '{bad']])); await broken.action('copy'); assert.equal(broken.initial.get(TUTORIAL_KEY), '{bad');
  await broken.action('reset'); assert.doesNotThrow(() => validateTutorial(JSON.parse(broken.initial.get(TUTORIAL_KEY))));
});
test('错误判断和越过前提的操作不会标记本课完成', async () => {
  const a = setup(); await a.lesson(2); await a.action('source-assume'); await a.action('review-source');
  assert.equal(a.controller.getState().tracks.master.done.includes('sources'), false);
  await a.action('observe'); await a.action('source-route'); await a.action('review-source');
  assert.ok(a.controller.getState().tracks.master.done.includes('sources'));
  await a.lesson(3); await a.action('reference-assume'); await a.action('reference-submit'); assert.equal(a.controller.getState().tracks.master.done.includes('references'), false);
});
test('备份练习先拒绝损坏记录，再校验恢复有效的虚构数据', async () => {
  const a = setup(); await a.lesson(6); await a.action('restore'); assert.equal(a.controller.getState().tracks.master.flags.includes('backupRestored'), false);
  await a.action('backup'); await a.action('bad-backup'); await a.action('restore');
  assert.ok(a.controller.getState().tracks.master.done.includes('backup'));
  assert.equal(LESSONS.length, 7);
});
test('复制不可用时支持手动确认，浏览器存储失败仍可练习', async () => {
  const a = setup(new Map(), async () => false); await a.action('copy'); assert.equal(a.controller.getState().tracks.master.done.includes('agent'), false);
  await a.action('manual-copy'); assert.ok(a.controller.getState().tracks.master.done.includes('agent'));
  const b = createTutorial({ storage: { getItem: () => null, setItem() { throw new Error('空间不足'); } }, copyText: async () => true, repaint() {} });
  const target = { dataset: { tourAction: 'copy' }, matches: () => false, closest: () => target }; await b.handleClick({ target });
  assert.ok(b.getState().tracks.master.done.includes('agent'));
});
test('刷新后恢复原练习快照，不把当前版本冒充备份', async () => {
  const a = setup(); await a.lesson(6); await a.action('backup');
  await a.lesson(5); await a.action('agent-update'); await a.action('add-extension');
  const b = setup(a.initial); await b.lesson(6); await b.action('bad-backup'); await b.action('restore');
  const p = b.controller.getState().tracks.master;
  assert.equal(practiceWorkspace('master', p.practiceFlags).revision, 1);
  assert.ok(p.flags.includes('agentUpdated')); assert.ok(p.flags.includes('extensionAdded'));
  const c = setup(b.initial); assert.equal(practiceWorkspace('master', c.controller.getState().tracks.master.practiceFlags).revision, 1);
});
