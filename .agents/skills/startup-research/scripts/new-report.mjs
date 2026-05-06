#!/usr/bin/env node
// Create or resume a report folder under reports/<timestamp>-<slug>/ after
// checking reports/_index.yaml for duplicate company name or website/domain risk.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  isFinalizedReportFolder,
  isRunId,
  normalizeCompanyName,
  normalizeDomain,
  normalizeRevision,
  readYaml,
  reportsDir,
  slugify,
} from './utils.mjs';

const DISCLOSURE_PROFILES = new Set(['public', 'private-disclosed', 'private-undisclosed', 'stealth']);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/new-report.mjs <YYYYMMDDHHmmss> <company name> [--website <url>] [--disclosure <public|private-disclosed|private-undisclosed|stealth>] [--refresh-of <runId|latest>] [--refresh-reason <text>] [--resume] [--index reports/_index.yaml]');
  process.exit(1);
}

function parseArgs(argv) {
  const [timestamp, ...rest] = argv;
  const args = { timestamp, nameParts: [], website: '', disclosure: '', refreshOf: '', refreshReason: '', resume: false, indexPath: 'reports/_index.yaml' };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--website' || arg === '--url' || arg === '--domain') args.website = rest[++i] ?? '';
    else if (arg === '--disclosure' || arg === '--disclosure-profile') args.disclosure = rest[++i] ?? '';
    else if (arg === '--refresh-of') args.refreshOf = rest[++i] ?? '';
    else if (arg === '--refresh-reason') args.refreshReason = rest[++i] ?? '';
    else if (arg === '--resume') args.resume = true;
    else if (arg === '--index') args.indexPath = rest[++i] ?? '';
    else if (arg.startsWith('--')) usage();
    else args.nameParts.push(arg);
  }
  if (!/^\d{14}$/.test(args.timestamp ?? '')) usage();
  if (args.disclosure && !DISCLOSURE_PROFILES.has(args.disclosure)) {
    console.error(`[new] invalid --disclosure value: ${args.disclosure} (allowed: ${[...DISCLOSURE_PROFILES].join(', ')})`);
    process.exit(1);
  }
  if (args.refreshOf && args.refreshOf !== 'latest' && !isRunId(args.refreshOf)) {
    console.error(`[new] invalid --refresh-of value: ${args.refreshOf} (expected a report run id or "latest")`);
    process.exit(1);
  }
  return args;
}

function loadIndexReports(indexPath) {
  if (!existsSync(indexPath)) return;
  const index = readYaml(indexPath);
  return Array.isArray(index?.reports) ? index.reports : [];
}

function duplicateMatches({ companyName, website, reports }) {
  const candidateName = normalizeCompanyName(companyName);
  const candidateDomain = normalizeDomain(website);
  if (!candidateName && !candidateDomain) return [];
  return reports.filter((report) => {
    const sameName = candidateName && normalizeCompanyName(report.companyName) === candidateName;
    const sameDomain = candidateDomain && normalizeDomain(report.website) === candidateDomain;
    return sameName || sameDomain;
  });
}

function currentMatches(matches) {
  return matches.filter((report) => (report.revisionStatus ?? 'current') !== 'superseded');
}

function ensureFinalizedRun(runId, label) {
  const folder = join(reportsDir, runId);
  if (!isFinalizedReportFolder(folder)) {
    console.error(`[new] ${label} is not a finalized report folder: reports/${runId}`);
    process.exit(2);
  }
}

function resolveRefreshTarget({ refreshOf, matches, reports }) {
  if (!refreshOf) return null;
  if (!matches.length) {
    console.error('[new] refresh requested, but reports/_index.yaml has no matching finalized report for this company/domain.');
    process.exit(2);
  }
  if (refreshOf === 'latest') {
    const candidates = currentMatches(matches).sort((a, b) => String(b.runId).localeCompare(String(a.runId)));
    if (!candidates.length) {
      console.error('[new] refresh requested, but every matching report is already superseded.');
      process.exit(2);
    }
    const target = candidates[0];
    ensureFinalizedRun(target.runId, '--refresh-of latest target');
    return target;
  }
  const target = reports.find((report) => report.runId === refreshOf);
  if (!target) {
    console.error(`[new] --refresh-of ${refreshOf} was not found in reports/_index.yaml.`);
    process.exit(2);
  }
  if (!matches.some((report) => report.runId === refreshOf)) {
    console.error(`[new] --refresh-of ${refreshOf} does not match the requested company/domain.`);
    process.exit(2);
  }
  if ((target.revisionStatus ?? 'current') === 'superseded') {
    console.error(`[new] --refresh-of ${refreshOf} is already superseded; refresh the current report instead.`);
    process.exit(2);
  }
  ensureFinalizedRun(refreshOf, '--refresh-of target');
  return target;
}

function checkDuplicateRisk({ matches, refreshTarget }) {
  if (!matches.length) return;
  if (refreshTarget) {
    console.error(`[new] refresh mode: duplicate company/domain accepted; refreshing ${refreshTarget.runId}.`);
    return;
  }

  console.error('[new] duplicate-risk: high');
  for (const match of matches) {
    console.error(`  - ${match.companyName ?? match.slug} (${match.path})`);
  }
  console.error('[new] stop: reports/_index.yaml already contains an official report for this company/domain.');
  process.exit(2);
}

function writeRefreshContext({ base, companyName, website, refreshTarget, refreshReason }) {
  if (!refreshTarget) return;
  const previousRunId = refreshTarget.runId;
  const previousCardPath = join(reportsDir, previousRunId, 'summary-card.yaml');
  const previousCard = existsSync(previousCardPath) ? readYaml(previousCardPath) : {};
  const revision = normalizeRevision(previousCard.revision);
  const cacheDir = join(reportsDir, '..', '.research-cache', base);
  mkdirSync(cacheDir, { recursive: true });
  const context = {
    schemaVersion: 'refresh-context-v1',
    mode: 'refresh',
    newRunId: base,
    refreshOfRunId: previousRunId,
    refreshReason: refreshReason || null,
    previousReport: {
      runId: previousRunId,
      path: `reports/${previousRunId}`,
      summaryCardPath: `reports/${previousRunId}/summary-card.yaml`,
      runDate: previousCard.runDate ?? refreshTarget.date ?? null,
      revisionStatus: revision.status,
      company: previousCard.company ?? {
        name: refreshTarget.companyName ?? companyName,
        website: refreshTarget.website ?? website ?? null,
      },
      headline: previousCard.summary?.headline ?? null,
      overallScore: previousCard.summary?.overallScore ?? null,
      recommendation: previousCard.summary?.recommendation ?? null,
      riskRating: previousCard.summary?.riskRating ?? null,
      valuationStance: previousCard.summary?.valuationStance ?? null,
      keyMetrics: previousCard.summary?.keyMetrics ?? {},
      sourceStats: previousCard.sourceStats ?? {},
    },
    refreshInstructions: [
      'Use the previous report only as background and diff context; do not copy stale claims without re-verifying them.',
      'Re-fetch volatile facts: funding, valuation, headcount, customers, pricing, legal/regulatory status, outages, partnerships, and product releases.',
      'Generate a full 8-chapter report and run the normal chapter gates before finalizing.',
      'Set report-meta.yaml revision.status=current, revision.refreshOfRunId to the previous run id, revision.supersededByRunId=null, and revision.refreshReason to the reason above.',
    ],
  };
  const path = join(cacheDir, 'refresh-context.yaml');
  writeFileSync(path, yaml.dump(context, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
  console.error(`[new] wrote refresh context: ${path}`);
}

const args = parseArgs(process.argv.slice(2));
const companyName = args.nameParts.join(' ') || 'startup';
const reports = loadIndexReports(args.indexPath) ?? [];
const matches = duplicateMatches({ companyName, website: args.website, reports });
const refreshTarget = resolveRefreshTarget({ refreshOf: args.refreshOf, matches, reports });
checkDuplicateRisk({ matches, refreshTarget });

const base = `${args.timestamp}-${slugify(companyName)}`;
const path = join(reportsDir, base);
if (existsSync(path)) {
  if (isFinalizedReportFolder(path)) {
    console.error(`[new] finalized report folder already exists: ${path}`);
    console.error('[new] stop: use the existing official report instead of resuming.');
    process.exit(2);
  }
  if (!args.resume) {
    console.error(`[new] in-progress report folder already exists: ${path}`);
    console.error('[new] rerun the same command with --resume to continue it; duplicate suffix folders are not created.');
    process.exit(3);
  }
  writeRefreshContext({ base, companyName, website: args.website, refreshTarget, refreshReason: args.refreshReason });
  console.error(`[new] resume: ${path}`);
  console.log(path);
  process.exit(0);
}
if (args.resume) {
  console.error(`[new] cannot resume missing report folder: ${path}`);
  console.error('[new] run without --resume to create a fresh in-progress report folder.');
  process.exit(4);
}
mkdirSync(path, { recursive: true });
writeRefreshContext({ base, companyName, website: args.website, refreshTarget, refreshReason: args.refreshReason });

if (args.disclosure) {
  // Write a hint file the agent reads when authoring chapters; also printed
  // to stderr so the spawning workflow surfaces it. The hint lists canonical
  // evidenceGap topics that are almost-certain to remain unsupported for the
  // given disclosureProfile, so chapter 04 can pre-populate them rather than
  // rediscovering they are unavailable.
  const undisclosedGaps = [
    'Annual Recurring Revenue (ARR) — not publicly disclosed.',
    'Trailing-twelve-month revenue or revenue run-rate — not publicly disclosed.',
    'Headcount — no public filing or verified headcount source.',
    'Gross margin / unit economics — not publicly disclosed.',
    'Customer count — not publicly disclosed.',
  ];
  const stealthGaps = [
    ...undisclosedGaps,
    'Product release timeline — company in stealth, no public roadmap.',
    'Named customer references — company in stealth, no public deployments.',
  ];
  const canonicalGaps = args.disclosure === 'stealth'
    ? stealthGaps
    : args.disclosure === 'private-undisclosed'
      ? undisclosedGaps
      : [];
  const hint = {
    disclosureProfile: args.disclosure,
    note: 'Set companyProfile.disclosureProfile in report-meta.yaml to this value. Pre-populate the canonical evidenceGaps below in chapter 04 (financials) instead of rediscovering they are unavailable.',
    canonicalEvidenceGaps: canonicalGaps,
  };
  writeFileSync(join(path, '_disclosure-hint.yaml'), yaml.dump(hint, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
  console.error(`[new] disclosureProfile=${args.disclosure}; wrote _disclosure-hint.yaml with ${canonicalGaps.length} canonical evidenceGaps.`);
}

console.log(path);
