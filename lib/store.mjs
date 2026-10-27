import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { blankWorkspace, validateWorkspace } from './model.mjs';

export async function atomicReplace(from, to, renameFile = rename, pause = wait) {
  // Windows scanners/readers can briefly hold a file. Keep the old file and lock
  // while retrying the atomic operation; never fall back to truncating it.
  for (let attempt = 0; ; attempt++) {
    try { await renameFile(from, to); return; }
    catch (e) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(e.code) || attempt >= 5) throw e;
      await pause(25 * 2 ** attempt);
    }
  }
}

export class Store {
  constructor(dir, initial = blankWorkspace()) { this.dir = dir; this.file = join(dir, 'workspace.json'); this.initial = initial; this.queue = Promise.resolve(); }
  async read() {
    try { return validateWorkspace(JSON.parse(await readFile(this.file, 'utf8'))); }
    catch (e) { if (e.code === 'ENOENT') return structuredClone(this.initial); throw new Error(`本地记录无法读取，原文件已保留：${e.message}`); }
  }
  async write(next, expectedRevision) {
    const run = this.queue.then(async () => {
      validateWorkspace(next);
      await mkdir(this.dir, { recursive: true });
      // Exclusive lock coordinates CLI processes, source checks and server updates.
      const lock = join(this.dir, 'write.lock');
      const { open, unlink } = await import('node:fs/promises');
      let handle;
      try { handle = await open(lock, 'wx'); } catch (e) { if (e.code === 'EEXIST') throw new Error('已有写入正在进行；稍后重试。如进程异常退出，请先确认没有写入进程再移除 .local/write.lock。'); throw e; }
      const temp = `${this.file}.${randomUUID()}.tmp`;
      try {
        const current = await this.read();
        if (expectedRevision !== current.revision) throw new Error(`版本冲突：期望 ${expectedRevision}，当前 ${current.revision}；先重新读取，再合并修改。`);
        const result = { ...next, revision: current.revision + 1, updatedAt: new Date().toISOString() };
        await writeFile(temp, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
        try { await mkdir(join(this.dir, 'backups'), { recursive: true }); await copyFile(this.file, join(this.dir, 'backups', `${current.revision}-${randomUUID()}.json`)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
        await atomicReplace(temp, this.file);
        return result;
      } finally { await handle.close(); await unlink(lock).catch(() => {}); await unlink(temp).catch(() => {}); }
    });
    this.queue = run.catch(() => {});
    return run;
  }
  async initialize(workspace) {
    try { await readFile(this.file); throw new Error('已有本地记录；init 不会覆盖。请使用 snapshot 和 apply。'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    return this.write(workspace, 0);
  }
}
