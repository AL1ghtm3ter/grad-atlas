import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ALLOWED = ['README.md', 'README.en.md', 'LICENSE', 'package.json', '.gitignore', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'lib/', 'src/', 'scripts/', 'tests/', 'examples/', 'skills/', '.claude/commands/', 'docs/', '.github/', '.impeccable/design.json', '.impeccable/surfaces/'];
export const allowed = path => ALLOWED.some(p => p.endsWith('/') ? path.startsWith(p) : path === p);
export async function publicFiles(dir = ROOT) {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = resolve(dir, item.name), rel = relative(ROOT, file).replaceAll('\\', '/');
    if (item.isSymbolicLink()) { if (allowed(rel)) throw new Error(`公开目录不接受符号链接：${rel}`); continue; }
    if (item.isDirectory()) { if (ALLOWED.some(p => p.startsWith(rel + '/') || rel.startsWith(p.replace(/\/$/, '')))) result.push(...await publicFiles(file)); }
    else if (allowed(rel)) result.push(rel);
  }
  return result.sort();
}
export async function audit({ compareIndex = true } = {}) {
  const files = await publicFiles(), errors = [];
  const forbidden = /(?:^|\/)(?:\.local|\.runtime|node_modules|backups)(?:\/|$)|(?:\.local\.json$|\.env(?:\.|$)|\.pdf$|\.xlsx$|\.sqlite$|\.pem$|\.key$|\.zip$)/i;
  const secrets = [ /gh[pousr]_[A-Za-z0-9_]{20,}/g, /github_pat_[A-Za-z0-9_]{20,}/g, /sk-[A-Za-z0-9_-]{24,}/g, /-----BEGIN [^-]*PRIVATE KEY-----/g, /[A-Za-z]:\\Users\\[^\s\\]+/g, /[A-Z0-9._%+-]+@(?!example\.(?:org|com|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}/gi ];
  for (const rel of files) {
    if (forbidden.test(rel)) errors.push(`${rel}: 不应公开的路径或类型`);
    if ((await stat(resolve(ROOT, rel))).size > 5_000_000) errors.push(`${rel}: 超过公开文件大小上限`);
    if (['.png', '.jpg', '.webp', '.ico'].includes(extname(rel))) continue;
    const text = await readFile(resolve(ROOT, rel), 'utf8');
    for (const pattern of secrets) { pattern.lastIndex = 0; if (pattern.test(text)) errors.push(`${rel}: 疑似凭据、私人邮箱或用户目录`); }
  }
  let staged = [];
  try { staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\r?\n/).filter(Boolean); } catch { /* Fresh source package may have no Git metadata. */ }
  for (const rel of staged) if (!allowed(rel) || forbidden.test(rel)) errors.push(`${rel}: 暂存文件不在公开清单`);
  for (const rel of compareIndex ? staged.filter(allowed) : []) {
    try {
      const index = execFileSync('git', ['show', `:${rel}`], { cwd: ROOT, maxBuffer: 8_000_000, stdio: ['ignore', 'pipe', 'ignore'] });
      const working = await readFile(resolve(ROOT, rel));
      const hash = b => createHash('sha256').update(b).digest('hex');
      // Git may normalize LF/CRLF; compare normalized text, exact binary bytes.
      const binary = ['.png', '.jpg', '.webp', '.ico'].includes(extname(rel));
      if (hash(binary ? index : index.toString('utf8').replaceAll('\r\n', '\n')) !== hash(binary ? working : working.toString('utf8').replaceAll('\r\n', '\n'))) errors.push(`${rel}: 暂存内容与已检查的工作区不同，请重新暂存后检查`);
    } catch { errors.push(`${rel}: 无法检查确切暂存内容`); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`公开文件检查通过：${files.length} 个允许发布的文件，${staged.length} 个暂存文件。图片需另行检查实际内容。`);
  return files;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { await audit(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
