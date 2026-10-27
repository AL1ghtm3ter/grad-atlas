import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../lib/store.mjs';
import { blankWorkspace, templateTasks, validateWorkspace, readiness } from '../lib/model.mjs';
import { refreshSources } from '../lib/sources.mjs';
import { blankApplication, enrollmentTemplate, ROUTES } from '../lib/lifecycle.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Store(resolve(root, '.local'));
const [command = 'help', ...args] = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const print = data => console.log(JSON.stringify(data, null, 2));
try {
  if (command === 'init') {
    const track = args.includes('--track') ? value('--track') : 'master';
    const w = blankWorkspace(track); w.tasks = templateTasks(track);
    const next = await store.initialize(w); print({ ok: true, revision: next.revision, track });
  } else if (command === 'snapshot') {
    const w = await store.read();
    if (args.includes('--out')) {
      const file = resolve(value('--out'));
      if (!(file.startsWith(resolve(root, '.local') + '\\') || file.startsWith(resolve(root, '.local') + '/'))) throw new Error('快照请写入 .local/ 内，避免把私人信息放进待发布目录。');
      await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(w, null, 2)}\n`, { mode: 0o600 }); print({ ok: true, revision: w.revision, file: '.local/ 中的指定文件' });
    } else print(w);
  } else if (command === 'template') {
    const track = args[0] || 'master', w = blankWorkspace(track); w.tasks = templateTasks(track); print(w);
  } else if (command === 'application-template') {
    const route = args[0] || '待确认'; if (!ROUTES.includes(route)) throw new Error(`招生方式需要是：${ROUTES.join('、')}`);
    const application = blankApplication(route); application.enrollment = enrollmentTemplate(); print(application);
  } else if (command === 'apply') {
    if (!args[0] || !args.includes('--expect-revision')) throw new Error('用法：apply .local/draft.json --expect-revision <当前版本> [--dry-run]');
    const w = validateWorkspace(JSON.parse(await readFile(resolve(args[0]), 'utf8')));
    const expected = Number(value('--expect-revision'));
    const current = await store.read();
    if (current.revision !== expected) throw new Error(`版本冲突：当前为 ${current.revision}。先重新读取并合并。`);
    const summary = { programs: w.programs.length, tasks: w.tasks.length, materials: w.materials.length, sources: w.sources.length, extensions: w.extensions.length, readiness: readiness(w) };
    if (args.includes('--dry-run')) print({ valid: true, expectedRevision: expected, summary });
    else { const next = await store.write(w, expected); print({ ok: true, revision: next.revision, summary }); }
  } else if (command === 'complete') {
    const current = await store.read(), t = current.tasks.find(t => t.id === args[0]);
    if (!t) throw new Error('任务 ID 不存在');
    t.done = !args.includes('--undo'); const next = await store.write(current, current.revision); print({ ok: true, revision: next.revision, id: t.id, done: t.done });
  } else if (command === 'check-sources') {
    print(await refreshSources(store));
  } else {
    console.log('GradAtlas Agent 命令\n\ninit --track master|phd|both\ntemplate master|phd|both\napplication-template [项目制|岗位招聘|导师制|待确认]\nsnapshot [--out .local/draft.json]\napply .local/draft.json --expect-revision N [--dry-run]\ncomplete <task-id> [--undo]\ncheck-sources\n\n个人信息只写 .local/。先读取当前版本，基于用户已确认的信息修改，校验后再写入。网页会自动同步。');
    if (command !== 'help') process.exitCode = 1;
  }
} catch (e) { console.error(e.message); process.exitCode = 1; }
