#!/usr/bin/env node
// Create or resume a report folder under reports/<timestamp>-<slug>/ after
// walking existing reports/<runId>/summary-card.yaml files for duplicate
// company name or website/domain risk.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  EXIT,
  FINAL_ARTIFACTS,
  isFinalizedReportFolder,
  listDirs,
  loadWorkflowConfig,
  normalizeCompanyName,
  normalizeDomain,
  normalizeRevision,
  readYaml,
  reportsDir,
  researchCacheDir,
  slugify,
} from './utils.mjs';

const DISCLOSURE_PROFILES = new Set(['public', 'private-disclosed', 'private-undisclosed', 'stealth']);
const SUMMARY_CARD_FILE = FINAL_ARTIFACTS.summaryCard.file;

function volatileFactRefreshInstruction() {
  const facts = loadWorkflowConfig().agentPolicy?.volatileFacts ?? [];
  return facts.length
    ? `Re-fetch volatile facts: ${facts.join(', ')}.`
    : 'Re-fetch volatile facts from the workflow agent policy.';
}

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/create-report-run.mjs <YYYYMMDDHHmmss> <company name> [--website <url>] [--disclosure <public|private-disclosed|private-undisclosed|stealth>] [--refresh] [--refresh-reason <text>] [--resume]');
  process.exit(EXIT.failure);
}

function parseArgs(argv) {
  const [timestamp, ...rest] = argv;
  const args = { timestamp, nameParts: [], website: '', disclosure: '', refresh: false, refreshReason: '', resume: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--website' || arg === '--url' || arg === '--domain') args.website = rest[++i] ?? '';
    else if (arg === '--disclosure' || arg === '--disclosure-profile') args.disclosure = rest[++i] ?? '';
    else if (arg === '--refresh') args.refresh = true;
    else if (arg === '--refresh-reason') args.refreshReason = rest[++i] ?? '';
    else if (arg === '--resume') args.resume = true;
    else if (arg.startsWith('--')) usage();
    else args.nameParts.push(arg);
  }
  if (!/^\d{14}$/.test(args.timestamp ?? '')) usage();
  if (args.disclosure && !DISCLOSURE_PROFILES.has(args.disclosure)) {
    console.error(`[create-report-run] invalid --disclosure value: ${args.disclosure} (allowed: ${[...DISCLOSURE_PROFILES].join(', ')})`);
    process.exit(EXIT.failure);
  }
  return args;
}

// Walk every reports/<runId>/summary-card.yaml and return a flat list of the
// fields needed for duplicate detection and --refresh target resolution.
// Folders without summary-card.yaml (in-progress, partial) are skipped.
function loadReportsFromDisk() {
  const reports = [];
  for (const runId of listDirs(reportsDir)) {
    const cardPath = join(reportsDir, runId, SUMMARY_CARD_FILE);
    if (!existsSync(cardPath)) continue;
    let card;
    try { card = readYaml(cardPath); }
    catch { continue; }
    const company = card?.company ?? {};
    const revision = normalizeRevision(card?.revision);
    reports.push({
      runId,
      companyName: company.name ?? null,
      website: company.website ?? null,
      revisionStatus: revision.status,
      path: `reports/${runId}/${SUMMARY_CARD_FILE}`,
    });
  }
  return reports;
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
    console.error(`[create-report-run] ${label} is not a finalized report folder: reports/${runId}`);
    process.exit(EXIT.failure);
  }
}

function resolveRefreshTarget({ refresh, matches }) {
  if (!refresh) return null;
  if (!matches.length) {
    console.error('[create-report-run] --refresh requested, but no matching finalized report exists for this company/domain.');
    process.exit(EXIT.failure);
  }
  const candidates = currentMatches(matches).sort((a, b) => String(b.runId).localeCompare(String(a.runId)));
  if (!candidates.length) {
    console.error('[create-report-run] --refresh requested, but every matching report is already superseded.');
    process.exit(EXIT.failure);
  }
  const target = candidates[0];
  ensureFinalizedRun(target.runId, '--refresh target');
  return target;
}

function checkDuplicateRisk({ matches, refreshTarget }) {
  if (!matches.length) return;
  if (refreshTarget) {
    console.error(`[create-report-run] refresh mode: duplicate company/domain accepted; refreshing ${refreshTarget.runId}.`);
    return;
  }

  console.error('[create-report-run] duplicate-risk: high');
  for (const match of matches) {
    console.error(`  - ${match.companyName ?? match.runId} (${match.path})`);
  }
  console.error('[create-report-run] stop: a finalized report already exists for this company/domain.');
  process.exit(EXIT.alreadyExists);
}

function writeRefreshContext({ base, companyName, website, refreshTarget, refreshReason }) {
  if (!refreshTarget) return;
  const previousRunId = refreshTarget.runId;
  const previousCardPath = join(reportsDir, previousRunId, SUMMARY_CARD_FILE);
  const previousCard = existsSync(previousCardPath) ? readYaml(previousCardPath) : {};
  const revision = normalizeRevision(previousCard.revision);
  const cacheDir = researchCacheDir(base);
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
      summaryCardPath: `reports/${previousRunId}/${SUMMARY_CARD_FILE}`,
      runDate: previousCard.runDate ?? null,
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
      volatileFactRefreshInstruction(),
      'Generate a full 8-chapter report and run the normal chapter gates before finalizing.',
      'Set report-meta.yaml revision.status=current, revision.refreshOfRunId to the previous run id, revision.supersededByRunId=null, and revision.refreshReason to the reason above.',
    ],
  };
  const path = join(cacheDir, 'refresh-context.yaml');
  writeFileSync(path, yaml.dump(context, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
  console.error(`[create-report-run] wrote refresh context: ${path}`);
}

const args = parseArgs(process.argv.slice(2));
const companyName = args.nameParts.join(' ') || 'startup';
const reports = loadReportsFromDisk();
const matches = duplicateMatches({ companyName, website: args.website, reports });
const refreshTarget = resolveRefreshTarget({ refresh: args.refresh, matches });
checkDuplicateRisk({ matches, refreshTarget });

const base = `${args.timestamp}-${slugify(companyName)}`;
const path = join(reportsDir, base);
if (existsSync(path)) {
  if (isFinalizedReportFolder(path)) {
    console.error(`[create-report-run] finalized report folder already exists: ${path}`);
    console.error('[create-report-run] stop: use the existing official report instead of resuming.');
    process.exit(EXIT.alreadyExists);
  }
  if (!args.resume) {
    console.error(`[create-report-run] in-progress report folder already exists: ${path}`);
    console.error('[create-report-run] rerun the same command with --resume to continue it; duplicate suffix folders are not created.');
    process.exit(EXIT.inProgress);
  }
  writeRefreshContext({ base, companyName, website: args.website, refreshTarget, refreshReason: args.refreshReason });
  console.error(`[create-report-run] resume: ${path}`);
  console.log(path);
  process.exit(EXIT.ok);
}
if (args.resume) {
  console.error(`[create-report-run] cannot resume missing report folder: ${path}`);
  console.error('[create-report-run] run without --resume to create a fresh in-progress report folder.');
  process.exit(EXIT.notFound);
}
mkdirSync(path, { recursive: true });
writeRefreshContext({ base, companyName, website: args.website, refreshTarget, refreshReason: args.refreshReason });

if (args.disclosure) {
  // Write a hint file the agent reads when authoring chapters; also printed
  // to stderr so the spawning workflow surfaces it. The hint lists canonical
  // evidenceGap topics that are almost-certain to remain unsupported for the
  // given disclosureProfile, so chapter 04 can pre-populate them rather than
  // rediscovering they are unavailable. Lives under .research-cache/<base>/
  // to keep reports/<run>/ to the canonical artifact set the SKILL hard rules
  // allow.
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
  const cacheDir = researchCacheDir(base);
  mkdirSync(cacheDir, { recursive: true });
  const hintPath = join(cacheDir, 'disclosure-hint.yaml');
  writeFileSync(hintPath, yaml.dump(hint, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
  console.error(`[create-report-run] disclosureProfile=${args.disclosure}; wrote ${hintPath} with ${canonicalGaps.length} canonical evidenceGaps.`);
}

console.log(path);
