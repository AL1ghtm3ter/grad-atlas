export const FEATURES = [
  ['home', '申请总览', '每天先看什么', '查看下一项行动、最近日期和任务进度。尚未明确的成绩、语言和预算可以继续保留未知。', '我刚收到新回复，请结合待办和日期更新今天的计划。'],
  ['profile', '申请档案', '从自己的情况开始', '由 Agent 分轮整理背景、目标与约束。硕士关注课程和学分，博士关注研究经历、导师偏好与资助需求。', '请检查已有档案，只追问缺口或有变化的信息，再整理到本地。'],
  ['programs', '目标项目', '先核对，再比较', '按学校、项目或导师搜索，按阶段筛选，勾选最多三个目标并排比较。课程要求、资助和匹配依据分别保留。', '请按我的背景补充目标，并附官方来源、适用周期和待确认事项。'],
  ['applications', '申请跟踪', '把每个项目分别跟进', '记录项目制、岗位招聘或导师制；分别维护网申、推荐信或可联系推荐人、导师联系和面试。材料已就绪、草稿已写好都不等于已提交。', '请根据实际进展更新递交、逐项目推荐信、联系与面试，保留各自日期和状态。'],
  ['timeline', '申请时间线', '分清日期的含义', '官方日期、个人安排、往年参考和待核实信息各自标明。面试保留时刻与时区，不把未知日期当成新一轮承诺。', '请核对各项日期的来源、周期和时区，再倒排个人准备时间。'],
  ['materials', '材料与任务', '知道缺什么、下一步做什么', '查看材料所属项目、准备状态、任务备注和个人安排。任务完成不会替你确认招生资格或推荐信到达。', '这些材料有了新进展，请更新状态，并告诉我还缺哪一项。'],
  ['sources', '来源与更新', '回到出处核对', '网页检查记录基线、文本变化或读取失败。Agent 阅读并核对后才更新事实；自动检查仅在本地服务运行期间生效。', '请检查来源变化，核对官方正文和适用周期，再更新已确认的事实。'],
  ['decisions', '录取与入学', '看清条件，再作决定', '录取、资助和个人选择分别维护。比较原币种、计发周期、期限和学费覆盖，再跟进入学材料、居留、注册与入组。', '请比较正式录取和资助条件。我的决定确认后，再整理后续入学事项。'],
  ['extensions', '我的扩展', '补上自己的工作方式', '请 Agent 添加课程对照、导师联系、阅读或奖学金表。简单需求使用字段和扩展表，复杂交互再改可信本地源码。', '我想增加一份奖学金跟踪表，请先问清我要记录什么，再加入扩展。'],
  ['agent', '与 Agent 协作', '配置、更新和迁移', '复制提示词交给自己的 Agent。Agent 校验版本后写入，网页自动同步；真实备份和恢复也由 Agent 核对后处理。', '请先读取当前版本和备份，说明差异，再按我确认的内容恢复。']
];

export function helpView(c, progress) {
  const { esc, heading, promptButton, icon } = c;
  return heading('先学会配合，再按自己的节奏申请。', '看一遍工作流程，或直接用虚构资料练习。实际档案和进度由你的 Agent 维护。') +
    `<section class="help-start"><div><h2>新手教程：动手走一遍</h2><p>复制引导、搜索与比较、核对来源、区分推荐信状态，再练习录取、更新、扩展和备份。</p><a class="button primary" href="#tutorial">${progress ? '继续新手教程' : '开始新手教程'} ${icon('arrow')}</a></div><div class="help-start-note"><strong>练习与申请资料分开</strong><p>可以随时跳过、离开和回看。硕士与博士练习分别保存进度。</p></div></section>
    <section class="section"><h2>第一次用，按这三步开始</h2><ol class="help-workflow"><li><strong>在仓库里打开自己的 Agent</strong><p>复制引导提示词，让 Agent 先读取已有资料，再问你方向、背景和约束。</p></li><li><strong>由 Agent 整理目标与任务</strong><p>信息不足时保留未知。建立目标和任务后，就可以在首页查看日常计划。</p></li><li><strong>有变化时接着聊</strong><p>告诉 Agent 新成绩、新回复或新决定。记录经过校验写入后，页面会自动同步。</p></li></ol></section>
    <section class="section"><div class="section-head"><h2>各项功能怎么用</h2><span class="muted">按你现在要做的事查阅</span></div><div class="feature-guide">${FEATURES.map(([view, title, job, detail, prompt]) => `<article><div class="feature-title"><h3><a href="#${view}">${esc(title)} ${icon('arrow')}</a></h3><span>${esc(job)}</span></div><div><p>${esc(detail)}</p>${promptButton(prompt, '复制给 Agent 的说法')}</div></article>`).join('')}</div></section>
    <section class="section help-questions"><h2>刚开始可能会问</h2><details data-record-id="help-faq-0"><summary>我需要自己填写配置表或 JSON 吗？</summary><p>不用。你通过对话提供背景、确认选择，Agent 负责维护结构化资料。网页中的搜索、筛选和比较供你查看计划。</p></details><details data-record-id="help-faq-1"><summary>为什么网页变化了，信息还显示待核对？</summary><p>文本变化可能只是版面调整，也可能是招生要求更新。需要 Agent 阅读正文、核对周期和具体要求后再确认。</p></details><details data-record-id="help-faq-2"><summary>页面更新、官网检查有什么区别？</summary><p>Agent 写入本地记录后，页面自动同步；官网检查另行配置。关闭服务后，官网定时检查不会继续运行。</p></details><details data-record-id="help-faq-3"><summary>练习备份能恢复我的真实申请吗？</summary><p>教程只暂存虚构练习的备份。真实记录位于本地工作区，迁移或恢复前让 Agent 核对备份与当前版本，再确认如何合并。</p></details></section>`;
}
