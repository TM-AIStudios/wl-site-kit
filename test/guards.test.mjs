import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { lintCssImportantSource, lintCssImportantFile } from '../src/css-important.mjs';
import { lintInlineStyleSource } from '../src/inline-style.mjs';
import { lintAntiSlopSource } from '../src/anti-slop-copy.mjs';
import {
  lintCorrectionsSource,
  parseCorrectionsTable,
} from '../src/check-corrections.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (...p) => path.join(here, 'fixtures', ...p);

test('css-important flags bad fixture and allows reduced-motion block', async () => {
  const bad = await fs.readFile(fx('css-important', 'bad.css'), 'utf8');
  const issues = lintCssImportantSource(bad, 'bad.css');
  assert.ok(issues.length >= 1);
  assert.match(issues[0].message, /!important/);
  assert.equal(issues[0].line, 2);

  const good = await fs.readFile(fx('css-important', 'good.css'), 'utf8');
  assert.equal(lintCssImportantSource(good, 'good.css').length, 0);

  await lintCssImportantFile(fx('css-important', 'bad.css'), 'bad.css');
});

test('inline-style flags style= and passes clean html', async () => {
  const bad = await fs.readFile(fx('inline-style', 'bad.html'), 'utf8');
  assert.ok(lintInlineStyleSource(bad, 'bad.html').length >= 1);
  const good = await fs.readFile(fx('inline-style', 'good.html'), 'utf8');
  assert.equal(lintInlineStyleSource(good, 'good.html').length, 0);
});

test('anti-slop-copy flags violations and passes clean copy', async () => {
  const bad = await fs.readFile(fx('anti-slop', 'bad.md'), 'utf8');
  assert.ok(lintAntiSlopSource(bad, 'bad.md').length >= 2);
  const good = await fs.readFile(fx('anti-slop', 'good.md'), 'utf8');
  assert.equal(lintAntiSlopSource(good, 'good.md').length, 0);
});

test('anti-slop-copy excludeIds removes a rule', async () => {
  const bad = await fs.readFile(fx('anti-slop', 'bad.md'), 'utf8');
  const issues = lintAntiSlopSource(bad, 'bad.md', {
    excludeIds: ['leading-provider', 'fantastic-services', 'team-of-experts', 'star-glyphs'],
  });
  assert.equal(issues.length, 0);
});

test('corrections ledger parse and unguarded row', async () => {
  const bad = await fs.readFile(fx('corrections', 'bad.md'), 'utf8');
  const rows = parseCorrectionsTable(bad);
  assert.equal(rows.length, 1);
  const scripts = JSON.parse(
    await fs.readFile(fx('corrections', 'package.json'), 'utf8'),
  ).scripts;
  const issues = await lintCorrectionsSource(
    bad,
    'docs/corrections.md',
    fx('corrections'),
    scripts,
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /missing-guard-script/);

  const good = await fs.readFile(fx('corrections', 'good.md'), 'utf8');
  const ok = await lintCorrectionsSource(
    good,
    'docs/corrections.md',
    fx('corrections'),
    scripts,
  );
  assert.equal(ok.length, 0);
});