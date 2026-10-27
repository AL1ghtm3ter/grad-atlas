import { cp, mkdir, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.CODEX_HOME || join(homedir(), '.codex');
const target = join(base, 'skills', 'grad-apply-onboarding');
try { await access(target); console.error('已有同名技能，已保留。请先检查现有技能，再决定是否更新。'); process.exitCode = 1; }
catch (e) {
  if (e.code !== 'ENOENT') throw e;
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, 'skills/grad-apply-onboarding'), target, { recursive: true, errorOnExist: true, force: false });
  console.log('引导技能已安装到 Codex skills。重新载入技能列表后使用 $grad-apply-onboarding；当前对话也可以直接请 Agent 阅读仓库中的 SKILL.md。');
}
