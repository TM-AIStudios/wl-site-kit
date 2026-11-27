import fs from 'node:fs/promises';

const REDUCED_MOTION_OPEN =
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/gi;

/**
 * Track whether index is inside a prefers-reduced-motion block (brace depth).
 * @param {string} css
 * @param {number} index - position before !important match
 */
function insideReducedMotion(css, index) {
  const before = css.slice(0, index);
  let inBlock = false;
  let depth = 0;
  let m;
  REDUCED_MOTION_OPEN.lastIndex = 0;
  const opens = [];
  while ((m = REDUCED_MOTION_OPEN.exec(before)) !== null) {
    opens.push(m.index + m[0].length - 1);
  }
  if (opens.length === 0) return false;

  const lastOpen = opens[opens.length - 1];
  const segment = before.slice(lastOpen + 1);
  depth = 1;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return false;
    }
  }
  return depth > 0;
}

/**
 * @param {string} css
 * @param {string} relPath
 * @returns {import('./shared/types.d.ts').LintIssue[]}
 */
export function lintCssImportantSource(css, relPath) {
  /** @type {import('./shared/types.d.ts').LintIssue[]} */
  const issues = [];
  const re = /!important\b/gi;
  let match;
  const lines = css.split('\n');
  while ((match = re.exec(css)) !== null) {
    if (insideReducedMotion(css, match.index)) continue;
    const line = css.slice(0, match.index).split('\n').length;
    issues.push({
      path: relPath,
      line,
      column: match.index - css.lastIndexOf('\n', match.index),
      message: 'CSS uses `!important` outside `@media (prefers-reduced-motion: reduce)`.',
      fix:
        'Remove `!important` and increase selector specificity, or move the rule into `@media (prefers-reduced-motion: reduce) { ... }` only when overriding motion for accessibility.',
    });
  }
  return issues;
}

/**
 * @param {string} absPath
 * @param {string} relPath
 */
export async function lintCssImportantFile(absPath, relPath) {
  const css = await fs.readFile(absPath, 'utf8');
  return lintCssImportantSource(css, relPath);
}