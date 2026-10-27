---
name: GradAtlas · 研途图谱
description: 暖纸与深蓝双主题的研究生申请工作区
colors:
  accent: "#835326"
  paper: "#f3f0e7"
  surface: "#faf7f0"
  ink: "#302e29"
  muted: "#6a6254"
  line: "#c9c1b0"
  rail: "#e7e0d0"
  rail-hover: "#ddd3c0"
  wash: "#ebe4d5"
  selection: "#dbc09b"
  cover-ground: "#dce6eb"
  cover-ink: "#264453"
  cover-muted: "#426b82"
  cover-line: "#8ba8b8"
  amber: "#855222"
  amber-bg: "#efe2c7"
  danger: "#a34736"
  success: "#375a6a"
  success-bg: "#dce6eb"
  night-accent: "#e0bd88"
  night-paper: "#080e1a"
  night-surface: "#101827"
  night-ink: "#e8e9e7"
  night-muted: "#a6afbd"
  night-line: "#303a4b"
  night-rail: "#0c1523"
  night-rail-hover: "#1d2d40"
  night-wash: "#141d2c"
  night-selection: "#5a6d88"
  night-cover-ground: "#102333"
  night-cover-ink: "#e0e9ea"
  night-cover-muted: "#a6bfcd"
  night-cover-line: "#476378"
  night-amber: "#e0bd88"
  night-amber-bg: "#352b20"
  night-danger: "#f2a38b"
  night-success: "#c2d6df"
  night-success-bg: "#183040"
typography:
  headline:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "18px"
    fontWeight: 620
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  copy:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  control:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  institution-initial:
    fontFamily: 'Georgia, "Songti SC", SimSun, serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  tag: "5px"
  button: "7px"
  field: "8px"
  notice: "9px"
  list: "10px"
  surface: "14px"
spacing:
  compact: "8px"
  control-gap: "12px"
  item-gap: "16px"
  list-inset: "18px"
  mobile-gutter: "20px"
  card-inset: "24px"
  medium-gutter: "28px"
  section-gap: "34px"
  desktop-gutter: "42px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.wash}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.control}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
  nav-active:
    backgroundColor: "{colors.cover-ground}"
    textColor: "{colors.cover-ink}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  status-neutral:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "3px 9px"
  status-ready:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "3px 9px"
  status-review:
    backgroundColor: "{colors.amber-bg}"
    textColor: "{colors.amber}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "3px 9px"
  program-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
  daily-brief:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  segment-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "4px 16px"
  task-list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "16px 0"
---

# Design System: GradAtlas · 研途图谱

## Overview

**Creative North Star: "暖纸上的申请工作区"**

暖纸底色承载日常阅读，棕色标记链接与行动，浅蓝色集中提示当前导航、日期和已整理状态。夜间保留同样的信息关系，以深蓝底色、浅墨字和暖金色行动替换明度。界面依靠排版、分隔线与色面形成秩序，适合反复查看任务、项目和来源。

组件保持紧凑、平稳的操作感：正文让位于事实，标签说明状态，主要按钮用于把明确事项交给 Agent。字体、边界和色彩角色在各模块间复用；扩展模块沿用同一套视觉语言。

本文件从 `src/style.css`、`src/index.html`、`src/theme-init.js`、`src/theme.mjs`、`src/app.mjs` 和扩展入口提取。它记录源码中的设计规则，不构成截图验收或可访问性认证。

**Key Characteristics:**

- 暖纸白昼与深蓝夜间共享语义色角色。
- 系统无衬线文字为主，衬线字仅用于院校首字标记。
- 色面、细线与留白构成层级，常规容器不依赖阴影。
- 固定侧栏在手机转为横向导航，内容按重要性收成单列。
- 状态始终有文字，未知信息保留明确说明。

## Colors

前置 tokens 是颜色规范；无前缀为白昼，`night-` 为同一角色的夜间值。源码通过根元素的主题属性切换 CSS 变量，组件不单独判断主题。

### Primary

- **暖棕 / 夜间暖金**（`accent`）：链接、Agent 行动按钮、下一步提示及重点标记。源码中的主按钮色与强调色共享此值。
- **主按钮反色**：白昼使用纸色文字，夜间使用深蓝纸色文字；不要直接固定为纯白。

### Secondary

- **浅蓝 / 夜间蓝幕**（`cover-ground`、`cover-ink`、`cover-muted`、`cover-line`）：当前导航、每日日期区、阶段标记与辅助线。浅蓝是结构色，配套文字必须使用蓝幕前景色。

### Tertiary

- **已整理蓝**（`success`、`success-bg`）：材料就绪、完成态及已整理的信息标签。
- **待核对琥珀**（`amber`、`amber-bg`）：来源变化、待核对、提示和高优先级任务标记。源码的焦点色随主题采用同组强调色。
- **逾期暖红**（`danger`）：尚未完成任务的逾期文字。

### Neutral

- **纸、面、墨**（`paper`、`surface`、`ink`）：页面背景、输入框及内容容器、主要文字。
- **静默文字与细线**（`muted`、`line`）：说明、元数据、列表分隔和控件边界。
- **侧栏与浅洗色**（`rail`、`rail-hover`、`wash`）：导航框架、悬停反馈和次级容器。
- **选区色**（`selection`）：文字选择与已整理的引导步骤编号。

**The Paired Theme Rule.** 增加颜色角色时同时处理白昼与夜间，使用相应前景与背景组合。

**The Written State Rule.** 颜色辅助区分状态；就绪、待核对、逾期及日期依据必须保留文字。

## Typography

**Display / Body Font:** Segoe UI → Microsoft YaHei → sans-serif。
**Institution Initial Font:** Georgia → Songti SC → SimSun → serif。

主要文字统一采用系统无衬线字体，避免额外字体下载；院校首字标记提供轻微的书写感。日期和数字进度使用等宽数字特性，保持更新时的对齐。

### Hierarchy

- **页面标题**：使用 `headline`；窄于（900px）时缩为（27px），手机缩为（25px）。
- **段落标题**：使用 `title`；每日摘要标题独立放大为（23px），宽屏为（26px），手机为（22px）。
- **正文基线**：使用 `body`。实际说明文案多为（12–13px），任务与来源元数据多为（11px）；沿用对应组件的层级，不把所有文字放大成同一级。
- **控件与标签**：使用 `control`、`label`；按钮保持自然中文书写，不使用强制大写。
- **阅读宽度**：页面说明约（72ch），摘要说明约（65ch），Agent 提示与长说明约（75ch）。

**The Numeric Rhythm Rule.** 日期、倒计时和进度保留等宽数字；文字换行不截断来源或未知状态。

## Layout

桌面采用侧栏加工作区。侧栏固定在左侧，默认宽（228px）；顶部状态栏高（77px），主内容最大宽（1400px），左右内边距（42px）。主内容在剩余工作区内居中，页脚沿工作区底部排列。

每日看板以“摘要与日期”双区开始，日期区默认宽（230px）。下方主内容与辅助进度区为双列，辅助列默认宽（245px），列间距（38px）。项目列表、任务、来源和资料采用纵向阅读；比较表独立横向滚动，最小表宽（550px）。

| 断点 | 源码中的布局变化 |
| --- | --- |
| ≥1500px | 主内容上边距增大，摘要与任务文字略放大，任务行更宽松。 |
| ≤1150px | 侧栏收至（205px），主内容横向间距（28px），看板辅助列和日期区收窄。 |
| ≤900px | 侧栏收至（184px），看板主辅区上下排列；进度与材料并排，项目详情改为单列；引导路线图隐藏。 |
| ≤650px | 侧栏回到文档流，导航横向滚动；状态栏高（48px）；主内容横向间距（20px）；每日摘要、项目详情与档案收成单列，搜索占满一行。 |

常规段落前的区块间距为（34px），手机为（28px）。项目卡默认内边距（24px），手机为（20px）。布局优先换列、换行与局部横向滚动，不依赖隐藏整段核心内容来适配手机。

打印样式移除导航、状态栏、按钮和页脚，内容取消工作区偏移；摘要、任务列表与项目卡尽量避免跨页断开。

## Elevation & Depth

常规界面没有容器投影。纸色、内容面、浅洗色和蓝幕色分出层次；列表用（1px）边界维持扫描路径。悬停主要改变背景或出现下划线，不让容器浮起。

### Shadow Vocabulary

- **短时反馈**（`0 6px 24px #080e1a22`）：仅用于底部 toast，使其与工作区内容分离。

**The Flat Workspace Rule.** 列表、项目卡与导航保持平面层级，投影留给覆盖内容的短时反馈。

toast 使用（0.2s ease-out）的轻微位移与透明度进入；源码在用户选择减少动态效果时关闭动画、过渡和平滑滚动。

## Shapes

主容器采用柔和圆角（14px），任务和材料列表采用较小圆角（10px）；控件为（7–8px），状态标签为（5px）。细线为常见边界，避免用厚边框替代层级。

圆形仅用于任务序号、阶段节点、引导步骤编号与小状态点；矩形内容仍是主要阅读结构。图标使用小尺寸线性 SVG，常规为（20px），按钮和标签内收至（15–16px）。

## Components

### Buttons

按钮紧凑、明确，默认最小高（40px）、内边距（9px 14px），图标与文字间距（8px）。主要按钮使用强调底色与主题反色；普通按钮使用内容面及细线；安静按钮使用透明底和强调文字。普通与安静按钮悬停采用浅洗色。

可聚焦控件使用（2px）焦点轮廓与（4px）偏移；禁用按钮降低透明度（0.55），鼠标呈等待状态。当前主按钮的悬停色与默认强调色一致，不虚构额外动画。

Agent 按钮复制可继续对话的说明。复制成功、复制受限与超出比较数量通过 toast 反馈；按钮文案描述交接内容。

### Chips

状态标签采用小圆角、紧凑内边距与自然中文文字。中性、已整理蓝、待核对琥珀各有成对前景与背景。方向筛选采用分段按钮，选中项以内容面衬底，并维护按压状态语义。

### Cards / Containers

项目卡使用内容面、细线和主容器圆角；标题、方向、阶段、比较选择、匹配依据、下一步及日期依据分组呈现。次级事实通过原生折叠详情展开，保留来源、周期与核验日期。

任务与材料采用连续列表，依靠行间细线组织。任务的完成态保留标题文字，使用完成图标及较弱文字色；任务序号与比较复选框具有不同的外观和作用。

每日摘要用浅洗色承载任务，用蓝幕区承载日期。日期区的日期、来源依据、时区与倒计时作为一组出现。手机中日期区成为摘要底部的横向信息带。

### Inputs / Fields

搜索与阶段筛选沿用内容面、细线及字段圆角；输入内边距（9px 12px）。搜索有独立的辅助标签和占位提示；比较使用原生复选框并采用主题强调色。网页中的字段用于浏览和筛选，申请资料由 Agent 更新。

### Navigation

侧栏导航使用图标与文字；悬停呈侧栏加深色，当前项呈蓝幕色和较强字重，并标记当前页面。手机导航横向滚动、文字保持单行，不固定导航项数量。切换页面后焦点移至主内容。

主题开关放在顶部状态栏，显示当前“白昼 / 夜间”，同时提供切换目标的辅助名称。首次遵循系统偏好；用户切换后保存浏览器主题选择。

### Feedback, Sources and Extensions

连接状态、示例提示、读取错误与 toast 各有独立位置。读取错误保留当前画面并提示检查；来源变化标记为待核对，不直接变为新的官方事实。空状态说明缺少什么，并提供可复制的下一步。

帮助入口常驻顶栏。功能介绍以连续条目连接实际页面；七课教程以章节目录、练习目标、文字反馈和独立预览区展开。桌面目录与正文分列，手机目录横向滚动，按钮与反馈仍复用现有主题变量。练习进度、跳过与完成均有文字说明，练习资料不写入正式工作区。

扩展字段沿用资料行和事实网格；扩展表复用可横向滚动的表格，可信本地模块复用区块标题、状态标签和主题变量。公开组件示例采用虚构内容。

## Do's and Don'ts

### Do:

- **Do** 在白昼与夜间成对复用语义色，保持主按钮反色随主题切换。
- **Do** 用文字同时说明状态与日期依据，保留来源、适用周期和未知信息。
- **Do** 沿用连续列表、细线和留白，按现有断点调整列数与间距。
- **Do** 为新增模块延续标题、字段、标签、表格与反馈组件，并保留键盘焦点样式。
- **Do** 在公开示例、组件预览与截图中使用虚构资料。

### Don't:

- **Don't** 在组件内固定单主题前景色，或用纯白替代主题反色。
- **Don't** 把个人完成态、来源网页变化和官方要求核验合成同一种状态。
- **Don't** 为常规卡片增加浮起阴影，或为状态反馈加入新的装饰色系。
- **Don't** 把扩展模块做成另一套配色、排版或边界系统。
- **Don't** 把来源用户的身份、个人主页地址或真实申请资料写入公开设计文档与组件示例。
