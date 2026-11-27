import type { LintIssue } from './shared/types.d.ts';

export function lintCssImportantSource(css: string, relPath: string): LintIssue[];
export function lintCssImportantFile(
  absPath: string,
  relPath: string,
): Promise<LintIssue[]>;