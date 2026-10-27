export const TRACKS = ['master', 'phd', 'both'];
export const STAGES = ['定位', '选校', '准备', '递交', '面试', '结果', '入学'];
export const PROGRAM_STAGES = ['调研中', '准备中', '已联系', '已递交', '面试中', '候补', '录取', '未录取', '已接受', '已婉拒', '已撤回', '已入学', '暂缓'];
export const PROFILE_FIELDS = ['displayName', 'track', 'cycle', 'field', 'regions', 'education', 'academicRecord', 'language', 'budget', 'constraints', 'researchInterests', 'researchExperience', 'publications', 'supervisorPreferences', 'fundingNeeds', 'prerequisites', 'degreeDocuments', 'goals'];
export const MASTER_TASKS = [
  ['定位', '确认方向与入学时间', '说明目标学科、地区、预算和不可妥协的条件。'],
  ['选校', '核对先修课程与学分', '逐项目记录课程要求、适用周期和官方出处；不同学分体系单独说明。'],
  ['准备', '整理成绩、学位和语言材料', '分别核对申请阶段和入学注册阶段要求。'],
  ['准备', '准备个人陈述与推荐信', '区分授课型和研究型项目，按实际项目要求安排。'],
  ['递交', '核对申请窗口与递交清单', '截止日期保留适用周期和来源；时刻、时区未公布时留空并列为待核对。'],
  ['结果', '比较录取条件与费用', '学费、学期杂费、生活费和奖学金分别记录。'],
  ['结果', '确认录取选择与答复日期', '保留正式录取条件、答复日期和用户决定；对外答复需明确授权。'],
  ['入学', '准备注册、签证与入学', '核对学位原件、目的地签证或居留要求、住宿、保险与注册。']
];
export const PHD_TASKS = [
  ['定位', '明确研究问题与研究经历', '说明想研究的问题、已有方法、成果和待补足的能力。'],
  ['选校', '整理导师、课题组与研究匹配', '记录近期课题、论文、招生模式和匹配依据。'],
  ['选校', '核对资助与岗位条件', '区分带薪岗位、奖学金和自费；记录金额、期限及资格出处。'],
  ['准备', '准备研究计划、写作样本与推荐信', '按课题组或项目要求安排，不虚构论文或研究成果。'],
  ['准备', '安排导师联系与后续跟进', '草稿、已发送和收到回复分别记录；发送需用户明确授权。'],
  ['递交', '递交申请并核对逐项目推荐信', '区分欧洲岗位/导师制与美国项目制；记录实际递交和各推荐信的提交状态。'],
  ['面试', '准备研究陈述与面试', '围绕研究问题、方法、匹配和资助安排。'],
  ['结果', '核对录取、资助与入组条件', '录取不等于资助获批，分别记录正式依据。'],
  ['结果', '比较录取并确认答复安排', '逐项比较研究、导师、正式资助、合同、学费及答复日期，由用户作决定。'],
  ['入学', '准备学位材料、签证与注册入组', '在读申请者跟进最终成绩单、学位与注册条件；签证或居留根据国籍和目的地核对。']
];

export function blankWorkspace(track = 'master') {
  if (!TRACKS.includes(track)) throw new Error('track 必须是 master、phd 或 both');
  return {
    version: 1, revision: 0, updatedAt: null,
    profile: Object.fromEntries(PROFILE_FIELDS.map(k => [k, k === 'track' ? track : ''])),
    programs: [], tasks: [], materials: [], sources: [], observations: [], extensions: [],
    settings: { refreshMinutes: 0 }
  };
}

export function templateTasks(track) {
  return [['master', MASTER_TASKS], ['phd', PHD_TASKS]].filter(([t]) => track === 'both' || track === t)
    .flatMap(([t, list]) => list.map(([stage, title, note], i) => ({ id: `${t}-${i + 1}`, title, note, stage, track: t, programId: '', due: '', done: false, priority: i === 0 ? 'high' : 'normal' })));
}

function fail(path, message) { throw new Error(`${path}: ${message}`); }
function object(v, p) { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p, '需要对象'); }
function keys(v, allowed, p) { object(v, p); for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${p}.${k}`, '未知字段；扩展内容请放 customFields 或 extensions'); }
function string(v, p, max = 2000) { if (typeof v !== 'string' || v.length > max) fail(p, `需要不超过 ${max} 字的字符串`); }
function choice(v, list, p) { if (!list.includes(v)) fail(p, `允许值：${list.join(', ')}`); }
function list(v, p, max = 500) { if (!Array.isArray(v) || v.length > max) fail(p, `需要不超过 ${max} 项的数组`); }
function date(v, p) {
  string(v, p, 10);
  if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)) || new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v)) fail(p, '需要真实的 YYYY-MM-DD 日期或空字符串');
}
function id(v, p) { if (typeof v !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(v)) fail(p, '需要小写字母、数字、下划线或短横线的 ID'); }
export function safeURL(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
function url(v, p, empty = false) { string(v, p); if (!(empty && v === '') && !safeURL(v)) fail(p, '需要不含用户名和密码的 http(s) URL'); }
function custom(v, p) { object(v, p); if (Object.keys(v).length > 50) fail(p, '扩展字段过多'); for (const [k, val] of Object.entries(v)) { string(k, p, 80); string(val, `${p}.${k}`); if (['__proto__', 'constructor', 'prototype'].includes(k)) fail(p, '不支持此字段名'); } }

export function validateWorkspace(w) {
  keys(w, ['version', 'revision', 'updatedAt', 'profile', 'programs', 'tasks', 'materials', 'sources', 'observations', 'extensions', 'settings'], 'workspace');
  if (w.version !== 1) fail('version', '仅支持版本 1');
  if (!Number.isSafeInteger(w.revision) || w.revision < 0) fail('revision', '需要非负整数');
  if (w.updatedAt !== null && (typeof w.updatedAt !== 'string' || Number.isNaN(Date.parse(w.updatedAt)))) fail('updatedAt', '需要 ISO 时间或 null');
  keys(w.profile, [...PROFILE_FIELDS, 'customFields'], 'profile');
  for (const k of PROFILE_FIELDS) string(w.profile[k], `profile.${k}`, k === 'track' ? 10 : 4000);
  choice(w.profile.track, TRACKS, 'profile.track');
  if (w.profile.customFields) custom(w.profile.customFields, 'profile.customFields');
  for (const name of ['programs', 'tasks', 'materials', 'sources', 'observations', 'extensions']) list(w[name], name, name === 'observations' ? 1000 : 500);
  const allIds = {};
  for (const name of ['programs', 'tasks', 'materials', 'sources', 'extensions']) {
    allIds[name] = new Set();
    w[name].forEach((v, i) => { object(v, `${name}[${i}]`); id(v.id, `${name}[${i}].id`); if (allIds[name].has(v.id)) fail(name, `重复 ID ${v.id}`); allIds[name].add(v.id); });
  }
  const ref = (v, name, p) => { string(v, p, 80); if (v && !allIds[name].has(v)) fail(p, `引用的 ${name} 不存在`); };
  w.sources.forEach((s, i) => {
    const p = `sources[${i}]`; keys(s, ['id', 'label', 'url', 'cycle', 'verifiedAt', 'note', 'reviewedHash'], p);
    for (const k of ['label', 'cycle', 'note']) string(s[k], `${p}.${k}`);
    url(s.url, `${p}.url`); date(s.verifiedAt, `${p}.verifiedAt`);
    if (s.reviewedHash !== undefined && !/^(?:[a-f0-9]{64})?$/.test(s.reviewedHash)) fail(`${p}.reviewedHash`, '需要已人工核对的网页 SHA256 或空字符串');
  });
  w.programs.forEach((v, i) => {
    const p = `programs[${i}]`; keys(v, ['id', 'name', 'institution', 'region', 'track', 'stage', 'url', 'fit', 'nextAction', 'deadline', 'facts', 'customFields', 'supervisor', 'lab', 'funding', 'contactStatus', 'application'], p);
    for (const k of ['name', 'institution', 'region', 'fit', 'nextAction']) string(v[k], `${p}.${k}`);
    for (const k of ['supervisor', 'lab', 'funding', 'contactStatus']) if (v[k] !== undefined) string(v[k], `${p}.${k}`);
    choice(v.track, ['master', 'phd'], `${p}.track`); choice(v.stage, PROGRAM_STAGES, `${p}.stage`); url(v.url, `${p}.url`, true);
    keys(v.deadline, ['date', 'time', 'timezone', 'basis', 'sourceId', 'cycle'], `${p}.deadline`);
    date(v.deadline.date, `${p}.deadline.date`); choice(v.deadline.basis, ['official', 'personal', 'historical', 'unknown'], `${p}.deadline.basis`);
    string(v.deadline.cycle, `${p}.deadline.cycle`); string(v.deadline.timezone, `${p}.deadline.timezone`, 80);
    if (v.deadline.time !== undefined) { string(v.deadline.time, `${p}.deadline.time`, 5); if (v.deadline.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.deadline.time)) fail(`${p}.deadline.time`, '需要 HH:MM 时刻或空字符串'); }
    if (v.deadline.timezone) { try { new Intl.DateTimeFormat('en', { timeZone: v.deadline.timezone }); } catch { fail(`${p}.deadline.timezone`, '需要 IANA 时区'); } }
    ref(v.deadline.sourceId, 'sources', `${p}.deadline.sourceId`);
    if (v.deadline.basis === 'official' && (!v.deadline.sourceId || !v.deadline.cycle || !v.deadline.date)) fail(`${p}.deadline`, '官方日期需要来源、适用周期及日期；未公布时区留空');
    list(v.facts, `${p}.facts`, 50); v.facts.forEach((f, j) => { const q = `${p}.facts[${j}]`; keys(f, ['label', 'value', 'sourceId', 'cycle', 'verifiedAt'], q); string(f.label, q); string(f.value, q); string(f.cycle, q); date(f.verifiedAt, q); ref(f.sourceId, 'sources', q); });
    if (v.customFields) custom(v.customFields, `${p}.customFields`);
    if (v.application) validateApplication(v.application, { path: `${p}.application`, hasSource: id => allIds.sources.has(id), validURL: safeURL });
  });
  w.tasks.forEach((t, i) => {
    const p = `tasks[${i}]`; keys(t, ['id', 'title', 'note', 'stage', 'track', 'programId', 'due', 'done', 'priority'], p);
    string(t.title, p); string(t.note, p); choice(t.stage, STAGES, p); choice(t.track, TRACKS, p); ref(t.programId, 'programs', p); date(t.due, p);
    if (typeof t.done !== 'boolean') fail(p, 'done 需要布尔值'); choice(t.priority, ['high', 'normal', 'low'], p);
  });
  w.materials.forEach((m, i) => { const p = `materials[${i}]`; keys(m, ['id', 'name', 'track', 'status', 'note', 'programId'], p); string(m.name, p); string(m.note, p); choice(m.track, TRACKS, p); choice(m.status, ['待准备', '准备中', '待核对', '已就绪'], p); ref(m.programId, 'programs', p); });
  w.observations.forEach((o, i) => {
    const p = `observations[${i}]`; keys(o, ['sourceId', 'checkedAt', 'hash', 'previousHash', 'status', 'message', 'method', 'sourceUrl', 'upstreamStatus', 'cacheMode'], p); ref(o.sourceId, 'sources', p);
    for (const k of ['checkedAt', 'hash', 'previousHash', 'message']) string(o[k], p);
    if (!o.sourceId || Number.isNaN(Date.parse(o.checkedAt))) fail(p, '需要来源及检查时间');
    choice(o.status, ['baseline', 'unchanged', 'changed', 'error'], p);
    if (o.method !== undefined) choice(o.method, ['direct', 'jina'], p);
    if (o.sourceUrl !== undefined) url(o.sourceUrl, `${p}.sourceUrl`);
    if (o.upstreamStatus !== undefined && o.upstreamStatus !== 200) fail(p, '成功正文的上游状态需要为 200');
    if (o.cacheMode !== undefined) choice(o.cacheMode, ['bypass', 'no-cache'], p);
  });
  w.extensions.forEach((e, i) => { const p = `extensions[${i}]`; keys(e, ['id', 'title', 'description', 'fields', 'items'], p); string(e.title, p); string(e.description, p); list(e.fields, p, 15); e.fields.forEach(k => string(k, p, 80)); list(e.items, p, 200); e.items.forEach(row => { custom(row, p); for (const k of Object.keys(row)) if (!e.fields.includes(k)) fail(p, `未声明列 ${k}`); }); });
  keys(w.settings, ['refreshMinutes', 'sourceReader'], 'settings');
  if (w.settings.sourceReader !== undefined) choice(w.settings.sourceReader, ['off', 'jina'], 'settings.sourceReader');
  if (!Number.isInteger(w.settings.refreshMinutes) || (w.settings.refreshMinutes !== 0 && (w.settings.refreshMinutes < 15 || w.settings.refreshMinutes > 1440))) fail('settings.refreshMinutes', '0 表示关闭；定时检查为 15–1440 分钟');
  return w;
}

export function readiness(w) {
  const p = w.profile;
  return [
    { name: '申请定位', done: ['cycle', 'field', 'regions', 'goals'].every(k => p[k].trim()) },
    { name: '背景与约束', done: ['education', 'academicRecord', 'language', 'budget'].every(k => p[k].trim()) && (p.track === 'master' || !!p.researchInterests.trim()) },
    { name: '目标与计划', done: w.programs.length > 0 && w.tasks.length > 0 }
  ];
}

export function daysUntil(date, timezone = 'UTC', now = new Date()) {
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`)) / 86400000);
}
import { validateApplication } from './lifecycle.mjs';

