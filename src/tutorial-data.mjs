import { blankWorkspace, validateWorkspace } from '../lib/model.mjs';
import { blankApplication, enrollmentTemplate } from '../lib/lifecycle.mjs';

export function practiceWorkspace(track, flags = []) {
  const f = name => flags.includes(name), w = blankWorkspace(track);
  Object.assign(w.profile, { displayName: '教程练习者（虚构）', cycle: '2030 练习周期', field: track === 'phd' ? '城市气候研究（虚构方向）' : '环境科学（虚构方向）', regions: '仅供练习', education: '虚构教育背景', academicRecord: '尚未整理', language: '尚未整理', budget: '尚未整理', goals: '学会与 Agent 配合维护计划', researchInterests: '研究问题待讨论', degreeDocuments: '在读证明与最终学位分别核对' });
  w.sources = [{ id: 'practice-source', label: '练习资料 · 虚构网页', url: 'https://example.org/', cycle: '2030 练习周期', verifiedAt: f('sourceReviewed') ? '2030-10-28' : '', note: '用于练习来源口径，不包含真实院校的招生结论。', reviewedHash: f('sourceReviewed') ? 'b'.repeat(64) : '' }];
  w.programs = [['practice-north', '北岸练习大学', '城市气候'], ['practice-river', '河谷练习大学', '环境数据']].map(([id, institution, topic], i) => {
    const application = blankApplication(track === 'phd' && i === 0 ? '岗位招聘' : '项目制');
    application.status = '准备中'; application.references = [{ id: 'ref-a', label: '推荐人 A（虚构）', status: f('referenceConfirmed') && i === 0 ? '已提交' : '已同意', due: '2030-11-15', submittedOn: f('referenceConfirmed') && i === 0 ? '2030-10-28' : '', note: '同一推荐人向不同项目提交的状态分别记录。' }];
    application.decision = { status: f('offerAccepted') && i === 0 ? '已接受' : '录取', receivedOn: '2030-10-20', responseDue: '2030-11-30', timezone: 'Europe/Berlin', conditions: '取得最终学位（虚构条件）', note: '练习结果，不代表实际录取。' };
    application.funding.note = '资助条件尚未核对；接受练习录取不会改变这一状态。'; application.enrollment = enrollmentTemplate();
    return { id, name: `${topic}${track === 'phd' ? '博士' : '硕士'}（练习）`, institution, region: '虚构地区', track, stage: '准备中', url: '', fit: track === 'phd' ? '比较研究问题、方法与指导条件。' : '比较课程、先修学分与训练方向。', nextAction: track === 'phd' ? '请 Agent 核对导师与资助。' : '请 Agent 核对课程与材料。', deadline: { date: '2030-12-01', timezone: 'Europe/Berlin', basis: 'personal', sourceId: '', cycle: '2030 练习周期' }, facts: [{ label: track === 'phd' ? '招生与资助要求' : '先修课程与学分', value: '等待 Agent 从真实官方资料核对。', sourceId: '', cycle: '', verifiedAt: '' }], ...(track === 'phd' ? { supervisor: '练习导师（虚构）', lab: '练习课题组', funding: '待核对', contactStatus: '未整理' } : {}), application };
  });
  w.tasks = [{ id: 'practice-task', title: f('agentUpdated') ? '练习：根据新回复核对材料' : '练习：整理第一批目标', note: f('agentUpdated') ? '模拟 Agent 写入后，同一页面显示新的待办。' : '真实资料由 Agent 整理，教程只使用虚构记录。', stage: '准备', track, programId: 'practice-north', due: '', done: false, priority: 'high' }];
  w.materials = [{ id: 'practice-letter', name: '推荐信材料（练习）', track, status: f('materialReady') ? '已就绪' : '准备中', note: '材料齐备并不表示推荐人已经向项目提交。', programId: 'practice-north' }];
  if (f('sourceObserved')) w.observations = [{ sourceId: 'practice-source', checkedAt: '2030-10-28T08:00:00Z', hash: 'b'.repeat(64), previousHash: 'a'.repeat(64), status: 'changed', message: '练习网页文本有变化，申请要求仍需 Agent 阅读核对。' }];
  if (f('extensionAdded')) w.extensions = [{ id: 'practice-scholarships', title: '奖学金跟踪（练习）', description: '模拟 Agent 添加的扩展表。', fields: ['名称', '资格', '下一步'], items: [{ '名称': '虚构奖学金', '资格': '待核对', '下一步': '查官方规则与适用周期' }] }];
  w.revision = 1 + Number(f('agentUpdated')) + Number(f('extensionAdded')); w.updatedAt = '2030-10-28T08:00:00Z';
  return validateWorkspace(w);
}
