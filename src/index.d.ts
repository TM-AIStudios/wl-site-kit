export {
  lintCssImportantSource,
  lintCssImportantFile,
} from './css-important.d.ts';
export {
  lintInlineStyleSource,
  type InlineStyleOptions,
} from './inline-style.d.ts';
export {
  lintAntiSlopSource,
  defaultCopyBans,
  type CopyBanRule,
  type AntiSlopOptions,
} from './anti-slop-copy.d.ts';
export {
  parseCorrectionsTable,
  lintCorrectionsSource,
  lintCorrectionsFile,
  type CorrectionsRow,
} from './check-corrections.d.ts';
export type { LintIssue, LintResult } from './shared/types.d.ts';