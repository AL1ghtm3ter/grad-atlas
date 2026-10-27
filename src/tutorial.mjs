import { LESSONS, TUTORIAL_KEY, blankTutorial, blankProgress, validateTutorial, addFlag, lessonComplete, moveLesson } from './tutorial-state.mjs';
import { practiceWorkspace } from './tutorial-data.mjs';
import { validateWorkspace } from '../lib/model.mjs';

export const START_PROMPT = '请阅读当前仓库的 AGENTS.md 和 skills/grad-apply-onboarding/SKILL.md，引导我配置或更新 GradAtlas。先检查已有记录，再逐轮问我硕士或博士方向、背景、目标与约束。由你整理配置，不让我手工填写 JSON；保留未知项，写入前核对版本并校验，完成后检查页面同步。';

export function createTutorial({ storage, repaint, copyText }) {
  let data = blankTutorial(), feedback = '', tone = 'neutral', persistenceBlocked = false, storageNotice = '';
  let filter = 'all', stage = 'all', manualCopy = false;
  try { const raw = storage?.getItem(TUTORIAL_KEY); if (raw) data = validateTutorial(JSON.parse(raw)); }
  catch { persistenceBlocked = true; storageNotice = '已有教程进度无法读取，原记录已保留。你仍可以临时练习，或主动重置本教程。'; }
  const progress = () => data.tracks[data.track];
  const flag = f => progress().flags.includes(f);
  const sample = () => practiceWorkspace(data.track, progress().practiceFlags || progress().flags);
  function persist() {
    if (persistenceBlocked) return;
    try { storage?.setItem(TUTORIAL_KEY, JSON.stringify(data)); }
    catch { storageNotice = '浏览器暂时不能保存教程进度，本次练习仍可继续。'; }
  }
  function message(text, kind = 'neutral') { feedback = text; tone = kind; }
  function renderAgain() { persist(); repaint(); }
  function mark(name, text) { const p = progress(); p.practiceFlags ??= [...p.flags]; addFlag(p, name); if (!p.practiceFlags.includes(name)) p.practiceFlags.push(name); message(text, 'success'); }
  function needs(flags) { if (flags.every(flag)) return true; message('请先完成前面的练习操作；也可以选择跳过本课。', 'hint'); return false; }
  function controls(id, c) {
    const { esc } = c;
    const button = (action, title, primary = false) => `<button class="button ${primary ? 'primary' : 'quiet'}" data-tour-action="${action}">${title}</button>`;
    const choice = (action, title) => `<button class="tutorial-choice" data-tour-action="${action}">${title}</button>`;
    if (id === 'agent') return `<p>在自己的编码 Agent 中打开 GradAtlas 仓库。下面这段话可用于真实起步；复制后需要由你粘贴给 Agent。</p><blockquote>${esc(START_PROMPT)}</blockquote>${button('copy', '复制引导提示词', true)}${manualCopy ? button('manual-copy', '我已手动复制上方提示词') : ''}<p class="tutorial-note">${data.track === 'phd' ? '博士对话会继续梳理研究问题、方法、导师与资助，不从专业名推断已有成果。' : '硕士对话会继续梳理课程、学分、语言与材料，不把未核对的条件写成已满足。'}</p>`;
    if (id === 'targets') return `<p>下面使用正式项目页的搜索与比较功能。先搜索“北岸”，再清空搜索，勾选两个项目的“比较”。</p><div class="tutorial-checklist"><span>${flag('searched') ? '已完成' : '待完成'}：找到北岸项目</span><span>${flag('compared') ? '已完成' : '待完成'}：两项目并排比较</span></div>`;
    if (id === 'sources') return `<p>本课模拟网页文本变化。练习中的“官方资料”也是虚构内容，不构成真实招生依据。</p><div class="tutorial-actions">${button('observe', '模拟发现网页变化', true)}${button('review-source', '模拟 Agent 核对完成')}</div><div class="tutorial-choices" aria-label="发现网页变化后怎样处理">${choice('source-assume', '网页变了，直接确认所有新要求')}${choice('source-route', '交给 Agent 阅读正文并核对周期')}</div>`;
    if (id === 'references') return `<p>同一位推荐人向两个项目提交，状态需要分别记录。先让练习材料就绪，再判断它是否代表推荐信已到达。</p><div class="tutorial-actions">${button('material-ready', '模拟 Agent 将材料整理就绪', true)}${button('reference-submit', '模拟确认北岸推荐信已提交')}</div><div class="tutorial-choices" aria-label="材料与推荐信状态">${choice('reference-assume', '材料就绪，两个项目都算已提交')}${choice('reference-route', '逐项目核对推荐人的实际提交状态')}</div>`;
    if (id === 'offers') return `<p>${data.track === 'phd' ? '博士录取、岗位或奖学金、合同与个人决定分别核对。' : '硕士录取、奖学金、学费和个人决定分别核对。'}这里练习如何读状态，不替你作真实选择。</p><div class="tutorial-choices" aria-label="录取与资助的关系">${choice('offer-assume', '有录取就表示资金已经落实')}${choice('offer-separate', '把录取结果与资金状态分别保留')}</div><div class="tutorial-actions">${button('accept', '在练习中模拟接受北岸录取', true)}</div>`;
    if (id === 'updates') return `<p>真实使用时，告诉 Agent 新进展，由它校验并写入记录。下面仅模拟页面收到一份新记录，不调用模型或改动文件。</p><div class="tutorial-actions">${button('agent-update', '模拟 Agent 更新待办', true)}${button('add-extension', '模拟 Agent 添加奖学金表')}</div><div class="tutorial-checklist"><span>${flag('agentUpdated') ? '已完成' : '待完成'}：看见新待办</span><span>${flag('extensionAdded') ? '已完成' : '待完成'}：看见新增扩展表</span></div>`;
    return `<p>本课只在教程内暂存虚构数据备份。真实备份位于本地工作区，由 Agent 核对差异与版本后恢复。</p><div class="tutorial-actions">${button('backup', '暂存练习备份', true)}${button('bad-backup', '试读一份损坏备份')}${button('restore', '恢复有效练习备份')}</div><div class="tutorial-checklist"><span>${flag('backupCreated') ? '已完成' : '待完成'}：有效备份</span><span>${flag('backupRejected') ? '已完成' : '待完成'}：损坏记录被拒绝</span><span>${flag('backupRestored') ? '已完成' : '待完成'}：恢复练习记录</span></div>`;
  }
  return {
    hasProgress: () => Object.values(data.tracks).some(p => p.current > 0 || p.flags.length || p.skipped.length),
    getState: () => structuredClone(data),
    render(c) {
      const p = progress(), lesson = LESSONS[p.current], view = p.preview || lesson.view;
      const complete = lessonComplete(p, lesson.id), finished = p.done.length === LESSONS.length;
      return c.heading('用一次练习，学会推进申请。', '虚构实例 · 可以跳过、回看和继续。教程只保存练习进度，真实档案由 Agent 维护。', '<a class="button quiet" href="#guide">查看功能介绍</a>') +
        `<div class="tutorial-toolbar"><div class="segments" aria-label="教程申请方向">${[['master', '硕士练习'], ['phd', '博士练习']].map(([id, title]) => `<button data-tour-track="${id}" aria-pressed="${data.track === id}">${title}</button>`).join('')}</div><span>${p.done.length} / ${LESSONS.length} 课已完成${p.skipped.length ? ` · ${p.skipped.length} 课待回看` : ''}</span><a href="#home">暂时离开教程</a></div>
        ${storageNotice ? `<p class="notice" role="status">${c.esc(storageNotice)}</p>` : ''}
        ${finished ? '<section class="tutorial-finished"><h2>这套流程，你已经亲手走过了。</h2><p>接下来把真实背景交给自己的 Agent，建立申请计划；需要时还可以回来复习。</p><a class="button primary" href="#agent">开始真实配置</a><a class="text-link" href="#guide">查阅功能介绍</a></section>' : ''}
        <div class="tutorial-layout"><nav class="tutorial-lessons" aria-label="教程课次">${LESSONS.map((l, i) => `<button data-tour-lesson="${i}" ${i === p.current ? 'aria-current="step"' : ''}><span>${p.done.includes(l.id) ? c.icon('check') : i + 1}</span><div>${l.title}<small>${p.done.includes(l.id) ? '已完成 · 可回看' : p.skipped.includes(l.id) ? '已跳过 · 待回看' : '可以随时开始'}</small></div></button>`).join('')}<button class="tutorial-reset" data-tour-action="reset">重置本方向练习</button></nav>
        <div class="tutorial-main"><section class="tutorial-lesson"><div class="section-head"><h2>${p.current + 1}. ${lesson.title}</h2><span class="pill ${complete ? 'green' : ''}">${complete ? '本课已完成' : '正在练习'}</span></div><p class="tutorial-goal"><strong>这一课：</strong>${lesson.goal}</p><div class="tutorial-instructions">${controls(lesson.id, c)}</div><div class="tutorial-feedback ${tone}" role="status" aria-live="polite">${c.esc(feedback || '按上面的目标试一试。所有数据和操作都留在练习实例。')}</div><div class="tutorial-navigation"><button class="button quiet" data-tour-action="previous" ${p.current === 0 ? 'disabled' : ''}>上一课</button><button class="button quiet" data-tour-action="skip">${p.current === LESSONS.length - 1 ? '跳过本课并回看' : '跳过本课'}</button>${p.current < LESSONS.length - 1 ? `<button class="button primary" data-tour-action="next" ${complete ? '' : 'disabled'}>下一课 ${c.icon('arrow')}</button>` : '<a class="button primary" href="#guide">返回功能介绍</a>'}</div></section>
        <section class="tutorial-preview" data-tutorial-practice="true" aria-label="隔离的虚构练习实例"><header><div><strong>练习实例 · ${c.esc(c.names[view])}</strong><span>虚构资料，不写入真实工作区</span></div><div><small>练习版本 ${sample().revision}</small>${p.preview ? '<button class="button quiet" data-tour-action="lesson-view">回到本课实例</button>' : ''}</div></header><div class="tutorial-preview-content">${c.renderPractice(view, sample(), { query: p.query, compare: p.selected, track: filter, stage }).replace(/<h1>/g, '<h2>').replace(/<\/h1>/g, '</h2>')}</div></section></div></div>`;
    },
    afterRender(root) { const p = progress(); if (LESSONS[p.current].id === 'references' && (!p.preview || p.preview === 'applications')) { const details = root.querySelector('[data-tutorial-practice] details'); if (details) details.open = true; } },
    async handleClick(event) {
      const target = event.target.closest('button, a'); if (!target) return false;
      const p = progress();
      if (target.matches('[data-tour-track]')) { data.track = target.dataset.tourTrack; filter = 'all'; stage = 'all'; message('已切换方向，两个方向的练习进度分别保存。'); renderAgain(); return true; }
      if (target.matches('[data-tour-lesson]')) { moveLesson(p, Number(target.dataset.tourLesson)); message('可以直接练习这一课，也可以随时回看其他课。'); renderAgain(); return true; }
      if (target.closest('[data-tutorial-practice]')) {
        if (target.matches('[data-track]')) { filter = target.dataset.track; renderAgain(); return true; }
        if (target.id === 'clear-compare') { p.selected = []; renderAgain(); return true; }
        if (target.matches('a[href^="#"]')) { event.preventDefault(); const view = target.getAttribute('href').slice(1); if (['home', 'profile', 'programs', 'applications', 'materials', 'timeline', 'sources', 'decisions', 'extensions'].includes(view)) { p.preview = view; renderAgain(); } return true; }
        if (target.matches('a[target="_blank"]')) { event.preventDefault(); message('这是虚构示例链接。正式使用时，Agent 会提供实际资料的出处。', 'hint'); renderAgain(); return true; }
      }
      const action = target.dataset.tourAction; if (!action) return false;
      if (action === 'copy') {
        if (await copyText(START_PROMPT)) mark('promptCopied', '已复制。粘贴给你自己的 Agent 后，由它逐轮提问并维护资料。');
        else { manualCopy = true; message('浏览器未允许复制。可选中上方提示词手动复制，再点击“我已手动复制”继续。', 'hint'); }
      } else if (action === 'manual-copy' && manualCopy) {
        mark('promptCopied', '已按你的确认完成手动复制。将提示词粘贴给自己的 Agent，开始真实对话。');
      } else if (action === 'previous') { moveLesson(p, p.current - 1); message('已返回上一课，已完成的练习记录保留。'); }
      else if (action === 'next') { if (lessonComplete(p, LESSONS[p.current].id)) { moveLesson(p, p.current + 1); message('开始下一课。也可以从课次目录回看。'); } }
      else if (action === 'skip') { moveLesson(p, p.current === LESSONS.length - 1 ? 0 : p.current + 1, true); message('这课已标为待回看，没有计入完成。'); }
      else if (action === 'reset') { data.tracks[data.track] = blankProgress(); filter = 'all'; stage = 'all'; persistenceBlocked = false; storageNotice = ''; message('已重置这一方向的教程练习；另一方向和真实申请资料未改动。'); }
      else if (action === 'observe') { mark('sourceObserved', '已模拟发现变化。事实核验日期仍为空，请选择接下来怎样处理。'); p.preview = 'sources'; }
      else if (action === 'source-assume') message('文本变化还不是招生事实。保留待核对，让 Agent 阅读正文并检查适用周期。', 'hint');
      else if (action === 'source-route' && needs(['sourceObserved'])) mark('sourceRouted', '处理方式正确。现在可模拟 Agent 核对完成，观察事实核验与网页检查的区别。');
      else if (action === 'review-source' && needs(['sourceObserved', 'sourceRouted'])) mark('sourceReviewed', '练习中已模拟核对并确认本次文本。真实使用时，必须先读官方正文再更新核验记录。');
      else if (action === 'material-ready') { mark('materialReady', '练习材料已就绪，推荐信仍是已同意。看看这两种状态能否直接画等号。'); p.preview = 'materials'; }
      else if (action === 'reference-assume') message('材料就绪不会替推荐人提交，也不会同时更新两个项目。需要分别核对实际提交状态。', 'hint');
      else if (action === 'reference-route' && needs(['materialReady'])) { mark('referenceRouted', '正确。已转到逐项目推荐信记录；可以模拟确认北岸已提交。'); p.preview = 'applications'; }
      else if (action === 'reference-submit' && needs(['materialReady', 'referenceRouted'])) { mark('referenceConfirmed', '北岸显示 1/1 已提交，河谷仍为 0/1。另一个项目没有被自动完成。'); p.preview = 'applications'; }
      else if (action === 'offer-assume') message('收到录取不能确认资金。奖学金、岗位合同、学费覆盖与期限需要分别核对。', 'hint');
      else if (action === 'offer-separate') mark('offerSeparated', '正确。保留独立的资金状态，再用练习选择检查它会不会被自动改变。');
      else if (action === 'accept' && needs(['offerSeparated'])) mark('offerAccepted', '练习录取已接受，资助仍待核对，入学事项也仍待确认。没有执行任何真实对外操作。');
      else if (action === 'agent-update') { mark('agentUpdated', '练习待办与练习版本已更新。这里模拟显示变化；真实记录由 Agent 校验写入后同步。'); p.preview = 'home'; }
      else if (action === 'add-extension' && needs(['agentUpdated'])) { mark('extensionAdded', '练习中已增加奖学金表，显示在“我的扩展”。真实新增功能也交给 Agent 整理。'); p.preview = 'extensions'; }
      else if (action === 'backup') { p.backupFlags = [...(p.practiceFlags || p.flags)]; mark('backupCreated', `已在教程内暂存练习版本 ${sample().revision} 的备份，刷新后仍保留，不含真实申请资料。`); }
      else if (action === 'bad-backup' && needs(['backupCreated'])) { try { validateWorkspace(JSON.parse('{损坏的练习备份')); } catch { mark('backupRejected', '损坏备份被拒绝，当前练习数据保留。接下来可恢复有效备份。'); } }
      else if (action === 'restore' && needs(['backupCreated', 'backupRejected'])) { if (!Array.isArray(p.backupFlags)) message('当前没有可读取的练习备份。请重新暂存有效备份；不会把当前数据冒充备份恢复。', 'hint'); else try { const restored = validateWorkspace(JSON.parse(JSON.stringify(practiceWorkspace(data.track, p.backupFlags)))); p.practiceFlags = [...p.backupFlags]; mark('backupRestored', `有效练习备份已校验并恢复到版本 ${restored.revision}。真实恢复时，还要由 Agent 检查当前版本与差异。`); } catch { message('练习备份无法恢复，请重新暂存有效备份；当前数据保留。', 'hint'); } }
      renderAgain(); return true;
    },
    handleInput(event) {
      if (!event.target.closest('[data-tutorial-practice]') || event.target.id !== 'search') return false;
      const p = progress(); p.query = event.target.value.slice(0, 120);
      const matches = sample().programs.filter(t => `${t.name} ${t.institution}`.includes(p.query));
      if (p.query.trim() && matches.length === 1 && matches[0].id === 'practice-north') mark('searched', '已找到北岸。现在清空搜索，勾选两个项目比较。');
      renderAgain(); return true;
    },
    handleChange(event) {
      if (!event.target.closest('[data-tutorial-practice]')) return false;
      const p = progress();
      if (event.target.id === 'stage-filter') { stage = event.target.value; renderAgain(); return true; }
      if (event.target.matches('[data-compare]')) {
        const id = event.target.dataset.compare;
        if (!['practice-north', 'practice-river'].includes(id)) return true;
        p.selected = event.target.checked ? [...new Set([...p.selected, id])] : p.selected.filter(x => x !== id);
        if (p.selected.length === 2) mark('compared', '两个练习项目已并排显示。可以逐项比较，不必依靠一条综合判断。');
        renderAgain(); return true;
      }
      return false;
    }
  };
}
