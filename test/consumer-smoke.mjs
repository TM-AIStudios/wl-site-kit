import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function sh(cmd, args, opts = {}) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
  cwd: opts.cwd ?? root,
    env: { ...process.env, ...opts.env },
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout, stderr };
}

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wl-site-kit-smoke-'));

try {
  const { stdout: packOut } = await sh('npm', ['pack', '--pack-destination', tmp]);
  const tgz = packOut.trim().split('\n').pop();
  const consumerDir = path.join(tmp, 'consumer');
  await fs.mkdir(consumerDir, { recursive: true });
  await fs.writeFile(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({ name: 'consumer', type: 'module', private: true }, null, 2),
  );
  await sh('npm', ['install', path.join(tmp, tgz)], { cwd: consumerDir });

  const {
    lintCssImportantSource,
    lintInlineStyleSource,
    lintAntiSlopSource,
    defaultCopyBans,
  } = await import(
    path.join(consumerDir, 'node_modules', '@tm-aistudios', 'wl-site-kit', 'src', 'index.mjs')
  );
  assert.ok(typeof lintCssImportantSource === 'function');
  assert.ok(Array.isArray(defaultCopyBans));
  assert.ok(lintCssImportantSource('.x{color:red!important}', 'x.css').length === 1);
  assert.ok(lintInlineStyleSource('<p style="x">', 'x.html').length === 1);
  assert.ok(lintAntiSlopSource('leading provider', 'x.md').length >= 1);

  const binDir = path.join(
    consumerDir,
    'node_modules',
    '@tm-aistudios',
    'wl-site-kit',
    'bin',
  );
  for (const cli of ['wl-lint-guards.mjs', 'wl-check-corrections.mjs']) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(binDir, cli), '--help'], {
        cwd: consumerDir,
      });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cli} exit ${code}`))));
    });
  }

  console.log('consumer-smoke: ok');
} finally {
  await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
}