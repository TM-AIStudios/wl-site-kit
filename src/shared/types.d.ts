export interface LintIssue {
  path: string;
  line: number;
  column?: number;
  message: string;
  fix: string;
}

export interface LintResult {
  ok: boolean;
  issues: LintIssue[];
}