# 添加自己的功能

先向 Agent 描述希望记录和看见什么。简单需求可以只加数据；复杂需求再改源码。

## 加字段

`profile.customFields` 和每个项目的 `customFields` 接受字符串键值，例如“申请顾虑”“课程匹配说明”。字段会自动出现在档案或项目详情里。项目字段还会按字段名加入目标与录取比较，缺项显示待核对。

硕士比较默认列出“课程与先修”“学费”“学期杂费”“生活费”“申请费”。Agent 可以在 `customFields` 中补充对应摘要，也可以继续添加“保险”“定金”等字段。保留币种、计费周期、适用年度和条件，官方依据另放带出处的 `facts`。比较只展示记录，不换算金额、学分或推断资格。

## 加一张表

在工作区 `extensions` 数组追加：

```json
{
  "id": "scholarships",
  "title": "奖学金跟踪",
  "description": "由 Agent 核对并维护。",
  "fields": ["名称", "资格", "下一步"],
  "items": [
    {"名称": "待核对奖学金", "资格": "待查官方规则", "下一步": "确认适用周期"}
  ]
}
```

Agent 通过 `apply` 校验写入，页面的“我的扩展”会显示新表。行记录只能使用已声明的列，字符串按文本渲染。这个机制可以做课程映射、导师联系、研究阅读、签证准备或面试复盘。

## 加交互

`src/extensions/index.mjs` 导出 `renderers` Map。可信的本地模块可以注册渲染函数，接收工作区副本，返回 DOM 节点：

```js
renderers.set('my-summary', workspace => {
  const section = document.createElement('section');
  const title = document.createElement('h2');
  title.textContent = '我的准备记录';
  const content = document.createElement('p');
  content.textContent = `当前有 ${workspace.tasks.length} 项任务。`;
  section.append(title, content);
  return section;
});
```

自定义数据通过 `textContent` 写入，不拼接未转义 HTML。不要从私人配置或远程 URL 动态导入脚本。扩展失败只影响该模块的显示。

修改 schema 时同步更新校验、示例、技能中的数据说明及相关测试；需要转换旧数据时先备份，提供显式迁移命令。个人扩展数据仍放 `.local/`，通用模块源码可以贡献回仓库。

## 接入工作台

先独立运行 `npm start`，再在工作台的私人配置中添加 `http://127.0.0.1:4680/` 作为项目地址。工作台只提供入口或 iframe，不复制申请数据，也不承担本项目的运行和来源核验。服务默认允许本机 HTTP 工作台嵌入；网页不向父窗口传递个人信息。
