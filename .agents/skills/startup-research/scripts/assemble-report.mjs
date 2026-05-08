#!/usr/bin/env node
// Deterministically assemble full-report.yaml and summary-card.yaml from
// the eight analysis chapter YAMLs, the consolidated evidence.yaml, and a
// hand-written report-meta.yaml that carries the judgment fields the chapters
// do not encode (recommendation, cover metrics, startup introduction, top
// strengths/risks, unresolved gaps, overall score, etc.).
//
// Re-running this script is idempotent and safe: it is the single source of
// truth for the consolidated artifacts so the agent never hand-edits them.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EXIT, FINAL_ARTIFACTS, REPORT_META_FILE, getAnalysisArtifacts, loadWorkflowConfig, parseDate, tryReadYaml, writeYaml } from './utils.mjs';
import { SCHEMA_VERSION } from './report-artifact-schema.mjs';
import {
  CARD_CONFIDENCES,
  CARD_RECOMMENDATIONS,
  CARD_RISK_RATINGS,
  CARD_VALUATION_STANCES,
} from './validation-catalog.mjs';
const DEFAULT_DISCLAIMER = 'This report is a public-evidence diligence snapshot, not investment advice. Important financial, legal, technical, and contractual facts remain non-public and should be verified directly with management and primary documents before any investment decision.';
const CLAIM_ID_RE = /^C[A-Z]\d{3}$/;
const LEGACY_CLAIM_ID_RE = /^C\d{3}$/;
const INLINE_CLAIM_REF_RE = /\[(C[A-Z]\d{3}|C\d{3})\]/g;

function abort(message) {
  console.error(`[assemble-report] ${message}`);
  process.exit(EXIT.failure);
}

function parseArgs(argv) {
  const args = { folder: null, dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('-')) abort(`unknown flag: ${arg}\nUsage: node .agents/skills/startup-research/scripts/assemble-report.mjs <report-folder> [--dry-run]`);
    else if (!args.folder) args.folder = arg;
    else abort(`unexpected positional argument: ${arg}\nUsage: node .agents/skills/startup-research/scripts/assemble-report.mjs <report-folder> [--dry-run]`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder) {
  abort('Usage: node .agents/skills/startup-research/scripts/assemble-report.mjs <report-folder> [--dry-run]');
}

const reportFolder = resolve(args.folder);
if (!existsSync(reportFolder)) abort(`report folder not found: ${reportFolder}`);

const config = loadWorkflowConfig();
const chapters = getAnalysisArtifacts(config);
const evidenceFile = FINAL_ARTIFACTS.evidence.file;
const fullReportFile = FINAL_ARTIFACTS.fullReport.file;
const summaryCardFile = FINAL_ARTIFACTS.summaryCard.file;

function readRequiredYaml(file, label) {
  const path = join(reportFolder, file);
  const result = tryReadYaml(path);
  if (!result.ok) {
    abort(result.error.startsWith('ENOENT') ? `missing ${label}: ${path}` : `failed to parse ${label} (${file}): ${result.error}`);
  }
  return result.value;
}

const meta = readRequiredYaml(REPORT_META_FILE, 'report-meta');
const evidence = readRequiredYaml(evidenceFile, 'evidence ledger');
const chapterDocs = chapters.map((spec) => {
  const doc = readRequiredYaml(spec.file, `chapter ${spec.order}`);
  if (doc.artifact !== spec.artifact) {
    abort(`${spec.file}: artifact "${doc.artifact}" does not match chapter key "${spec.artifact}"`);
  }
  return { spec, doc };
});

// ---------------------------------------------------------------------------
// guardrails on report-meta.yaml shape
// ---------------------------------------------------------------------------
function requireField(obj, path) {
  const segments = path.split('.');
  let cursor = obj;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== 'object' || !(segment in cursor)) {
      abort(`${REPORT_META_FILE} is missing required field: ${path}`);
    }
    cursor = cursor[segment];
  }
  if (cursor == null || cursor === '') abort(`${REPORT_META_FILE} field is empty: ${path}`);
  return cursor;
}

function collectReportMetaClaimRefs(value, path = REPORT_META_FILE, out = []) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(INLINE_CLAIM_REF_RE)) out.push({ ref: match[1], path });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectReportMetaClaimRefs(item, `${path}.${index}`, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'claimRefs') {
      if (!Array.isArray(child)) abort(`${path}.claimRefs must be an array`);
      child.forEach((ref, index) => {
        if (typeof ref !== 'string') abort(`${path}.claimRefs.${index} must be a claim id string`);
        out.push({ ref, path: `${path}.claimRefs.${index}` });
      });
      continue;
    }
    if (key === 'claimRef') {
      if (typeof child !== 'string') abort(`${path}.claimRef must be a claim id string`);
      out.push({ ref: child, path: `${path}.claimRef` });
      continue;
    }
    collectReportMetaClaimRefs(child, `${path}.${key}`, out);
  }
  return out;
}

function checkReportMetaClaimRefs(metaDoc, evidenceLedger) {
  const claimIds = new Set((evidenceLedger.claims ?? []).map((claim) => claim?.id).filter(Boolean));
  if (!claimIds.size) abort(`${evidenceFile} has no claims; run build-evidence-ledger.mjs before assemble-report.mjs`);
  for (const { ref, path } of collectReportMetaClaimRefs(metaDoc)) {
    if (LEGACY_CLAIM_ID_RE.test(ref)) {
      abort(`${path} uses legacy claim ref ${ref}; use the chapter-letter id from ${evidenceFile} (for example CO001)`);
    }
    if (!CLAIM_ID_RE.test(ref)) {
      abort(`${path} has invalid claim ref ${ref}; expected C<ChapterLetter><Seq3> (for example CO001)`);
    }
    if (!claimIds.has(ref)) {
      abort(`${path} references missing claim ${ref} in ${evidenceFile}`);
    }
  }
}

checkReportMetaClaimRefs(meta, evidence);

const slug = requireField(meta, 'slug');
const runDate = requireField(meta, 'runDate');
const companyName = requireField(meta, 'company.name');
requireField(meta, 'summary.recommendation');
requireField(meta, 'summary.confidence');
requireField(meta, 'summary.riskRating');
requireField(meta, 'summary.valuationStance');
requireField(meta, 'companyProfile.summary');
requireField(meta, 'companyProfile.productSummary');
requireField(meta, 'summary.headline');
requireField(meta, 'summary.overallScore');
requireField(meta, 'summary.topStrengths');
requireField(meta, 'summary.topRisks');
requireField(meta, 'summary.unresolvedGaps');

// Enum gates: catch typos in judgment fields here so the agent fixes
// report-meta.yaml before bad values land in summary-card.yaml. The card
// enum sets live in validation-catalog.mjs (single source of truth shared with
// check-report); we just unwrap them into ordered arrays so the abort
// message lists allowed values in a stable order.
const SUMMARY_ENUMS = {
  recommendation: [...CARD_RECOMMENDATIONS],
  confidence: [...CARD_CONFIDENCES],
  riskRating: [...CARD_RISK_RATINGS],
  valuationStance: [...CARD_VALUATION_STANCES],
};
for (const [field, allowed] of Object.entries(SUMMARY_ENUMS)) {
  const value = meta.summary?.[field];
  if (!allowed.includes(value)) {
    abort(`${REPORT_META_FILE} summary.${field}="${value}" is not one of ${allowed.join('|')}`);
  }
}
const overallScore = meta.summary.overallScore;
if (typeof overallScore !== 'number' || overallScore < 0 || overallScore > 10) {
  abort(`${REPORT_META_FILE} summary.overallScore must be a number between 0 and 10 (got ${overallScore})`);
}

// ---------------------------------------------------------------------------
// chapter → 91 chapter object
// ---------------------------------------------------------------------------
function paragraphBlock(section) {
  return {
    type: 'paragraph',
    body: section.body,
    claimRefs: section.claimRefs ?? [],
  };
}

function calloutBlock(callout) {
  // Chapter callouts and report callout blocks share a single calloutType
  // vocabulary: strength | risk | recommendation | insight | assumption.
  return {
    type: 'callout',
    title: callout.title,
    body: callout.body,
    calloutType: callout.calloutType ?? 'insight',
    claimRefs: callout.claimRefs ?? [],
  };
}

function tableRefBlock(table) {
  return {
    type: 'table',
    tableRef: table.id,
    claimRefs: table.claimRefs ?? [],
  };
}

function figureRefBlock(figure) {
  return {
    type: 'figure',
    figureRef: figure.id,
    claimRefs: figure.claimRefs ?? [],
  };
}

function buildChapter({ spec, doc }) {
  // Chapter numbering matches the source order: chapter 1 is the first
  // analysis chapter (company overview), not a cover placeholder.
  const reportChapterNumber = spec.order;
  const sections = (doc.sections ?? []).map((section, index) => ({
    number: `${reportChapterNumber}.${index + 1}`,
    title: section.title,
    blocks: [paragraphBlock(section)],
  }));
  const callouts = doc.callouts ?? [];
  const tables = doc.tables ?? [];
  const figures = doc.figures ?? [];
  if (callouts.length || tables.length || figures.length) {
    sections.push({
      number: `${reportChapterNumber}.${sections.length + 1}`,
      title: 'Exhibits',
      blocks: [
        ...callouts.map(calloutBlock),
        ...tables.map(tableRefBlock),
        ...figures.map(figureRefBlock),
      ],
    });
  }
  return {
    number: reportChapterNumber,
    title: spec.title,
    sections,
  };
}

// ---------------------------------------------------------------------------
// global tables / figures / bibliography
// ---------------------------------------------------------------------------
function dropLocalEvidenceFields(item) {
  // Chapter tables/figures may carry localEvidence-only fields; the consolidated
  // report should expose only the schema-defined ones.
  return Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'localEvidence'));
}

function collectGlobalArtifacts(field) {
  const seen = new Set();
  const out = [];
  for (const { doc } of chapterDocs) {
    for (const item of doc[field] ?? []) {
      if (!item?.id) continue;
      if (seen.has(item.id)) abort(`duplicate ${field} id ${item.id} across chapters`);
      seen.add(item.id);
      out.push(dropLocalEvidenceFields(item));
    }
  }
  return out;
}

const tables = collectGlobalArtifacts('tables');
const figures = collectGlobalArtifacts('figures');
const sourceRefs = (evidence.sources ?? []).map((source) => source.id).filter(Boolean);

function buildRevision(value) {
  const revision = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    status: revision.status ?? 'current',
    refreshOfRunId: revision.refreshOfRunId ?? null,
    supersededByRunId: revision.supersededByRunId ?? null,
    refreshReason: revision.refreshReason ?? null,
  };
}

const revision = buildRevision(meta.revision);

const companyDefaults = {
  website: null,
  sector: null,
  stage: null,
  headquarters: null,
  shortDescription: null,
};
const company = {
  name: companyName,
  ...companyDefaults,
  ...(meta.company ?? {}),
};

// ---------------------------------------------------------------------------
// build full-report.yaml
// ---------------------------------------------------------------------------
const fullReport = {
  schemaVersion: SCHEMA_VERSION,
  artifact: 'full-report',
  slug,
  runDate,
  company,
  revision,
  subtitle: meta.subtitle ?? null,
  coverageNotes: meta.coverageNotes ?? null,
  coverFacts: meta.coverFacts ?? [],
  companyProfile: meta.companyProfile,
  chapters: chapterDocs.map(buildChapter),
  tables,
  figures,
  appendices: meta.appendices ?? [],
  bibliography: { sourceRefs },
  disclaimer: meta.disclaimer ?? DEFAULT_DISCLAIMER,
};

// ---------------------------------------------------------------------------
// build summary-card.yaml
// ---------------------------------------------------------------------------
const sourceStats = computeSourceStats(evidence, chapterDocs, runDate);

const summaryCard = {
  schemaVersion: SCHEMA_VERSION,
  artifact: 'summary-card',
  slug,
  runDate,
  company,
  revision,
  summary: {
    headline: meta.summary.headline,
    overallScore: meta.summary.overallScore,
    recommendation: meta.summary.recommendation,
    confidence: meta.summary.confidence,
    riskRating: meta.summary.riskRating,
    valuationStance: meta.summary.valuationStance,
    keyMetrics: meta.summary.keyMetrics ?? {},
    topStrengths: meta.summary.topStrengths,
    topRisks: meta.summary.topRisks,
    unresolvedGaps: meta.summary.unresolvedGaps,
  },
  sourceStats: {
    sourcesRetained: sourceRefs.length,
    claimsReviewed: (evidence.claims ?? []).length,
    domainCount: sourceStats.domainCount,
    adverseSourceCount: sourceStats.adverseSourceCount,
    // Unanswered-question breakdown:
    //  - openQuestionCount: every question whose status != answered
    //  - documentedGapQuestionCount: open AND referenced by some
    //    evidenceGap.relatedQuestionRefs (i.e. closed out as a known gap)
    //  - blockingQuestionCount: open AND not referenced by any evidenceGap
    //    (the chapter gate forbids this; should be 0 after a clean finalize-report)
    openQuestionCount: sourceStats.openQuestionCount,
    documentedGapQuestionCount: sourceStats.documentedGapQuestionCount,
    blockingQuestionCount: sourceStats.blockingQuestionCount,
    averageSourceAgeDays: sourceStats.averageSourceAgeDays,
  },
};

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------
const fullReportPath = join(reportFolder, fullReportFile);
const summaryCardPath = join(reportFolder, summaryCardFile);

if (args.dryRun) {
  console.log(`[assemble-report] dry-run: would write ${fullReportPath}`);
  console.log(`[assemble-report] dry-run: would write ${summaryCardPath}`);
  console.log(`[assemble-report] chapters=${chapterDocs.length} tables=${tables.length} figures=${figures.length} sources=${sourceRefs.length}`);
  process.exit(EXIT.ok);
}

writeYaml(fullReportPath, fullReport);
writeYaml(summaryCardPath, summaryCard);
console.log(`[assemble-report] ✓ wrote ${fullReportFile} (${tables.length} tables, ${figures.length} figures) and ${summaryCardFile}`);

function computeSourceStats(evidenceLedger, chapters, runDateStr) {
  const sources = evidenceLedger.sources ?? [];
  const matrix = evidenceLedger.coverageMatrix ?? {};
  const domainCount = matrix.totalDistinctDomains ?? 0;
  const adverseSourceCount = matrix.byStance?.adverse ?? sources.filter((s) => s?.stance === 'adverse').length;
  let openQuestionCount = 0;
  let documentedGapQuestionCount = 0;
  let blockingQuestionCount = 0;
  // evidenceGap.relatedQuestionRefs are Q<L>### ids local to the same chapter
  // (each chapter has its own letter L), so the open-vs-documented match is
  // done per-chapter rather than globally.
  for (const { doc } of chapters) {
    const local = doc.localEvidence ?? {};
    const gapRefs = new Set();
    for (const gap of local.evidenceGaps ?? []) {
      for (const ref of gap?.relatedQuestionRefs ?? []) gapRefs.add(ref);
    }
    for (const q of local.researchQuestions ?? []) {
      if (!q?.status || q.status === 'answered') continue;
      openQuestionCount += 1;
      if (q.id && gapRefs.has(q.id)) documentedGapQuestionCount += 1;
      else blockingQuestionCount += 1;
    }
  }
  const anchor = parseDate(runDateStr);
  const ages = [];
  for (const s of sources) {
    const d = parseDate(s?.date);
    if (anchor && d) {
      const days = Math.max(0, Math.round((anchor.valueOf() - d.valueOf()) / 86400000));
      ages.push(days);
    }
  }
  const averageSourceAgeDays = ages.length ? Math.round(ages.reduce((sum, n) => sum + n, 0) / ages.length) : null;
  return {
    domainCount,
    adverseSourceCount,
    openQuestionCount,
    documentedGapQuestionCount,
    blockingQuestionCount,
    averageSourceAgeDays,
  };
}
