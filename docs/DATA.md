# 数据结构与迁移

`lib/model.mjs` 定义实际校验规则。`examples/demo.mjs` 展示完整的虚构工作区，可作为结构参考。所有个人值写在 `.local/`，不要修改公开示例。

| 对象 | 用途 | 关键字段 |
| --- | --- | --- |
| `profile` | 用户已确认的申请背景和约束 | `track` 为 `master`、`phd` 或 `both`；其他字段为字符串 |
| `programs` | 目标项目及匹配依据 | 学校、方向、阶段、下一步、日期、事实；博士另含导师、课题组、资助与联系状态 |
| `tasks` | 个人行动 | 标题、阶段、方向、关联项目、计划日期、完成状态、优先级 |
| `materials` | 材料准备 | 名称、方向、状态、备注、关联项目 |
| `sources` | 官方资料与事实核对状态 | URL、适用周期、事实核验日、说明、已核对文本的 `reviewedHash` |
| `observations` | 网页检查结果 | 来源、检查时间、文本哈希、上次哈希、状态、说明；可附实际通道、原URL、上游状态与缓存请求方式 |
| `extensions` | 自定义数据表 | ID、标题、说明、列名和行记录 |
| `settings` | 官网检查策略 | `refreshMinutes` 为 0 时关闭定时，开启为 15–1440 分钟；`sourceReader` 可选 `off` / `jina`，控制公开阅读回退 |

档案的基础字段是：`displayName`、`track`、`cycle`、`field`、`regions`、`education`、`academicRecord`、`language`、`budget`、`constraints`、`goals`。硕士补充 `prerequisites`、`degreeDocuments`；博士补充 `researchInterests`、`researchExperience`、`publications`、`supervisorPreferences`、`fundingNeeds`。可按实际情况留空；自定义字符串放 `profile.customFields`。

任务阶段为 `定位`、`选校`、`准备`、`递交`、`面试`、`结果`、`入学`。项目阶段另支持 `已接受`、`已婉拒`、`已撤回`、`已入学`。优先级为 `high`、`normal`、`low`。已有项目与任务即可进入日常看板，未知成绩、预算和语言可以继续留空。

## 全周期申请记录

每个项目可以附加 `application`，旧记录没有该对象也能继续读取。Agent 可运行 `npm run agent -- application-template 项目制` 查看完整空结构；也支持 `岗位招聘`、`导师制` 和 `待确认`。实际字段与状态由 `lib/lifecycle.mjs` 校验。

| 字段 | 用途 |
| --- | --- |
| `route`、`portal` | 招生模式与官方申请入口，不按地区自动推断 |
| `status`、`submittedOn`、`referenceNumber`、`note` | 实际递交状态、日期、编号与记录 |
| `references` | 逐项目保存推荐人，`kind` 可为 `letter`（推荐信）或 `contact`（可联系推荐人），旧记录默认 `letter`；包含邀请/同意状态、个人安排、联系资料及备注，信件另有实际提交日 |
| `contacts` | 联系主题、草稿/已发送/已回复状态、实际日期、个人跟进日和记录 |
| `interviews` | 标题、状态、日期、时刻、IANA 时区、方式和准备或复盘 |
| `milestones` | 同一项目的网申、推荐信、资助、答复等多项日期，分别保留口径、来源、周期与时区 |
| `decision` | 结果、收到日期、个人答复安排、时区、录取条件和用户决定 |
| `funding` | 资助状态、类型、金额、币种、计发周期、期限、学费覆盖、来源与书面依据说明 |
| `enrollment` | 学位和注册条件、资助合同、签证或居留、住宿保险、注册入组等逐项状态和个人计划 |

递交、推荐信已提交、实际联系和结果状态需要相应实际日期；安排面试必须同时记录日期、时刻和时区。接受 offer 不会确认资助，也不会完成入学清单。`已获资助` 需要来源或正式书面依据说明；系统校验结构，不代替阅读资助文件。

岗位可能只要求在CV列出同意被联系的推荐人，不要求上传信。此时用 `kind: "contact"`，在 `contactDetails` 保存已确认的联系资料（只放私人工作区），状态跟进至 `已同意`，不填 `submittedOn`。界面显示同意人数，缺联系方式时另行提示；不会统计成“推荐信未提交”或继续催交信件。联系型记录的 `已提交` 和信件提交日期会被拒绝。同一目标同时要求信件与联系人时可以混合保存，分别统计。

`references[].due`、`contacts[].followUp` 和 `enrollment[].due` 是个人安排，按 UTC 自然日显示。`decision.responseDue` 是由 Agent 整理的个人答复安排，保留原时区；官方答复截止日另放 `milestones`，按 `official` 的完整来源要求记录。没有公开来源的私人录取函可在备注中说明书面依据，不伪造 URL。

一个里程碑的结构如下，同一项目可以存多项：

```json
{
  "id": "reference-deadline",
  "title": "推荐信截止",
  "deadline": {"date": "", "timezone": "", "basis": "unknown", "sourceId": "", "cycle": ""},
  "status": "待处理",
  "note": "由 Agent 核对该项目的单独要求。"
}
```

申请跟踪中的推荐信、联系、面试，以及录取与入学事项会加入时间线；已完成、已结束或不适用的事项不作为待办展示。已撤回、已婉拒、未录取和已入学项目不再生成这些待办，历史数据仍保留。每日日期摘要同时读取原生里程碑、任务和后续事项，只把官方日期与个人安排作为倒计时。

存在 `application` 时，项目摘要、阶段筛选和并排比较优先读取其中的实际资助、联系与结果状态；旧字段保留供没有该对象的记录兼容。修改整体 `stage` 时，Agent 仍应同步核对全部实际状态。

## 日期与事实

项目和里程碑的 `deadline` 包含 `date`、`timezone`、`basis`、`sourceId`、`cycle`，以及可选的 `time`（HH:MM 或空字符串）。旧记录无需补齐 `time`。

- `official`：官方日期已核实，须有日期、适用周期和对应来源；未公布时刻或时区时留空，页面提示缺口。
- `personal`：个人计划，不表示官方窗口。
- `historical`：往年资料，保留年份，不推断为新周期。
- `unknown`：尚未核实或未公布。

倒计时按该时区自然日计算，不代表精确到时分的提交倒计时。官方日期缺少时区时只显示原日期，不加入首页倒计时。往年和待核实日期也不倒计时。任务日期按 UTC 自然日安排。若官网规定具体时刻，保存到 `time`，在事实或备注中保留原时区表述及 IANA 映射依据，并提前安排个人任务。

只有年度月日通则、未明确当轮年份时，不据此生成当轮官方日期。两个官方页面要求冲突时，分别保存事实和来源，列待核对事项；来源核验日不能代替招生周期。真实院校基线与研究记录见 `docs/research/README.md`，模拟个人进展与官方事实分开。

项目 `facts` 中的每项是 `{ label, value, sourceId, cycle, verifiedAt }`。没有来源的内容会显示待核对；空值不能解释为已满足要求。官方日期关联来源存在不等于系统核实其内容，Agent 仍须阅读原文。

目标与录取比较会按字段名显示所选项目的 `customFields` 并集，缺项显示待核对。硕士默认列出“课程与先修”“学费”“学期杂费”“生活费”“申请费”；Agent 可补充这些摘要及其他字段，费用保留币种、周期、适用年度和身份条件。正式依据仍存入 `facts`，比较不会推断资格、换算学分或金额，也不改写来源核验日。资助金额及学费覆盖另行展示，不能代替实际费用。

来源观察可附 `method: "direct" | "jina"`、`sourceUrl`、`upstreamStatus: 200`、`cacheMode: "no-cache" | "bypass"`。它们描述正文的实际取得方式，不是资格或招生事实。通道改变时重新建文本基线，旧记录继续兼容。读取策略、隐私边界及代理说明见 [官网检查](SOURCES.md)。

## Agent 写入

```sh
npm run agent -- init --track phd
npm run agent -- snapshot --out .local/draft.json
# Agent 编辑 draft.json，保留未涉及的数据和 ID。
npm run agent -- apply .local/draft.json --expect-revision 1 --dry-run
npm run agent -- apply .local/draft.json --expect-revision 1
```

版本号每次从当前快照读取。写入采用排他锁、版本检查、临时文件和原子替换；旧版本保存在 `.local/backups/`。Windows 暂时占用导致文件替换失败时，会有限退避重试；仍失败则报错并保留原记录，不降级为直接截断覆盖。锁冲突时重试前先确认前一个进程已经结束。进程异常退出留下 `write.lock` 时，核对没有写入进程后再移除这个锁文件。

网页通过本地文件观察和 SSE 同步；连接恢复后会重新读取最新快照。操作系统丢失文件事件时，服务每 5 秒兜底检查。个人服务、硕士演示和博士演示使用不同数据目录。

## 备份与恢复

停止服务后复制整个 `.local/` 即可迁移；这是私人备份，不应提交 Git 或发到公开 Issue。恢复时先由 Agent 读取备份并校验，给出差异摘要，再按当前版本使用 `apply` 写入。不要直接用旧备份覆盖较新的工作区。

无法读取或校验失败时，服务显示错误并保留原文件。不要通过重新 `init` 来隐藏损坏。
