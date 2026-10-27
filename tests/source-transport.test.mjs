import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { requestPublic, proxyFor, publicTarget, publicAddress, dnsAnswer } from '../lib/source-http.mjs';
import { fetchSourceDocument, validateReaderDocument } from '../lib/source-reader.mjs';
import { blankWorkspace, validateWorkspace } from '../lib/model.mjs';

const url = 'https://school.example.org/admissions';
const resolve = async () => [{ address: '2001:4860:4860::8888', family: 6 }, { address: '8.8.8.8', family: 4 }];
const payload = (overrides = {}) => ({ code: 200, data: { httpStatus: 200, url, title: 'Graduate admissions', content: 'Official academic requirements. '.repeat(20), ...overrides } });
function response(body = '<p>Official admissions</p>', { status = 200, headers = {} } = {}, inspect = () => {}) {
  return (requestURL, options, callback) => {
    inspect(requestURL, options);
    const req = new EventEmitter(); req.destroy = () => {};
    queueMicrotask(() => { const res = Readable.from([Buffer.from(body)]); res.statusCode = status; res.headers = { 'content-type': 'text/html', ...headers }; callback(res); });
    return req;
  };
}

test('直连保留全部已核对地址，启用IPv6/IPv4连接回退', async () => {
  let addresses;
  const result = await requestPublic(url, { resolve, env: {}, requestImpl: response(undefined, {}, (_u, options) => {
    assert.equal(options.autoSelectFamily, true);
    options.lookup('school.example.org', { all: true }, (_error, rows) => { addresses = rows; });
  }) });
  assert.deepEqual(addresses, await resolve()); assert.match(result.body, /Official/);
});

test('代理Fake-IP必须独立确认真实公网地址，普通私网和混合答案不能放行', async () => {
  const fake = async () => [{ address: '198.18.0.62', family: 4 }, { address: '2001:2::31', family: 6 }];
  const env = { HTTPS_PROXY: 'http://127.0.0.1:3128' }; let queries = 0;
  const publicResolve = async host => { queries++; assert.equal(host, 'school.example.org'); return [{ address: '8.8.8.8', family: 4 }]; };
  const target = await publicTarget(url, fake, { env, publicResolve }); assert.equal(target.addresses[0].address, '8.8.8.8'); assert.equal(queries, 1);
  assert.equal(publicAddress('2001:2::31'), false);
  await assert.rejects(publicTarget(url, fake, { env: {}, publicResolve }), /保留网络/);
  await assert.rejects(publicTarget(url, async () => [{ address: '127.0.0.1', family: 4 }], { env, publicResolve }), /保留网络/);
  await assert.rejects(publicTarget(url, async () => [{ address: '8.8.8.8', family: 4 }, { address: '198.18.0.1', family: 4 }], { env, publicResolve }), /保留网络/);
  await assert.rejects(publicTarget('https://198.18.0.1/', fake, { env, publicResolve }), /保留网络/);
  await assert.rejects(publicTarget(url, fake, { env, publicResolve: async () => [{ address: '10.0.0.1', family: 4 }] }), /保留网络/);
  const dns = { Status: 0, Question: [{ name: 'school.example.org.', type: 1 }], Answer: [{ type: 1, data: '8.8.8.8', TTL: 30 }] };
  assert.equal(dnsAnswer(dns, 'school.example.org', 1)[0].address, '8.8.8.8');
  assert.throws(() => dnsAnswer(dns, 'other.example.org', 1), /未确认/);
  dns.Answer.push({ type: 1, data: '192.168.1.1', TTL: 30 }); assert.throws(() => dnsAnswer(dns, 'school.example.org', 1), /私网/);
});

test('代理目标仍固定到核对过的公网IP，保留原Host与TLS域名', async () => {
  await requestPublic(url, { resolve, env: { HTTPS_PROXY: 'http://127.0.0.1:3128' }, requestImpl: response(undefined, {}, (u, options) => {
    assert.equal(u.hostname, '8.8.8.8'); assert.equal(options.headers.Host, 'school.example.org'); assert.equal(options.servername, 'school.example.org');
  }) });
  assert.equal(proxyFor(new URL(url), { HTTPS_PROXY: 'http://localhost:3128', NO_PROXY: '.example.org' }), '');
  assert.equal(proxyFor(new URL(url), { https_proxy: 'http://localhost:3128' }), 'http://localhost:3128/');
  assert.equal(proxyFor(new URL(url), { HTTPS_PROXY: 'http://localhost:3128', NO_PROXY: 'school.example.org:80' }), 'http://localhost:3128/');
  assert.throws(() => proxyFor(new URL(url), { HTTPS_PROXY: 'file:///private' }), /代理地址/);
});

test('重定向到内网、降级、超大响应和整体超时仍会被拒绝', async () => {
  await assert.rejects(requestPublic(url, { resolve, env: {}, requestImpl: response('', { status: 302, headers: { location: 'https://127.0.0.1/' } }) }), /本机/);
  await assert.rejects(requestPublic(url, { resolve, env: {}, requestImpl: response('', { status: 302, headers: { location: 'http://school.example.org/' } }) }), /降级/);
  await assert.rejects(requestPublic(url, { resolve, env: {}, requestImpl: response('A'.repeat(2_000_001)) }), /2 MB/);
  await assert.rejects(requestPublic(url, { resolve, env: {}, timeoutMs: 15, requestImpl: () => { const req = new EventEmitter(); req.destroy = () => {}; return req; } }), /超时/);
});

test('公共阅读校验原URL、上游状态、完整正文及缓存和挑战页警告', () => {
  const good = validateReaderDocument(payload(), url); assert.equal(good.method, 'jina'); assert.equal(good.cacheMode, 'bypass');
  assert.throws(() => validateReaderDocument(payload({ url: 'https://other.example.org/' }), url), /其他来源/);
  assert.throws(() => validateReaderDocument(payload({ httpStatus: 403 }), url), /HTTP 200/);
  assert.throws(() => validateReaderDocument(payload({ content: '' }), url), /不完整/);
  assert.throws(() => validateReaderDocument({ ...payload(), warning: 'This is a cached snapshot' }, url), /旧缓存/);
  assert.throws(() => validateReaderDocument(payload({ content: 'Warning: This is a cached snapshot. ' + 'old '.repeat(100) }), url), /旧缓存/);
  assert.throws(() => validateReaderDocument(payload({ title: 'Just a moment...', content: 'Cloudflare Ray ID '.repeat(30) }), url), /安全验证/);
});

test('回退必须启用且仅发公开无查询URL，强制请求新正文并返回可审计来源', async () => {
  const calls = [], denied = new Error('官网返回 HTTP 403'); denied.status = 403;
  const request = async (u, options) => { calls.push({ u, options }); if (u === url) throw denied; return { body: JSON.stringify(payload()) }; };
  await assert.rejects(fetchSourceDocument(url, { reader: 'off', resolve, request }), /403/); assert.equal(calls.length, 1); calls.length = 0;
  const document = await fetchSourceDocument(url, { reader: 'jina', resolve, request });
  assert.equal(document.sourceUrl, url); assert.equal(document.upstreamStatus, 200); assert.equal(calls.length, 2);
  assert.equal(calls[1].u, 'https://r.jina.ai/' + url);
  assert.deepEqual(calls[1].options.headers, { Accept: 'application/json', 'X-No-Cache': 'true', 'X-Cache-Tolerance': '0', 'X-Timeout': '20', DNT: '1' });
  calls.length = 0;
  await assert.rejects(fetchSourceDocument(url + '?private=secret', { reader: 'jina', resolve, request: async (u, o) => { calls.push(u); throw denied; } }), /不带查询参数/); assert.equal(calls.length, 1);
  calls.length = 0;
  await assert.rejects(fetchSourceDocument('https://127.0.0.1/', { reader: 'jina', resolve, request: async () => calls.push('不应发生') }), /本机/); assert.equal(calls.length, 0);
  await assert.rejects(fetchSourceDocument(url, { reader: 'jina', resolve, request: async () => { const e = new Error('HTTP 404'); e.status = 404; throw e; } }), /404/);
});

test('旧设置兼容，读取策略与观察来源字段会按类型校验', () => {
  const w = blankWorkspace(); delete w.settings.sourceReader; validateWorkspace(w);
  w.settings.sourceReader = 'jina'; validateWorkspace(w);
  w.settings.sourceReader = 'unknown-reader'; assert.throws(() => validateWorkspace(w), /sourceReader/);
  w.settings.sourceReader = 'off'; w.sources = [{id:'official', label:'官网', url, cycle:'', verifiedAt:'', note:''}];
  w.observations = [{sourceId:'official', checkedAt:new Date().toISOString(), hash:'', previousHash:'', status:'baseline', message:'读取', method:'jina', sourceUrl:url, upstreamStatus:200, cacheMode:'bypass'}]; validateWorkspace(w);
  w.observations[0].method = 'untrusted'; assert.throws(() => validateWorkspace(w), /允许值/);
  w.observations[0].method = 'jina'; w.observations[0].upstreamStatus = 403; assert.throws(() => validateWorkspace(w), /上游状态/);
});

test('公网首地址连接停滞时在总时限内换地址，保留原域名验证', async () => {
  let calls = 0;
  const requestImpl = (u, options, cb) => {
    calls++; assert.equal(options.servername, 'school.example.org');
    if (calls > 1) return response(undefined, {}, () => assert.equal(u.hostname, '1.1.1.1'))(u, options, cb);
    const req = new EventEmitter(); req.destroy = () => {}; return req;
  };
  const result = await requestPublic(url, { resolve: async () => [{ address: '8.8.8.8', family: 4 }, { address: '1.1.1.1', family: 4 }], env: { HTTPS_PROXY: 'http://127.0.0.1:3128' }, timeoutMs: 200, connectTimeoutMs: 10, requestImpl });
  assert.equal(calls, 2); assert.match(result.body, /Official/);
});

test('阅读通道临时超时只重试一次，不拿旧正文冒充成功或重试来源校验失败', async () => {
  let reads = 0;
  const denied = new Error('HTTP 403'); denied.status = 403;
  const request = async (u, options) => {
    if (u === url) throw denied;
    reads++; assert.equal(options.headers['X-No-Cache'], 'true');
    if (reads === 1) { const e = new Error('官网请求超时'); e.code = 'SOURCE_NETWORK'; throw e; }
    assert.equal(options.addressOffset, 1); return { body: JSON.stringify(payload()) };
  };
  const result = await fetchSourceDocument(url, { reader: 'jina', resolve, request });
  assert.equal(reads, 2); assert.equal(result.retrievalAttempts, 2); assert.equal(result.upstreamStatus, 200);
  reads = 0;
  await assert.rejects(fetchSourceDocument(url, { reader: 'jina', resolve, request: async u => { if (u === url) throw denied; reads++; return { body: JSON.stringify(payload({ url: 'https://other.example.org/' })) }; } }), /其他来源/);
  assert.equal(reads, 1);
  reads = 0;
  await assert.rejects(fetchSourceDocument(url, { reader: 'jina', resolve, request: async u => { if (u === url) throw denied; reads++; const e = new Error('持续超时'); e.code = 'SOURCE_NETWORK'; throw e; } }), /已尝试2次/);
  assert.equal(reads, 2);
});
