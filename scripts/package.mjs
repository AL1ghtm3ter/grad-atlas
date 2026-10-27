import { mkdir, copyFile, mkdtemp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { ROOT, audit } from './check-public.mjs';

const files = await audit();
const stage = await mkdtemp(join(tmpdir(), 'gradatlas-package-'));
for (const rel of files) { const dest = join(stage, 'grad-atlas', rel); await mkdir(dirname(dest), { recursive: true }); await copyFile(resolve(ROOT, rel), dest); }
await mkdir(join(ROOT, 'release'), { recursive: true });
const output = join(ROOT, 'release', `grad-atlas-source-${Date.now()}.tar.gz`);
execFileSync('tar', ['-czf', output, '-C', stage, 'grad-atlas'], { stdio: 'inherit' });
console.log(`源码包已生成：${output}`);
