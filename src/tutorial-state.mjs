export const TUTORIAL_KEY = 'gradatlas.tutorial.v1';
export const LESSONS = [
  { id: 'agent', title: '把信息交给 Agent', view: 'profile', goal: '复制一段引导提示词，知道从哪里开始对话。' },
  { id: 'targets', title: '找到并比较目标', view: 'programs', goal: '搜索“北岸”，再清空搜索并勾选两个项目比较。' },
  { id: 'sources', title: '分清日期与来源', view: 'sources', goal: '观察网页变化，再决定这条信息应怎样核对。' },
  { id: 'references', title: '材料与推荐信', view: 'applications', goal: '辨别材料准备和推荐人提交，查看逐项目状态。' },
  { id: 'offers', title: '录取与资助分开看', view: 'decisions', goal: '在练习中记录接受，检查资助是否仍待确认。' },
  { id: 'updates', title: '更新计划与加功能', view: 'home', goal: '模拟 Agent 更新待办，再添加一张扩展表。' },
  { id: 'backup', title: '备份、恢复与回看', view: 'materials', goal: '暂存练习备份，识别损坏数据，再恢复有效记录。' }
];
export const FLAGS = ['promptCopied', 'searched', 'compared', 'sourceObserved', 'sourceRouted', 'sourceReviewed', 'materialReady', 'referenceRouted', 'referenceConfirmed', 'offerSeparated', 'offerAccepted', 'agentUpdated', 'extensionAdded', 'backupCreated', 'backupRejected', 'backupRestored'];
export function blankProgress() { return { current: 0, done: [], skipped: [], flags: [], practiceFlags: [], backupFlags: null, query: '', selected: [], preview: '' }; }
export function blankTutorial() { return { version: 1, track: 'master', tracks: { master: blankProgress(), phd: blankProgress() } }; }
export function validateTutorial(value) {
  const object = (v, keys) => { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) throw new Error('教程进度结构不正确'); };
  object(value, ['version', 'track', 'tracks']);
  if (value.version !== 1 || !['master', 'phd'].includes(value.track)) throw new Error('教程版本或方向不正确');
  object(value.tracks, ['master', 'phd']);
  for (const track of ['master', 'phd']) {
    const p = value.tracks[track]; object(p, ['current', 'done', 'skipped', 'flags', 'practiceFlags', 'backupFlags', 'query', 'selected', 'preview']);
    if (!Number.isInteger(p.current) || p.current < 0 || p.current >= LESSONS.length) throw new Error('教程课次无效');
    for (const key of ['done', 'skipped']) if (!Array.isArray(p[key]) || p[key].length > LESSONS.length || p[key].some(id => !LESSONS.some(l => l.id === id)) || new Set(p[key]).size !== p[key].length) throw new Error('教程完成记录无效');
    if (!Array.isArray(p.flags) || p.flags.length > FLAGS.length || p.flags.some(f => !FLAGS.includes(f)) || new Set(p.flags).size !== p.flags.length) throw new Error('教程练习记录无效');
    for (const key of ['practiceFlags', 'backupFlags']) if (p[key] !== undefined && p[key] !== null && (!Array.isArray(p[key]) || p[key].length > FLAGS.length || p[key].some(f => !FLAGS.includes(f)) || new Set(p[key]).size !== p[key].length)) throw new Error('教程实例或备份记录无效');
    if (typeof p.query !== 'string' || p.query.length > 120 || !Array.isArray(p.selected) || p.selected.length > 3 || p.selected.some(id => !['practice-north', 'practice-river'].includes(id)) || new Set(p.selected).size !== p.selected.length) throw new Error('教程筛选记录无效');
    if (typeof p.preview !== 'string' || !['', 'home', 'profile', 'programs', 'applications', 'materials', 'timeline', 'sources', 'decisions', 'extensions'].includes(p.preview)) throw new Error('教程预览无效');
  }
  return value;
}
export function lessonComplete(progress, id) {
  const f = flag => progress.flags.includes(flag);
  return { agent: f('promptCopied'), targets: f('searched') && f('compared'), sources: f('sourceObserved') && f('sourceRouted') && f('sourceReviewed'), references: f('materialReady') && f('referenceRouted') && f('referenceConfirmed'), offers: f('offerSeparated') && f('offerAccepted'), updates: f('agentUpdated') && f('extensionAdded'), backup: f('backupCreated') && f('backupRejected') && f('backupRestored') }[id] || false;
}
export function addFlag(progress, flag) {
  if (!FLAGS.includes(flag)) throw new Error('未知练习操作');
  if (!progress.flags.includes(flag)) progress.flags.push(flag);
  for (const { id } of LESSONS) if (lessonComplete(progress, id)) { if (!progress.done.includes(id)) progress.done.push(id); progress.skipped = progress.skipped.filter(x => x !== id); }
}
export function moveLesson(progress, index, skip = false) {
  if (skip && !progress.done.includes(LESSONS[progress.current].id) && !progress.skipped.includes(LESSONS[progress.current].id)) progress.skipped.push(LESSONS[progress.current].id);
  progress.current = Math.max(0, Math.min(LESSONS.length - 1, index)); progress.preview = '';
}
