import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { safeURL } from './model.mjs';

export function publicAddress(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19].includes(b)));
  }
  // Only global IPv6 unicast; mapped/private/transition ranges are rejected.
  return isIP(ip) === 6 && /^[23][0-9a-f]{0,3}:/i.test(ip) && !/^2001:(?:db8|0:|10:|20:)/i.test(ip) && !/^2002:/i.test(ip);
}

export async function fetchPublicPage(raw, { redirects = 0, resolve = lookup } = {}) {
  if (redirects > 4) throw new Error('重定向次数过多');
  if (!safeURL(raw)) throw new Error('来源 URL 无效');
  const u = new URL(raw);
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('来源只允许标准 HTTP/HTTPS 端口');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolve(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('来源不能指向本机、局域网或保留网络');
  const selected = addresses[0];
  return new Promise((ok, reject) => {
    const req = (u.protocol === 'https:' ? https : http).get(u, {
      headers: { 'User-Agent': 'GradAtlas/1.0 (local source-change checker)', 'Accept': 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      lookup: (_hostname, options, cb) => options?.all ? cb(null, [selected]) : cb(null, selected.address, selected.family)
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, u);
        if (u.protocol === 'https:' && next.protocol !== 'https:') return reject(new Error('拒绝从 HTTPS 降级')); 
        return fetchPublicPage(next.href, { redirects: redirects + 1, resolve }).then(ok, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`官网返回 HTTP ${res.statusCode}`)); }
      if (!/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(res.headers['content-type'] || '')) { res.resume(); return reject(new Error('来源检查支持 HTML 或纯文本；PDF 需要 Agent 单独核验')); }
      let size = 0; const chunks = [];
      res.on('data', chunk => { size += chunk.length; if (size > 2_000_000) req.destroy(new Error('页面超过 2 MB，请由 Agent 核验')); else chunks.push(chunk); });
      res.on('end', () => ok(Buffer.concat(chunks).toString('utf8'))); res.on('error', reject);
    });
    req.setTimeout(12000, () => req.destroy(new Error('官网请求超时'))); req.on('error', reject);
  });
}

export function normalizedText(html) { return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
export async function inspectSource(source, previous, fetcher = fetchPublicPage) {
  const checkedAt = new Date().toISOString();
  try {
    const hash = createHash('sha256').update(normalizedText(await fetcher(source.url))).digest('hex');
    const previousHash = previous?.hash || '';
    const status = !previousHash ? 'baseline' : previousHash === hash ? 'unchanged' : 'changed';
    return { sourceId: source.id, checkedAt, hash, previousHash, status, message: status === 'changed' ? '网页文本有变化，请 Agent 核对适用周期、日期和要求。' : status === 'baseline' ? '已建立网页文本基线，尚未核实招生事实。' : '本次网页文本与上次一致，不代表申请信息仍有效。' };
  } catch (e) { return { sourceId: source.id, checkedAt, hash: previous?.hash || '', previousHash: previous?.hash || '', status: 'error', message: String(e.message).slice(0, 500) }; }
}

export async function refreshSources(store, fetcher) {
  const initial = await store.read();
  const observations = [];
  for (const source of initial.sources) observations.push(await inspectSource(source, [...initial.observations].reverse().find(o => o.sourceId === source.id && o.hash), fetcher));
  if (!observations.length) return { checked: 0, changed: 0, errors: 0 };
  // Reread after network IO and only merge observations for unchanged source URLs.
  const current = await store.read();
  const valid = observations.filter(o => current.sources.some(s => s.id === o.sourceId && initial.sources.find(t => t.id === s.id)?.url === s.url));
  await store.write({ ...current, observations: [...current.observations, ...valid].slice(-1000) }, current.revision);
  return { checked: valid.length, changed: valid.filter(o => o.status === 'changed').length, errors: valid.filter(o => o.status === 'error').length };
}
