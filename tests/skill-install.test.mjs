import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, readdir, access, rm, realpath } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gradatlas-install-')), clone = join(dir, 'clone'), home = join(dir, 'new user 中文');
  await mkdir(join(clone, 'scripts'), { recursive: true });
  await cp(join(root, 'skills'), join(clone, 'skills'), { recursive: true });
  await cp(join(root, 'scripts/install-skill.mjs'), join(clone, 'scripts/install-skill.mjs'));
  await cp(join(root, 'package.json'), join(clone, 'package.json'));
  const env = { ...process.env, CODEX_HOME: join(home, '.codex'), HOME: home, USERPROFILE: home };
  t.after(async () => {
    const target = await realpath(dir), parent = await realpath(tmpdir());
    assert.equal(dirname(target), parent); assert.ok(basename(target).startsWith('gradatlas-install-'));
    await rm(target, { recursive: true, force: true });
  });
  const run = () => spawnSync(process.execPath, ['scripts/install-skill.mjs'], { cwd: clone, env, encoding: 'utf8' });
  return { clone, target: join(env.CODEX_HOME, 'skills/grad-apply-onboarding'), run };
}

async function files(dir, prefix = '') {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + item.name;
    if (item.isDirectory()) result.push(...await files(join(dir, item.name), name + '/'));
    else result.push(name);
  }
  return result.sort();
}

test('空用户目录可独立安装完整技能和references，不生成个人档案', async t => {
  const f = await fixture(t), result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(f.target));
  const source = join(f.clone, 'skills/grad-apply-onboarding'), paths = await files(source);
  assert.deepEqual(await files(f.target), paths);
  assert.ok(paths.includes('SKILL.md')); assert.ok(paths.includes('references/master.md')); assert.ok(paths.includes('references/phd.md'));
  for (const path of paths) assert.deepEqual(await readFile(join(f.target, path)), await readFile(join(source, path)));
  await assert.rejects(access(join(f.clone, '.local')), { code: 'ENOENT' });
});

test('已有同名技能时拒绝覆盖，并完整保留用户修改和其他文件', async t => {
  const f = await fixture(t); await mkdir(f.target, { recursive: true });
  const content = '用户自己的引导说明'; await writeFile(join(f.target, 'SKILL.md'), content); await writeFile(join(f.target, 'custom.txt'), '保留');
  const result = f.run(); assert.equal(result.status, 1); assert.match(result.stderr, /已有同名技能.*已保留/);
  assert.equal(await readFile(join(f.target, 'SKILL.md'), 'utf8'), content);
  assert.equal(await readFile(join(f.target, 'custom.txt'), 'utf8'), '保留');
  assert.deepEqual(await files(f.target), ['SKILL.md', 'custom.txt']);
});
