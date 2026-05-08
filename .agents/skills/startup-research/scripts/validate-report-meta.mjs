#!/usr/bin/env node
// Shape + enum validator for report-meta.yaml.
//
// Runs as the first step of finalize-report.mjs so the agent sees every
// problem at once instead of fixing one field per finalize-loop iteration.
// History: report-meta authoring used to deadlock the finalize pipeline —
// each missing field surfaced only after a 5-10s evidence-ledger build
// followed by an abort, costing 4-6 retries per company. This script lists
// every shape/enum violation in a single pass, and skips the cross-ref
// checks that need evidence.yaml (assemble-report.mjs still owns those as
// defense-in-depth).
//
// Output (default): one issue per line, prefixed with the field path.
// Use --format json to pipe into another tool. Exit 0 on success, 1 on
// any violation. The script never mutates files.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EXIT, REPORT_META_FILE, tryReadYaml } from './utils.mjs';
import {
  CARD_CONFIDENCES,
  CARD_RECOMMENDATIONS,
  CARD_RISK_RATINGS,
  CARD_VALUATION_STANCES,
} from './validation-catalog.mjs';

const DISCLOSURE_PROFILES = new Set(['public', 'private-disclosed', 'private-undisclosed', 'stealth']);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/validate-report-meta.mjs <report-folder> [--format text|json]');
  process.exit(EXIT.failure);
}

function parseArgs(argv) {
  const args = { folder: null, format: 'text' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') {
      const next = argv[++i];
      if (next === undefined || next.startsWith('-')) {
        console.error('[validate-report-meta] --format requires a value (text|json)');
        process.exit(EXIT.failure);
      }
      args.format = next;
    } else if (arg.startsWith('-')) usage();
    else if (!args.folder) args.folder = arg;
    else usage();
  }
  if (!args.folder) usage();
  if (!['text', 'json'].includes(args.format)) {
    console.error(`[validate-report-meta] invalid --format: ${args.format} (expected text|json)`);
    process.exit(EXIT.failure);
  }
  return args;
}

// Returns the value at the dotted path, or `undefined` if any segment is
// missing or not an object. Empty-string and null are treated as "missing"
// by the caller (`requireField`); typed checks below distinguish them.
function lookupPath(root, path) {
  const segments = path.split('.');
  let cursor = root;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== 'object' || !(segment in cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function pushIssue(issues, path, message, extra = {}) {
  issues.push({ path, message, ...extra });
}

function requireField(root, path, issues) {
  const value = lookupPath(root, path);
  if (value === undefined || value === null || value === '') {
    pushIssue(issues, path, `missing or empty field: ${path}`);
    return undefined;
  }
  return value;
}

function requireArray(root, path, issues, { minLength = 0 } = {}) {
  const value = lookupPath(root, path);
  if (value === undefined || value === null) {
    pushIssue(issues, path, `missing field: ${path} (expected array)`);
    return null;
  }
  if (!Array.isArray(value)) {
    pushIssue(issues, path, `${path} must be an array (got ${typeof value})`);
    return null;
  }
  if (value.length < minLength) {
    pushIssue(issues, path, `${path} must have at least ${minLength} item(s) (got ${value.length})`);
  }
  return value;
}

function requireEnum(root, path, allowed, issues) {
  const value = lookupPath(root, path);
  if (value === undefined || value === null || value === '') {
    pushIssue(issues, path, `missing field: ${path} (expected one of ${[...allowed].join('|')})`);
    return;
  }
  if (!allowed.has(value)) {
    pushIssue(issues, path, `invalid value: ${path}="${value}" (expected one of ${[...allowed].join('|')})`);
  }
}

function validateReportMeta(meta) {
  const issues = [];

  if (!meta || typeof meta !== 'object') {
    pushIssue(issues, '/', 'report-meta.yaml is empty or not a YAML mapping');
    return issues;
  }

  // Top-level required scalars.
  requireField(meta, 'slug', issues);
  const runDate = requireField(meta, 'runDate', issues);
  if (typeof runDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
    pushIssue(issues, 'runDate', `runDate must be YYYY-MM-DD (got "${runDate}")`);
  }

  // company.* — name is required; the rest are optional but if present must
  // be strings (assemble-report serialises them verbatim into summary-card).
  requireField(meta, 'company.name', issues);

  // companyProfile.* — required prose fields the cover page renders.
  requireField(meta, 'companyProfile.summary', issues);
  requireField(meta, 'companyProfile.productSummary', issues);
  const disclosureProfile = lookupPath(meta, 'companyProfile.disclosureProfile');
  if (disclosureProfile != null && !DISCLOSURE_PROFILES.has(disclosureProfile)) {
    pushIssue(issues, 'companyProfile.disclosureProfile',
      `invalid value: "${disclosureProfile}" (expected one of ${[...DISCLOSURE_PROFILES].join('|')} or null)`);
  }

  // summary.* — the headline judgment block. This is the field most often
  // missed: prior runs set top-level `recommendation:` instead of
  // `summary.recommendation:`, so the agent had to discover the nested
  // shape by `cat`-ing a sibling report's report-meta.yaml. Listing every
  // missing summary field at once eliminates the discovery loop.
  const summary = lookupPath(meta, 'summary');
  if (summary === undefined || summary === null) {
    pushIssue(issues, 'summary', 'missing summary block (required: headline, overallScore, recommendation, confidence, riskRating, valuationStance, keyMetrics, topStrengths, topRisks, unresolvedGaps)');
  } else if (typeof summary !== 'object' || Array.isArray(summary)) {
    pushIssue(issues, 'summary', `summary must be a YAML mapping (got ${Array.isArray(summary) ? 'array' : typeof summary})`);
  } else {
    requireField(meta, 'summary.headline', issues);
    const overallScore = lookupPath(meta, 'summary.overallScore');
    if (overallScore === undefined || overallScore === null) {
      pushIssue(issues, 'summary.overallScore', 'missing field: summary.overallScore (number 0–10, one decimal place)');
    } else if (typeof overallScore !== 'number' || Number.isNaN(overallScore) || overallScore < 0 || overallScore > 10) {
      pushIssue(issues, 'summary.overallScore', `summary.overallScore must be a number between 0 and 10 (got ${JSON.stringify(overallScore)})`);
    }
    requireEnum(meta, 'summary.recommendation', CARD_RECOMMENDATIONS, issues);
    requireEnum(meta, 'summary.confidence', CARD_CONFIDENCES, issues);
    requireEnum(meta, 'summary.riskRating', CARD_RISK_RATINGS, issues);
    requireEnum(meta, 'summary.valuationStance', CARD_VALUATION_STANCES, issues);
    // keyMetrics is an object whose values may all be null; require the
    // container so summary-card always has the slot.
    const keyMetrics = lookupPath(meta, 'summary.keyMetrics');
    if (keyMetrics === undefined || keyMetrics === null) {
      pushIssue(issues, 'summary.keyMetrics', 'missing field: summary.keyMetrics (object; values may be null when undisclosed)');
    } else if (typeof keyMetrics !== 'object' || Array.isArray(keyMetrics)) {
      pushIssue(issues, 'summary.keyMetrics', `summary.keyMetrics must be a YAML mapping (got ${Array.isArray(keyMetrics) ? 'array' : typeof keyMetrics})`);
    }
    requireArray(meta, 'summary.topStrengths', issues, { minLength: 1 });
    requireArray(meta, 'summary.topRisks', issues, { minLength: 1 });
    // unresolvedGaps may legitimately be empty (when the configured financials
    // chapter reported no material gaps), but the field itself must exist so
    // downstream renderers can iterate without a guard.
    requireArray(meta, 'summary.unresolvedGaps', issues);
  }

  // revision is optional; when present it must be the right shape so the
  // refresh linker (link-refresh.mjs) does not silently no-op. Schema:
  // { status, refreshOfRunId, supersededByRunId, refreshReason }.
  const revision = lookupPath(meta, 'revision');
  if (revision !== undefined && revision !== null) {
    if (typeof revision !== 'object' || Array.isArray(revision)) {
      pushIssue(issues, 'revision', `revision must be a YAML mapping or null (got ${Array.isArray(revision) ? 'array' : typeof revision})`);
    } else {
      const status = revision.status;
      if (status !== undefined && status !== 'current' && status !== 'superseded') {
        pushIssue(issues, 'revision.status', `invalid value: "${status}" (expected current|superseded)`);
      }
    }
  }

  return issues;
}

const args = parseArgs(process.argv.slice(2));
const reportFolder = resolve(args.folder);
if (!existsSync(reportFolder)) {
  console.error(`[validate-report-meta] report folder not found: ${reportFolder}`);
  process.exit(EXIT.notFound);
}
const metaPath = join(reportFolder, REPORT_META_FILE);
if (!existsSync(metaPath)) {
  console.error(`[validate-report-meta] missing ${REPORT_META_FILE} in ${reportFolder}; author it before finalizing.`);
  console.error('[validate-report-meta] schema: .agents/skills/startup-research/references/report-schema-v2.md §Report meta schema');
  process.exit(EXIT.notFound);
}
const result = tryReadYaml(metaPath);
if (!result.ok) {
  console.error(`[validate-report-meta] ${REPORT_META_FILE}: YAML parse failed: ${result.error}`);
  process.exit(EXIT.failure);
}

const issues = validateReportMeta(result.value);
if (args.format === 'json') {
  console.log(JSON.stringify({
    ok: issues.length === 0,
    file: REPORT_META_FILE,
    reportFolder,
    issueCount: issues.length,
    issues,
  }, null, 2));
} else if (issues.length === 0) {
  console.log(`[validate-report-meta] ✓ ${REPORT_META_FILE} shape and enums OK.`);
} else {
  console.error(`[validate-report-meta] ${REPORT_META_FILE} has ${issues.length} issue(s) (fix all before re-running):`);
  for (const issue of issues) {
    console.error(`  - ${issue.path}: ${issue.message}`);
  }
  console.error('[validate-report-meta] schema: .agents/skills/startup-research/references/report-schema-v2.md §Report meta schema');
}

process.exit(issues.length === 0 ? EXIT.ok : EXIT.failure);
