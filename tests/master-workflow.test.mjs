import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { demoWorkspace } from '../examples/demo.mjs';
import { validateWorkspace } from '../lib/model.mjs';
import { applicationsView, decisionsView } from '../src/lifecycle-view.mjs';
import { programComparisonView } from '../src/comparison-view.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const context = (matchesTrack = () => true) => ({ esc, pill: esc, heading: (a, b, action) => a + b + action, promptButton: esc, trackFilter: () => '', matchesTrack, sourceLink: () => '来源', empty: (a, b) => a + b });

test('纯硕士跟踪和录取比较围绕课程与先修，不强制走博士岗位或导师路径', () => {
  const w = demoWorkspace('master');
  const applications = applicationsView(w, context()), decisions = decisionsView(w, context());
  assert.doesNotMatch(applications, /欧洲岗位\/导师制/);
  assert.match(applications, /硕士/);
  assert.match(decisions, /<th scope="row">课程与先修<\/th>/);
  assert.doesNotMatch(decisions, /研究与导师/);
});

test('硕士录取比较保留费用分项、原币种与年度，自定义字段按并集显示并转义', () => {
  const w = demoWorkspace('master');
  w.programs[0].customFields = { '课程与先修': '原自有学分待核对，未换算ECTS', '学费': 'USD 20,000 / 2026-27（虚构）', '学期杂费': '待核对', '生活费': 'EUR 900 / 月（虚构）', '<script>': '<img onerror=alert(1)>' };
  w.programs[1].customFields = { '语言豁免证据': '尚未取得，不代表已豁免' };
  const page = decisionsView(w, context());
  for (const text of ['USD 20,000 / 2026-27', 'EUR 900 / 月', '未换算ECTS', '语言豁免证据', '尚未取得，不代表已豁免']) assert.ok(page.includes(text));
  for (const label of ['学费', '学期杂费', '生活费', '申请费']) assert.ok(page.includes(`<th scope="row">${label}</th>`));
  assert.match(page, /&lt;script&gt;/); assert.doesNotMatch(page, /<img onerror/);
  assert.match(page, /<td>待核对<\/td>/);
  assert.equal(w.programs[0].customFields['学费'], 'USD 20,000 / 2026-27（虚构）');
});

test('按实际筛选目标切换硕博文案，博士保留导师，空硕士页仍给硕士入口', () => {
  const w = demoWorkspace('phd');
  const master = demoWorkspace('master').programs[0]; master.id = 'separate-master';
  w.profile.track = 'both'; w.programs.push(master);
  assert.match(decisionsView(w, context(p => p.track === 'phd')), /研究与导师/);
  assert.doesNotMatch(applicationsView(w, context(p => p.track === 'master')), /欧洲岗位\/导师制/);
  const blank = demoWorkspace('master'); blank.programs = [];
  assert.match(applicationsView(blank, context()), /硕士/);
});

test('目标比较显示课程及自定义费用并集，混合目标保留博士字段且不改变数据', () => {
  const w = demoWorkspace('master'), programs = w.programs.slice(0, 2);
  programs[0].customFields = { '课程与先修': '20 本校学分，未转换', '学费': 'CHF 100 / 学期（虚构）' };
  programs[1].customFields = { '语言证据': '<script>未豁免</script>' };
  const before = JSON.stringify(programs), c = { esc, trackName: track => track === 'master' ? '硕士' : '博士' };
  const page = programComparisonView(programs, c);
  assert.match(page, /20 本校学分，未转换/); assert.match(page, /CHF 100 \/ 学期/);
  assert.match(page, /语言证据/); assert.match(page, /&lt;script&gt;/); assert.match(page, /<td>待核对<\/td>/);
  assert.doesNotMatch(page, /导师与资助/); assert.equal(JSON.stringify(programs), before);
  const phd = demoWorkspace('phd').programs[0]; phd.id = 'separate-phd';
  assert.match(programComparisonView([...programs, phd], c), /导师与资助/);
});

test('同时申请硕博但只有硕士录取时，录取表按实际offer显示课程与费用', () => {
  const w = demoWorkspace('phd'); w.profile.track = 'both';
  w.programs.forEach(p => { p.application.decision.status = '待结果'; p.application.decision.receivedOn = ''; });
  const master = demoWorkspace('master').programs[0]; master.id = 'only-master-offer';
  master.customFields = { '课程与先修': '   ' }; w.programs.push(master);
  const table = decisionsView(w, context()).match(/<table class="offer-table">[\s\S]*?<\/table>/)?.[0];
  assert.match(table, /<th scope="row">课程与先修<\/th><td>待核对<\/td>/);
  assert.doesNotMatch(table, /研究与导师/);
});

test('真实硕士基线保留独立招生、日期与费用周期，未写成个人已满足或已递交', async () => {
  const w = JSON.parse(await readFile(new URL('../examples/real-master-research-20261028.json', import.meta.url), 'utf8'));
  validateWorkspace(w);
  assert.equal(w.profile.track, 'master'); assert.equal(w.profile.education, '');
  assert.ok(w.programs.length >= 4);
  for (const p of w.programs) {
    assert.equal(p.track, 'master'); assert.equal(p.application.status, '未开始');
    assert.equal(p.application.decision.status, '待结果'); assert.equal(p.application.funding.status, '待核对');
    assert.equal(p.application.submittedOn, ''); assert.equal(p.application.references.length, 0);
    assert.ok(p.facts.every(f => f.sourceId && f.cycle && f.verifiedAt === '2026-10-28'));
    assert.ok(p.application.enrollment.every(item => item.status === '待确认'));
  }
  const leiden = w.programs.find(p => /Leiden/.test(p.institution)); assert.equal(leiden.deadline.basis, 'unknown'); assert.equal(leiden.deadline.date, '');
  const eth = w.programs.find(p => /ETH/.test(p.institution)); assert.equal(eth.deadline.time, '11:59'); assert.equal(eth.deadline.timezone, 'Europe/Zurich');
  const oxford = w.programs.find(p => /Oxford/.test(p.institution)); assert.equal(oxford.deadline.date, '2027-01-27'); assert.ok(oxford.facts.some(f => /600/.test(f.value) && /独立CV/.test(f.value)));
  const columbia = w.programs.find(p => /Columbia/.test(p.institution)); assert.match(columbia.customFields['学费'], /2026-27/); assert.match(columbia.customFields['学费'], /不是2027-28/);
  assert.equal(w.extensions.find(e => e.id === 'master-excluded').items.length, 2);
  assert.equal(w.observations.length, 0); assert.equal(w.settings.refreshMinutes, 0);
});
