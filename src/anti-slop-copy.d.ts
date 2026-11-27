import type { LintIssue } from './shared/types.d.ts';

export interface CopyBanRule {
  id: string;
  pattern: RegExp;
  message: string;
  fix: string;
}

export const defaultCopyBans: CopyBanRule[];

export interface AntiSlopOptions {
  extraBans?: CopyBanRule[];
  excludeIds?: string[];
}

export function lintAntiSlopSource(
  source: string,
  relPath: string,
  options?: AntiSlopOptions,
): LintIssue[];