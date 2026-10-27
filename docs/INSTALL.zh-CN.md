# GradAtlas v1.3.1 中文安装与首次使用教程

GradAtlas 是由自己的 Agent 维护的研究生申请工作台，支持硕士、博士和同时申请两者。你通过对话说明背景与变化，Agent 整理档案、核对来源和更新计划，网页显示结果。本版为开源公测版，使用 MIT 许可。

## 1. 准备工具

- Node.js 22.21+（22.x）或 24.5+。从 [Node.js 官网](https://nodejs.org/en/download)选择符合版本要求的安装程序。
- Git 克隆方式需要 [Git](https://git-scm.com/install/)；直接下载源码压缩包可不安装 Git。
- 一个已配置好的编码 Agent，例如 Codex 或 Claude Code。GradAtlas 不提供模型账号或在线聊天服务。
- 一个浏览器。当前完整实机验收使用 Windows 与 Edge；macOS/Linux 尚未完成同等实机验收。

安装工具后重新打开终端，确认 `node --version` 和 `npm --version` 可用；使用 Git 时再检查 `git --version`。程序只用 Node.js 标准库，无需执行 `npm install`。

## 2. 下载源码

打开 [v1.3.1 Release](https://github.com/AL1ghtm3ter/grad-atlas/releases/tag/v1.3.1)，下载 `grad-atlas-v1.3.1-source.zip` 并解压；也可选择 `.tar.gz`。解压后的顶层目录为 `grad-atlas`，里面应有 `package.json`、`README.md`、`scripts/`、`skills/` 等文件。保留包内的隐藏文件和目录。

习惯使用 Git 时，在终端运行：

```sh
git clone --branch v1.3.1 https://github.com/AL1ghtm3ter/grad-atlas.git
cd grad-atlas
```

## 3. 启动本地工作区

在终端 A 中进入刚解压或克隆的 `grad-atlas` 目录，运行：

```sh
npm start
```

保持终端运行，打开它输出的地址；默认是 `http://127.0.0.1:4680/`。首次启动应显示“从一次对话，开始申请”的引导。停止时在该终端按 Ctrl+C。

如果端口已被其他实例使用，运行：

```sh
npm start -- --port 4685
```

打开这次输出的新地址。帮助与教程从当前页面右上角进入，避免误入旧端口。改变端口不会新建个人档案；每份源码目录各自保存资料。

PowerShell 如果提示禁止执行 `npm.ps1`，可以将命令中的 `npm` 改为 `npm.cmd`，例如 `npm.cmd start`。

## 4. 安装 SKILL，并让 Agent 配置信息

保持终端 A 运行。另开终端 B，或让编码 Agent 打开**同一份** `grad-atlas` 目录。服务与 Agent 必须指向同一目录。

Codex 用户可在终端 B 执行：

```sh
npm run install:skill
```

脚本会显示安装目录，使用 `CODEX_HOME`，未设置时使用用户目录下的 `.codex/skills`。通过技能选择器或 `$grad-apply-onboarding` 使用。当前客户端未显示时，重新载入或重启客户端；也可直接让 Agent 阅读仓库中的 SKILL。

已有同名技能时脚本会拒绝覆盖，原文件保持不变。先检查差异，或直接使用当前仓库的技能，不需要删除已有副本。

在 Agent 对话里复制下面这段话：

> 请阅读 AGENTS.md 和 skills/grad-apply-onboarding/SKILL.md，引导我配置 GradAtlas。先检查已有记录，每轮问我 1–3 个问题，允许未知和跳过。硕士与博士分别处理，由你整理配置，不让我手工填写 JSON。写入前校验当前版本，更新后确认正在运行的网页已同步。不要读取其他项目的私人资料来补齐背景。

Claude Code 用户也可在仓库内使用 `/grad-apply`；其他编码 Agent 可直接阅读同一份 SKILL。安装技能不等于填写个人档案，后者仍通过你与 Agent 的对话完成。

## 5. 选择硕士或博士路径

硕士申请可以这样开始：

> 我要申请硕士。请先问我的目标、教育阶段、课程和原学分、成绩计分体系、语言、预算与材料情况，再逐项研究真实院校。不要自动换算成绩或认定我符合先修要求。

博士申请可以这样开始：

> 我要申请博士。请先问我的研究兴趣、教育与科研经历、成果、地区和资助需求，再核对项目、导师或岗位。未知信息留空，不编造论文、导师回复、语言豁免或资助。

你不必一次答完全部问题。Agent 会先保存已确认的部分，资料不足时留下待核对项。建立目标与任务后，首页切换为每日看板；以后可以接着说“我的语言成绩出来了”“收到一封回复”“帮我增加奖学金跟踪表”。

仓库内真实院校研究文件是有核验日期的公开规则基线，不能当成个人资格结论或最新招生承诺；使用前由 Agent 再查官网，也不能将示例录取当成自己的申请记录。

## 6. 先用教程练习

在当前页面右上角点击“帮助”，查看功能介绍并进入七课交互教程。练习覆盖 Agent 引导、项目搜索与比较、来源、推荐信、录取、更新、扩展和备份。可以跳过、回看或中途退出，硕博分别保存进度，练习不写入正式档案。

若只想先看示例，在另一个终端的同一目录中运行其中一条：

```sh
npm run demo
npm run demo:phd
```

硕士和博士示例默认端口分别为 4681、4682。端口占用时可运行 `npm run demo -- --port 4686` 或 `npm run demo:phd -- --port 4687`。以输出地址为准；示例与个人档案分开保存，人物、学校和进度均为虚构。

## 7. 更新、官网检查与备份

Agent 写入有效记录后，网页会实时更新。官网检查是另一项操作：告诉 Agent 需要检查哪些官方页面，变化先作为待核对观察保留，不自动改写资格、截止日或核验日期。

部分网站会拒绝自动读取。可在了解用途后让 Agent 配置 `settings.sourceReader: "jina"`，通过第三方阅读服务读取无查询参数的公开网址；默认关闭，不发送档案、Cookie 或登录信息。定时官网检查也需自行选择频率，只有本地服务运行时才执行。

个人资料、申请进度、观察和备份保存在当前目录的 `.local/`。迁移前停止服务并复制该目录到私人备份位置；恢复时让 Agent 检查差异，校验版本后操作。不要把 `.local/`、私人备份或真实申请截图提交到公开仓库、Issue 或 Release。

## 8. 遇到问题时

先记录版本、操作步骤、预期和实际结果；用虚构内容复现后再提交 [GitHub Issue](https://github.com/AL1ghtm3ter/grad-atlas/issues)。不要附上个人档案、真实成绩单、邮箱、账号凭据或安装日志中的私人路径。

功能、数据和核验口径分别见 [README](https://github.com/AL1ghtm3ter/grad-atlas/blob/v1.3.1/README.md)、[数据约定](https://github.com/AL1ghtm3ter/grad-atlas/blob/v1.3.1/docs/DATA.md)、[来源说明](https://github.com/AL1ghtm3ter/grad-atlas/blob/v1.3.1/docs/SOURCES.md)和[中文测试报告索引](https://github.com/AL1ghtm3ter/grad-atlas/blob/v1.3.1/docs/qa/README.md)。当前服务只监听本机，供个人工作区使用。
