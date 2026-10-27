import { createHash } from 'node:crypto';
import { fetchSourceDocument, assertSourceBody } from './source-reader.mjs';
export { publicAddress } from './source-http.mjs';
export { fetchPublicPage, fetchSourceDocument } from './source-reader.mjs';

export function normalizedText(html) { return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
export async function inspectSource(source, previous, fetcher = fetchSourceDocument) {
  const checkedAt = new Date().toISOString();
  try {
    const fetched = await fetcher(source.url);
    const document = typeof fetched === 'string' ? { body: fetched, method: 'direct' } : fetched;
    assertSourceBody(document.body);
    const method = document.method || 'direct';
    const hash = createHash('sha256').update(normalizedText(document.body)).digest('hex');
    const previousHash = previous?.hash || '';
    const switched = !!previousHash && (previous?.method || 'direct') !== method;
    const status = !previousHash || switched ? 'baseline' : previousHash === hash ? 'unchanged' : 'changed';
    const message = switched ? '读取通道切换，已建立新正文基线，不能把格式差异当成招生变化。' : status === 'changed' ? '网页文本有变化，请 Agent 核对适用周期、日期和要求。' : status === 'baseline' ? '已建立网页文本基线，尚未核实招生事实。' : '本次网页文本与上次一致，不代表申请信息仍有效。';
    const metadata = Object.fromEntries(['sourceUrl', 'upstreamStatus', 'cacheMode'].filter(k => document[k] !== undefined).map(k => [k, document[k]]));
    return { sourceId: source.id, checkedAt, hash, previousHash, status, method, ...metadata, message: message + (method === 'jina' ? ' 经 Jina 公共阅读服务，已请求不使用旧缓存。' : '') };
  } catch (e) { return { sourceId: source.id, checkedAt, hash: previous?.hash || '', previousHash: previous?.hash || '', status: 'error', method: previous?.method || e.method || 'direct', message: String(e.message).slice(0, 500) }; }
}

export async function refreshSources(store, fetcher) {
  const initial = await store.read();
  const observations = [];
  const reader = initial.settings.sourceReader ?? process.env.GRAD_ATLAS_SOURCE_READER ?? 'off';
  const read = fetcher || (url => fetchSourceDocument(url, { reader }));
  for (const source of initial.sources) observations.push(await inspectSource(source, [...initial.observations].reverse().find(o => o.sourceId === source.id && o.hash), read));
  if (!observations.length) return { checked: 0, changed: 0, errors: 0 };
  // Reread after network IO and only merge observations for unchanged source URLs.
  const current = await store.read();
  const valid = observations.filter(o => current.sources.some(s => s.id === o.sourceId && initial.sources.find(t => t.id === s.id)?.url === s.url));
  await store.write({ ...current, observations: [...current.observations, ...valid].slice(-1000) }, current.revision);
  return { checked: valid.length, changed: valid.filter(o => o.status === 'changed').length, errors: valid.filter(o => o.status === 'error').length };
}
