import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, extname, sep } from 'node:path';
import { Store } from '../lib/store.mjs';
import { refreshSources } from '../lib/sources.mjs';
import { demoWorkspace } from '../examples/demo.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

export async function createApp({ dir = join(ROOT, '.local'), demo = false, demoTrack = 'master' } = {}) {
  const initial = demo ? { ...demoWorkspace(demoTrack), revision: 0 } : undefined;
  const store = new Store(dir, initial);
  await mkdir(dir, { recursive: true });
  if (demo) { try { await readFile(store.file); } catch (e) { if (e.code !== 'ENOENT') throw e; await store.initialize({ ...initial, revision: 0 }); } }
  const clients = new Set();
  let latestSignature = '', busy = false, lastCheck = Date.now(), refreshTimer, debounce;
  const notify = (type = 'revision', payload = {}) => { for (const client of clients) client.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`); };
  async function changed() {
    try { const state = await store.read(); const signature = JSON.stringify(state); if (signature !== latestSignature) { latestSignature = signature; notify('revision', { revision: state.revision }); } }
    catch (e) { notify('data-error', { message: e.message }); }
  }
  const watcher = watch(dir, (_event, file) => { if (String(file) === 'workspace.json') { clearTimeout(debounce); debounce = setTimeout(changed, 80); } });
  const heartbeat = setInterval(() => { for (const c of clients) c.write(': heartbeat\n\n'); }, 15000).unref();
  // A directory watch survives atomic file replacement; polling covers missed OS events.
  refreshTimer = setInterval(async () => {
    await changed();
    if (demo || busy) return;
    try {
      const state = await store.read();
      if (state.settings.refreshMinutes && Date.now() - lastCheck >= state.settings.refreshMinutes * 60000) {
        busy = true; lastCheck = Date.now(); await refreshSources(store);
      }
    } catch (e) { notify('data-error', { message: e.message }); }
    finally { busy = false; }
  }, 5000).unref();
  const server = createServer(async (req, res) => {
    const security = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors http://127.0.0.1:* http://localhost:*"
    };
    for (const [k, v] of Object.entries(security)) res.setHeader(k, v);
    const send = (status, data, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type }); res.end(typeof data === 'string' ? data : JSON.stringify(data)); };
    try {
      const port = server.address()?.port;
      const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!allowedHosts.includes(req.headers.host)) return send(403, { error: 'Host 不受信任' });
      if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) return send(403, { error: '跨来源请求已拒绝' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { error: '此服务只提供读取；由本地 Agent 命令维护记录。' });
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname === '/api/health') return send(200, { name: 'grad-atlas', version: '1.2.0', demo });
      if (url.pathname === '/api/state') { const workspace = await store.read(); return send(200, { workspace, demo, sourceReader: workspace.settings.sourceReader ?? process.env.GRAD_ATLAS_SOURCE_READER ?? 'off' }); }
      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write('event: connected\ndata: {}\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
      }
      const decoded = decodeURIComponent(url.pathname);
      let file;
      if (decoded === '/') file = join(ROOT, 'src/index.html');
      else if (decoded.startsWith('/src/')) file = resolve(ROOT, `.${decoded}`);
      else if (['/lib/model.mjs', '/lib/lifecycle.mjs'].includes(decoded)) file = join(ROOT, `.${decoded}`);
      else return send(404, { error: '页面不存在' });
      if (!(file.startsWith(join(ROOT, 'src') + sep) || ['model.mjs', 'lifecycle.mjs'].some(f => file === join(ROOT, 'lib', f)))) return send(403, { error: '路径不允许' });
      const type = TYPES[extname(file)]; if (!type) return send(404, { error: '文件类型不允许' });
      const body = await readFile(file); res.writeHead(200, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body);
    } catch (e) { send(e.code === 'ENOENT' ? 404 : 500, { error: e.code === 'ENOENT' ? '文件不存在' : e.message }); }
  });
  return { server, store, close: async () => { watcher.close(); clearInterval(heartbeat); clearInterval(refreshTimer); clearTimeout(debounce); for (const c of clients) c.end(); if (server.listening) await new Promise(r => server.close(r)); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), demoArg = args.find(a => a === '--demo' || a.startsWith('--demo='));
  const demoTrack = demoArg?.split('=')[1] || 'master';
  if (!['master', 'phd'].includes(demoTrack)) throw new Error('演示方向为 master 或 phd');
  const portIndex = args.indexOf('--port');
  const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.GRAD_ATLAS_PORT || (demoArg ? 4681 : 4680));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口需要是 1–65535 的整数');
  const app = await createApp({ demo: !!demoArg, demoTrack, dir: join(ROOT, demoArg ? `.runtime/demo-${demoTrack}` : '.local') });
  app.server.on('error', e => { console.error(`无法启动：${e.message}`); process.exitCode = 1; app.close(); });
  app.server.listen(port, '127.0.0.1', () => console.log(`GradAtlas ${demoArg ? '虚构示例' : '本地工作区'} http://127.0.0.1:${port}\nCtrl+C 停止。个人信息由 Agent 写入 .local/workspace.json。`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
