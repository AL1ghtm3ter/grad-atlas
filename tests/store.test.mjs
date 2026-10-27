import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store, atomicReplace } from '../lib/store.mjs';
import { blankWorkspace } from '../lib/model.mjs';

async function fixture(t) { const dir = await mkdtemp(join(tmpdir(), 'gradatlas-store-')); t.after(() => rm(dir, { recursive: true, force: true })); return new Store(dir); }
test('写入保留旧版本、拒绝过期覆盖，重启后记录可读取', async t => {
  const store = await fixture(t); const initial = await store.initialize(blankWorkspace('phd'));
  assert.equal(initial.revision, 1); initial.profile.field = 'Ecology';
  const next = await store.write(initial, 1); assert.equal(next.revision, 2);
  assert.equal((await new Store(store.dir).read()).profile.field, 'Ecology');
  await assert.rejects(store.write(initial, 1), /版本冲突/);
  const files = await readdir(join(store.dir, 'backups')); assert.equal(files.length, 1);
  assert.equal(JSON.parse(await readFile(join(store.dir, 'backups', files[0]), 'utf8')).revision, 1);
});
test('初始化拒绝覆盖已有记录，损坏数据保持原样', async t => {
  const store = await fixture(t); await store.initialize(blankWorkspace());
  await assert.rejects(store.initialize(blankWorkspace('phd')), /已有/);
  await writeFile(store.file, '{broken');
  await assert.rejects(store.write(blankWorkspace(), 1), /原文件已保留/);
  assert.equal(await readFile(store.file, 'utf8'), '{broken');
});
test('相同版本的竞争写入仅一方成功', async t => {
  const store = await fixture(t); const w = await store.initialize(blankWorkspace());
  const results = await Promise.allSettled([store.write(w, 1), store.write(w, 1)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await store.read()).revision, 2);
});
test('临时文件占用后可原子提交，永久失败保留旧记录', async t => {
  const store = await fixture(t), from = join(store.dir, 'pending.json');
  await writeFile(store.file, '旧记录'); await writeFile(from, '新记录');
  let attempts = 0;
  await atomicReplace(from, store.file, async (a, b) => { if (++attempts < 3) throw Object.assign(new Error('模拟短暂占用'), { code: 'EPERM' }); await rename(a, b); }, async () => {});
  assert.equal(await readFile(store.file, 'utf8'), '新记录');
  await writeFile(from, '待提交');
  await assert.rejects(atomicReplace(from, store.file, async () => { throw Object.assign(new Error('模拟永久失败'), { code: 'EPERM' }); }, async () => {}), /永久失败/);
  assert.equal(await readFile(store.file, 'utf8'), '新记录'); assert.equal(await readFile(from, 'utf8'), '待提交');
});
