import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dest = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.GRAD_ATLAS_PREVIEW_PORT || 4683);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const server = createServer(async (req, res) => {
  const send = (code, content, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(req.method === 'HEAD' ? undefined : content); };
  if (!['GET', 'HEAD'].includes(req.method) || ![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) return send(403, 'Forbidden');
  try {
    const path = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    const rel = path === '/' ? '/index.html' : path;
    if (!(/^\/(?:src\/|lib\/(?:model|lifecycle)\.mjs$|api\/state\/index\.html$|index\.html$)/.test(rel))) return send(404, 'Not found');
    const file = resolve(dest, `.${rel}`);
    if (!file.startsWith(dest + sep)) return send(403, 'Forbidden');
    const data = await readFile(file); send(200, data, types[extname(file)] || 'application/octet-stream');
  } catch { send(404, 'Not found; run npm run build first.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`GradAtlas 静态示例 http://127.0.0.1:${port} · Ctrl+C 停止`));
server.on('error', e => { console.error(e.message); process.exitCode = 1; });
