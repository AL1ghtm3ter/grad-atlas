import { daysUntil, readiness, STAGES, blankWorkspace } from '/lib/model.mjs';
import { renderers } from './extensions/index.mjs';
import './theme.mjs';
import { createLatestLoader } from './live.mjs';
import { applicationsView, decisionsView, lifecycleDates } from './lifecycle-view.mjs';
import { programStage, fundingSummary, contactSummary, actionDates } from '/lib/lifecycle.mjs';
import { helpView } from './help-view.mjs';
import { createTutorial } from './tutorial.mjs';

const $ = selector => document.querySelector(selector);
const STATIC = document.querySelector('meta[name="gradatlas-mode"]')?.content === 'static';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/>',
  file: '<path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8m-8 4h6"/>',
  link: '<path d="m10 7 3-3a5 5 0 0 1 7 7l-3 3M7 10l-3 3a5 5 0 0 0 7 7l3-3M8 16l8-8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/>',
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.file}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
let workspace, demo = false, signature = '';
let track = 'all', query = '', stage = 'all', compare = new Set();
const names = { home: '申请总览', programs: '目标项目', applications: '申请跟踪', timeline: '申请时间线', materials: '材料与任务', decisions: '录取与入学', sources: '来源与更新', profile: '申请档案', extensions: '我的扩展', agent: '与 Agent 协作', guide: '新手教程与功能介绍', tutorial: '交互式新手教程' };
const trackName = t => ({ master: '硕士申请', phd: '博士申请', both: '硕士 + 博士申请' }[t] || t);
const currentView = () => Object.hasOwn(names, location.hash.slice(1)) ? location.hash.slice(1) : 'home';
const pill = (text, tone = '') => `<span class="pill ${tone}">${esc(text)}</span>`;
const dateLabel = date => date ? `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8))} 日` : '时间待核对';
const sourceLink = id => {
  const s = workspace.sources.find(s => s.id === id);
  return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>` : '<span class="muted">待核对来源</span>';
};
function promptButton(prompt, label = '交给 Agent') { return `<button class="button quiet" data-prompt="${esc(prompt)}">${icon('spark')}${esc(label)}</button>`; }
const trackFilter = () => `<div class="segments" aria-label="申请方向筛选">${[['all', '全部'], ['master', '硕士'], ['phd', '博士']].map(([id, label]) => `<button data-track="${id}" aria-pressed="${track === id}">${label}</button>`).join('')}</div>`;
const matchesTrack = item => track === 'all' || item.track === 'both' || item.track === track;
const empty = (heading, body, prompt) => `<div class="empty"><div class="empty-mark">${icon('compass')}</div><h2>${esc(heading)}</h2><p>${esc(body)}</p>${prompt ? promptButton(prompt, '复制给 Agent 的说明') : ''}</div>`;
function heading(title, description, action = '') { return `<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`; }

function onboarding() {
  const steps = readiness(workspace), done = steps.filter(s => s.done).length;
  const prompt = '请使用 $grad-apply-onboarding 引导我建立研究生申请工作区。先阅读 AGENTS.md 和 SKILL.md，检查当前本地记录。逐轮问我申请方向、背景、目标与约束；根据硕士或博士分别追问。不要让我手工填写 JSON。只把我已确认的信息写入 .local/，保留未知项，并生成目标和任务，网页应自动刷新。';
  return heading('从一次对话，开始申请。', '先和你的 Agent 理清方向。信息整理好后，这里会变成你的每日申请看板。', pill(workspace.revision === 0 ? '方向待确认' : trackName(workspace.profile.track), 'green')) +
    `<section class="onboard-intro"><div><h2>你负责选择，Agent 负责整理。</h2><p>不必先准备一张完美的表格。说清你想学什么、想去哪里，以及眼下的顾虑。Agent 会顺着你的回答，逐步补齐计划。</p><button class="button primary" data-prompt="${esc(prompt)}">${icon('spark')}复制引导提示词</button><a class="text-link" href="#agent">查看如何连接 Agent ${icon('arrow')}</a><a class="text-link tutorial-start-link" href="#tutorial">先跟教程练一遍 ${icon('arrow')}</a></div><div class="journey-symbol" aria-hidden="true"><svg viewBox="0 0 240 210" fill="none"><path d="M30 178C30 110 91 147 105 95S190 117 208 32" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 7"/><circle cx="30" cy="178" r="8" fill="currentColor"/><circle cx="105" cy="95" r="8" fill="#d4e5b5" stroke="currentColor"/><circle cx="208" cy="32" r="11" stroke="currentColor"/><path d="m202 32 4 4 8-9" stroke="currentColor" stroke-width="1.5"/></svg><span>从想法，到下一步。</span></div></section>
    <section class="section"><div class="section-head"><h2>你的起步路线</h2><span class="muted">已完成 ${done} / 3 阶段</span></div><div class="setup-steps">${steps.map((s, i) => `<article class="setup-step ${s.done ? 'complete' : ''}"><span class="step-number">${s.done ? icon('check') : i + 1}</span><div><h3>${s.name}</h3><p>${['确定硕士或博士、入学周期、方向与地区。', '补齐教育经历、语言、预算及申请限制。', '由 Agent 整理目标、资料来源和第一批任务。'][i]}</p></div>${pill(s.done ? '已整理' : '待对话', s.done ? 'green' : '')}</article>`).join('')}</div></section>
    <div class="inline-note">${icon('file')}<p>个人信息由你自己的 Agent 保存在本地。你可以随时说“更新我的计划”，也可以跳过暂时不确定的问题。</p></div>
    <section class="section path-notes"><div><h3>硕士申请</h3><p>课程与学分是否匹配？材料什么时候齐备？申请窗口和费用是什么？</p></div><div><h3>博士申请</h3><p>研究问题和导师是否匹配？如何获得资助？联系、研究计划和面试怎样安排？</p></div></section>`;
}

function taskRow(t, index = 0) {
  const p = workspace.programs.find(p => p.id === t.programId);
  const n = t.due ? daysUntil(t.due) : null;
  return `<article class="task-row ${t.done ? 'is-done' : ''}"><span class="task-indicator ${t.priority === 'high' && !t.done ? 'priority' : ''}">${t.done ? icon('check') : String(index + 1).padStart(2, '0')}</span><div class="task-copy"><h3>${esc(t.title)}</h3>${p ? `<p class="task-program">${esc(p.institution)} · ${esc(p.name)}</p>` : ''}<p>${esc(t.note)}</p></div><div class="task-meta">${pill(t.stage)}<span class="${n !== null && n < 0 && !t.done ? 'danger-text' : ''}">${t.done ? '已完成' : t.due ? `${dateLabel(t.due)}${n < 0 ? ' · 已逾期' : ''}` : '时间待安排'}</span></div></article>`;
}

function home() {
  if (!workspace.programs.length || !workspace.tasks.length) return onboarding();
  const todo = workspace.tasks.filter(t => !t.done).sort((a, b) => (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0) || (a.due || '9999').localeCompare(b.due || '9999'));
  const dates = actionDates(workspace).sort((a, b) => daysUntil(a.deadline.date, a.deadline.timezone) - daysUntil(b.deadline.date, b.deadline.timezone));
  const nearest = dates[0];
  const missingZone = workspace.programs.filter(p => p.deadline.basis === 'official' && p.deadline.date && !p.deadline.timezone).length;
  const complete = workspace.tasks.filter(t => t.done).length;
  const changed = unresolvedChanges().length;
  return heading('今天，把下一步走稳。', `${workspace.profile.cycle} · ${workspace.profile.field}`, promptButton('请检查我的 GradAtlas 当前记录、待办和来源，更新今天的申请计划。先读取当前版本；只写入已确认的信息。', '更新今日计划')) +
    `<section class="daily-brief"><div class="brief-main">${pill(trackName(workspace.profile.track), 'green')}<h2>${esc(todo[0]?.title || '当前任务都已完成')}</h2><p>${esc(todo[0]?.note || '让 Agent 根据回复与申请结果，整理下一阶段的计划。')}</p><a href="#materials" class="text-link">查看完整清单 ${icon('arrow')}</a></div><div class="brief-deadline">${icon('calendar')}<span>${nearest ? esc(nearest.label) : '下一步时间'}</span><strong>${nearest ? dateLabel(nearest.deadline.date) : '待安排'}</strong><p>${nearest ? esc(nearest.program.institution) : '由 Agent 核对后补充'}</p><small>${nearest ? `${daysUntil(nearest.deadline.date, nearest.deadline.timezone) < 0 ? '已过 ' + -daysUntil(nearest.deadline.date, nearest.deadline.timezone) + ' 天' : daysUntil(nearest.deadline.date, nearest.deadline.timezone) === 0 ? '今天' : '剩 ' + daysUntil(nearest.deadline.date, nearest.deadline.timezone) + ' 天'} · ${nearest.deadline.basis === 'official' ? '官方' : '个人计划'} · ${esc(nearest.deadline.timezone || 'UTC')}${nearest.deadline.time ? ` · 截止 ${esc(nearest.deadline.time)}` : ''}` : '保留周期与时区'}</small></div></section>
    ${missingZone ? `<div class="inline-note"><p>${missingZone} 个目标的官网截止时区尚待确认，未列入倒计时。<a href="#timeline">查看原日期</a></p></div>` : ''}<div class="summary-line"><span>${workspace.programs.length} 个目标项目</span><span>${todo.length} 项待办</span><span>${complete} 项任务已完成</span><span>${changed ? `${changed} 个来源有变化待核对` : '按计划稳步推进'}</span></div>
    <div class="dashboard-grid"><div><section class="section"><div class="section-head"><h2>接下来做什么</h2><a href="#materials">全部任务 ${icon('arrow')}</a></div><div class="task-list">${todo.slice(0, 3).map(taskRow).join('') || '<p class="muted">当前任务已完成。</p>'}</div></section><section class="section"><div class="section-head"><h2>目标项目</h2><a href="#programs">查看全部 ${icon('arrow')}</a></div>${compactPrograms(workspace.programs.slice(0, 3))}</section></div>
    <aside class="daily-side"><section class="side-section"><div class="section-head"><h2>申请进度</h2><span>${complete} / ${workspace.tasks.length}</span></div><div class="stage-track">${STAGES.map(s => { const tasks = workspace.tasks.filter(t => t.stage === s); const all = tasks.length && tasks.every(t => t.done); const active = !all && tasks.some(t => !t.done); return `<div class="stage-item ${all ? 'complete' : active ? 'active' : ''}"><span class="stage-dot">${all ? icon('check') : ''}</span><span>${s}</span><small>${tasks.length ? `${tasks.filter(t => t.done).length}/${tasks.length}` : '待安排'}</small></div>`; }).join('')}</div></section><section class="side-section"><h2>材料准备</h2><div class="material-summary">${workspace.materials.slice(0, 4).map(m => `<div><span>${esc(m.name)}</span>${pill(m.status, m.status === '已就绪' ? 'green' : m.status === '待核对' ? 'amber' : '')}</div>`).join('') || '<p class="muted">由 Agent 整理材料清单。</p>'}</div><a href="#materials" class="text-link">查看材料 ${icon('arrow')}</a></section><section class="quiet-note"><h3>${icon('spark')}和 Agent 接着聊</h3><p>“我刚收到一封回复，帮我更新计划，看看接下来要做什么。”</p></section></aside></div>`;
}

function compactPrograms(programs) {
  return `<div class="program-compact">${programs.map(p => `<a href="#programs" class="compact-row"><span class="institution-initial">${esc(p.institution.charAt(0))}</span><div><h3>${esc(p.institution)}</h3><p>${esc(p.name)} · ${esc(p.region)}</p></div>${pill(programStage(p), ['准备中', '录取', '已接受'].includes(programStage(p)) ? 'green' : '')}<span class="row-arrow">${icon('arrow')}</span></a>`).join('')}</div>`;
}

function deadlineDetail(p) {
  const d = p.deadline;
  const basis = { official: '官方日期', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[d.basis];
  const actionable = ['official', 'personal'].includes(d.basis) && (d.basis !== 'official' || d.timezone);
  const n = d.date && actionable ? daysUntil(d.date, d.timezone) : null;
  return `<div class="deadline-detail">${pill(basis, d.basis === 'official' ? 'green' : 'amber')}<strong>${esc(d.date ? `${d.date}${d.time ? ` ${d.time}` : ''}` : '尚未公布或核实')}</strong><span>${esc(d.timezone || '时区待核对')} ${d.cycle ? `· ${esc(d.cycle)}` : ''}</span>${d.date && !d.time ? '<span>截止时刻未记录，请核对官网。</span>' : ''}${d.basis === 'official' && !d.timezone ? '<span>官网时区尚未确认，暂不计算倒计时。</span>' : ''}${n !== null ? `<span>${n < 0 ? `已过 ${-n} 天` : n === 0 ? '今天' : `剩 ${n} 天`}（按${esc(d.timezone || 'UTC')}自然日）</span>` : ''}${d.sourceId ? sourceLink(d.sourceId) : ''}</div>`;
}

function programs() {
  const filtered = workspace.programs.filter(p => matchesTrack(p) && (stage === 'all' || programStage(p) === stage) && `${p.name} ${p.institution} ${p.region} ${p.supervisor || ''} ${p.lab || ''}`.toLowerCase().includes(query.toLowerCase()));
  return heading('找到适合你的下一站。', '把匹配依据、待核对的条件和下一步放在一起。', promptButton('请根据我的 GradAtlas 档案，研究并补充目标项目。硕士核对课程、学分、材料与费用；博士核对研究匹配、导师、岗位和资助。事实需附官方来源及适用周期。', '补充目标项目')) +
    `<div class="filters">${trackFilter()}<label class="search"><span class="sr-only">搜索项目、学校或导师</span><input id="search" type="search" placeholder="搜索项目、学校或导师" value="${esc(query)}"></label><label><span class="sr-only">阶段筛选</span><select id="stage-filter"><option value="all">全部阶段</option>${['调研中', '准备中', '已联系', '已递交', '面试中', '候补', '录取', '未录取', '已接受', '已婉拒', '已撤回', '已入学', '暂缓'].map(s => `<option ${stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
    ${compare.size ? comparison() : ''}<div class="result-count">${filtered.length} 个项目 · 可勾选最多 3 个进行比较</div><div class="program-list">${filtered.map(p => `<article class="program-item"><div class="program-top"><div class="program-title"><span class="institution-initial">${esc(p.institution.charAt(0))}</span><div><p>${esc(p.institution)} <span>· ${esc(p.region)}</span></p><h2>${esc(p.name)}</h2></div></div><div class="program-tags">${pill(trackName(p.track))}${pill(programStage(p), ['准备中', '录取', '已接受'].includes(programStage(p)) ? 'green' : '')}<label class="compare-check"><input type="checkbox" data-compare="${p.id}" ${compare.has(p.id) ? 'checked' : ''}>比较</label></div></div><div class="program-overview"><div><h3>匹配与下一步</h3><p>${esc(p.fit || '匹配依据待补充')}</p><p class="next-action">${icon('arrow')}${esc(p.nextAction || '由 Agent 整理下一步')}</p>${p.track === 'phd' ? `<div class="phd-line"><span>导师：${esc(p.supervisor || '待核对')}</span><span>课题组：${esc(p.lab || '待核对')}</span></div><p class="muted">资助：${esc(fundingSummary(p))} · 联系：${esc(contactSummary(p))}</p>` : ''}</div>${deadlineDetail(p)}</div><details data-program-id="${p.id}"><summary>查看条件、来源与扩展字段</summary><div class="facts-grid">${p.facts.map(f => `<div><h4>${esc(f.label)}</h4><p>${esc(f.value)}</p><small>${sourceLink(f.sourceId)}${f.cycle ? ` · ${esc(f.cycle)}` : ''}${f.verifiedAt ? ` · 核对于 ${esc(f.verifiedAt)}` : ''}</small></div>`).join('')}${Object.entries(p.customFields || {}).map(([k, v]) => `<div><h4>${esc(k)}</h4><p>${esc(v)}</p></div>`).join('') || (!p.facts.length ? '<p class="muted">由 Agent 逐项核对后补充。</p>' : '')}</div>${p.url ? `<a class="text-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">项目官网 ↗</a>` : ''}</details></article>`).join('') || empty('目标清单还在等你。', '告诉 Agent 你的方向、偏好和约束，让它先整理一批值得核对的项目。', '请根据我的申请档案补充目标项目，并保留来源和未知项。')}</div>`;
}

function comparison() {
  const chosen = workspace.programs.filter(p => compare.has(p.id));
  const rows = [['方向', p => trackName(p.track)], ['匹配依据', p => p.fit], ['当前阶段', p => programStage(p)], ['日期', p => `${p.deadline.date || '待核对'} ${p.deadline.time || ''} · ${p.deadline.timezone || '时区待核对'} · ${{ official: '官方', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[p.deadline.basis]}`], ['导师与资助', p => p.track === 'phd' ? `${p.supervisor || '待核对'}；${fundingSummary(p)}` : '见各项来源要求'], ['下一步', p => p.nextAction]];
  return `<section class="comparison"><div class="section-head"><h2>并排比较</h2><button class="button quiet" id="clear-compare">清空选择</button></div><div class="table-scroll"><table><caption class="sr-only">所选项目对比</caption><thead><tr><th scope="col">比较项目</th>${chosen.map(p => `<th scope="col">${esc(p.institution)}<small>${esc(p.name)}</small></th>`).join('')}</tr></thead><tbody>${rows.map(([k, fn]) => `<tr><th scope="row">${k}</th>${chosen.map(p => `<td>${esc(fn(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

function timeline() {
  const dates = workspace.programs.filter(p => p.deadline.date && matchesTrack(p)).sort((a, b) => a.deadline.date.localeCompare(b.deadline.date));
  const todo = workspace.tasks.filter(t => t.due && matchesTrack(t)).sort((a, b) => a.due.localeCompare(b.due));
  return heading('把准备，放进时间里。', '官方截止日、个人安排与往年参考各自标明。日期按对应时区的自然日显示。') + trackFilter() +
    `<section class="section"><div class="section-head"><h2>项目日期</h2></div><div class="timeline-list">${dates.map(p => `<article class="timeline-row"><div class="timeline-date"><b>${dateLabel(p.deadline.date)}</b><small>${p.deadline.date.slice(0, 4)}</small></div><div><h3>${esc(p.institution)} · ${esc(p.name)}</h3>${deadlineDetail(p)}</div></article>`).join('') || '<p class="muted">还没有经过整理的项目日期。请让 Agent 从官方来源核对，不确定时保留未知。</p>'}</div></section><section class="section"><div class="section-head"><h2>已安排的任务</h2><span class="muted">个人计划 · UTC 自然日</span></div>${todo.map(taskRow).join('') || '<p class="muted">让 Agent 根据申请窗口倒排准备时间。</p>'}</section>` + lifecycleDates(workspace, lifecycleContext());
}

function materials() {
  const tasks = workspace.tasks.filter(matchesTrack), items = workspace.materials.filter(matchesTrack);
  return heading('准备充分，再向前一步。', '材料状态和个人任务由 Agent 维护；完成待办不会改变项目的官方要求。', promptButton('请整理我的材料和任务：根据实际进展更新完成状态、安排日期，并指出待核对的要求。先读取当前记录，不把个人勾选当成官方核实。', '更新进度')) + trackFilter() +
    `<section class="section"><div class="section-head"><h2>申请材料</h2><span class="muted">${items.filter(m => m.status === '已就绪').length} / ${items.length} 已就绪</span></div><div class="material-list">${items.map(m => { const p = workspace.programs.find(p => p.id === m.programId); return `<article><span class="material-icon">${icon('file')}</span><div><h3>${esc(m.name)}</h3><p class="material-program">${p ? `${esc(p.institution)} · ${esc(p.name)}` : '通用材料'}</p><p>${esc(m.note)}</p></div>${pill(m.status, m.status === '已就绪' ? 'green' : m.status === '待核对' ? 'amber' : '')}</article>`; }).join('') || empty('让 Agent 整理你的材料清单。', '从已有材料开始，再补充各项目的特殊要求。')}</div></section><section class="section"><div class="section-head"><h2>分阶段任务</h2><span class="muted">${tasks.filter(t => t.done).length} / ${tasks.length} 已完成</span></div>${STAGES.map(s => { const group = tasks.filter(t => t.stage === s); return group.length ? `<div class="task-group"><h3 class="group-title">${s}</h3>${group.map(taskRow).join('')}</div>` : ''; }).join('') || '<p class="muted">请使用引导技能建立第一批任务。</p>'}</section>`;
}

function unresolvedChanges() {
  return workspace.sources.filter(s => {
    const changed = [...workspace.observations].reverse().find(o => o.sourceId === s.id && o.status === 'changed');
    return changed && s.reviewedHash !== changed.hash;
  });
}

function sources() {
  const latest = id => [...workspace.observations].reverse().find(o => o.sourceId === id);
  const changes = unresolvedChanges();
  return heading('每条信息，都能回到出处。', '检查网页变化后，由 Agent 核对正文、适用周期和实际要求，再更新申请信息。', promptButton('请运行 npm run agent -- check-sources，查看来源变化。对有变化、出错或过时的来源逐个核对。只有核对过的事实才能更新 verifiedAt，网页抓取时间不能当作事实核验日期。', '检查并核对来源')) +
    `<div class="source-status"><span class="dot"></span><p>页面：Agent 写入后自动同步。官网检查：${workspace.settings.refreshMinutes ? `每 ${workspace.settings.refreshMinutes} 分钟一次，仅服务运行期间有效` : '按需检查，定时检查尚未开启'}。</p></div>${changes.length ? `<div class="notice">${changes.length} 个来源有变化待核对。未变化的页面也可能包含过期信息。</div>` : ''}
    <section class="section"><div class="section-head"><h2>资料来源</h2><span class="muted">${workspace.sources.length} 个来源</span></div><div class="source-list">${workspace.sources.map(s => { const o = latest(s.id); return `<article><div class="source-title"><h3>${sourceLink(s.id)}</h3>${o ? pill({ baseline: '已建基线', unchanged: '文本未变', changed: '发现变化', error: '检查失败' }[o.status], ['changed', 'error'].includes(o.status) ? 'amber' : 'green') : pill('尚未检查')}</div><p>${esc(s.note)}</p><div class="source-dates"><span>适用周期：${esc(s.cycle || '待核对')}</span><span>事实核验：${esc(s.verifiedAt || '尚未核验')}</span><span>网页检查：${o ? esc(new Date(o.checkedAt).toLocaleString('zh-CN', { hour12: false })) : '尚未检查'}</span></div>${o ? `<p class="observation">${esc(o.message)}</p>` : ''}</article>`; }).join('') || empty('从官方来源开始。', '由 Agent 整理项目官网、招生条例、导师和资助信息，并标明核对日期。')}</div></section>
    <section class="section"><h2>变化记录</h2><div class="observation-list">${workspace.observations.slice(-20).reverse().map(o => `<div><time>${esc(new Date(o.checkedAt).toLocaleString('zh-CN', { hour12: false }))}</time><span>${sourceLink(o.sourceId)} · ${esc(o.message)}</span></div>`).join('') || '<p class="muted">首次检查只建立文本基线，后续检查才会比较变化。</p>'}</div></section>`;
}

function profile() {
  const p = workspace.profile;
  const groups = [
    ['申请定位', [['displayName', '称呼'], ['track', '申请方向'], ['cycle', '入学周期'], ['field', '学科方向'], ['regions', '地区与语言偏好'], ['goals', '申请目标']]],
    ['背景与约束', [['education', '教育背景'], ['academicRecord', '成绩与计分体系'], ['degreeDocuments', '学位与材料情况'], ['language', '语言与考试'], ['budget', '预算'], ['constraints', '其他约束']]],
    ...(p.track !== 'phd' ? [['硕士申请', [['prerequisites', '先修课程与学分']]]] : []),
    ...(p.track !== 'master' ? [['博士申请', [['researchInterests', '研究兴趣'], ['researchExperience', '研究经历与方法'], ['publications', '成果与写作样本'], ['supervisorPreferences', '导师与指导偏好'], ['fundingNeeds', '资助需求']]]] : [])
  ];
  return heading('让计划，适合你的真实情况。', '档案由你与 Agent 的对话整理。未知、未考和暂不确定都可以如实保留。', promptButton('请使用 $grad-apply-onboarding 检查我的 GradAtlas 档案。只追问尚缺或有变化的信息，按硕士/博士特化维护。更新前给出修改摘要，使用当前版本号合并写入。', '与 Agent 更新档案')) + groups.map(([title, fields]) => `<section class="section"><h2>${title}</h2><dl class="profile-grid">${fields.map(([key, label]) => `<div><dt>${label}</dt><dd>${esc(key === 'track' ? trackName(p[key]) : p[key] || '尚未整理')}</dd></div>`).join('')}</dl></section>`).join('') + (p.customFields && Object.keys(p.customFields).length ? `<section class="section"><h2>自定义档案</h2><dl class="profile-grid">${Object.entries(p.customFields).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>` : '');
}

function extensions() {
  return heading('让工作区适合你的申请方式。', '课程匹配、套磁记录、奖学金、阅读计划……告诉 Agent 你还想看什么。', promptButton('请为我的 GradAtlas 添加一个扩展模块。先问清楚我要记录什么，再选择 extensions 数据表、customFields 或可信的本地代码模块。说明保存位置和验证方法。', '添加一个功能')) +
    (workspace.extensions.map(e => `<section class="section extension"><h2>${esc(e.title)}</h2><p class="muted">${esc(e.description)}</p><div class="table-scroll"><table><caption class="sr-only">${esc(e.title)}</caption><thead><tr>${e.fields.map(f => `<th scope="col">${esc(f)}</th>`).join('')}</tr></thead><tbody>${e.items.map(item => `<tr>${e.fields.map(f => `<td>${esc(item[f] || '待补充')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('') || empty('你的工作方式，由你决定。', '先从一张自定义记录表开始。复杂功能可以通过源码扩展，数据和程序分别维护。')) + '<div id="custom-extensions"></div>';
}

function agent() {
  const start = '请使用 $grad-apply-onboarding 帮我建立 GradAtlas 申请工作区。先读 AGENTS.md、skills/grad-apply-onboarding/SKILL.md，再检查本地记录。逐轮提问，根据硕士或博士分别追问。配置和更新由你整理完成，不让我手工填表；保留未知项，写入前检查版本并校验，网页自动刷新。';
  return heading('和你的 Agent，一起推进申请。', '使用你已有的编码 Agent。网页展示计划，Agent 负责整理配置、查证资料与更新进展。') +
    `<section class="agent-start"><h2>把这段话交给 Agent</h2><p>在仓库目录启动 Agent，或把仓库目录作为工作区打开。首次使用按阶段引导，后续只补充变化。</p><blockquote>${esc(start)}</blockquote><button class="button primary" data-prompt="${esc(start)}">${icon('spark')}复制开始提示词</button></section>
    <section class="section"><h2>可以这样接着聊</h2><div class="conversation-list">${[
      ['资料有变化', '我的语言成绩出来了。请更新档案，再检查哪些项目的要求还需要核对。'],
      ['硕士选校', '请核对这些硕士项目的先修课程、学分、材料和费用，附官方来源与适用周期。'],
      ['博士匹配', '请根据我的研究经历整理导师和课题组，区分研究匹配、岗位条件与资助。联系邮件先给我草稿。'],
      ['日常推进', '看看我的待办和最近日期，结合新回复更新计划，明确今天先做什么。'],
      ['新增功能', '我想增加一份奖学金跟踪表，请先问清字段，再加入我的扩展模块。']
    ].map(([title, text]) => `<article><div><h3>${title}</h3><p>“${esc(text)}”</p></div>${promptButton(text, '复制')}</article>`).join('')}</div></section>
    <section class="section"><h2>本地维护与备份</h2><p class="prose">Agent 使用 <code>npm run agent</code> 读取、校验和更新 <code>.local/workspace.json</code>。每次写入检查版本号并生成本地备份。改端口或换浏览器不会改变同一目录里的申请记录；换电脑时迁移整个 <code>.local/</code>。</p><div class="inline-note">${icon('link')}<p>程序不自带模型账号，也不自动向外发送你的资料。定时官网检查需要 Agent 配置，服务运行期间才会执行。发送邮件或递交申请前，由用户明确授权。</p></div></section>`;
}

function lifecycleContext() { return { esc, pill, heading, promptButton, trackFilter, matchesTrack, sourceLink, empty }; }
function practiceView(view, data, controls) {
  const saved = { workspace, track, query, stage, compare };
  try { workspace = data; track = controls.track; query = controls.query; stage = controls.stage; compare = new Set(controls.compare); return views[view](); }
  finally { ({ workspace, track, query, stage, compare } = saved); }
}
function helpContext() { return { esc, heading, promptButton, icon, names, renderPractice: practiceView }; }
let tutorialStorage;
try { tutorialStorage = window.localStorage; } catch { tutorialStorage = { getItem() { throw new Error('无法读取教程进度'); } }; }
const tutorial = createTutorial({ storage: tutorialStorage, repaint: () => { if (currentView() === 'tutorial') render(); }, copyText: copy });
const views = { home, programs, applications: () => applicationsView(workspace, lifecycleContext()), timeline, materials, decisions: () => decisionsView(workspace, lifecycleContext()), sources, profile, extensions, agent, guide: () => helpView(helpContext(), tutorial.hasProgress()), tutorial: () => tutorial.render(helpContext()) };
function render() {
  const view = currentView();
  if (!workspace && !['guide', 'tutorial'].includes(view)) return;
  const open = new Set([...document.querySelectorAll('details[open]')].map(d => d.dataset.programId || d.dataset.recordId));
  const focused = document.activeElement?.id;
  const tourFocusKey = ['data-tour-action', 'data-tour-track', 'data-tour-lesson'].find(key => document.activeElement?.hasAttribute(key));
  const tourFocusValue = tourFocusKey ? document.activeElement.getAttribute(tourFocusKey) : '';
  const selection = focused === 'search' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  $('#content').innerHTML = views[view]();
  document.querySelectorAll('details[data-program-id], details[data-record-id]').forEach(d => { d.open = open.has(d.dataset.programId || d.dataset.recordId); });
  if (view === 'tutorial') tutorial.afterRender($('#content'));
  if (view === 'extensions') for (const [id, renderer] of renderers) {
    try { const node = renderer(structuredClone(workspace)); if (!(node instanceof Node)) throw new Error('扩展需要返回 DOM 节点'); const section = document.createElement('section'); section.className = 'section'; section.append(node); $('#custom-extensions').append(section); }
    catch { const p = document.createElement('p'); p.className = 'notice'; p.textContent = `扩展 ${id} 未能显示，请让 Agent 检查本地代码。`; $('#custom-extensions').append(p); }
  }
  if (focused) { const el = document.getElementById(focused); el?.focus(); if (selection) el?.setSelectionRange?.(...selection); }
  else if (view === 'tutorial' && tourFocusKey) { const el = $('#content').querySelector(`[${tourFocusKey}="${CSS.escape(tourFocusValue)}"]`); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  document.querySelectorAll('nav [data-view], .rail-bottom [data-view]').forEach(a => { a.classList.toggle('active', a.dataset.view === view); if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#breadcrumb').textContent = `申请工作区 / ${names[view]}`;
  const live = workspace || blankWorkspace();
  $('#workspace-label').textContent = live.profile.cycle ? `${live.profile.cycle} · ${trackName(live.profile.track)}` : '从一次对话开始';
  const count = workspace ? unresolvedChanges().length : 0; $('#source-count').textContent = count; $('#source-count').hidden = !count;
  $('#version').textContent = workspace ? `本地版本 ${live.revision}${live.updatedAt ? ` · ${new Date(live.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新` : ' · 等待 Agent 整理'}` : '等待本地记录恢复 · 帮助仍可使用';
  $('#banner').hidden = !demo; $('#banner').textContent = demo ? '示例工作区 · 人物、院校、要求与日期均为虚构，仅用于演示功能。' : '';
}

const load = createLatestLoader(async () => {
  try {
    const res = await fetch(STATIC ? '/api/state/index.html' : '/api/state', { cache: 'no-store' });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || '无法读取本地记录');
    const nextSignature = JSON.stringify(data);
    if (nextSignature !== signature) { workspace = data.workspace; demo = data.demo; signature = nextSignature; compare = new Set([...compare].filter(id => workspace.programs.some(p => p.id === id))); render(); }
    $('#error').hidden = true;
  } catch (e) { $('#error').textContent = `${e.message}。当前画面保留；请让 Agent 检查记录或确认本地服务正在运行。`; $('#error').hidden = false; if (!workspace) render(); }
});

let toastTimer;
async function copy(text) {
  let success = true;
  try { await navigator.clipboard.writeText(text); $('#toast').textContent = '已复制。粘贴给你的 Agent，即可接着整理。'; }
  catch { success = false; $('#toast').textContent = `复制受限，请手动复制：${text}`; }
  $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 7000);
  return success;
}
document.addEventListener('click', async e => {
  if (currentView() === 'tutorial' && await tutorial.handleClick(e)) return;
  const prompt = e.target.closest('[data-prompt]'); if (prompt) copy(prompt.dataset.prompt);
  const tab = e.target.closest('[data-track]'); if (tab) { track = tab.dataset.track; render(); }
  if (e.target.closest('#clear-compare')) { compare.clear(); render(); }
});
document.addEventListener('input', e => { if (currentView() === 'tutorial' && tutorial.handleInput(e)) return; if (e.target.id === 'search') { query = e.target.value; render(); } });
document.addEventListener('change', e => {
  if (currentView() === 'tutorial' && tutorial.handleChange(e)) return;
  if (e.target.id === 'stage-filter') { stage = e.target.value; render(); }
  if (e.target.matches('[data-compare]')) {
    const id = e.target.dataset.compare;
    if (e.target.checked && compare.size >= 3) { e.target.checked = false; $('#toast').textContent = '最多同时比较 3 个项目。'; $('#toast').hidden = false; setTimeout(() => { $('#toast').hidden = true; }, 3000); return; }
    e.target.checked ? compare.add(id) : compare.delete(id); render();
  }
});
window.addEventListener('hashchange', () => { render(); $('#content').focus({ preventScroll: true }); window.scrollTo({ top: 0 }); });
function updateDate() { $('#today').textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }); }
updateDate(); setInterval(updateDate, 60000);
await load();
let connected = false;
if (!STATIC) {
  const events = new EventSource('/api/events');
  events.addEventListener('connected', () => { connected = true; $('#connection').innerHTML = '<i class="dot"></i>实时同步已连接'; load(); });
  events.addEventListener('revision', load);
  events.addEventListener('data-error', e => { $('#error').textContent = `${JSON.parse(e.data).message}。当前记录未被覆盖，请让 Agent 检查。`; $('#error').hidden = false; });
  events.onerror = () => { connected = false; $('#connection').innerHTML = '<i class="dot amber-dot"></i>正在重连 · 定时读取'; };
  // Reconnects reread the latest snapshot, covering updates missed while a tab was suspended.
  setInterval(() => { if (!connected) load(); }, 10000);
} else $('#connection').textContent = '静态示例';
const countdownKey = () => `${new Date().toDateString()}|${workspace?.programs.map(p => daysUntil(p.deadline.date, p.deadline.timezone)).join(',')}`;
let todayKey = countdownKey();
setInterval(() => { const next = countdownKey(); if (todayKey !== next) { todayKey = next; render(); } }, 60000);
