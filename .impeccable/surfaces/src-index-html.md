---
version: 1
slug: "src-index-html"
primary_target: "src/index.html"
related_targets: ["src/app.mjs","src/style.css","src/theme-init.js","src/theme.mjs","src/extensions/index.mjs","src/help-view.mjs","src/help.css","src/tutorial.mjs"]
---

# Surface brief: 申请工作区

## Scope and mode

- 主要目标：`src/index.html`。
- 关联实现：`src/app.mjs`、`src/style.css`、`src/theme-init.js`、`src/theme.mjs`、`src/extensions/index.mjs`。
- 模式：**Operate**。
- 访问者：首次建立或日常维护研究生申请计划的用户。
- 主要任务：查看下一步、项目、材料、日期和来源；搜索、筛选、展开详情及比较项目。
- 更新方式：用户与自己的 Agent 对话，由 Agent 维护本地配置；网页承担浏览、筛选、比较和复制交接说明。

## Content and states

首次进入显示按阶段整理资料的引导；资料具备后，同一路由显示每日看板。各模块使用统一的页面标题、段落说明、状态标签与下一步入口。官方事实、来源变化与个人安排分别说明；缺少内容时保留未知提示。

工作区明确显示连接、重连、读取失败和静态示例状态。来源变化待核对，个人任务完成不会改写官方要求。组件示例、默认演示和教程使用虚构资料；真实院校研究基线单独注明核验日和来源，不含实际个人进度。

## Direction contract

**THESIS:** 用可反复查看的申请工作区呈现下一步及其依据，页面以行动、项目事实与日期形成阅读顺序。

**OWN-WORLD:** 暖纸、墨色、棕色行动与浅蓝结构区构成白昼；深蓝、浅墨与暖金构成夜间。字体、色彩、圆角和细线规则由根目录 `DESIGN.md` 统一定义。

**STORY:** 用户先通过 Agent 梳理方向、背景和目标，再在工作区查看计划；日常从最需要处理的任务进入项目、材料与来源，更新时把明确事项交回 Agent。

**FIRST VIEWPORT:** 桌面保留左侧导航与顶部连接、日期、主题开关。主区先给出页面标题与行动；每日看板首先呈现任务摘要和最近日期，随后展开任务、项目与辅助进度。首次引导首先呈现对话入口及阶段路线。

**FORM:** 沿用已实现的单页工作区与共用组件。宽屏为侧栏、主区与辅助列；中等宽度将辅助内容下移；手机采用横向导航与单列内容，比较表局部横向滚动。新增模块复用现有系统，不固定导航数量。

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Evidence boundary

此 brief 记录源码中的结构与交互意图，未声明新的截图检查或可访问性认证。当前提取依据为 `PRODUCT.md` 及上述关联实现；主题与组件规范以 `DESIGN.md` 的实际 tokens 为准。

## 教程与帮助扩展（2026-10-28）

顶栏增加常驻帮助入口。功能介绍使用连续条目和直接页面链接；教程沿用现有标题、按钮、标签与文字反馈。桌面按章节目录和练习区分列，窄屏把章节收成可横向滚动的目录，正文保持单列。没有增加颜色角色。

练习区明确标注虚构资料，搜索、比较与记录展示复用正式渲染器，浏览器进度与正式工作区隔离。错误判断保留反馈，跳过显示待回看。真实院校研究基线另行维护，只含公开规则与测试角色，不包含实际申请进度。

完成检查：实际查看1440px白昼功能介绍和教程、390px夜间教程截图；320/390px昼夜七课与静态产物操作已验收。没有发现阻止使用的排版问题；没有将这些检查称为屏幕阅读器或完整无障碍认证。截图来源见 `docs/screenshots/README.md`，操作证据见 `docs/qa/tutorial-20261028.md`。
