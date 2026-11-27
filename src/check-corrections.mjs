import fs from 'node:fs/promises';
import path from 'node:path';

const HEADER =
  /^\|\s*Date\s*\|\s*Correction\s*\|\s*Layer\s*\|\s*Guard\s*\|?\s*$/i;

/**
 * @param {string} markdown
 * @returns {{ line: number, guard: string }[]}
 */
export function parseCorrectionsTable(markdown) {
  const lines = markdown.split('\n');
  /** @type {{ line: number, guard: string }[]} */
  const rows = [];
  let inTable = false;
  let headerSeen = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!inTable && HEADER.test(line)) {
      inTable = true;
      headerSeen = true;
      continue;
    }
    if (inTable && headerSeen && /^\|?\s*[-:|]+\s*\|/.test(line)) {
      headerSeen = false;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith('|')) break;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length);
    if (cells.length < 4) continue;
    const guard = cells[3];
    rows.push({ line: i + 1, guard });
  }
  return rows;
}

/**
 * @param {string} guard
 * @param {string} root
 * @param {Record<string, string>} scripts
 */
async function guardExists(guard, root, scripts) {
  const trimmed = guard.trim();
  if (!trimmed) return false;
  if (Object.prototype.hasOwnProperty.call(scripts, trimmed)) return true;
  const candidate = path.isAbsolute(trimmed)
    ? trimmed
    : path.join(root, trimmed);
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

/**
 * @typedef {Object} CorrectionIssue
 * @property {string} path
 * @property {number} line
 * @property {string} message
 * @property {string} fix
 */

/**
 * @param {string} markdown
 * @param {string} relPath
 * @param {string} root
 * @param {Record<string, string>} [scripts]
 * @returns {Promise<CorrectionIssue[]>}
 */
export async function lintCorrectionsSource(
  markdown,
  relPath,
  root,
  scripts = {},
) {
  const rows = parseCorrectionsTable(markdown);
  /** @type {CorrectionIssue[]} */
  const issues = [];
  for (const row of rows) {
    if (!row.guard.trim()) {
      issues.push({
        path: relPath,
        line: row.line,
        message: 'Corrections ledger row has an empty Guard column.',
        fix:
          'Set Guard to an npm script name from package.json or a repo file path that enforces the correction.',
      });
      continue;
    }
    const ok = await guardExists(row.guard, root, scripts);
    if (!ok) {
      issues.push({
        path: relPath,
        line: row.line,
        message: `Guard "${row.guard}" is not a package.json script or existing file under --root.`,
        fix:
          'Add a package.json script with this name, or point Guard at an existing guard file (relative to repo root).',
      });
    }
  }
  return issues;
}

/**
 * @param {string} absPath
 * @param {string} relPath
 * @param {string} root
 * @param {Record<string, string>} [scripts]
 */
export async function lintCorrectionsFile(absPath, relPath, root, scripts) {
  const md = await fs.readFile(absPath, 'utf8');
  return lintCorrectionsSource(md, relPath, root, scripts);
}