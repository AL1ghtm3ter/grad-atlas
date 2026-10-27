读取当前仓库的 `AGENTS.md` 和 `skills/grad-apply-onboarding/SKILL.md`，按该技能引导用户建立或更新 GradAtlas 研究生申请计划。

用户补充的要求：$ARGUMENTS

先检查已有档案，逐轮追问，不让用户手工填写配置。硕士和博士分别处理，由 Agent 维护 `.local/` 中的数据，更新后验证页面同步。
