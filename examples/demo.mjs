import { blankWorkspace, templateTasks } from '../lib/model.mjs';
import { blankApplication, enrollmentTemplate } from '../lib/lifecycle.mjs';

// All people, institutions, matches and dates here are synthetic.
export function demoWorkspace(track = 'master', now = new Date()) {
  const w = blankWorkspace(track);
  const day = offset => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
  Object.assign(w.profile, {
    displayName: '示例申请者', cycle: `${now.getFullYear() + 1} 秋季`, field: '环境科学与可持续研究',
    regions: '欧洲 · 英语授课项目', education: '示例大学 · 环境科学本科', academicRecord: '示例成绩 3.5 / 4.0（虚构）',
    language: '英语考试准备中，目标分数待逐项目核对', budget: '每年 20 万元以内（示例约束）',
    constraints: '优先有奖学金或明确资助的项目', goals: '找到研究兴趣匹配、费用可承担的项目',
    prerequisites: '统计、生态学、地理信息课程，学分待核对', degreeDocuments: '成绩单已有；学位证明待整理',
    researchInterests: '城市气候适应与空间数据方法', researchExperience: '一项课程研究和一段研究助理经历（虚构）',
    publications: '暂无正式论文；有一份课程研究报告', supervisorPreferences: '重视方法指导和开放合作', fundingNeeds: '需要覆盖学费与基本生活费的资助'
  });
  const definitions = track === 'phd' ? [
    ['north-climate', '城市气候适应博士岗位', '北岸大学', '荷兰', '陈教授（虚构）', '城市韧性课题组', '岗位资助待书面核对', '已准备联系草稿'],
    ['river-spatial', '空间数据与环境博士', '河谷理工学院', '瑞典', '林教授（虚构）', '空间方法实验室', '奖学金条件待核对', '尚未联系'],
    ['forest-ecology', '生态系统建模博士', '森林大学', '德国', '周教授（虚构）', '生态建模课题组', '资助期限待核对', '等待回复（虚构）']
  ] : [
    ['north-climate', '气候与环境科学硕士', '北岸大学', '荷兰'],
    ['river-spatial', '空间数据科学硕士', '河谷理工学院', '瑞典'],
    ['forest-ecology', '生态与可持续发展硕士', '森林大学', '德国']
  ];
  w.sources = [{ id: 'demo-source', label: '虚构资料说明', url: 'https://example.org/', cycle: w.profile.cycle, verifiedAt: '', note: '演示内容，无真实招生结论。' }];
  w.programs = definitions.map(([id, name, institution, region, supervisor, lab, funding, contactStatus], i) => ({
    id, name, institution, region, track, stage: ['准备中', '调研中', '已联系'][i], url: '',
    fit: ['研究方向相符，需进一步核对方法训练', '课程与工具训练互补，待核对先修条件', '兴趣匹配，费用与资助信息待补充'][i],
    nextAction: track === 'phd' ? ['完善研究匹配说明，交给用户审阅', '核对岗位资助和合同期限', '整理已收到的回复和待确认问题'][i] : ['逐门核对先修课程与学分', '确认成绩单与语言材料要求', '核对学费、杂费和生活费口径'][i],
    deadline: { date: day([12, 29, 45][i]), timezone: 'Europe/Amsterdam', basis: 'personal', sourceId: '', cycle: w.profile.cycle },
    facts: track === 'phd' ? [
      { label: '研究方法', value: '空间统计、城市气候建模（虚构）', sourceId: '', cycle: '', verifiedAt: '' },
      { label: '资助', value: funding, sourceId: '', cycle: '', verifiedAt: '' }
    ] : [
      { label: '先修学分', value: '统计与环境课程要求待核对', sourceId: '', cycle: '', verifiedAt: '' },
      { label: '费用', value: '学费、杂费、生活费分别待核对', sourceId: '', cycle: '', verifiedAt: '' }
    ], ...(track === 'phd' ? { supervisor, lab, funding, contactStatus } : {})
  }));
  w.tasks = templateTasks(track);
  w.tasks[0].done = true;
  w.tasks[1].due = day(3); w.tasks[1].priority = 'high'; w.tasks[1].programId = 'north-climate';
  w.tasks[2].due = day(6); w.tasks[2].programId = 'river-spatial';
  w.tasks[3].due = day(9);
  w.programs.forEach((p, i) => {
    const a = blankApplication(track === 'master' ? '项目制' : ['岗位招聘', '项目制', '导师制'][i]);
    a.status = i === 2 ? '已确认收到' : '已递交'; a.submittedOn = day(-7 - i); a.referenceNumber = `DEMO-${i + 1}`;
    a.note = '虚构申请记录，未发送邮件或递交真实申请。';
    a.references = [
      { id: 'ref-1', label: '推荐人 A（虚构）', status: '已提交', due: day(-4), submittedOn: day(-5), note: '仅示例提交状态' },
      { id: 'ref-2', label: '推荐人 B（虚构）', status: i === 2 ? '已提交' : '已同意', due: day(4 + i), submittedOn: i === 2 ? day(-3) : '', note: '按该项目要求跟进' }
    ];
    a.contacts = track === 'phd' ? [{ id: 'contact-1', label: p.supervisor || '项目联系人（虚构）', status: i === 1 ? '草稿待审' : '已回复', date: i === 1 ? '' : day(-3), followUp: day(5 + i), note: '示例记录，实际没有发送。' }] : [];
    a.milestones = [{ id: 'funding-date', title: '资助资料核对', deadline: { date: day(7 + i), timezone: 'Europe/Amsterdam', basis: 'personal', sourceId: '', cycle: w.profile.cycle }, status: '待处理', note: '个人演示安排，不是官方截止日。' }];
    if (i === 2) a.interviews = [{ id: 'interview-1', title: '研究讨论（虚构）', status: '已安排', date: day(9), time: '14:00', timezone: 'Europe/Berlin', format: '视频面试', note: '准备方法介绍和研究问题，完成后由 Agent 整理复盘。' }];
    if (i < 2) {
      p.stage = '录取'; a.decision = { status: '录取', receivedOn: day(-2), responseDue: day(14 + i * 7), timezone: 'Europe/Amsterdam', conditions: '取得最终学位、补齐注册材料（虚构条件）', note: '仅用于演示录取和个人选择，无真实录取。' };
      Object.assign(a.funding, { status: i === 0 ? '已获资助' : '待结果', type: track === 'phd' ? '岗位 / 奖学金（虚构）' : '奖学金（虚构）', amount: i === 0 ? '36,500' : '', currency: 'EUR', period: '每年 · 税前（虚构）', duration: track === 'phd' ? '4 年（虚构）' : '2 年（虚构）', tuition: '学费覆盖条件待逐项核对', note: '虚构书面依据说明，用于展示资金与录取分开记录。' });
    }
    a.enrollment = enrollmentTemplate(); p.application = a;
  });
  w.materials = [
    { id: 'transcript', name: '成绩单与学位证明', track: 'both', status: '准备中', note: '核对翻译和认证要求', programId: '' },
    { id: 'language', name: '语言证明', track: 'both', status: '待准备', note: '录入项目要求后再安排考试', programId: '' },
    { id: 'statement', name: track === 'phd' ? '研究计划与写作样本' : '个人陈述', track, status: '待核对', note: '第一稿已整理，待用户审阅（虚构）', programId: '' },
    { id: 'references', name: '推荐信', track: 'both', status: '待准备', note: '核对推荐人数、形式和提交入口', programId: '' }
  ];
  w.extensions = [{ id: 'reading', title: track === 'phd' ? '研究阅读' : '课程匹配', description: '这是 Agent 添加的扩展模块。可以改为套磁记录、奖学金或任何申请相关内容。', fields: track === 'phd' ? ['主题', '阅读进度', '下一步'] : ['课程', '已有训练', '待核对'], items: track === 'phd' ? [{ '主题': '城市热岛与遥感方法', '阅读进度': '整理方法笔记', '下一步': '讨论可研究的问题' }] : [{ '课程': '统计方法', '已有训练': '概率与回归课程', '待核对': '学分与课程大纲' }] }];
  w.revision = 1; w.updatedAt = now.toISOString();
  return w;
}
