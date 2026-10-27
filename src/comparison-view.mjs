import { programStage, fundingSummary } from '../lib/lifecycle.mjs';

export const MASTER_COMPARISON_FIELDS = ['课程与先修', '学费', '学期杂费', '生活费', '申请费'];

export function visibleTrack(programs, fallback = 'both') {
  const tracks = [...new Set(programs.map(p => p.track))];
  return tracks.length === 1 ? tracks[0] : tracks.length ? 'both' : fallback;
}

export function customComparisonRows(programs, defaults = [], excluded = []) {
  const keys = new Set([...defaults, ...programs.flatMap(p => Object.keys(p.customFields || {}))]);
  return [...keys].filter(key => !excluded.includes(key)).map(key => [key, p => p.customFields?.[key]?.trim() ? p.customFields[key] : '待核对']);
}

export function programComparisonView(programs, { esc, trackName }) {
  const hasMaster = programs.some(p => p.track === 'master');
  const rows = [
    ['方向', p => trackName(p.track)], ['匹配依据', p => p.fit], ['当前阶段', p => programStage(p)],
    ['日期', p => `${p.deadline.date || '待核对'} ${p.deadline.time || ''} · ${p.deadline.timezone || '时区待核对'} · ${{ official: '官方', personal: '个人计划', historical: '往年参考', unknown: '待核实' }[p.deadline.basis]}`],
    ...customComparisonRows(programs, hasMaster ? MASTER_COMPARISON_FIELDS : []),
    ...(programs.some(p => p.track === 'phd') ? [['导师与资助', p => p.track === 'phd' ? `${p.supervisor || '待核对'}；${fundingSummary(p)}` : '硕士项目，参见课程与费用分项']] : []),
    ['下一步', p => p.nextAction]
  ];
  return `<section class="comparison"><div class="section-head"><h2>并排比较</h2><button class="button quiet" id="clear-compare">清空选择</button></div><div class="table-scroll"><table><caption class="sr-only">所选项目对比</caption><thead><tr><th scope="col">比较项目</th>${programs.map(p => `<th scope="col">${esc(p.institution)}<small>${esc(p.name)}</small></th>`).join('')}</tr></thead><tbody>${rows.map(([label, render]) => `<tr><th scope="row">${esc(label)}</th>${programs.map(p => `<td>${esc(render(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
