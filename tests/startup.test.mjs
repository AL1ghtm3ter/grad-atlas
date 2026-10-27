import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, cp, readFile, rm, realpath } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gradatlas-start-')), clone = join(dir, 'clone'), children = [];
  await mkdir(join(clone, 'scripts'), { recursive: true });
  for (const folder of ['lib', 'src', 'examples']) await cp(join(root, folder), join(clone, folder), { recursive: true });
  await cp(join(root, 'scripts/server.mjs'), join(clone, 'scripts/server.mjs'));
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const [node, ...args] = pkg.scripts['demo:phd'].split(/\s+/); assert.equal(node, 'node');
  const occupied = createServer();
  await new Promise((ok, reject) => { occupied.once('error', e => e.code === 'EADDRINUSE' ? ok() : reject(e)); occupied.listen(4682, '127.0.0.1', ok); });
  t.after(async () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) await new Promise(ok => { child.once('exit', ok); child.kill(); });
    if (occupied.listening) await new Promise(ok => occupied.close(ok));
    const target = await realpath(dir), parent = await realpath(tmpdir());
    assert.equal(dirname(target), parent); assert.ok(basename(target).startsWith('gradatlas-start-'));
    await rm(target, { recursive: true, force: true });
  });
  return { clone, args, children };
}
async function freePort() { const server = createServer(); await new Promise(ok => server.listen(0, '127.0.0.1', ok)); const port = server.address().port; await new Promise(ok => server.close(ok)); return port; }
async function start(f, args, env, port) {
  const child = spawn(process.execPath, args, { cwd: f.clone, env: { ...process.env, GRAD_ATLAS_PORT: '', GRAD_ATLAS_SOURCE_READER: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  f.children.push(child);
  await new Promise((ok, reject) => {
    let output = '', errors = '', finished = false;
    const finish = error => { if (finished) return; finished = true; clearTimeout(timer); error ? reject(error) : ok(); };
    const timer = setTimeout(() => finish(new Error('启动未到达指定端口：' + output + errors)), 10000);
    child.stdout.on('data', chunk => { output += chunk; if (output.includes(`http://127.0.0.1:${port}`)) finish(); });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.once('exit', code => finish(new Error(`启动提前退出${code}：${output}${errors}`)));
  });
  const url = `http://127.0.0.1:${port}`;
  assert.equal((await (await fetch(url + '/api/health')).json()).demo, true);
  assert.equal((await (await fetch(url + '/api/state')).json()).workspace.profile.track, 'phd');
}

test('博士示例默认端口被占用时，npm追加的端口参数仍能启动独立博士示例', async t => {
  const f = await fixture(t), port = await freePort();
  await start(f, [...f.args, '--port', String(port)], { GRAD_ATLAS_PORT: '4682' }, port);
});

test('博士示例没有显式端口时，采用环境指定端口而非脚本固定值', async t => {
  const f = await fixture(t), port = await freePort();
  await start(f, f.args, { GRAD_ATLAS_PORT: String(port) }, port);
});
