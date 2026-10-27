import test from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, validateWorkspace, templateTasks, readiness, daysUntil } from '../lib/model.mjs';
import { demoWorkspace } from '../examples/demo.mjs';

test('空工作区进入引导，硕士与博士示例均可进入日常计划', () => {
  assert.equal(readiness(blankWorkspace()).some(s => s.done), false);
  for (const track of ['master', 'phd']) { const w = demoWorkspace(track); assert.equal(validateWorkspace(w), w); assert.equal(readiness(w).every(s => s.done), true); }
});
test('硕士与博士使用不同任务模板，并支持同时申请', () => {
  const master = templateTasks('master'), phd = templateTasks('phd');
  assert.ok(master.some(t => /学分/.test(t.title))); assert.ok(phd.some(t => /资助/.test(t.title))); assert.ok(phd.some(t => /导师/.test(t.title)));
  assert.equal(templateTasks('both').length, master.length + phd.length);
});
test('官方截止日需有来源周期和时区，并校验真实日期', () => {
  const w = demoWorkspace(); w.programs[0].deadline.basis = 'official';
  assert.throws(() => validateWorkspace(w), /官方日期/);
  Object.assign(w.programs[0].deadline, { sourceId: 'demo-source', cycle: '2028 秋季', timezone: 'Europe/Berlin' });
  assert.doesNotThrow(() => validateWorkspace(w));
  w.programs[0].deadline.date = '2028-02-30'; assert.throws(() => validateWorkspace(w), /真实/);
  w.programs[0].deadline.date = '2028-02-29'; w.programs[0].deadline.timezone = 'Mars/Olympus'; assert.throws(() => validateWorkspace(w), /时区/);
});
test('拒绝失效引用、重复标识、可执行链接和未声明扩展列', () => {
  let w = demoWorkspace(); w.tasks[0].programId = 'missing'; assert.throws(() => validateWorkspace(w), /不存在/);
  w = demoWorkspace(); w.tasks.push(w.tasks[0]); assert.throws(() => validateWorkspace(w), /重复/);
  w = demoWorkspace(); w.sources[0].url = 'javascript:alert(1)'; assert.throws(() => validateWorkspace(w), /URL/);
  w = demoWorkspace(); w.programs[0].url = 'https://user:secret@example.org/'; assert.throws(() => validateWorkspace(w), /URL/);
  w = demoWorkspace(); w.extensions[0].items[0].unknown = 'value'; assert.throws(() => validateWorkspace(w), /未声明列/);
});
test('个人任务完成不改变来源核验，定时检查需显式配置', () => {
  const w = demoWorkspace(); const before = structuredClone(w.sources); w.tasks.forEach(t => { t.done = true; });
  validateWorkspace(w); assert.deepEqual(w.sources, before);
  w.settings.refreshMinutes = 1; assert.throws(() => validateWorkspace(w), /15/);
  w.settings.refreshMinutes = 15; assert.doesNotThrow(() => validateWorkspace(w));
});
test('倒计时按原时区处理跨日与夏令时', () => {
  const now = new Date('2027-03-28T00:30:00Z');
  assert.equal(daysUntil('2027-03-28', 'Europe/Berlin', now), 0);
  assert.equal(daysUntil('2027-03-28', 'America/Los_Angeles', now), 1);
  assert.equal(daysUntil('2027-03-27', 'Europe/Berlin', now), -1);
  assert.equal(daysUntil('', 'UTC', now), null);
});
