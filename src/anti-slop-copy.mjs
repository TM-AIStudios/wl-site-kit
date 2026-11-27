/**
 * @typedef {Object} CopyBanRule
 * @property {string} id
 * @property {RegExp} pattern
 * @property {string} message
 * @property {string} fix
 */

/** @type {CopyBanRule[]} */
export const defaultCopyBans = [
  {
    id: 'team-of-experts',
    pattern: /\bour team of experts\b/i,
    message: 'Generic credibility phrase "our team of experts".',
    fix: 'Name a specific credential, certification, or concrete experience instead.',
  },
  {
    id: 'leading-provider',
    pattern: /\bleading provider\b/i,
    message: 'Unsubstantiated superlative "leading provider".',
    fix: 'Replace with a factual differentiator or measurable outcome.',
  },
  {
    id: 'fantastic-services',
    pattern: /\bfantastic services\b/i,
    message: 'Empty praise "fantastic services".',
    fix: 'Describe what the service does and who it helps.',
  },
  {
    id: 'world-class',
    pattern: /\bworld[- ]class\b/i,
    message: 'Marketing filler "world-class".',
    fix: 'Use specific standards, awards, or metrics you can verify.',
  },
  {
    id: 'invented-testimonial',
    pattern: /\b(?:john|jane)\s+doe\b.*(?:said|recommends|review)/i,
    message: 'Placeholder or invented testimonial name pattern.',
    fix: 'Use a real attributed quote with permission or remove the testimonial.',
  },
  {
    id: 'star-glyphs',
    pattern: /(?:★{3,}|⭐{3,}|[\u2605\u2B50]{3,})/,
    message: 'Three or more star-rating glyphs (often fake social proof).',
    fix: 'Remove decorative star rows or link to a verified third-party review source.',
  },
];

/**
 * @typedef {Object} AntiSlopOptions
 * @property {CopyBanRule[]} [extraBans]
 * @property {string[]} [excludeIds]
 */

/**
 * @param {string} source
 * @param {string} relPath
 * @param {AntiSlopOptions} [options]
 * @returns {import('./shared/types.d.ts').LintIssue[]}
 */
export function lintAntiSlopSource(source, relPath, options = {}) {
  const exclude = new Set(options.excludeIds ?? []);
  const rules = [
    ...defaultCopyBans.filter((r) => !exclude.has(r.id)),
    ...(options.extraBans ?? []),
  ];
  /** @type {import('./shared/types.d.ts').LintIssue[]} */
  const issues = [];
  const lines = source.split('\n');
  for (const rule of rules) {
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (!rule.pattern.test(lineText)) {
        rule.pattern.lastIndex = 0;
        continue;
      }
      rule.pattern.lastIndex = 0;
      const col = lineText.search(rule.pattern) + 1;
      issues.push({
        path: relPath,
        line: i + 1,
        column: col > 0 ? col : undefined,
        message: `[${rule.id}] ${rule.message}`,
        fix: rule.fix,
      });
    }
  }
  return issues;
}