import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestLoader } from '../src/live.mjs';

test('慢读取期间收到新事件时排队补读，避免丢失更新', async () => {
  let release, reads = 0, renderedVersion = 0, version = 1;
  const first = new Promise(r => { release = r; });
  const load = createLatestLoader(async () => { reads++; const captured = version; if (reads === 1) await first; renderedVersion = captured; });
  const running = load(); version = 2; await load(); await load(); release(); await running;
  assert.equal(reads, 2); assert.equal(renderedVersion, 2);
});
test('读取失败后释放读取器，后续更新可以恢复', async () => {
  let count = 0, caught = 0;
  const load = createLatestLoader(async () => { if (++count === 1) throw new Error('offline'); }, () => { caught++; });
  await load(); await load(); assert.equal(count, 2); assert.equal(caught, 1);
});
