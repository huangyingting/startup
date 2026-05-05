#!/usr/bin/env node
// Schema and renderer-contract checks for a single report folder.
// Usage:
//   node .agents/skills/startup-research/scripts/check-report.mjs <report-folder>
//
// `<report-folder>` may be an absolute path, a path relative to the repo
// root, or a bare run id (e.g. `20260505063138-cyberhaven`) which is
// resolved against ./reports/. Exits 0 on success, non-zero on failures.
//
// Invoked automatically as the last step of finalize.mjs. Reports are
// considered immutable post-finalize, so there is no batch re-validation
// step in `npm run validate` — the website's `astro build` is what catches
// any later renderer-breaking change. To re-check a single report by hand:
//   node .agents/skills/startup-research/scripts/check-report.mjs <folder>
// Chapter content readiness is checked by the other startup-research scripts.
import { existsSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectClaimRefs,
  FINAL_ARTIFACTS,
  getAnalysisArtifacts,
  getCoreArtifacts,
  loadWorkflowConfig,
  tryReadYaml,
} from './utils.mjs';
import {
  checkArtifactRefs,
  checkCalloutSchema,
  checkClaimSchema,
  checkDocumentHeadSchema,
  checkFigureDeep,
  checkSourceSchema,
  checkTableSchema,
  checkUniqueIds,
  SCHEMA_VERSION,
} from './chapter-schema.mjs';
const REPORTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports');
const WORKFLOW_CONFIG = loadWorkflowConfig();
const ANALYSIS_ARTIFACTS = getAnalysisArtifacts(WORKFLOW_CONFIG);
const CORE_ARTIFACTS = getCoreArtifacts(WORKFLOW_CONFIG);
const ANALYSIS_FILES = ANALYSIS_ARTIFACTS.map((item) => item.file);
const REQUIRED_ENGLISH_FILES = CORE_ARTIFACTS.map((item) => item.file);
const ARTIFACT_BY_FILE = new Map(CORE_ARTIFACTS.map((item) => [item.file, item]));
const EVIDENCE_FILE = FINAL_ARTIFACTS.evidence.file;
const FULL_REPORT_FILE = FINAL_ARTIFACTS.fullReport.file;
const SUMMARY_CARD_FILE = FINAL_ARTIFACTS.summaryCard.file;

const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// ledger schema
// ---------------------------------------------------------------------------

function checkLedgerSources(run, sources) {
  // Schema rules live in chapter-schema.mjs so check-chapter and check-report
  // can never drift. We just route the per-source errors into our flat
  // failure list with the same path prefix this checker has always used.
  for (const source of sources) {
    const path = `${run}/${EVIDENCE_FILE}: source ${source?.id ?? '?'}`;
    const { errors } = checkSourceSchema(source, { path });
    for (const err of errors) fail(err.message);
  }
}

function checkLedgerCoverage(run, coverage) {
  const path = `${run}/${EVIDENCE_FILE}: coverage`;
  if (coverage?.evidenceQuality === undefined) fail(`${path} missing evidenceQuality`);
}

function checkLedgerClaims(run, claims) {
  for (const claim of claims) {
    const path = `${run}/${EVIDENCE_FILE}: claim ${claim?.id ?? '?'}`;
    const { errors } = checkClaimSchema(claim, { path });
    for (const err of errors) fail(err.message);
  }
}

// ---------------------------------------------------------------------------
// chapter / appendix block schema
// ---------------------------------------------------------------------------

function collectBlocks(value, location, out) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBlocks(item, `${location}.${index}`, out));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.type !== undefined) out.push([location, value]);
  for (const [key, child] of Object.entries(value)) collectBlocks(child, `${location}.${key}`, out);
}

function checkReportBlocks(run, reportDoc) {
  const blocks = [];
  collectBlocks(reportDoc?.chapters ?? [], 'chapters', blocks);
  collectBlocks(reportDoc?.appendices ?? [], 'appendices', blocks);
  const CALLOUT_TYPES = new Set(['strength', 'risk', 'recommendation', 'insight', 'assumption']);

  for (const [location, block] of blocks) {
    const path = `${run}/${FULL_REPORT_FILE}:${location}`;
    if (block.type === 'paragraph' && !hasText(block.body)) fail(`${path} paragraph block requires body`);
    if (block.type === 'list' && (!Array.isArray(block.items) || block.items.length === 0)) {
      fail(`${path} list block requires non-empty items`);
    }
    if (block.type === 'equation' && !hasText(block.equation)) fail(`${path} equation block requires equation`);
    if (block.type === 'callout') {
      if (!hasText(block.body)) fail(`${path} callout block requires body`);
      if (block.calloutType != null && !CALLOUT_TYPES.has(block.calloutType)) {
        fail(`${path} callout block calloutType must be one of ${[...CALLOUT_TYPES].join('|')}`);
      }
    }
    if (block.type === 'table' && !hasText(block.tableRef)) fail(`${path} table block requires tableRef`);
    if (block.type === 'figure' && !hasText(block.figureRef)) fail(`${path} figure block requires figureRef`);
  }
}

function checkAnalysisCallouts(run, file, doc) {
  if (!ANALYSIS_FILES.includes(file)) return;
  for (const [index, callout] of (doc?.callouts ?? []).entries()) {
    const path = `${run}/${file}: callout ${index + 1}`;
    const { errors } = checkCalloutSchema(callout, { path });
    for (const err of errors) fail(err.message);
  }
}

// ---------------------------------------------------------------------------
// figure schema
// ---------------------------------------------------------------------------

function checkFigure(path, figure) {
  // All figure deep-schema rules now live in chapter-schema.mjs so the
  // chapter-time gate and post-finalize gate enforce the same contract.
  const { errors } = checkFigureDeep(figure, { path });
  for (const err of errors) fail(err.message);
}

// ---------------------------------------------------------------------------
// table schema
// ---------------------------------------------------------------------------

function checkTables(run, file, doc) {
  for (const table of doc?.tables ?? []) {
    const path = `${run}/${file}: table ${table?.id ?? '?'}`;
    const { errors } = checkTableSchema(table, { path });
    for (const err of errors) fail(err.message);
  }
}

// ---------------------------------------------------------------------------
// table/figure ref usage
// ---------------------------------------------------------------------------

function checkRefs(run, reportDoc) {
  // Run on the assembled full-report: walk chapters + appendices and verify
  // every figureRef/tableRef resolves to a top-level figure/table id, with
  // each id referenced exactly once (each artifact has exactly one home).
  const figureIds = new Set((reportDoc?.figures ?? []).map((figure) => figure.id));
  const tableIds = new Set((reportDoc?.tables ?? []).map((table) => table.id));
  const path = `${run}/${FULL_REPORT_FILE}`;
  const { errors: chapterErrors } = checkArtifactRefs(reportDoc?.chapters ?? [], { path, figureIds, tableIds, requireUniqueHome: true });
  for (const err of chapterErrors) fail(err.message);
  const { errors: appendixErrors } = checkArtifactRefs(reportDoc?.appendices ?? [], { path, figureIds, tableIds, requireUniqueHome: true });
  for (const err of appendixErrors) fail(err.message);
}

// ---------------------------------------------------------------------------
// per-run pipeline
// ---------------------------------------------------------------------------

function parseRunArtifacts(run, dir) {
  const parsed = new Map();
  for (const file of REQUIRED_ENGLISH_FILES.filter((name) => name.endsWith('.yaml'))) {
    const result = tryReadYaml(join(dir, file));
    if (!result.ok) {
      fail(`${run}/${file}: YAML parse failed: ${result.error}`);
      continue;
    }
    parsed.set(file, result.value);
    const expected = ARTIFACT_BY_FILE.get(file);
    const { errors } = checkDocumentHeadSchema(result.value, { path: `${run}/${file}`, expected });
    for (const err of errors) fail(err.message);
  }
  return parsed;
}

function checkLedgerCrossReferences(run, ledger, parsed) {
  if (!ledger) return;
  const claimIds = new Set((ledger.claims ?? []).map((claim) => claim.id));
  const sourceIds = new Set((ledger.sources ?? []).map((source) => source.id));
  checkLedgerCoverage(run, ledger.coverage ?? {});
  checkLedgerSources(run, ledger.sources ?? []);
  checkLedgerClaims(run, ledger.claims ?? []);
  for (const err of checkUniqueIds(ledger.sources, { label: 'source', pattern: /^S\d{3}$/, path: run }).errors) fail(err.message);
  for (const err of checkUniqueIds(ledger.claims, { label: 'claim', pattern: /^C\d{3}$/, path: run }).errors) fail(err.message);
  for (const claim of ledger.claims ?? []) {
    for (const ref of claim.sourceRefs ?? []) {
      if (!sourceIds.has(ref)) fail(`${run}: claim ${claim.id} references missing source ${ref}`);
    }
  }
  for (const [file, doc] of parsed) {
    if (file === EVIDENCE_FILE) continue;
    for (const ref of collectClaimRefs(doc)) {
      if (!claimIds.has(ref)) fail(`${run}/${file}: missing claimRef ${ref}`);
    }
  }
  checkReportLevelDiversity(run, ledger);
}

function checkReportLevelDiversity(run, ledger) {
  const matrix = ledger.coverageMatrix;
  if (!matrix) {
    fail(`${run}/${EVIDENCE_FILE}: coverageMatrix missing — re-run ledger.mjs`);
    return;
  }
  // Report-wide floors: at least 30 distinct domains across the full report;
  // at least one adverse-stance source; not more than 30% paywall/broken sources.
  const REPORT_MIN_DOMAINS = 30;
  if ((matrix.totalDistinctDomains ?? 0) < REPORT_MIN_DOMAINS) {
    fail(`${run}/${EVIDENCE_FILE}: report-wide totalDistinctDomains=${matrix.totalDistinctDomains ?? 0}, expected at least ${REPORT_MIN_DOMAINS}`);
  }
  const adverseTotal = matrix.byStance?.adverse ?? 0;
  if (adverseTotal === 0) {
    fail(`${run}/${EVIDENCE_FILE}: no adverse-stance sources across the entire report (risks chapter must contribute at least one)`);
  }
  const totalSources = (ledger.sources ?? []).length;
  if (totalSources > 0) {
    const blockedTotal = (matrix.byAccessStatus?.broken ?? 0) + (matrix.byAccessStatus?.paywall ?? 0) + (matrix.byAccessStatus?.['rate-limited'] ?? 0);
    if (blockedTotal / totalSources > 0.3) {
      fail(`${run}/${EVIDENCE_FILE}: ${blockedTotal}/${totalSources} sources are paywall/broken/rate-limited (>30%); replace blocked sources with accessible alternatives`);
    }
  }
}

function checkCardConsistency(run, card, reportDoc, ledger) {
  const cardPath = `${run}/${SUMMARY_CARD_FILE}`;
  const RECOMMENDATIONS = new Set(['strong-buy', 'buy', 'track', 'research-more', 'avoid']);
  const CONFIDENCES = new Set(['high', 'medium', 'low']);
  const RISK_RATINGS = new Set(['low', 'medium', 'high', 'critical', 'unknown']);
  const VALUATION_STANCES = new Set(['attractive', 'fair', 'stretched', 'expensive', 'unknown']);
  const summary = card?.summary;
  if (!summary || typeof summary !== 'object') {
    fail(`${cardPath}: summary block is required`);
  } else {
    if (typeof summary.overallScore !== 'number' || summary.overallScore < 0 || summary.overallScore > 10) {
      fail(`${cardPath}: summary.overallScore must be a number between 0 and 10`);
    }
    if (!hasText(summary.headline)) fail(`${cardPath}: summary.headline is required`);
    if (!RECOMMENDATIONS.has(summary.recommendation)) fail(`${cardPath}: summary.recommendation must be one of ${[...RECOMMENDATIONS].join('|')}`);
    if (!CONFIDENCES.has(summary.confidence)) fail(`${cardPath}: summary.confidence must be one of ${[...CONFIDENCES].join('|')}`);
    if (!RISK_RATINGS.has(summary.riskRating)) fail(`${cardPath}: summary.riskRating must be one of ${[...RISK_RATINGS].join('|')}`);
    if (!VALUATION_STANCES.has(summary.valuationStance)) fail(`${cardPath}: summary.valuationStance must be one of ${[...VALUATION_STANCES].join('|')}`);
    for (const field of ['topStrengths', 'topRisks', 'unresolvedGaps']) {
      if (!Array.isArray(summary[field])) fail(`${cardPath}: summary.${field} must be an array`);
    }
  }
  for (const field of ['headline', 'recommendation', 'confidence', 'riskRating', 'valuationStance', 'overallScore', 'keyMetrics', 'topStrengths', 'topRisks', 'unresolvedGaps']) {
    if (card?.[field] !== undefined) fail(`${cardPath}: top-level field '${field}' is obsolete; nest under 'summary'`);
  }
  if (card?.sourceStats?.claimsReviewed !== undefined && ledger?.claims && card.sourceStats.claimsReviewed > ledger.claims.length) {
    fail(`${cardPath}: claimsReviewed exceeds ledger claims`);
  }
  for (const field of ['sourcesRetained', 'claimsReviewed', 'domainCount', 'adverseSourceCount', 'unresolvedQuestionCount']) {
    if (typeof card?.sourceStats?.[field] !== 'number') fail(`${cardPath}: sourceStats.${field} is required and must be a number`);
  }
  if (card?.sourceStats && card.sourceStats.averageSourceAgeDays != null && typeof card.sourceStats.averageSourceAgeDays !== 'number') {
    fail(`${cardPath}: sourceStats.averageSourceAgeDays must be a number or null`);
  }
  // The full-report figure/table arrays carry the authoritative counts; the
  // card no longer mirrors them (cf. schema simplification).
  void reportDoc;
}

function checkReportConsistency(run, reportDoc) {
  const reportPath = `${run}/${FULL_REPORT_FILE}`;
  if (reportDoc?.startupIntroduction !== undefined) {
    fail(`${reportPath}: uses obsolete field 'startupIntroduction'; rename to 'companyProfile'`);
  }
  if (reportDoc?.coverMetrics !== undefined) {
    fail(`${reportPath}: uses obsolete field 'coverMetrics'; rename to 'coverFacts'`);
  }
  if (!reportDoc?.companyProfile || typeof reportDoc.companyProfile !== 'object') {
    fail(`${reportPath}: missing companyProfile object`);
  } else if (typeof reportDoc.companyProfile.summary !== 'string' || !reportDoc.companyProfile.summary.trim()) {
    fail(`${reportPath}: companyProfile.summary is required`);
  }
}

function checkCrossArtifactIdentity(run, parsed) {
  const docs = [...parsed.values()];
  const names = new Set(docs.map((doc) => doc?.company?.name).filter(Boolean));
  if (names.size > 1) fail(`${run}: company.name is inconsistent across artifacts`);
  const slugs = new Set(docs.map((doc) => doc?.slug).filter(Boolean));
  if (slugs.size > 1) fail(`${run}: slug is inconsistent across artifacts`);
}

function checkRun(run) {
  const dir = join(REPORTS_DIR, run);
  if (!existsSync(join(dir, SUMMARY_CARD_FILE))) return false;

  const beforeMissing = failures.length;
  for (const file of REQUIRED_ENGLISH_FILES) {
    if (!existsSync(join(dir, file))) fail(`${run}/${file}: missing required v2 artifact`);
  }
  if (failures.length > beforeMissing) return true;

  const parsed = parseRunArtifacts(run, dir);
  const ledger = parsed.get(EVIDENCE_FILE);
  const reportDoc = parsed.get(FULL_REPORT_FILE);
  const card = parsed.get(SUMMARY_CARD_FILE);

  checkCrossArtifactIdentity(run, parsed);
  checkLedgerCrossReferences(run, ledger, parsed);

  if (reportDoc) {
    checkReportBlocks(run, reportDoc);
    for (const err of checkUniqueIds(reportDoc.figures, { label: 'figure', pattern: /^F\d{3}$/, path: run }).errors) fail(err.message);
    for (const err of checkUniqueIds(reportDoc.tables, { label: 'table', pattern: /^T\d{3}$/, path: run }).errors) fail(err.message);
    checkRefs(run, reportDoc);
    checkReportConsistency(run, reportDoc);
  }

  for (const [file, doc] of parsed) checkTables(run, file, doc);
  for (const [file, doc] of parsed) checkAnalysisCallouts(run, file, doc);
  for (const [file, doc] of parsed) {
    for (const figure of doc?.figures ?? []) checkFigure(`${run}/${file}`, figure);
  }

  checkCardConsistency(run, card, reportDoc, ledger);
  return true;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function resolveReportDir(arg) {
  // Bare run id like `20260505063138-cyberhaven` resolves under ./reports/.
  if (!arg.includes('/') && !isAbsolute(arg)) return join(REPORTS_DIR, arg);
  return resolve(arg);
}

try {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error('Usage: node .agents/skills/startup-research/scripts/check-report.mjs <report-folder>');
    process.exit(2);
  }
  const dir = resolveReportDir(folderArg);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`[check:report] not a directory: ${dir}`);
    process.exit(2);
  }
  const run = basename(dir);
  // checkRun() resolves the folder via REPORTS_DIR; reject anything outside
  // it instead of silently misbehaving.
  if (resolve(REPORTS_DIR, run) !== dir) {
    console.error(`[check:report] folder must live under ${REPORTS_DIR}; got ${dir}`);
    process.exit(2);
  }

  const checked = checkRun(run);
  if (failures.length) {
    console.error('[check:report] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  if (!checked) {
    console.error(`[check:report] ${run}: not a finalized v2 report (no ${SUMMARY_CARD_FILE}).`);
    process.exit(1);
  }
  console.log(`[check:report] ✓ ${run} verified.`);
} catch (err) {
  console.error(`[check:report] fatal error: ${err.message}`);
  process.exit(1);
}
