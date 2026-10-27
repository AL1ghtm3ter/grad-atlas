export const ROUTES = ['项目制', '岗位招聘', '导师制', '待确认'];
export const APPLICATION_STATUS = ['未开始', '准备中', '已递交', '已确认收到', '已撤回'];
export const REFERENCE_STATUS = ['待邀请', '已邀请', '已同意', '已提交', '不再需要'];
export const CONTACT_STATUS = ['草稿待审', '已发送', '已回复', '已结束'];
export const INTERVIEW_STATUS = ['待安排', '已安排', '已完成', '已取消'];
export const DECISION_STATUS = ['待结果', '候补', '录取', '未录取', '已接受', '已婉拒', '已撤回', '已入学'];
export const FUNDING_STATUS = ['待核对', '未申请', '已申请', '待结果', '已获资助', '未获资助', '自费'];
export const MILESTONE_STATUS = ['待确认', '待办理', '办理中', '已完成', '不适用'];

export function programStage(program) {
  const a = program.application;
  if (!a) return program.stage;
  if (a.decision.status !== '待结果') return a.decision.status;
  if (a.status === '已撤回') return '已撤回';
  if (a.interviews.some(i => ['已安排', '已完成'].includes(i.status))) return '面试中';
  if (['已递交', '已确认收到'].includes(a.status)) return '已递交';
  if (a.contacts.some(c => ['已发送', '已回复'].includes(c.status))) return '已联系';
  if (a.status === '准备中') return '准备中';
  return program.stage;
}

export function fundingSummary(program) {
  if (!program.application) return program.funding || '待核对';
  const f = program.application.funding;
  return [f.status, f.type, [f.amount, f.currency, f.period].filter(Boolean).join(' '), f.duration, f.tuition].filter(Boolean).join(' · ');
}

export function contactSummary(program) {
  if (!program.application) return program.contactStatus || '未记录';
  const contacts = program.application.contacts;
  if (!contacts.length) return '尚未整理联系记录';
  const counts = new Map();
  for (const c of contacts) counts.set(c.status, (counts.get(c.status) || 0) + 1);
  return [...counts].map(([status, n]) => `${status} ${n} 条`).join(' · ');
}

// Only actionable dates enter the daily summary. Unverified and historical
// observations remain visible in their source views, never as a live countdown.
export function actionDates(workspace) {
  const events = [];
  const closed = p => ['已撤回', '已婉拒', '未录取', '已入学'].includes(programStage(p));
  const add = (program, date, timezone, label, basis = 'personal', deadline = {}) => {
    if (!date || !['official', 'personal'].includes(basis)) return;
    events.push({ program, deadline: { date, timezone: timezone || 'UTC', basis, ...deadline }, label });
  };
  for (const p of workspace.programs) {
    if (closed(p)) continue;
    if (!['录取', '已接受'].includes(programStage(p))) add(p, p.deadline.date, p.deadline.timezone, p.deadline.basis === 'official' ? '官方申请截止日' : '申请计划日期', p.deadline.basis, p.deadline);
    const a = p.application; if (!a) continue;
    for (const m of a.milestones || []) if (m.status === '待处理') add(p, m.deadline.date, m.deadline.timezone, m.title, m.deadline.basis, m.deadline);
    for (const r of a.references) if (!['已提交', '不再需要'].includes(r.status)) add(p, r.due, 'UTC', `推荐信安排 · ${r.label}`);
    for (const c of a.contacts) if (c.status !== '已结束') add(p, c.followUp, 'UTC', `联系跟进 · ${c.label}`);
    for (const i of a.interviews) if (i.status === '已安排') add(p, i.date, i.timezone, `面试 · ${i.title}`);
    if (['录取', '候补'].includes(a.decision.status)) add(p, a.decision.responseDue, a.decision.timezone, '录取答复安排');
    for (const m of a.enrollment) if (!['已完成', '不适用'].includes(m.status)) add(p, m.due, 'UTC', m.title);
  }
  for (const t of workspace.tasks) {
    if (t.done || !t.due) continue;
    const p = workspace.programs.find(p => p.id === t.programId);
    if (p && closed(p)) continue;
    add(p || { institution: '个人任务', name: t.title }, t.due, 'UTC', t.title);
  }
  return events;
}

export function blankApplication(route = '待确认') {
  return {
    route, portal: '', status: '未开始', submittedOn: '', referenceNumber: '', note: '',
    references: [], contacts: [], interviews: [], milestones: [],
    decision: { status: '待结果', receivedOn: '', responseDue: '', timezone: '', conditions: '', note: '' },
    funding: { status: '待核对', type: '', amount: '', currency: '', period: '', duration: '', tuition: '', sourceId: '', note: '' },
    enrollment: []
  };
}

export function enrollmentTemplate() {
  return [
    ['degree', '学位、最终成绩单与注册条件', '分别核对申请时的替代材料和注册原件。'],
    ['funding', '资助书、合同与经费安排', '确认正式资助依据、金额、期限和学费覆盖。'],
    ['immigration', '签证或居留要求', '先确认国籍、目的地和个人情况；由官方规则判断是否适用。'],
    ['housing', '住宿、保险与出行', '根据实际入学时间安排，避免在条件未确定时作不可撤销预订。'],
    ['registration', '注册、入组与迎新', '核对校方注册、院系和课题组要求。']
  ].map(([id, title, note]) => ({ id, title, status: '待确认', due: '', note }));
}

export function validateApplication(a, { path = 'application', hasSource = () => false, validURL = () => true } = {}) {
  const fail = message => { throw new Error(`${path}: ${message}`); };
  const object = (o, allowed) => { if (!o || typeof o !== 'object' || Array.isArray(o)) fail('需要对象'); for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`未知字段 ${k}`); };
  const text = (v, max = 4000) => { if (typeof v !== 'string' || v.length > max) fail('文本类型或长度不正确'); };
  const choice = (v, values) => { if (!values.includes(v)) fail(`状态需要是 ${values.join('、')}`); };
  const date = v => { text(v, 10); if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)) || new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v)) fail('需要真实 YYYY-MM-DD 日期或空字符串'); };
  const timezone = v => { text(v, 80); if (v) try { new Intl.DateTimeFormat('en', { timeZone: v }); } catch { fail('需要 IANA 时区'); } };
  const list = (rows, fields, fn) => { if (!Array.isArray(rows) || rows.length > 100) fail('需要不超过 100 条的数组'); const ids = new Set(); for (const row of rows) { object(row, ['id', ...fields]); if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(row.id) || ids.has(row.id)) fail('条目 ID 不合法或重复'); ids.add(row.id); fn(row); } };
  object(a, ['route', 'portal', 'status', 'submittedOn', 'referenceNumber', 'note', 'references', 'contacts', 'interviews', 'milestones', 'decision', 'funding', 'enrollment']);
  choice(a.route, ROUTES); choice(a.status, APPLICATION_STATUS); text(a.portal); if (a.portal && !validURL(a.portal)) fail('申请入口需要安全 http(s) URL');
  date(a.submittedOn); text(a.referenceNumber); text(a.note);
  if (['已递交', '已确认收到'].includes(a.status) && !a.submittedOn) fail('已递交需要实际提交日期，不能把草稿当作递交');
  list(a.references, ['label', 'status', 'due', 'submittedOn', 'note'], r => { text(r.label); choice(r.status, REFERENCE_STATUS); date(r.due); date(r.submittedOn); text(r.note); if (r.status === '已提交' && !r.submittedOn) fail('推荐信已提交需要提交日期'); });
  list(a.contacts, ['label', 'status', 'date', 'followUp', 'note'], c => { text(c.label); choice(c.status, CONTACT_STATUS); date(c.date); date(c.followUp); text(c.note); if (['已发送', '已回复'].includes(c.status) && !c.date) fail('已发送或已回复的联系需要实际日期'); });
  list(a.interviews, ['title', 'status', 'date', 'time', 'timezone', 'format', 'note'], i => { text(i.title); choice(i.status, INTERVIEW_STATUS); date(i.date); text(i.time, 5); timezone(i.timezone); text(i.format); text(i.note); if (i.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time)) fail('面试时刻需要 HH:MM'); if (['已安排', '已完成'].includes(i.status) && (!i.date || !i.time || !i.timezone)) fail('已安排面试需要日期、时刻及 IANA 时区'); });
  if (a.milestones !== undefined) list(a.milestones, ['title', 'deadline', 'status', 'note'], m => {
    text(m.title); text(m.note); choice(m.status, ['待处理', '已完成', '不适用']);
    object(m.deadline, ['date', 'timezone', 'basis', 'sourceId', 'cycle']);
    const d = m.deadline; date(d.date); timezone(d.timezone); text(d.sourceId); text(d.cycle); choice(d.basis, ['official', 'personal', 'historical', 'unknown']);
    if (d.sourceId && !hasSource(d.sourceId)) fail('里程碑来源不存在');
    if (d.basis === 'official' && (!d.date || !d.timezone || !d.cycle || !d.sourceId)) fail('官方里程碑需要日期、时区、周期和来源');
  });
  object(a.decision, ['status', 'receivedOn', 'responseDue', 'timezone', 'conditions', 'note']);
  choice(a.decision.status, DECISION_STATUS); date(a.decision.receivedOn); date(a.decision.responseDue); timezone(a.decision.timezone); text(a.decision.conditions); text(a.decision.note);
  if (a.decision.responseDue && !a.decision.timezone) fail('录取答复日期需要时区');
  if (['录取', '未录取', '已接受', '已婉拒', '已入学'].includes(a.decision.status) && !a.decision.receivedOn) fail('结果状态需要实际收到结果的日期');
  object(a.funding, ['status', 'type', 'amount', 'currency', 'period', 'duration', 'tuition', 'sourceId', 'note']);
  choice(a.funding.status, FUNDING_STATUS); for (const k of ['type', 'amount', 'currency', 'period', 'duration', 'tuition', 'sourceId', 'note']) text(a.funding[k]);
  if (a.funding.sourceId && !hasSource(a.funding.sourceId)) fail('资助来源不存在');
  if (a.funding.status === '已获资助' && !a.funding.sourceId && !a.funding.note.trim()) fail('已获资助需要来源或正式书面依据说明');
  list(a.enrollment, ['title', 'status', 'due', 'note'], m => { text(m.title); choice(m.status, MILESTONE_STATUS); date(m.due); text(m.note); });
  return a;
}
