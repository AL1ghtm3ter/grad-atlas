import { blankApplication, programStage } from '../lib/lifecycle.mjs';
import { daysUntil } from '../lib/model.mjs';

export function applicationsView(w, c) {
  const { esc, pill, heading, promptButton, trackFilter, matchesTrack } = c;
  const targets = w.programs.filter(matchesTrack);
  const row = (cells, head = false) => `<tr>${cells.map(v => head ? `<th scope="col">${v}</th>` : `<td>${v}</td>`).join('')}</tr>`;
  const table = (caption, labels, rows) => `<div class="table-scroll"><table><caption class="sr-only">${esc(caption)}</caption><thead>${row(labels.map(esc), true)}</thead><tbody>${rows.map(values => row(values)).join('')}</tbody></table></div>`;
  return heading('从准备，到确认收到。', '逐项目记录招生模式、申请递交、推荐信、导师联系与面试。草稿和已发送分别保存。', promptButton('请更新我的申请跟踪。按欧洲岗位/导师制与美国项目制分别核对入口、实际递交、推荐信提交、导师联系和面试。只记录实际进展；发送联系或递交申请需要我的明确授权。', '更新申请跟踪')) + trackFilter() +
    (targets.map(p => {
      const a = p.application || blankApplication();
      const submitted = a.references.filter(r => r.status === '已提交').length;
      return `<article class="workflow-item section"><div class="section-head"><div><h2>${esc(p.institution)} · ${esc(p.name)}</h2><p class="muted">${esc(p.region)} · ${esc(a.route)}</p></div>${pill(a.status, ['已递交', '已确认收到'].includes(a.status) ? 'green' : '')}</div><div class="workflow-summary"><div><span>申请递交</span><strong>${esc(a.submittedOn || '尚未记录递交')}</strong></div><div><span>推荐信</span><strong>${a.references.length ? `${submitted} / ${a.references.length} 已提交` : '按项目要求整理'}</strong></div><div><span>申请编号</span><strong>${esc(a.referenceNumber || '未记录')}</strong></div><div><span>申请入口</span>${a.portal ? `<a href="${esc(a.portal)}" target="_blank" rel="noopener noreferrer">打开官方入口 ↗</a>` : '<strong>待核对</strong>'}</div></div>${a.note ? `<p class="workflow-note">${esc(a.note)}</p>` : ''}<details data-record-id="${p.id}-application"><summary>推荐信、导师联系与面试详情</summary>
        <section class="workflow-section"><h3>各项申请日期</h3>${a.milestones?.length ? table(`${p.institution} 多项日期`, ['事项', '状态', '日期 / 时区', '口径 / 来源', '备注'], a.milestones.map(m => [esc(m.title), pill(m.status), `${esc(m.deadline.date || '待核对')}<small>${esc(m.deadline.timezone || '时区待核对')}</small>`, `${pill({ official: '官方日期', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[m.deadline.basis], m.deadline.basis === 'official' ? 'green' : 'amber')}<small>${esc(m.deadline.cycle)} ${m.deadline.sourceId ? c.sourceLink(m.deadline.sourceId) : ''}</small>`, esc(m.note)])) : '<p class="muted">可分别整理网申、推荐信、资助与答复等日期；每一项保留自己的来源、周期与时区。</p>'}</section>
        <section class="workflow-section"><h3>推荐信 · 按项目单独跟踪</h3>${a.references.length ? table(`${p.institution} 推荐信`, ['推荐人称呼', '状态', '个人安排日期', '提交日期', '备注'], a.references.map(r => [esc(r.label), pill(r.status, r.status === '已提交' ? 'green' : ''), esc(r.due || '待安排'), esc(r.submittedOn || '未提交'), esc(r.note)])) : '<p class="muted">由 Agent 核对推荐人数、要求和提交入口后添加；未整理不表示无需推荐信。</p>'}</section>
        <section class="workflow-section"><h3>导师联系与跟进</h3>${a.contacts.length ? table(`${p.institution} 联系记录`, ['对象 / 主题', '状态', '实际日期', '跟进日期', '记录'], a.contacts.map(r => [esc(r.label), pill(r.status, r.status === '草稿待审' ? 'amber' : ''), esc(r.date || '未发送'), esc(r.followUp || '待安排'), esc(r.note)])) : '<p class="muted">尚未整理联系记录。邮件草稿与已发送分别记录，对外发送需用户明确授权。</p>'}</section>
        <section class="workflow-section"><h3>面试安排与复盘</h3>${a.interviews.length ? table(`${p.institution} 面试`, ['面试', '状态', '原定时间与时区', '方式', '准备 / 复盘'], a.interviews.map(i => [esc(i.title), pill(i.status), esc(i.date ? `${i.date} ${i.time} · ${i.timezone}` : '待安排'), esc(i.format), esc(i.note)])) : '<p class="muted">尚未记录面试。确定后补齐日期、时刻与时区，完成后保留复盘。</p>'}</section></details></article>`;
    }).join('') || c.empty('先整理目标，再开始跟踪。', 'Agent 添加目标项目后，可以分别记录欧洲岗位、导师制或美国项目制的申请流程。'));
}

export function decisionsView(w, c) {
  const { esc, pill, heading, promptButton, trackFilter, matchesTrack, sourceLink } = c;
  const targets = w.programs.filter(matchesTrack);
  const offers = targets.filter(p => ['录取', '已接受', '已婉拒', '已入学'].includes(p.application?.decision.status));
  const amount = f => [f.amount, f.currency, f.period].filter(Boolean).join(' · ') || '待核对';
  const compareFields = [
    ['研究与导师', p => `${p.fit || '待核对'}${p.supervisor ? `；${p.supervisor}` : ''}`],
    ['个人决定', p => p.application.decision.status],
    ['资助状态', p => p.application.funding.status],
    ['金额与周期', p => amount(p.application.funding)],
    ['期限与学费', p => `${p.application.funding.duration || '期限待核对'}；${p.application.funding.tuition || '学费覆盖待核对'}`],
    ['录取条件', p => p.application.decision.conditions || '待核对'],
    ['答复日期', p => `${p.application.decision.responseDue || '待核对'} · ${p.application.decision.timezone || '时区待核对'}`]
  ];
  return heading('看清条件，再作选择。', '录取、资助和个人决定分别记录。比较金额时保留币种与周期，不自动换算或作选择。', promptButton('请根据正式结果更新录取、资助、答复日期和入学安排。比较每个 offer 的研究匹配、导师、资金、学费和条件，保留未知。接受、婉拒或撤回只在我明确决定后记录，对外回复另需授权。', '整理录取与入学')) + trackFilter() +
    (offers.length ? `<section class="section"><div class="section-head"><h2>录取条件对比</h2><span class="muted">${offers.length} 项 · 保留原币种和资助口径</span></div><div class="table-scroll"><table class="offer-table"><caption class="sr-only">录取与资助比较</caption><thead><tr><th scope="col">比较内容</th>${offers.map(p => `<th scope="col">${esc(p.institution)}<small>${esc(p.name)}</small></th>`).join('')}</tr></thead><tbody>${compareFields.map(([label, render]) => `<tr><th scope="row">${label}</th>${offers.map(p => `<td>${esc(render(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '<p class="workflow-note">正式结果到来后，这里会显示录取与资助对比。当前仍可以跟踪候补、拒绝结果和待确认事项。</p>') +
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
    for (const m of a.milestones || []) if (m.deadline.date && m.status === '待处理') events.push({ date: m.deadline.date, label: `${p.institution} · ${m.title}`, detail: `${{ official: '官方日期', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[m.deadline.basis]} · ${m.deadline.timezone || '时区待核对'} · ${m.deadline.cycle}`, status: m.status, sourceId: m.deadline.sourceId });
    for (const r of a.references) if (r.due && !['已提交', '不再需要'].includes(r.status)) events.push({ date: r.due, label: `${p.institution} · 推荐信：${r.label}`, detail: '个人安排 · UTC 自然日', status: r.status });
    for (const r of a.contacts) if (r.followUp && r.status !== '已结束') events.push({ date: r.followUp, label: `${p.institution} · 联系跟进：${r.label}`, detail: '个人安排 · UTC 自然日', status: r.status });
    for (const i of a.interviews) if (i.date && i.status === '已安排') events.push({ date: i.date, label: `${p.institution} · ${i.title}`, detail: `${i.time} · ${i.timezone} · ${i.format}`, status: i.status });
    const d = a.decision;
    if (d.responseDue && ['录取', '候补'].includes(d.status)) events.push({ date: d.responseDue, label: `${p.institution} · 录取答复`, detail: `${d.timezone} · 请核对录取函的具体时刻`, status: d.status });
    for (const m of a.enrollment) if (m.due && !['已完成', '不适用'].includes(m.status)) events.push({ date: m.due, label: `${p.institution} · ${m.title}`, detail: '个人入学安排 · UTC 自然日', status: m.status });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return `<section class="section"><div class="section-head"><h2>推荐信、联系、面试与入学</h2></div><div class="lifecycle-dates">${events.map(e => `<article><time>${esc(e.date)}</time><div><h3>${esc(e.label)}</h3><p>${esc(e.detail)} ${e.sourceId ? c.sourceLink(e.sourceId) : ''}</p></div>${pill(e.status)}</article>`).join('') || '<p class="muted">尚未安排后续事项，由 Agent 整理后自动加入时间线。</p>'}</div></section>`;
}
