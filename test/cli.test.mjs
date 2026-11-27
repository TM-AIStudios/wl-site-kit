import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = (name) => path.join(root, 'bin', name);
const fx = (...p) => path.join(root, 'test', 'fixtures', ...p);

function run(cmd, args, cwd = root) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false });
    let stderr = '';
    let stdout = '';
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.on('close', (code) => resolve({ code, stderr, stdout }));
  });
}

test('wl-lint-guards fails on violations and passes on empty scan paths behavior', async () => {
  const fail = await run(process.execPath, [
    bin('wl-lint-guards.mjs'),
    '--root',
    fx('lint-guards-mini'),
    '--css',
    '.',
    '--html',
    '.',
  ]);
  assert.notEqual(fail.code, 0);
  assert.match(fail.stderr, /bad\.css/);
  assert.match(fail.stderr, /bad\.html/);

  const miniDir = fx('lint-guards-mini');
  const passCssOnly = await run(process.execPath, [
    bin('wl-lint-guards.mjs'),
    '--root',
    miniDir,
    '--copy',
    path.join(root, 'test', 'fixtures', 'anti-slop', 'good.md'),
  ]);
  assert.equal(passCssOnly.code, 0);
});

test('wl-check-corrections fails unguarded fixture', async () => {
  const fail = await run(process.execPath, [
    bin('wl-check-corrections.mjs'),
    '--root',
    fx('corrections'),
    '--file',
    'bad.md',
  ]);
  assert.equal(fail.code, 1);
  assert.match(fail.stderr, /missing-guard-script/);

  const pass = await run(process.execPath, [
    bin('wl-check-corrections.mjs'),
    '--root',
    fx('corrections'),
    '--file',
    'good.md',
  ]);
  assert.equal(pass.code, 0);
});

test('wl-site-verify serves static dir and checks routes', async () => {
  const pass = await run(process.execPath, [
    bin('wl-site-verify.mjs'),
    '--root',
    fx('site-verify'),
    '--dir',
    'dist',
    '--routes',
    '/',
    '--routes',
    '/about/',
  ]);
  assert.equal(pass.code, 0, pass.stderr);
});