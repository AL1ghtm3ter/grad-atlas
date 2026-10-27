import { requestPublic, publicTarget } from './source-http.mjs';

export function assertSourceBody(body, title = '') {
  if (typeof body !== 'string' || !body.trim()) throw new Error('官网返回空正文');
  const pageTitle = title || body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const plain = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) throw new Error('官网返回空正文');
  if (/^\s*(?:Just a moment|请稍候|请稍等|Access Denied|Attention Required|Verify you are human|Robot Check)/i.test(pageTitle) || (plain.length < 1500 && /Cloudflare Ray ID|Enable JavaScript and cookies|正在进行安全验证|验证您不是自动程序/i.test(plain))) {
    const error = new Error('官网返回安全验证页，未取得招生正文'); error.code = 'SOURCE_CHALLENGE'; throw error;
  }
  return body;
}

export function validateReaderDocument(payload, raw) {
  const target = new URL(raw); target.hash = '';
  const d = payload?.data;
  if (payload?.code !== 200 || d?.httpStatus !== 200) { const error = new Error('公共阅读服务未取得上游 HTTP 200 正文'); error.status = payload?.code !== 200 ? payload?.code : d?.httpStatus; throw error; }
  let reported;
  try { reported = new URL(d.url); reported.hash = ''; } catch { throw new Error('公共阅读服务缺少有效的原始来源 URL'); }
  if (reported.href !== target.href) throw new Error('公共阅读服务返回了其他来源，拒绝建立基线');
  const warnings = [payload.warning, d.warning, ...(Array.isArray(payload.warnings) ? payload.warnings : [])].filter(Boolean).join(' ');
  if (/cached|stale|缓存|快照/i.test(warnings) || /Warning:\s*(?:This is a cached snapshot|[^\n]*stale cache)/i.test(String(d.content || '').slice(0, 1000))) throw new Error('公共阅读服务报告旧缓存，未确认本次重新抓取');
  if (typeof d.content !== 'string' || d.content.trim().length < 200) throw new Error('公共阅读服务返回的正文为空或不完整');
  assertSourceBody(d.content, d.title);
  return { body: d.content, method: 'jina', sourceUrl: target.href, upstreamStatus: 200, cacheMode: 'bypass' };
}

export async function fetchSourceDocument(raw, { reader = process.env.GRAD_ATLAS_SOURCE_READER || 'off', resolve, env = process.env, request = requestPublic, ...options } = {}) {
  if (!['off', 'jina'].includes(reader)) throw new Error('sourceReader 需要是 off 或 jina');
  const target = await publicTarget(raw, resolve, { env });
  try {
    const response = await request(target.url.href, { ...options, resolve, env, headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
    assertSourceBody(response.body);
    return { body: response.body, method: 'direct', sourceUrl: target.url.href, upstreamStatus: 200, cacheMode: 'no-cache' };
  } catch (error) {
    if (reader !== 'jina' || !(error.code === 'SOURCE_NETWORK' || error.code === 'SOURCE_CHALLENGE' || error.status === 403)) throw error;
    if (target.url.search || /\/(?:login|signin|sign-in|oauth|sso|auth)(?:\/|$)/i.test(target.url.pathname)) throw new Error('直连失败；公共阅读回退仅用于不带查询参数的公开内容页，登录入口需单独核对');
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await request(`https://r.jina.ai/${target.url.href}`, {
          resolve, env, timeoutMs: 30000, addressOffset: attempt, acceptJSON: true,
          headers: { Accept: 'application/json', 'X-No-Cache': 'true', 'X-Cache-Tolerance': '0', 'X-Timeout': '20', DNT: '1' }
        });
        const document = validateReaderDocument(JSON.parse(response.body), target.url.href);
        return { ...document, retrievalAttempts: attempt + 1, fallbackReason: error.status ? `直连 HTTP ${error.status}` : error.code === 'SOURCE_CHALLENGE' ? '直连安全验证页' : '直连网络失败' };
      } catch (readerError) {
        if (attempt === 0 && (readerError.code === 'SOURCE_NETWORK' || [408, 500, 502, 503, 504].includes(readerError.status))) { await new Promise(resolve => setTimeout(resolve, 500)); continue; }
        const failure = new Error(`直连未取得正文；Jina 回退失败（已尝试${attempt + 1}次）：${readerError instanceof SyntaxError ? '返回的正文元数据不是有效 JSON' : readerError.message}`);
        failure.method = 'jina'; throw failure;
      }
    }
  }
}

// Retain the original string API for existing extensions and acceptance tools.
export async function fetchPublicPage(raw, options) { return (await fetchSourceDocument(raw, options)).body; }
