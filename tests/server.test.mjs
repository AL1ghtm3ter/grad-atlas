import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createApp } from '../scripts/server.mjs';
import { blankWorkspace } from '../lib/model.mjs';

async function fixture(t) { const dir = await mkdtemp(join(tmpdir(), 'gradatlas-http-')); const app = await createApp({ dir }); await new Promise(r => app.server.listen(0, '127.0.0.1', r)); t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); }); return { ...app, url: `http://127.0.0.1:${app.server.address().port}` }; }
test('HTTP 不提供私人文件，并拒绝不受信任的主机与来源', async t => {
  const { url } = await fixture(t);
  assert.equal((await fetch(url)).status, 200);
  for (const path of ['/.local/workspace.json', '/AGENTS.md', '/scripts/agent.mjs', '/src/%2e%2e%2fpackage.json']) assert.notEqual((await fetch(url + path)).status, 200);
  assert.equal((await fetch(url + '/api/state', { headers: { Origin: 'https://attacker.example.org' } })).status, 403);
  const hostStatus = await new Promise(r => { request(url + '/api/state', { headers: { Host: 'attacker.example.org' } }, res => { res.resume(); r(res.statusCode); }).end(); });
  assert.equal(hostStatus, 403);
  assert.equal((await fetch(url + '/api/state', { method: 'POST' })).status, 405);
});
test('实时事件通知文件写入，重新读取可取得最新版本', async t => {
  const { url, store } = await fixture(t);
  const controller = new AbortController(); t.after(() => controller.abort());
  const response = await fetch(url + '/api/events', { signal: controller.signal });
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body.getReader(); let text = new TextDecoder().decode((await reader.read()).value);
  assert.match(text, /connected/);
  await store.initialize(blankWorkspace('phd'));
  const timer = setTimeout(() => controller.abort(), 3000);
  try { while (!text.includes('event: revision')) text += new TextDecoder().decode((await reader.read()).value); }
  finally { clearTimeout(timer); controller.abort(); }
  assert.match(text, /revision/);
  const state = await (await fetch(url + '/api/state')).json(); assert.equal(state.workspace.profile.track, 'phd'); assert.equal(state.workspace.revision, 1);
});
test('磁盘数据无效时返回错误，保留原始记录', async t => {
  const { url, store } = await fixture(t); await writeFile(store.file, '{bad');
  const response = await fetch(url + '/api/state'); assert.equal(response.status, 500); assert.match((await response.json()).error, /原文件已保留/);
});
