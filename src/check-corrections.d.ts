import type { LintIssue } from './shared/types.d.ts';

export interface CorrectionsRow {
  line: number;
  guard: string;
}

export function parseCorrectionsTable(markdown: string): CorrectionsRow[];

export function lintCorrectionsSource(
  markdown: string,
  relPath: string,
  root: string,
  scripts?: Record<string, string>,
): Promise<LintIssue[]>;

export function lintCorrectionsFile(
  absPath: string,
  relPath: string,
  root: string,
  scripts?: Record<string, string>,
): Promise<LintIssue[]>;