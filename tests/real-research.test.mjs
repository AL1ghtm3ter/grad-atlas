import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateWorkspace } from '../lib/model.mjs';
import { actionDates } from '../lib/lifecycle.mjs';

test('真实院校公开基线可读取，保留日期缺口，不包含虚构的个人申请进度', async () => {
  const w = validateWorkspace(JSON.parse(await readFile(new URL('../examples/real-phd-research-20261028.json', import.meta.url), 'utf8')));
  assert.equal(w.programs.length, 4); assert.ok(w.sources.length >= 4);
  for (const key of ['academicRecord', 'language', 'budget', 'researchExperience', 'publications']) assert.equal(w.profile[key], '');
  for (const p of w.programs) {
    assert.equal(p.application.status, '未开始'); assert.equal(p.application.submittedOn, '');
    assert.equal(p.application.decision.status, '待结果'); assert.equal(p.application.funding.status, '待核对');
    assert.equal(p.application.contacts.length, 0); assert.equal(p.application.interviews.length, 0);
    assert.ok(p.facts.every(f => f.sourceId && f.verifiedAt === '2026-10-28'));
  }
  const leiden = w.programs.find(p => p.id.startsWith('leiden-')), mit = w.programs.find(p => p.id.startsWith('mit-'));
  assert.equal(leiden.deadline.timezone, ''); assert.equal(mit.deadline.date, ''); assert.equal(mit.deadline.basis, 'unknown');
  assert.ok(!actionDates(w).some(e => [leiden.id, mit.id].includes(e.program.id) && e.deadline.basis === 'official'));
  const oxford = w.programs.find(p => p.id.startsWith('oxford-'));
  assert.ok(oxford.application.milestones.some(m => m.deadline.date === '2027-01-06' && m.deadline.time === '12:00'));
  assert.ok(oxford.application.milestones.some(m => m.deadline.date === '2027-03-02' && m.deadline.time === '12:00'));
});
