#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { lintCssImportantFile } from '../src/css-important.mjs';
import { lintInlineStyleSource } from '../src/inline-style.mjs';
import { lintAntiSlopSource } from '../src/anti-slop-copy.mjs';
import { collectPaths } from '../src/shared/walk-paths.mjs';
import { printIssues } from '../src/shared/format-issue.mjs';
import { parseArgs } from '../src/shared/parse-args.mjs';

function usage() {
  console.error(`Usage: wl-lint-guards --root <dir> [--css <paths...>] [--copy <paths...>] [--html <paths...>]

Scans CSS, copy, and HTML/TS sources with built-in guards. Exits 1 when any issue is found.`);
}

const { flags } = parseArgs(process.argv.slice(2));
if (flags.help) {
  usage();
  process.exit(0);
}

const root = path.resolve(
  typeof flags.root === 'string' ? flags.root : process.cwd(),
);
const cssPaths = /** @type {string[]} */ (flags.css ?? []);
const copyPaths = /** @type {string[]} */ (flags.copy ?? []);
const htmlPaths = /** @type {string[]} */ (flags.html ?? []);

if (!cssPaths.length && !copyPaths.length && !htmlPaths.length) {
  usage();
  process.exit(2);
}

/** @type {import('../src/shared/types.d.ts').LintIssue[]} */
const allIssues = [];

async function readAndLintHtml(abs, rel) {
  const src = await fs.readFile(abs, 'utf8');
  return [
    ...lintInlineStyleSource(src, rel),
    ...lintAntiSlopSource(src, rel),
  ];
}

for (const p of cssPaths) {
  const files = await collectPaths(p, (abs) => /\.css$/i.test(abs), root);
  for (const { abs, rel } of files) {
    allIssues.push(...(await lintCssImportantFile(abs, rel)));
  }
}

const copyExts = /\.(html?|md|tsx?|jsx?|astro|vue|svelte)$/i;
for (const p of copyPaths) {
  const files = await collectPaths(p, (abs) => copyExts.test(abs), root);
  for (const { abs, rel } of files) {
    const src = await fs.readFile(abs, 'utf8');
    allIssues.push(...lintAntiSlopSource(src, rel));
  }
}

const htmlExts = /\.(html?|tsx?|jsx?|astro|vue|svelte)$/i;
for (const p of htmlPaths) {
  const files = await collectPaths(p, (abs) => htmlExts.test(abs), root);
  for (const { abs, rel } of files) {
    allIssues.push(...(await readAndLintHtml(abs, rel)));
  }
}

if (allIssues.length) {
  printIssues(allIssues);
  process.exit(1);
}
process.exit(0);