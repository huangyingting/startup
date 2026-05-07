#!/usr/bin/env node
// Schema and renderer-contract checks for a single report folder.
// Usage:
//   node .agents/skills/startup-research/scripts/check-report.mjs <report-folder>
//   node .agents/skills/startup-research/scripts/check-report.mjs <report-folder> --contract
//
// `<report-folder>` may be an absolute path, a path relative to the repo
// root, or a bare run id (e.g. `20260505063138-cyberhaven`) which is
// resolved against ./reports/. Exits 0 on success, non-zero on failures.
//
// Invoked automatically as the last step of finalize.mjs in full gate mode.
// `--contract` keeps schema / renderer / reference checks but skips current
// content-quality gates (source diversity and adverse-source distribution),
// which makes it suitable for re-checking historical reports after renderer
// or schema-contract changes. To re-check a single report by hand:
//   node .agents/skills/startup-research/scripts/check-report.mjs <folder>
//   node .agents/skills/startup-research/scripts/check-report.mjs <folder> --contract
// Chapter content readiness is checked by the other startup-research scripts.
import { existsSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXIT,
  collectClaimRefs,
  companySlugFromRunId,
  FINAL_ARTIFACTS,
  getAnalysisArtifacts,
  getCoreArtifacts,
  hasText,
  isFinalizedReportFolder,
  isRunId,
  loadWorkflowConfig,
  REVISION_STATUSES,
  tryReadYaml,
} from './utils.mjs';
import {
  BLOCK_TYPES,
  CALLOUT_TYPES,
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
import {
  CARD_CONFIDENCES,
  CARD_RECOMMENDATIONS,
  CARD_RISK_RATINGS,
  CARD_VALUATION_STANCES,
  ID_PATTERN_CLAIM,
  ID_PATTERN_FIGURE,
  ID_PATTERN_SOURCE,
  ID_PATTERN_TABLE,
  formatEnumChoices,
} from './check-dimensions.mjs';
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

  for (const [location, block] of blocks) {
    const path = `${run}/${FULL_REPORT_FILE}:${location}`;
    if (!BLOCK_TYPES.has(block.type)) {
      fail(`${path} block.type="${block.type}" must be one of ${formatEnumChoices(BLOCK_TYPES)}`);
      continue;
    }
    if (block.type === 'paragraph' && !hasText(block.body)) fail(`${path} paragraph block requires body`);
    if (block.type === 'list' && (!Array.isArray(block.items) || block.items.length === 0)) {
      fail(`${path} list block requires non-empty items`);
    }
    if (block.type === 'equation' && !hasText(block.equation)) fail(`${path} equation block requires equation`);
    if (block.type === 'callout') {
      if (!hasText(block.body)) fail(`${path} callout block requires body`);
      if (block.calloutType != null && !CALLOUT_TYPES.has(block.calloutType)) {
        fail(`${path} callout block calloutType="${block.calloutType}" must be one of ${formatEnumChoices(CALLOUT_TYPES)}`);
      }
    }
    if (block.type === 'table' && !hasText(block.tableRef)) fail(`${path} table block requires tableRef`);
    if (block.type === 'figure' && !hasText(block.figureRef)) fail(`${path} figure block requires figureRef`);
  }
}

function checkCallouts(run, file, doc) {
  if (!ANALYSIS_FILES.includes(file)) return;
  if (doc?.analysisCallouts !== undefined) {
    fail(`${run}/${file}: top-level field "analysisCallouts" is obsolete; rename to "callouts"`);
  }
  if (doc?.analysisCallout !== undefined) {
    fail(`${run}/${file}: top-level field "analysisCallout" (singular) is obsolete; rename to "callouts" and wrap the object in a list`);
  }
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
  const canonicalSlug = companySlugFromRunId(run);
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
    if (result.value?.slug && result.value.slug !== canonicalSlug) {
      fail(`${run}/${file}: slug "${result.value.slug}" does not match folder slug "${canonicalSlug}"`);
    }
  }
  return parsed;
}

function checkLedgerCrossReferences(run, ledger, parsed, { contentGates }) {
  if (!ledger) return;
  const claimIds = new Set((ledger.claims ?? []).map((claim) => claim.id));
  const sourceIds = new Set((ledger.sources ?? []).map((source) => source.id));
  checkLedgerCoverage(run, ledger.coverage ?? {});
  checkLedgerSources(run, ledger.sources ?? []);
  checkLedgerClaims(run, ledger.claims ?? []);
  for (const err of checkUniqueIds(ledger.sources, { label: 'source', pattern: ID_PATTERN_SOURCE, path: run }).errors) fail(err.message);
  for (const err of checkUniqueIds(ledger.claims, { label: 'claim', pattern: ID_PATTERN_CLAIM, path: run }).errors) fail(err.message);
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
  if (contentGates) checkReportLevelDiversity(run, ledger);
}

function checkReportLevelDiversity(run, ledger) {
  const gate = WORKFLOW_CONFIG.reportGate ?? {
    minDistinctDomains: 30,
    requireAdverseSource: true,
    maxPaywallPercent: 0.3,
  };

  const matrix = ledger.coverageMatrix;
  if (!matrix) {
    fail(`${run}/${EVIDENCE_FILE}: coverageMatrix missing — re-run ledger.mjs`);
    return;
  }

  // Report-wide floors: at least minDistinctDomains distinct domains;
  // at least one adverse-stance source (if requireAdverseSource is true);
  // not more than maxPaywallPercent of paywall/broken sources.
  const minDistinctDomains = gate.minDistinctDomains ?? 30;
  if ((matrix.totalDistinctDomains ?? 0) < minDistinctDomains) {
    fail(`${run}/${EVIDENCE_FILE}: report-wide totalDistinctDomains=${matrix.totalDistinctDomains ?? 0}, expected at least ${minDistinctDomains}`);
  }

  if (gate.requireAdverseSource ?? true) {
    const adverseTotal = matrix.byStance?.adverse ?? 0;
    if (adverseTotal === 0) {
      fail(`${run}/${EVIDENCE_FILE}: no adverse-stance sources across the entire report (risks chapter must contribute at least one)`);
    }
  }

  const totalSources = (ledger.sources ?? []).length;
  if (totalSources > 0) {
    const maxPaywallPercent = gate.maxPaywallPercent ?? 0.3;
    const blockedTotal = (matrix.byAccessStatus?.broken ?? 0) + (matrix.byAccessStatus?.paywall ?? 0) + (matrix.byAccessStatus?.['rate-limited'] ?? 0);
    if (blockedTotal / totalSources > maxPaywallPercent) {
      const pct = (blockedTotal / totalSources * 100).toFixed(0);
      fail(`${run}/${EVIDENCE_FILE}: ${blockedTotal}/${totalSources} sources are paywall/broken/rate-limited (${pct}%, max ${Math.round(maxPaywallPercent * 100)}%); replace blocked sources with accessible alternatives`);
    }
  }
}

// Adverse-evidence distribution gate. Per-chapter gates already require
// adverse *questions*; this checks that adverse *sources* are spread across
// the report instead of concentrating in one chapter (typically risks).
// Driven entirely by workflow-config.adverseDistribution; absent config = no
// check. Reads each chapter's localEvidence.sources directly so the check
// works whether or not coverageMatrix.byChapter exposes a stance breakdown.
function checkAdverseDistribution(run, parsed) {
  const config = WORKFLOW_CONFIG.adverseDistribution;
  if (!config) return;
  const chapterByFile = new Map(WORKFLOW_CONFIG.chapters.map((ch) => [ch.file, ch]));
  const adverseByKey = new Map();
  for (const [file, doc] of parsed) {
    const chapter = chapterByFile.get(file);
    if (!chapter) continue;
    const sources = doc?.localEvidence?.sources ?? [];
    const adverse = sources.filter((s) => s?.stance === 'adverse').length;
    adverseByKey.set(chapter.key, adverse);
  }
  for (const requiredKey of config.requireAtLeastOneAdverseSource ?? []) {
    if ((adverseByKey.get(requiredKey) ?? 0) < 1) {
      fail(`${run}/${EVIDENCE_FILE}: chapter "${requiredKey}" has 0 adverse-stance sources; adverseDistribution.requireAtLeastOneAdverseSource requires at least one`);
    }
  }
  const threshold = config.warnIfChaptersWithAdverseSourceAtMost;
  if (Number.isInteger(threshold)) {
    const chaptersWithAdverse = [...adverseByKey.values()].filter((n) => n > 0).length;
    if (chaptersWithAdverse <= threshold) {
      // Concentration is a fail, not a warn: reports that pass with adverse
      // evidence in only 1-2 chapters look "green" but are structurally
      // unbalanced. The threshold is operator-tunable in chapters.yaml.
      fail(`${run}/${EVIDENCE_FILE}: adverse-stance sources appear in only ${chaptersWithAdverse} chapter(s) (<= ${threshold}); spread adverse evidence across more chapters`);
    }
  }
}

function checkCardConsistency(run, card, reportDoc, ledger) {
  const cardPath = `${run}/${SUMMARY_CARD_FILE}`;
  const summary = card?.summary;
  if (!summary || typeof summary !== 'object') {
    fail(`${cardPath}: summary block is required`);
  } else {
    if (typeof summary.overallScore !== 'number' || summary.overallScore < 0 || summary.overallScore > 10) {
      fail(`${cardPath}: summary.overallScore must be a number between 0 and 10 (got ${JSON.stringify(summary.overallScore)})`);
    }
    if (!hasText(summary.headline)) fail(`${cardPath}: summary.headline is required`);
    if (!CARD_RECOMMENDATIONS.has(summary.recommendation)) fail(`${cardPath}: summary.recommendation="${summary.recommendation}" must be one of ${formatEnumChoices(CARD_RECOMMENDATIONS)}`);
    if (!CARD_CONFIDENCES.has(summary.confidence)) fail(`${cardPath}: summary.confidence="${summary.confidence}" must be one of ${formatEnumChoices(CARD_CONFIDENCES)}`);
    if (!CARD_RISK_RATINGS.has(summary.riskRating)) fail(`${cardPath}: summary.riskRating="${summary.riskRating}" must be one of ${formatEnumChoices(CARD_RISK_RATINGS)}`);
    if (!CARD_VALUATION_STANCES.has(summary.valuationStance)) fail(`${cardPath}: summary.valuationStance="${summary.valuationStance}" must be one of ${formatEnumChoices(CARD_VALUATION_STANCES)}`);
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
  for (const field of ['sourcesRetained', 'claimsReviewed', 'domainCount', 'adverseSourceCount', 'openQuestionCount', 'documentedGapQuestionCount', 'blockingQuestionCount']) {
    if (typeof card?.sourceStats?.[field] !== 'number') fail(`${cardPath}: sourceStats.${field} is required and must be a number`);
  }
  if (card?.sourceStats?.unresolvedQuestionCount !== undefined) {
    fail(`${cardPath}: sourceStats.unresolvedQuestionCount is obsolete; use sourceStats.openQuestionCount`);
  }
  // Invariant: every open question must be closed out by an evidenceGap
  // (the chapter gate enforces this). A nonzero blockingQuestionCount means
  // a chapter slipped through with an undocumented unanswered question.
  if (typeof card?.sourceStats?.blockingQuestionCount === 'number' && card.sourceStats.blockingQuestionCount > 0) {
    fail(`${cardPath}: sourceStats.blockingQuestionCount=${card.sourceStats.blockingQuestionCount} > 0; every open question must be referenced by some evidenceGap.relatedQuestionRefs`);
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
  if (names.size > 1) fail(`${run}: company.name is inconsistent across artifacts (found: ${[...names].map((n) => `"${n}"`).join(', ')})`);
  const slugs = new Set(docs.map((doc) => doc?.slug).filter(Boolean));
  if (slugs.size > 1) fail(`${run}: slug is inconsistent across artifacts (found: ${[...slugs].map((s) => `"${s}"`).join(', ')})`);
}

const REVISION_RELATION_FIELDS = ['refreshOfRunId', 'supersededByRunId'];

function revisionComparable(doc) {
  const revision = doc?.revision && typeof doc.revision === 'object' && !Array.isArray(doc.revision) ? doc.revision : {};
  return {
    status: revision.status ?? 'current',
    refreshOfRunId: revision.refreshOfRunId ?? null,
    supersededByRunId: revision.supersededByRunId ?? null,
    refreshReason: revision.refreshReason ?? null,
  };
}

function checkRevisionShape(run, file, doc) {
  if (doc?.revision === undefined) return;
  const path = `${run}/${file}: revision`;
  const revision = doc.revision;
  if (!revision || typeof revision !== 'object' || Array.isArray(revision)) {
    fail(`${path} must be an object when present`);
    return;
  }
  const status = revision.status ?? 'current';
  if (!REVISION_STATUSES.has(status)) fail(`${path}.status="${status}" must be one of ${formatEnumChoices(REVISION_STATUSES)}`);
  if (revision.refreshReason != null && typeof revision.refreshReason !== 'string') {
    fail(`${path}.refreshReason must be a string or null`);
  }
  for (const field of REVISION_RELATION_FIELDS) {
    const value = revision[field];
    if (value == null) continue;
    if (typeof value !== 'string' || !value.trim()) {
      fail(`${path}.${field} must be a non-empty runId string or null`);
      continue;
    }
    if (!isRunId(value)) fail(`${path}.${field}=${value} is not a valid report run id`);
    if (value === run) fail(`${path}.${field} cannot reference the same report run`);
    const targetDir = join(REPORTS_DIR, value);
    if (!isFinalizedReportFolder(targetDir)) fail(`${path}.${field} references a missing or unfinalized report: ${value}`);
  }
  if (status === 'current' && hasText(revision.supersededByRunId)) {
    fail(`${path}: current reports must not set supersededByRunId`);
  }
  if (status === 'superseded' && !hasText(revision.supersededByRunId)) {
    fail(`${path}: superseded reports must set supersededByRunId`);
  }
  if (hasText(revision.refreshOfRunId) && revision.refreshOfRunId === revision.supersededByRunId) {
    fail(`${path}: refreshOfRunId and supersededByRunId cannot point to the same run`);
  }
  if (status === 'superseded' && hasText(revision.supersededByRunId)) {
    const target = tryReadYaml(join(REPORTS_DIR, revision.supersededByRunId, SUMMARY_CARD_FILE));
    const targetRefreshOf = target.ok ? target.value?.revision?.refreshOfRunId : null;
    if (target.ok && targetRefreshOf !== run) {
      fail(`${path}: supersededByRunId=${revision.supersededByRunId} must point to a report whose revision.refreshOfRunId is ${run}`);
    }
  }
}

function checkRevisionConsistency(run, parsed) {
  const reportDoc = parsed.get(FULL_REPORT_FILE);
  const card = parsed.get(SUMMARY_CARD_FILE);
  checkRevisionShape(run, FULL_REPORT_FILE, reportDoc);
  checkRevisionShape(run, SUMMARY_CARD_FILE, card);
  const reportRevision = revisionComparable(reportDoc);
  const cardRevision = revisionComparable(card);
  if (JSON.stringify(reportRevision) !== JSON.stringify(cardRevision)) {
    fail(`${run}: revision is inconsistent between ${FULL_REPORT_FILE} and ${SUMMARY_CARD_FILE}`);
  }
}

function checkRun(run, { contentGates = true } = {}) {
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
  checkRevisionConsistency(run, parsed);
  checkLedgerCrossReferences(run, ledger, parsed, { contentGates });
  if (contentGates) checkAdverseDistribution(run, parsed);

  if (reportDoc) {
    checkReportBlocks(run, reportDoc);
    for (const err of checkUniqueIds(reportDoc.figures, { label: 'figure', pattern: ID_PATTERN_FIGURE, path: run }).errors) fail(err.message);
    for (const err of checkUniqueIds(reportDoc.tables, { label: 'table', pattern: ID_PATTERN_TABLE, path: run }).errors) fail(err.message);
    checkRefs(run, reportDoc);
    checkReportConsistency(run, reportDoc);
  }

  for (const [file, doc] of parsed) checkTables(run, file, doc);
  for (const [file, doc] of parsed) checkCallouts(run, file, doc);
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

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/check-report.mjs <report-folder> [--contract]');
  process.exit(EXIT.invalidArgs);
}

function parseArgs(argv) {
  const args = { folder: null, contract: false };
  for (const arg of argv) {
    if (arg === '--contract') args.contract = true;
    else if (arg === '-h' || arg === '--help') usage();
    else if (arg.startsWith('-')) usage();
    else if (!args.folder) args.folder = arg;
    else usage();
  }
  if (!args.folder) usage();
  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const folderArg = args.folder;
  const dir = resolveReportDir(folderArg);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`[check:report] not a directory: ${dir}`);
    process.exit(EXIT.notFound);
  }
  const run = basename(dir);
  // checkRun() resolves the folder via REPORTS_DIR; reject anything outside
  // it instead of silently misbehaving.
  if (resolve(REPORTS_DIR, run) !== dir) {
    console.error(`[check:report] folder must live under ${REPORTS_DIR}; got ${dir}`);
    process.exit(EXIT.invalidArgs);
  }

  const checked = checkRun(run, { contentGates: !args.contract });
  if (failures.length) {
    console.error('[check:report] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
    process.exit(EXIT.validation);
  }
  if (!checked) {
    console.error(`[check:report] ${run}: not a finalized v2 report (no ${SUMMARY_CARD_FILE}).`);
    process.exit(EXIT.validation);
  }
  const mode = args.contract ? 'contract verified' : 'verified';
  console.log(`[check:report] ✓ ${run} ${mode}.`);
} catch (err) {
  console.error(`[check:report] fatal error: ${err.message}`);
  process.exit(EXIT.validation);
}
