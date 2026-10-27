import { mkdir, copyFile, cp, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoWorkspace } from '../examples/demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = resolve(root, 'dist');
await mkdir(dest, { recursive: true });
await cp(resolve(root, 'src'), resolve(dest, 'src'), { recursive: true });
await mkdir(resolve(dest, 'lib'), { recursive: true });
await copyFile(resolve(root, 'lib/model.mjs'), resolve(dest, 'lib/model.mjs'));
await copyFile(resolve(root, 'lib/lifecycle.mjs'), resolve(dest, 'lib/lifecycle.mjs'));
const html = await readFile(resolve(root, 'src/index.html'), 'utf8');
await writeFile(resolve(dest, 'index.html'), html.replace('<title>', '<meta name="gradatlas-mode" content="static"><title>'));
// Static distribution is always synthetic. It never reads .local/ or browser state.
await mkdir(resolve(dest, 'api/state'), { recursive: true });
await writeFile(resolve(dest, 'api/state/index.html'), JSON.stringify({ workspace: demoWorkspace('master'), demo: true }));
await writeFile(resolve(dest, 'STATIC-DEMO.txt'), 'This static build contains synthetic example data only. Serve over HTTP at the domain root. For an editable personal workspace and live updates, use npm start from the source project.\n');
console.log('dist/ 已生成，仅包含虚构硕士示例。个人工作区与实时同步请运行 npm start。');
