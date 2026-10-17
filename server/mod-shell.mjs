// Each command owns a disposable worker: synchronous built-ins cannot block the server or defeat cancellation.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

export const MOD_SHELL_TIMEOUT = 10e3;
const SHELL_OUT = 11000, SHELL_ERR = 2000;
// One command's output, cut by its size as JSON (escapes inflate text), as the model gets it.
export const fitOutput = (stdout, stderr) => {
  let out = stdout, err = stderr.slice(0, SHELL_ERR);
  for (;;) {
    const n = JSON.stringify({ stdout: out, stderr: err }).length;
    if (n <= SHELL_OUT) break;
    if (out.length) out = out.slice(0, Math.max(0, Math.floor((out.length * SHELL_OUT) / n) - 64));
    else err = err.slice(0, Math.max(0, Math.floor((err.length * SHELL_OUT) / n) - 64));
  }
  return { stdout: out, stderr: err, truncated: out.length < stdout.length || err.length < stderr.length };
};
// The parent owns the deadline and always waits for termination, including after errors or cancellation.
export const modShell = async (files, command, signal, timeout = MOD_SHELL_TIMEOUT) => {
  let worker, timer, abort, expired = false;
  try {
    signal?.throwIfAborted();
    return await new Promise((resolve, reject) => {
      worker = new Worker(new URL('./mod-shell.mjs', import.meta.url), {
        workerData: { modShell: true, files, command, timeout }, env: {}, execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 8, stackSizeMb: 4 },
        stdout: true, stderr: true,
      });
      worker.stdout.resume();
      worker.stderr.resume();
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', () => reject(new Error('shell worker stopped')));
      abort = () => reject(new Error('shell command aborted'));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      timer = setTimeout(() => {
        expired = true;
        reject(new Error(`timed out after ${timeout / 1000} s`));
      }, timeout);
    });
  } catch (e) {
    return { ...fitOutput('', `${e.message}\n`), exitCode: expired ? 124 : e.code === 'ERR_WORKER_OUT_OF_MEMORY' ? 126 : 1 };
  } finally {
    clearTimeout(timer);
    if (abort) signal?.removeEventListener('abort', abort);
    await worker?.terminate();
  }
};

if (!isMainThread && workerData?.modShell) {
  const { Bash } = await import('just-bash');
  const { files, command, timeout } = workerData;
  try {
    const bash = new Bash({
      files: Object.fromEntries(Object.entries(files).map(([p, b]) => [`/mod/${p}`, new Uint8Array(b)])),
      cwd: '/mod', env: { HOME: '/mod' }, executionLimitProfile: 'hardened',
      python: false, javascript: false, defenseInDepth: true,
      executionLimits: {
        maxExecutionTimeMs: timeout, maxLiveBytes: 16 << 20, maxFileSystemBytes: 8 << 20,
        maxOutputSize: 1 << 20, maxDatabaseBytes: 8 << 20, maxArchiveBytes: 8 << 20,
      },
    });
    const r = await bash.exec(command);
    parentPort.postMessage({ ...fitOutput(String(r.stdout ?? ''), String(r.stderr ?? '')), exitCode: r.exitCode ?? 0 });
  } catch (e) {
    parentPort.postMessage({ ...fitOutput('', `${e.message}\n`), exitCode: 1 });
  }
}
