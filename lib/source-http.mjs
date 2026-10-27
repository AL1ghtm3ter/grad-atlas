import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import http from 'node:http';
import { safeURL } from './model.mjs';

export function publicAddress(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19].includes(b)));
  }
  return isIP(ip) === 6 && /^[23][0-9a-f]{0,3}:/i.test(ip) && !/^2001:(?:db8|0:|2:|10:|20:)/i.test(ip) && !/^2002:/i.test(ip);
}

const fakeAddress = ip => /^198\.(?:18|19)\./.test(ip) || /^2001:2:/i.test(ip);
const dnsCache = new Map();
export function dnsAnswer(payload, host, type) {
  if (payload?.Status !== 0 || payload.TC || !payload.Question?.some(q => q.name.toLowerCase().replace(/\.$/, '') === host.toLowerCase() && q.type === type)) throw new Error('公网 DNS 未确认所请求的域名');
  const rows = (payload.Answer || []).filter(a => [1, 28].includes(a.type)).map(a => ({ address: a.data, family: a.type === 1 ? 4 : 6, ttl: a.TTL }));
  if (rows.some(a => isIP(a.address) !== a.family || !publicAddress(a.address))) throw new Error('公网 DNS 返回了私网或保留地址，拒绝连接');
  return rows;
}
async function resolvePublicDNS(host, env) {
  const key = host.toLowerCase(), cached = dnsCache.get(key);
  if (cached && cached.until > Date.now()) return cached.addresses;
  const rows = (await Promise.all([1, 28].map(async type => {
    for (const endpoint of ['1.1.1.1', '1.0.0.1']) {
      try {
        const response = await requestPublic(`https://${endpoint}/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { env, acceptJSON: true, timeoutMs: 8000, headers: { Accept: 'application/dns-json' } });
        return dnsAnswer(JSON.parse(response.body), host, type);
      } catch (error) {
        if (endpoint === '1.0.0.1' || !(error.code === 'SOURCE_NETWORK' || [403, 408, 502, 503, 504].includes(error.status))) throw error;
      }
    }
  }))).flat();
  if (!rows.length) throw new Error('公网 DNS 没有可连接的公网地址');
  const addresses = [...new Map(rows.map(a => [a.address, { address: a.address, family: a.family }])).values()];
  const ttl = Math.max(0, Math.min(60, ...rows.map(a => Number.isFinite(a.ttl) ? a.ttl : 0)));
  if (dnsCache.size >= 200) dnsCache.delete(dnsCache.keys().next().value);
  dnsCache.set(key, { addresses, until: Date.now() + ttl * 1000 }); return addresses;
}

export async function publicTarget(raw, resolve = lookup, { env = process.env, publicResolve } = {}) {
  if (!safeURL(raw)) throw new Error('来源 URL 无效');
  const url = new URL(raw); url.hash = '';
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('来源只允许标准 HTTP/HTTPS 端口');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!isIP(host) && (!host.includes('.') || /(?:^|\.)(?:localhost|local|internal|lan)$/.test(host))) throw new Error('来源不能指向本机或内部域名');
  let addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await timed(resolve(host, { all: true, verbatim: true }), 6000);
  if (!isIP(host) && (resolve === lookup || publicResolve) && proxyFor(url, env) && addresses.length && addresses.every(a => fakeAddress(a.address))) {
    addresses = await (publicResolve || resolvePublicDNS)(host, env);
  }
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('来源不能指向本机、局域网或保留网络');
  return { url, host, addresses };
}

export function proxyFor(url, env = process.env) {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase(), port = url.port || (url.protocol === 'https:' ? '443' : '80');
  const excluded = String(env.no_proxy ?? env.NO_PROXY ?? '').split(',').some(value => {
    const entry = value.trim().toLowerCase(); if (!entry) return false; if (entry === '*') return true;
    const m = entry.match(/^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/); if (!m || (m[2] && m[2] !== port)) return false;
    const domain = m[1].replace(/^\[|\]$/g, '').replace(/^\*?\./, '');
    return host === domain || host.endsWith('.' + domain);
  });
  if (excluded) return '';
  const raw = url.protocol === 'https:' ? env.https_proxy ?? env.HTTPS_PROXY ?? env.http_proxy ?? env.HTTP_PROXY : env.http_proxy ?? env.HTTP_PROXY;
  if (!raw) return '';
  try { const p = new URL(raw); if (!['http:', 'https:'].includes(p.protocol) || p.search || p.hash || !['', '/'].includes(p.pathname)) throw new Error(); return p.href; }
  catch { throw new Error('HTTP_PROXY / HTTPS_PROXY 需要有效的 HTTP(S) 代理地址'); }
}

function timed(promise, milliseconds) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(networkError('官网请求超时')), Math.max(1, milliseconds)); })]).finally(() => clearTimeout(timer));
}
function networkError(message) { const error = new Error(message); error.code = 'SOURCE_NETWORK'; return error; }

// Pin every source connection to previously checked public addresses, including
// the CONNECT destination when a user-configured proxy is used.
async function requestOnce(target, { env, headers, acceptJSON, deadline, connectTimeoutMs, requestImpl, proxyAddress }) {
  const { url, host, addresses } = target, proxy = proxyFor(url, env);
  const requestURL = new URL(url);
  if (proxy) {
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (!((major === 22 && minor >= 21) || (major === 24 && minor >= 5) || major > 24)) throw new Error('代理读取需要 Node.js 22.21 或 24.5 以上版本');
    requestURL.hostname = proxyAddress.family === 6 ? `[${proxyAddress.address}]` : proxyAddress.address;
  }
  const module = url.protocol === 'https:' ? https : http;
  const agent = new module.Agent({ proxyEnv: proxy ? { HTTP_PROXY: proxy, HTTPS_PROXY: proxy } : {}, keepAlive: false });
  return new Promise((ok, reject) => {
    let settled = false, timer, connectTimer;
    const finish = (error, result) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(connectTimer); agent.destroy(); error ? reject(error) : ok(result); };
    const options = {
      agent, servername: isIP(host) ? undefined : host, autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 250,
      headers: { 'User-Agent': 'GradAtlas/1.2 (public source checker)', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity', ...headers, Host: url.host },
      lookup: (name, lookupOptions, cb) => { if (proxy && name.replace(/^\[|\]$/g, '') !== host) return lookup(name, lookupOptions, cb); return lookupOptions?.all ? cb(null, addresses) : cb(null, addresses[0].address, addresses[0].family); }
    };
    const req = (requestImpl || module.get)(requestURL, options, res => {
      clearTimeout(connectTimer);
      if (res.statusCode !== 200) { res.resume(); return finish(null, { status: res.statusCode, headers: res.headers, body: '', url: url.href }); }
      const types = acceptJSON ? /^(application\/(?:json|dns-json)|text\/html|text\/plain|application\/xhtml\+xml)/i : /^(text\/html|text\/plain|application\/xhtml\+xml)/i;
      if (!types.test(res.headers['content-type'] || '')) { res.resume(); return finish(new Error('来源检查支持 HTML 或纯文本；PDF 需要 Agent 单独核验')); }
      let size = 0; const chunks = [];
      res.on('data', chunk => { size += chunk.length; if (size > 2_000_000) { finish(new Error('页面超过 2 MB，请由 Agent 核验')); req.destroy(); } else chunks.push(chunk); });
      res.on('end', () => finish(null, { status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), url: url.href }));
      res.on('aborted', () => finish(networkError('官网响应未完整接收')));
      res.on('error', () => finish(networkError('官网响应读取失败')));
    });
    timer = setTimeout(() => { finish(networkError('官网请求超时')); req.destroy(); }, Math.max(1, deadline - Date.now()));
    connectTimer = setTimeout(() => { finish(networkError('官网连接超时')); req.destroy(); }, Math.max(1, Math.min(connectTimeoutMs, deadline - Date.now())));
    req.once('socket', socket => {
      if (!socket.connecting && (!socket.encrypted || socket.authorized)) clearTimeout(connectTimer);
      else socket.once(socket.encrypted ? 'secureConnect' : 'connect', () => clearTimeout(connectTimer));
    });
    if (settled) { clearTimeout(timer); clearTimeout(connectTimer); }
    req.on('error', error => finish(networkError(`官网连接失败${error.code ? `（${error.code}）` : ''}`)));
  });
}

export async function requestPublic(raw, { resolve = lookup, env = process.env, headers = {}, acceptJSON = false, timeoutMs = 12000, connectTimeoutMs = 5000, addressOffset = 0, deadline = Date.now() + timeoutMs, redirects = 0, requestImpl } = {}) {
  if (redirects > 4) throw new Error('重定向次数过多');
  const target = await timed(publicTarget(raw, resolve, { env }), deadline - Date.now());
  if (Date.now() >= deadline) throw networkError('官网请求超时');
  const proxy = proxyFor(target.url, env);
  const ordered = proxy ? [...target.addresses].sort((a, b) => a.family - b.family) : [undefined];
  const offset = (addressOffset >>> 0) % ordered.length;
  const candidates = [...ordered.slice(offset), ...ordered.slice(0, offset)];
  let response;
  for (let i = 0; i < candidates.length; i++) {
    try { response = await requestOnce(target, { env, headers, acceptJSON, deadline, connectTimeoutMs, requestImpl, proxyAddress: candidates[i] }); break; }
    catch (error) { if (error.code !== 'SOURCE_NETWORK' || i === candidates.length - 1 || Date.now() >= deadline) throw error; }
  }
  if (response.status >= 300 && response.status < 400 && response.headers.location) {
    const next = new URL(response.headers.location, target.url);
    if (target.url.protocol === 'https:' && next.protocol !== 'https:') throw new Error('拒绝从 HTTPS 降级');
    return requestPublic(next.href, { resolve, env, headers, acceptJSON, deadline, connectTimeoutMs, addressOffset, redirects: redirects + 1, requestImpl });
  }
  if (response.status !== 200) { const error = new Error(`官网返回 HTTP ${response.status}`); error.status = response.status; throw error; }
  return response;
}
