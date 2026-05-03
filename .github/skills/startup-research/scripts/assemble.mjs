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
import { FINAL_ARTIFACTS, getAnalysisArtifacts, loadWorkflowConfig, tryReadYaml, writeYaml } from './utils.mjs';

const SCHEMA_VERSION = 'report-v2';
const REPORT_META_FILE = 'report-meta.yaml';
const DEFAULT_DISCLAIMER = 'This report is a public-evidence diligence snapshot, not investment advice. Important financial, legal, technical, and contractual facts remain non-public and should be verified directly with management and primary documents before any investment decision.';

function abort(message) {
  console.error(`[assemble] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  return {
    folder: positional[0] ?? null,
    dryRun: argv.includes('--dry-run'),
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder) {
  abort('Usage: node .github/skills/startup-research/scripts/assemble.mjs <report-folder> [--dry-run]');
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

const slug = requireField(meta, 'slug');
const runDate = requireField(meta, 'runDate');
const companyName = requireField(meta, 'company.name');
const recommendation = requireField(meta, 'reportMeta.recommendation');
const confidence = requireField(meta, 'reportMeta.confidence');
const riskRating = requireField(meta, 'reportMeta.riskRating');
const valuationStance = requireField(meta, 'reportMeta.valuationStance');
requireField(meta, 'startupIntroduction.summary');
requireField(meta, 'startupIntroduction.productSummary');
requireField(meta, 'summary.headline');
requireField(meta, 'summary.overallScore');
requireField(meta, 'summary.topStrengths');
requireField(meta, 'summary.topRisks');
requireField(meta, 'summary.unresolvedGaps');

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
  // Map analysis-callout types into report-block calloutType vocabulary.
  // verdict-style callouts surface as the chapter's investment-recommendation
  // marker; everything else falls back to key-insight or risk-alert by tone.
  const calloutTypeMap = {
    verdict: 'final-recommendation',
    strength: 'opportunity',
    watchout: 'risk-alert',
    gap: 'risk-alert',
    methodology: 'key-insight',
    assumption: 'key-insight',
  };
  return {
    type: 'callout',
    title: callout.title,
    body: callout.body,
    calloutType: calloutTypeMap[callout.type] ?? 'key-insight',
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
  // Report chapter 1 is the cover; analysis chapters get bumped by 1.
  const reportChapterNumber = spec.order + 1;
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

// ---------------------------------------------------------------------------
// build full-report.yaml
// ---------------------------------------------------------------------------
const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const fullReport = {
  schemaVersion: SCHEMA_VERSION,
  artifact: 'full-report',
  slug,
  runDate,
  company: { name: companyName },
  reportMeta: {
    title: companyName,
    subtitle: meta.reportMeta.subtitle ?? null,
    generatedAt,
    schemaVersion: SCHEMA_VERSION,
    recommendation,
    confidence,
    riskRating,
    valuationStance,
    coverageNotes: meta.reportMeta.coverageNotes ?? null,
  },
  coverMetrics: meta.coverMetrics ?? [],
  startupIntroduction: meta.startupIntroduction,
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
const summaryDefaults = {
  website: null,
  sector: null,
  stage: null,
  foundedYear: null,
  headquarters: null,
  shortDescription: null,
};

const claimsReviewed = evidence.coverage?.claimsCreated ?? (evidence.claims ?? []).length;
const sourcesRetained = evidence.coverage?.sourcesRetained ?? sourceRefs.length;

const summaryCard = {
  schemaVersion: SCHEMA_VERSION,
  artifact: 'summary-card',
  slug,
  runDate,
  company: {
    name: companyName,
    ...summaryDefaults,
    ...(meta.company ?? {}),
  },
  title: companyName,
  subtitle: meta.reportMeta.subtitle ?? null,
  headline: meta.summary.headline,
  recommendation,
  confidence,
  riskRating,
  valuationStance,
  overallScore: meta.summary.overallScore,
  sourceStats: {
    sourcesRetained,
    claimsReviewed,
  },
  figureCount: figures.length,
  tableCount: tables.length,
  keyMetrics: meta.summary.keyMetrics ?? {},
  topStrengths: meta.summary.topStrengths,
  topRisks: meta.summary.topRisks,
  unresolvedGaps: meta.summary.unresolvedGaps,
  reportFiles: {
    fullReport: fullReportFile,
    summaryCard: summaryCardFile,
  },
};

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------
const fullReportPath = join(reportFolder, fullReportFile);
const summaryCardPath = join(reportFolder, summaryCardFile);

if (args.dryRun) {
  console.log(`[assemble] dry-run: would write ${fullReportPath}`);
  console.log(`[assemble] dry-run: would write ${summaryCardPath}`);
  console.log(`[assemble] chapters=${chapterDocs.length} tables=${tables.length} figures=${figures.length} sources=${sourceRefs.length}`);
  process.exit(0);
}

writeYaml(fullReportPath, fullReport);
writeYaml(summaryCardPath, summaryCard);
console.log(`[assemble] ✓ wrote ${fullReportFile} (${tables.length} tables, ${figures.length} figures) and ${summaryCardFile}`);
