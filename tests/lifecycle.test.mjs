import test from 'node:test';
import assert from 'node:assert/strict';
import { demoWorkspace } from '../examples/demo.mjs';
import { validateWorkspace, PROGRAM_STAGES, STAGES } from '../lib/model.mjs';
import { blankApplication, enrollmentTemplate, actionDates, fundingSummary, contactSummary, referenceSummary } from '../lib/lifecycle.mjs';
import { applicationsView, decisionsView, lifecycleDates } from '../src/lifecycle-view.mjs';

test('新版全周期和旧版项目数据均可读取，无需破坏性迁移', () => {
  const w = demoWorkspace('phd'); assert.doesNotThrow(() => validateWorkspace(w));
  delete w.programs[0].application; assert.doesNotThrow(() => validateWorkspace(w));
  for (const state of ['已接受', '已婉拒', '已撤回', '已入学']) assert.ok(PROGRAM_STAGES.includes(state)); assert.ok(STAGES.includes('入学'));
});
test('申请和推荐信已提交状态必须有实际日期', () => {
  const w = demoWorkspace('phd'); const a = w.programs[0].application;
  a.submittedOn = ''; assert.throws(() => validateWorkspace(w), /实际提交日期/);
  a.submittedOn = '2027-12-01'; a.references[0].submittedOn = ''; assert.throws(() => validateWorkspace(w), /推荐信已提交/);
});
test('联系和面试保留实际日期、时刻与时区要求', () => {
  const w = demoWorkspace('phd'), a = w.programs[0].application;
  a.contacts[0].date = ''; assert.throws(() => validateWorkspace(w), /联系需要实际日期/);
  a.contacts[0].status = '草稿待审'; assert.doesNotThrow(() => validateWorkspace(w));
  const i = w.programs[2].application.interviews[0]; i.timezone = ''; assert.throws(() => validateWorkspace(w), /已安排面试/);
  i.timezone = 'America/New_York'; i.time = '25:00'; assert.throws(() => validateWorkspace(w), /HH:MM/);
});
test('录取与资助分别维护，接受不自动确认资助或入学', () => {
  const w = demoWorkspace('phd'), a = w.programs[1].application;
  a.decision.status = '已接受'; validateWorkspace(w); assert.equal(a.funding.status, '待结果'); assert.ok(a.enrollment.every(e => e.status === '待确认'));
  a.decision.receivedOn = ''; assert.throws(() => validateWorkspace(w), /实际收到结果/);
  a.decision.receivedOn = '2027-05-01'; a.funding.status = '已获资助'; a.funding.note = ''; a.funding.sourceId = ''; assert.throws(() => validateWorkspace(w), /正式书面依据/);
});
test('每项官方里程碑分别保留来源、周期、时区和日期', () => {
  const w = demoWorkspace('phd'), a = w.programs[0].application;
  const m = a.milestones[0]; m.deadline.basis = 'official'; assert.throws(() => validateWorkspace(w), /官方里程碑/);
  m.deadline.sourceId = 'demo-source'; assert.doesNotThrow(() => validateWorkspace(w));
  a.milestones.push({ ...structuredClone(m), id: 'references-date', title: '推荐信截止', deadline: { ...m.deadline, date: '2028-01-15', timezone: 'America/New_York' } });
  validateWorkspace(w); assert.notEqual(a.milestones[0].deadline.timezone, a.milestones[1].deadline.timezone);
});
test('全周期页面显示逐项目推荐信、原币种、条件与待确认签证', () => {
  const w = demoWorkspace('phd'); w.programs[1].application.funding.currency = 'USD';
  const esc = value => String(value ?? '').replaceAll('<', '&lt;');
  const c = { esc, pill: esc, heading: (a, b) => a + b, promptButton: () => '', trackFilter: () => '', matchesTrack: () => true, sourceLink: () => '来源', empty: () => '空' };
  const applications = applicationsView(w, c), decisions = decisionsView(w, c), dates = lifecycleDates(w, c);
  assert.match(applications, /推荐人 A/); assert.match(applications, /草稿待审/); assert.match(applications, /Europe\/Berlin/);
  assert.match(decisions, /EUR/); assert.match(decisions, /USD/); assert.match(decisions, /最终学位/); assert.match(decisions, /签证或居留/); assert.match(decisions, /待确认/);
  assert.match(dates, /推荐信/); assert.match(dates, /录取答复/); assert.match(dates, /研究讨论/);
  assert.equal(blankApplication('项目制').route, '项目制'); assert.equal(enrollmentTemplate().length, 5);
});
test('已撤回和已婉拒项目不再生成时间线待办，历史记录仍保留', () => {
  const w = demoWorkspace('phd');
  const esc = v => String(v ?? '');
  const c = { esc, pill: esc, matchesTrack: () => true, sourceLink: () => '来源' };
  const first = w.programs[0]; first.institution = '已撤回的测试目标'; first.application.decision.status = '已撤回';
  const second = w.programs[1]; second.institution = '已婉拒的测试目标'; second.application.decision.status = '已婉拒';
  const rendered = lifecycleDates(w, c);
  assert.doesNotMatch(rendered, /已撤回的测试目标|已婉拒的测试目标/);
  assert.ok(first.application.contacts.length); assert.ok(second.application.references.length);
});
test('日常日期读取原生里程碑，排除往年未知和终止目标', () => {
  const w = demoWorkspace('phd'); w.tasks = [];
  for (const p of w.programs) p.deadline.date = '';
  const a = w.programs[0].application;
  a.milestones.push({ id: 'history', title: '往年资料', deadline: { date: '2025-01-01', timezone: 'UTC', basis: 'historical', sourceId: '', cycle: '2025' }, status: '待处理', note: '' });
  a.milestones.push({ id: 'unknown', title: '尚未核实', deadline: { date: '2030-01-01', timezone: 'UTC', basis: 'unknown', sourceId: '', cycle: '' }, status: '待处理', note: '' });
  assert.ok(actionDates(w).some(e => e.label === '资助资料核对'));
  assert.ok(!actionDates(w).some(e => ['往年资料', '尚未核实'].includes(e.label)));
  w.programs[0].application.decision.status = '已撤回'; assert.ok(!actionDates(w).some(e => e.program.id === w.programs[0].id));
});
test('项目与比较采用原生资助和联系状态，旧摘要只供旧数据兼容', () => {
  const w = demoWorkspace('phd'), p = w.programs[0]; p.funding = '旧摘要'; p.contactStatus = '旧状态';
  assert.match(fundingSummary(p), /已获资助/); assert.doesNotMatch(fundingSummary(p), /旧摘要/);
  assert.match(contactSummary(p), /已回复/); assert.doesNotMatch(contactSummary(p), /旧状态/);
  delete p.application; assert.equal(fundingSummary(p), '旧摘要'); assert.equal(contactSummary(p), '旧状态');
});

test('官网未公布时区时保留官方日期但不倒计时，精确时刻可往返展示', () => {
  const w = demoWorkspace('phd'); w.tasks = []; w.programs = [w.programs[0]];
  const p = w.programs[0]; w.materials = []; p.application = blankApplication('岗位招聘');
  p.deadline = { date: '2026-11-30', time: '', timezone: '', basis: 'official', sourceId: 'demo-source', cycle: '招聘编号示例' };
  p.application.milestones = [{ id: 'funding', title: '奖学金轮', deadline: { date: '2027-01-06', time: '12:00', timezone: 'Europe/London', basis: 'official', sourceId: 'demo-source', cycle: '2027-28' }, status: '待处理', note: '' }];
  assert.doesNotThrow(() => validateWorkspace(w));
  assert.deepEqual(actionDates(w).map(e => e.label), ['奖学金轮']);
  const esc = v => String(v ?? ''); const c = { esc, pill: esc, heading: () => '', promptButton: () => '', trackFilter: () => '', matchesTrack: () => true, sourceLink: () => '来源', empty: () => '' };
  assert.match(applicationsView(w, c), /12:00/); assert.match(lifecycleDates(w, c), /12:00/);
  p.application.milestones[0].deadline.time = '12:60'; assert.throws(() => validateWorkspace(w), /HH:MM/);
  p.application.milestones[0].deadline.time = ''; p.application.milestones[0].deadline.timezone = ''; validateWorkspace(w);
  assert.equal(actionDates(w).length, 0);
});

test('联系型推荐人记录同意和资料，区别于旧版推荐信的提交与追交', () => {
  const w = demoWorkspace('phd'), p = w.programs[0]; p.application = blankApplication('岗位招聘');
  const r = { id: 'contact-ref', kind: 'contact', label: '测试推荐人', status: '已同意', due: '2027-01-01', submittedOn: '', contactDetails: '虚构联系资料', note: 'CV列可联系推荐人，不要求上传信。' };
  p.application.references = [r]; validateWorkspace(w);
  assert.deepEqual(referenceSummary([r]), { label: '可联系推荐人', text: '1 / 1 已同意' });
  assert.ok(!actionDates(w).some(e => e.label.includes(r.label)));
  const esc = v => String(v ?? ''); const c = { esc, pill: esc, heading: () => '', promptButton: () => '', trackFilter: () => '', matchesTrack: q => q.id === p.id, sourceLink: () => '', empty: () => '' };
  const page = applicationsView(w, c); assert.match(page, /1 \/ 1 已同意/); assert.match(page, /虚构联系资料/); assert.doesNotMatch(page, /0 \/ 1 已提交|未提交/);
  r.contactDetails = ''; assert.match(applicationsView(w, c), /联系方式待补充/);
  r.status = '待邀请'; assert.ok(actionDates(w).some(e => e.label === `推荐人资料安排 · ${r.label}`));
  r.status = '已提交'; assert.throws(() => validateWorkspace(w), /可联系推荐人/);
  r.status = '已同意'; r.submittedOn = '2027-01-01'; assert.throws(() => validateWorkspace(w), /可联系推荐人/); r.submittedOn = '';
  const letter = { id: 'old-letter', label: '旧版信件记录', status: '已同意', due: '', submittedOn: '', note: '' };
  p.application.references.push(letter); validateWorkspace(w); assert.match(referenceSummary(p.application.references).text, /推荐信 0 \/ 1 已提交 · 可联系推荐人 1 \/ 1 已同意/);
  letter.status = '已提交'; assert.throws(() => validateWorkspace(w), /推荐信已提交/);
});
