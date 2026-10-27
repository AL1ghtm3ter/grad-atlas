import { blankApplication, programStage, isContactReference, referenceSummary, referenceNeedsFollowUp } from '../lib/lifecycle.mjs';
import { daysUntil } from '../lib/model.mjs';
import { MASTER_COMPARISON_FIELDS, customComparisonRows, visibleTrack } from './comparison-view.mjs';

export function applicationsView(w, c) {
  const { esc, pill, heading, promptButton, trackFilter, matchesTrack } = c;
  const targets = w.programs.filter(matchesTrack);
  const masterOnly = visibleTrack(targets, c.track && c.track !== 'all' ? c.track : w.profile.track) === 'master';
  const row = (cells, head = false) => `<tr>${cells.map(v => head ? `<th scope="col">${v}</th>` : `<td>${v}</td>`).join('')}</tr>`;
  const table = (caption, labels, rows) => `<div class="table-scroll"><table><caption class="sr-only">${esc(caption)}</caption><thead>${row(labels.map(esc), true)}</thead><tbody>${rows.map(values => row(values)).join('')}</tbody></table></div>`;
  return heading('从准备，到确认收到。', masterOnly ? '逐硕士项目核对材料、推荐信、递交与项目沟通；面试按实际要求记录。' : '逐项目记录招生模式、申请递交、推荐信、导师联系与面试。草稿和已发送分别保存。', promptButton(masterOnly ? '请更新我的硕士申请跟踪。逐项目核对授课或研究方向、课程与先修、材料、申请入口、实际递交和推荐信；项目沟通与面试按实际要求记录，不自动要求联系导师。只记录实际进展；对外联系或递交申请需要我的明确授权。' : '请更新我的申请跟踪。分别核对硕士课程与材料、博士岗位或项目的入口、实际递交、推荐信、导师联系和面试；招生方式不能只靠地区推断。只记录实际进展；发送联系或递交申请需要我的明确授权。', '更新申请跟踪')) + trackFilter() +
    (targets.map(p => {
      const a = p.application || blankApplication();
      const refs = referenceSummary(a.references);
      return `<article class="workflow-item section"><div class="section-head"><div><h2>${esc(p.institution)} · ${esc(p.name)}</h2><p class="muted">${esc(p.region)} · ${esc(a.route)}</p></div>${pill(a.status, ['已递交', '已确认收到'].includes(a.status) ? 'green' : '')}</div><div class="workflow-summary"><div><span>申请递交</span><strong>${esc(a.submittedOn || '尚未记录递交')}</strong></div><div><span>${esc(refs.label)}</span><strong>${esc(refs.text)}</strong></div><div><span>申请编号</span><strong>${esc(a.referenceNumber || '未记录')}</strong></div><div><span>申请入口</span>${a.portal ? `<a href="${esc(a.portal)}" target="_blank" rel="noopener noreferrer">打开官方入口 ↗</a>` : '<strong>待核对</strong>'}</div></div>${a.note ? `<p class="workflow-note">${esc(a.note)}</p>` : ''}<details data-record-id="${p.id}-application"><summary>${p.track === 'master' ? '推荐信、项目沟通与面试详情' : '推荐信、导师联系与面试详情'}</summary>
        <section class="workflow-section"><h3>各项申请日期</h3>${a.milestones?.length ? table(`${p.institution} 多项日期`, ['事项', '状态', '日期 / 时区', '口径 / 来源', '备注'], a.milestones.map(m => [esc(m.title), pill(m.status), `${esc(m.deadline.date ? `${m.deadline.date}${m.deadline.time ? ` ${m.deadline.time}` : ''}` : '待核对')}<small>${esc(m.deadline.timezone || '时区待核对')}</small>`, `${pill({ official: '官方日期', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[m.deadline.basis], m.deadline.basis === 'official' ? 'green' : 'amber')}<small>${esc(m.deadline.cycle)} ${m.deadline.sourceId ? c.sourceLink(m.deadline.sourceId) : ''}</small>`, esc(m.note)])) : '<p class="muted">可分别整理网申、推荐信、资助与答复等日期；每一项保留自己的来源、周期与时区。</p>'}</section>
        <section class="workflow-section"><h3>推荐信与可联系推荐人 · 按项目单独跟踪</h3>${a.references.length ? table(`${p.institution} 推荐记录`, ['推荐人称呼 / 类型', '状态', '个人安排日期', '提交日期 / 联系资料', '备注'], a.references.map(r => [esc(r.label) + `<small>${isContactReference(r) ? '可联系推荐人，不要求上传信' : '推荐信'}</small>`, pill(r.status, r.status === (isContactReference(r) ? '已同意' : '已提交') ? 'green' : ''), esc(r.due || '待安排'), esc(isContactReference(r) ? r.contactDetails || '联系方式待补充' : r.submittedOn || '未提交'), esc(r.note)])) : '<p class="muted">由 Agent 按官网要求区分推荐信与可联系推荐人；同意被联系不代表已提交信件。</p>'}</section>
        <section class="workflow-section"><h3>${p.track === 'master' ? '项目沟通与跟进' : '导师联系与跟进'}</h3>${a.contacts.length ? table(`${p.institution} 联系记录`, ['对象 / 主题', '状态', '实际日期', '跟进日期', '记录'], a.contacts.map(r => [esc(r.label), pill(r.status, r.status === '草稿待审' ? 'amber' : ''), esc(r.date || '未发送'), esc(r.followUp || '待安排'), esc(r.note)])) : '<p class="muted">尚未整理联系记录。邮件草稿与已发送分别记录，对外发送需用户明确授权。</p>'}</section>
        <section class="workflow-section"><h3>面试安排与复盘</h3>${a.interviews.length ? table(`${p.institution} 面试`, ['面试', '状态', '原定时间与时区', '方式', '准备 / 复盘'], a.interviews.map(i => [esc(i.title), pill(i.status), esc(i.date ? `${i.date} ${i.time} · ${i.timezone}` : '待安排'), esc(i.format), esc(i.note)])) : '<p class="muted">尚未记录面试。确定后补齐日期、时刻与时区，完成后保留复盘。</p>'}</section></details></article>`;
    }).join('') || c.empty('先整理目标，再开始跟踪。', masterOnly ? 'Agent 添加硕士目标后，逐项目整理课程、材料、推荐信、递交和入学要求。' : 'Agent 添加目标项目后，按实际招生方式分别整理硕士与博士流程。'));
}

export function decisionsView(w, c) {
  const { esc, pill, heading, promptButton, trackFilter, matchesTrack, sourceLink } = c;
  const targets = w.programs.filter(matchesTrack);
  const masterOnly = visibleTrack(targets, c.track && c.track !== 'all' ? c.track : w.profile.track) === 'master';
  const offers = targets.filter(p => ['录取', '已接受', '已婉拒', '已入学'].includes(p.application?.decision.status));
  const offerTrack = visibleTrack(offers, masterOnly ? 'master' : 'both');
  const amount = f => [f.amount, f.currency, f.period].filter(Boolean).join(' · ') || '待核对';
  const compareFields = [
    ...(offerTrack === 'master' ? [['课程与先修', p => p.customFields?.['课程与先修']?.trim() ? p.customFields['课程与先修'] : '待核对'], ['匹配依据', p => p.fit || '待核对']] : [[offerTrack === 'phd' ? '研究与导师' : '课程、研究与导师', p => `${p.fit || '待核对'}${p.supervisor ? `；${p.supervisor}` : ''}`]]),
    ['个人决定', p => p.application.decision.status],
    ['资助状态', p => p.application.funding.status],
    ['金额与周期', p => amount(p.application.funding)],
    ['资助期限与学费覆盖', p => `${p.application.funding.duration || '期限待核对'}；${p.application.funding.tuition || '学费覆盖待核对'}`],
    ...customComparisonRows(offers, offers.some(p => p.track === 'master') ? MASTER_COMPARISON_FIELDS : [], offerTrack === 'master' ? ['课程与先修'] : []),
    ['录取条件', p => p.application.decision.conditions || '待核对'],
    ['答复日期', p => `${p.application.decision.responseDue || '待核对'} · ${p.application.decision.timezone || '时区待核对'}`]
  ];
  return heading('看清条件，再作选择。', '录取、资助和个人决定分别记录。比较金额时保留币种与周期，不自动换算或作选择。', promptButton(masterOnly ? '请根据正式硕士结果更新录取、资助、答复日期和入学安排。分别比较课程与先修匹配、学费、学期杂费、生活费、申请费、奖学金、学位补件和注册条件，保留原币种、适用年度与未知项。接受、婉拒或撤回只在我明确决定后记录，对外回复另需授权。' : '请根据正式结果更新录取、资助、答复日期和入学安排。按硕士课程与费用、博士研究匹配与导师分别比较，保留未知、原币种和适用年度。接受、婉拒或撤回只在我明确决定后记录，对外回复另需授权。', '整理录取与入学')) + trackFilter() +
    (offers.length ? `<section class="section"><div class="section-head"><h2>录取条件对比</h2><span class="muted">${offers.length} 项 · 保留原币种和资助口径</span></div><div class="table-scroll"><table class="offer-table"><caption class="sr-only">录取与资助比较</caption><thead><tr><th scope="col">比较内容</th>${offers.map(p => `<th scope="col">${esc(p.institution)}<small>${esc(p.name)}</small></th>`).join('')}</tr></thead><tbody>${compareFields.map(([label, render]) => `<tr><th scope="row">${esc(label)}</th>${offers.map(p => `<td>${esc(render(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '<p class="workflow-note">正式结果到来后，这里会显示录取与资助对比。当前仍可以跟踪候补、拒绝结果和待确认事项。</p>') +
    targets.map(p => {
      const a = p.application || blankApplication(), d = a.decision, f = a.funding;
      const remaining = d.responseDue ? daysUntil(d.responseDue, d.timezone) : null;
      const responsePending = ['录取', '候补'].includes(d.status);
      return `<article class="workflow-item section"><div class="section-head"><div><h2>${esc(p.institution)} · ${esc(p.name)}</h2><p class="muted">${esc(a.route)} · 结果日期 ${esc(d.receivedOn || '未记录')}</p></div>${pill(d.status, ['录取', '已接受', '已入学'].includes(d.status) ? 'green' : '')}</div><div class="decision-grid"><div><h3>录取与个人决定</h3><p>${esc(d.conditions || '录取条件待核对')}</p><p>${d.responseDue ? `答复日期：${esc(d.responseDue)} · ${esc(d.timezone)}` : '答复日期尚未整理'}</p>${responsePending && remaining !== null ? `<p class="${remaining < 0 ? 'danger-text' : ''}">${remaining < 0 ? `答复日期已过 ${-remaining} 天，请核对实际状态` : `按原时区自然日剩 ${remaining} 天`}</p>` : ''}${d.note ? `<p>${esc(d.note)}</p>` : ''}</div><div><h3>资助单独核对</h3><p>${pill(f.status, f.status === '已获资助' ? 'green' : 'amber')} ${esc(f.type)}</p><p>${esc(amount(f))}</p><p>${esc(f.duration || '期限待核对')} · ${esc(f.tuition || '学费覆盖待核对')}</p>${f.sourceId ? sourceLink(f.sourceId) : ''}${f.note ? `<p>${esc(f.note)}</p>` : ''}</div></div><section class="workflow-section"><h3>签证、注册与入学准备</h3>${a.enrollment.length ? `<div class="enrollment-list">${a.enrollment.map(m => `<div><div><h4>${esc(m.title)}</h4><p>${esc(m.note)}</p></div><div>${pill(m.status, m.status === '已完成' ? 'green' : '')}<small>${esc(m.due || '日期待安排')}</small></div></div>`).join('')}</div>` : '<p class="muted">由 Agent 根据正式条件建立入学清单。国籍、目的地或个人情况未知时，签证要求保留待确认。</p>'}</section></article>`;
    }).join('') + (!targets.length ? c.empty('申请结果，逐项看清。', '先由 Agent 整理目标项目，再在这里跟进录取、资助和入学。') : '');
}

export function lifecycleDates(w, c) {
  const { esc, pill, matchesTrack } = c;
  const events = [];
  for (const p of w.programs.filter(matchesTrack)) {
    if (['已撤回', '已婉拒', '未录取', '已入学'].includes(programStage(p))) continue;
    const a = p.application; if (!a) continue;
    for (const m of a.milestones || []) if (m.deadline.date && m.status === '待处理') events.push({ date: m.deadline.date, label: `${p.institution} · ${m.title}`, detail: `${m.deadline.time || '时刻待核对'} · ${{ official: '官方日期', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[m.deadline.basis]} · ${m.deadline.timezone || '时区待核对'} · ${m.deadline.cycle}`, status: m.status, sourceId: m.deadline.sourceId });
    for (const r of a.references) if (r.due && referenceNeedsFollowUp(r)) events.push({ date: r.due, label: `${p.institution} · ${isContactReference(r) ? '推荐人资料' : '推荐信'}：${r.label}`, detail: '个人安排 · UTC 自然日', status: r.status });
    for (const r of a.contacts) if (r.followUp && r.status !== '已结束') events.push({ date: r.followUp, label: `${p.institution} · 联系跟进：${r.label}`, detail: '个人安排 · UTC 自然日', status: r.status });
    for (const i of a.interviews) if (i.date && i.status === '已安排') events.push({ date: i.date, label: `${p.institution} · ${i.title}`, detail: `${i.time} · ${i.timezone} · ${i.format}`, status: i.status });
    const d = a.decision;
    if (d.responseDue && ['录取', '候补'].includes(d.status)) events.push({ date: d.responseDue, label: `${p.institution} · 录取答复`, detail: `${d.timezone} · 请核对录取函的具体时刻`, status: d.status });
    for (const m of a.enrollment) if (m.due && !['已完成', '不适用'].includes(m.status)) events.push({ date: m.due, label: `${p.institution} · ${m.title}`, detail: '个人入学安排 · UTC 自然日', status: m.status });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return `<section class="section"><div class="section-head"><h2>推荐信、联系、面试与入学</h2></div><div class="lifecycle-dates">${events.map(e => `<article><time>${esc(e.date)}</time><div><h3>${esc(e.label)}</h3><p>${esc(e.detail)} ${e.sourceId ? c.sourceLink(e.sourceId) : ''}</p></div>${pill(e.status)}</article>`).join('') || '<p class="muted">尚未安排后续事项，由 Agent 整理后自动加入时间线。</p>'}</div></section>`;
}
