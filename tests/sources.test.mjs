import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publicAddress, fetchPublicPage, inspectSource, refreshSources } from '../lib/sources.mjs';
import { Store } from '../lib/store.mjs';
import { demoWorkspace } from '../examples/demo.mjs';

const source = { id: 'site', url: 'https://example.org/' };
test('拒绝本机内网元数据地址及含私网地址的 DNS 结果', async () => {
  for (const ip of ['127.0.0.1', '10.1.1.1', '172.16.2.1', '192.168.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  await assert.rejects(fetchPublicPage('http://127.0.0.1/'), /本机/);
  await assert.rejects(fetchPublicPage('https://example.org/', { resolve: async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }] }), /本机/);
});
test('网页检查建立基线、检测文本变化，失败时保留哈希', async () => {
  const a = await inspectSource(source, null, async () => '<p>A</p><script>date=1</script>'); assert.equal(a.status, 'baseline');
  const b = await inspectSource(source, a, async () => '<p>A</p><script>date=2</script>'); assert.equal(b.status, 'unchanged');
  const c = await inspectSource(source, b, async () => '<p>B</p>'); assert.equal(c.status, 'changed');
  const e = await inspectSource(source, c, async () => { throw new Error('offline'); }); assert.equal(e.status, 'error'); assert.equal(e.hash, c.hash);
});
test('安全验证页不能当成官网正文建立成功基线', async () => {
  const result = await inspectSource(source, null, async () => '<html><title>Just a moment...</title><body>Enable JavaScript and cookies to continue. Cloudflare Ray ID</body></html>');
  assert.equal(result.status, 'error'); assert.equal(result.hash, '');
});
test('切换读取通道重新建立基线，正文变化只在相同通道比较', async () => {
  const first = await inspectSource(source, null, async () => ({ body: '<p>Official page</p>', method: 'direct' }));
  const next = await inspectSource(source, first, async () => ({ body: '# Official page', method: 'jina', sourceUrl: source.url, upstreamStatus: 200 }));
  assert.equal(next.status, 'baseline'); assert.equal(next.method, 'jina'); assert.match(next.message, /通道/);
  const same = await inspectSource(source, next, async () => ({ body: '# Official page', method: 'jina', sourceUrl: source.url, upstreamStatus: 200 })); assert.equal(same.status, 'unchanged');
  const changed = await inspectSource(source, same, async () => ({ body: '# Changed page', method: 'jina', sourceUrl: source.url, upstreamStatus: 200 })); assert.equal(changed.status, 'changed');
});
test('来源检查不改变事实核验日和个人任务状态', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gradatlas-source-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); const w = demoWorkspace(); w.revision = 0; await store.initialize(w);
  const before = await store.read(); await refreshSources(store, async () => '<p>First</p>'); await refreshSources(store, async () => '<p>Second</p>');
  const after = await store.read(); assert.deepEqual(after.sources, before.sources); assert.deepEqual(after.programs, before.programs); assert.deepEqual(after.tasks, before.tasks);
  assert.equal(after.observations.at(-1).status, 'changed');
});
test('检查期间来源链接发生变化时不合并旧链接观察', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gradatlas-source-race-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); const w = demoWorkspace(); w.revision = 0; await store.initialize(w);
  await refreshSources(store, async () => { const current = await store.read(); current.sources[0].url = 'https://example.com/'; await store.write(current, current.revision); return '<p>Old URL</p>'; });
  assert.equal((await store.read()).observations.length, 0);
});
