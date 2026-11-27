#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { lintCorrectionsFile } from '../src/check-corrections.mjs';
import { printIssues } from '../src/shared/format-issue.mjs';
import { parseArgs } from '../src/shared/parse-args.mjs';

function usage() {
  console.error(`Usage: wl-check-corrections --root <dir> [--file <path>]

Default --file is docs/corrections.md relative to --root.`);
}

const { flags } = parseArgs(process.argv.slice(2));
if (flags.help) {
  usage();
  process.exit(0);
}

const root = path.resolve(
  typeof flags.root === 'string' ? flags.root : process.cwd(),
);
const relFile =
  typeof flags.file === 'string' ? flags.file : 'docs/corrections.md';
const absFile = path.join(root, relFile);

let scripts = {};
try {
  const pkgRaw = await fs.readFile(path.join(root, 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  scripts = pkg.scripts ?? {};
} catch {
  /* no package.json */
}

let issues;
try {
  issues = await lintCorrectionsFile(absFile, relFile, root, scripts);
} catch (err) {
  console.error(
    `${relFile}:1 Could not read corrections ledger — Fix: create ${relFile} with the required table columns (Date | Correction | Layer | Guard).`,
  );
  process.exit(1);
}

if (issues.length) {
  printIssues(issues);
  process.exit(1);
}
process.exit(0);