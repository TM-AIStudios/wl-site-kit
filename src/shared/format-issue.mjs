/**
 * @param {import('./types.d.ts').LintIssue} issue
 */
export function formatIssue(issue) {
  const col = issue.column != null ? `:${issue.column}` : '';
  return `${issue.path}:${issue.line}${col} ${issue.message} — Fix: ${issue.fix}`;
}

/**
 * @param {import('./types.d.ts').LintIssue[]} issues
 */
export function printIssues(issues) {
  for (const issue of issues) {
    console.error(formatIssue(issue));
  }
}