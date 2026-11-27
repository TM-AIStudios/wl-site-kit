/**
 * @typedef {Object} InlineStyleOptions
 * @property {string} [stylesheetHint] - e.g. "Move styles into styles/main.css"
 */

/**
 * @param {string} source
 * @param {string} relPath
 * @param {InlineStyleOptions} [options]
 * @returns {import('./shared/types.d.ts').LintIssue[]}
 */
export function lintInlineStyleSource(source, relPath, options = {}) {
  const hint =
    options.stylesheetHint ??
    'Move presentation rules into a project stylesheet and use classes instead.';
  /** @type {import('./shared/types.d.ts').LintIssue[]} */
  const issues = [];
  const re = /\bstyle\s*=/gi;
  let match;
  const seenLines = new Set();
  while ((match = re.exec(source)) !== null) {
    const line = source.slice(0, match.index).split('\n').length;
    if (seenLines.has(line)) continue;
    seenLines.add(line);
    const col = match.index - source.lastIndexOf('\n', match.index);
    issues.push({
      path: relPath,
      line,
      column: col,
      message: 'Inline `style=` attribute found in markup or render source.',
      fix: hint,
    });
  }
  return issues;
}