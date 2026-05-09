// Shared validation-result helpers for startup-research scripts.
//
// Validators should return one envelope shape so agents can triage failures
// without learning each script's bespoke prose format.

// Internal: only validationIssue() consumes this. No external caller has a
// raw zod path that needs the same coercion, so keep it module-local.
function pathToString(path) {
  if (path === undefined || path === null || path === '' || path === '/') return '/';
  if (Array.isArray(path)) return path.length ? path.map(String).join('.') : '/';
  return String(path);
}

export function validationIssue({
  path = '/',
  message,
  dimension = 'schema',
  code = dimension,
  severity = 'error',
  fix = null,
  source = null,
  ...extra
}) {
  return {
    path: pathToString(path),
    message: String(message ?? 'validation issue'),
    dimension,
    code,
    severity,
    ...(fix ? { fix } : {}),
    ...(source ? { source } : {}),
    ...extra,
  };
}

export function validationWarning(args) {
  return validationIssue({ ...args, severity: 'warning' });
}

export function zodIssues(error, {
  dimension = 'schema',
  codePrefix = 'schema',
  source = null,
  fix = null,
} = {}) {
  return (error?.issues ?? []).map((issue) => validationIssue({
    path: issue.path,
    message: issue.message,
    dimension,
    code: `${codePrefix}.${issue.code}`,
    source,
    fix: typeof fix === 'function' ? fix(issue) : fix,
    expected: issue.expected,
    received: issue.received,
  }));
}

export function validationEnvelope({
  ok,
  validator,
  artifact = null,
  reportFolder = null,
  issues = [],
  warnings = [],
  summary = {},
  retryOrder = [],
  suppressedDimensions = [],
  globalHints = [],
  // Optional richer surfaces used by check-chapter.mjs. Other validators
  // omit them and they stay out of the JSON shape entirely.
  counts = null,
  objectFailures = [],
}) {
  const normalizedIssues = issues.map((entry) => validationIssue(entry));
  const normalizedWarnings = warnings.map((entry) => validationWarning(entry));
  return {
    ok: Boolean(ok ?? normalizedIssues.length === 0),
    validator,
    ...(artifact ? { artifact } : {}),
    ...(reportFolder ? { reportFolder } : {}),
    issueCount: normalizedIssues.length,
    warningCount: normalizedWarnings.length,
    issues: normalizedIssues,
    warnings: normalizedWarnings,
    ...(retryOrder.length ? { retryOrder } : {}),
    ...(suppressedDimensions.length ? { suppressedDimensions } : {}),
    ...(globalHints.length ? { globalHints } : {}),
    ...(counts ? { counts } : {}),
    ...(objectFailures.length ? { objectFailures } : {}),
    summary,
  };
}

export function formatValidationText(result, { successMessage = 'validation OK', failureMessage = 'validation failed' } = {}) {
  const lines = [];
  if (result.ok) {
    lines.push(successMessage);
    if (result.warnings?.length) {
      lines.push(`${result.warningCount} warning(s):`);
      for (const warning of result.warnings) {
        lines.push(`  - ${warning.path}: ${warning.message}${warning.fix ? ` fix: ${warning.fix}` : ''}`);
      }
    }
    return lines.join('\n');
  }
  lines.push(`${failureMessage}: ${result.issueCount} issue(s)`);
  for (const issue of result.issues ?? []) {
    lines.push(`  - ${issue.path}: ${issue.message}${issue.fix ? `\n      fix: ${issue.fix}` : ''}`);
  }
  if (result.warnings?.length) {
    lines.push(`plus ${result.warningCount} warning(s):`);
    for (const warning of result.warnings) {
      lines.push(`  - ${warning.path}: ${warning.message}${warning.fix ? `\n      fix: ${warning.fix}` : ''}`);
    }
  }
  return lines.join('\n');
}

export function formatValidationCompact(result) {
  const lines = [`STATUS: ${result.ok ? 'OK' : 'FAIL'}`];
  if (result.validator) lines.push(`validator: ${result.validator}`);
  if (result.artifact) lines.push(`artifact: ${result.artifact}`);
  if (result.issueCount) lines.push(`issueCount: ${result.issueCount}`);
  if (result.warningCount) lines.push(`warningCount: ${result.warningCount}`);
  const dimensions = [...new Set((result.issues ?? []).map((issue) => issue.dimension).filter(Boolean))];
  if (dimensions.length) lines.push(`failedDimensions: ${dimensions.join(',')}`);
  for (const issue of result.issues ?? []) {
    lines.push(`FAIL [${issue.dimension ?? 'schema'}] ${issue.path}: ${issue.message}${issue.fix ? ` | fix: ${issue.fix}` : ''}`);
  }
  for (const warning of result.warnings ?? []) {
    lines.push(`WARN [${warning.dimension ?? 'schema'}] ${warning.path}: ${warning.message}${warning.fix ? ` | fix: ${warning.fix}` : ''}`);
  }
  return lines.join('\n');
}
