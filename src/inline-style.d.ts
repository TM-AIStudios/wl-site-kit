import type { LintIssue } from './shared/types.d.ts';

export interface InlineStyleOptions {
  stylesheetHint?: string;
}

export function lintInlineStyleSource(
  source: string,
  relPath: string,
  options?: InlineStyleOptions,
): LintIssue[];