import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bannedPatterns = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /-----BEGIN [A-Z ]+-----/,
  /sk_live_[a-zA-Z0-9]+/,
  /formspree\.io/i,
];

const cityOrDomainLike = new RegExp(
  String.raw`\b(?:${['example\.com', 'acme-corp', 'london', 'chicago', 'manchester'].join('|')})\b`,
  'i',
);

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    if (ent.name === 'cleanliness.test.mjs') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.isFile()) yield p;
  }
}

test('repo has no secrets, domains, or site-specific names', async () => {
  for await (const file of walk(root)) {
    if (file.endsWith('.png')) continue;
    if (file.endsWith(`${path.sep}test${path.sep}cleanliness.test.mjs`)) continue;
    const text = await fs.readFile(file, 'utf8').catch(() => '');
    for (const re of bannedPatterns) {
      re.lastIndex = 0;
      assert.ok(!re.test(text), `${path.relative(root, file)} matched ${re}`);
    }
    assert.ok(
      !cityOrDomainLike.test(text),
      `${path.relative(root, file)} matched city/domain heuristic`,
    );
  }
});