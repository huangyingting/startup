#!/usr/bin/env node
// Chapter-scoped readiness audit for one analysis artifact (01-08).
// Feedback is intentionally scoped to the owning chapter skill.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { collectClaimRefs, tryReadYaml } from './text-utils.mjs';

const MIN_LOCAL_SOURCES_PER_CHAPTER = 50;
const MIN_LOCAL_CLAIMS_PER_CHAPTER = 75;
const STANDARD_DEPTH_FLOOR = {
  minSectionBodyWords: 100,
  minSectionWordsTotal: 900,
  minTableRowsTotal: 36,
  minFigureDataPointsTotal: 18,
};
const ANALYSIS_ARTIFACTS = [
  { file: '01-company-overview.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['timeline'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '02-market-analysis.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['layered-lens', 'bars', 'range'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '03-competitors.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['quadrant', 'positioning-map', 'scorecard'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '04-financials.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['bridge', 'waterfall', 'bars', 'scatter', 'range'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '05-product-tech.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['stack', 'flow', 'dependency-map'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '06-customers.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['journey-map', 'bars', 'scatter', 'funnel', 'cohort'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '07-risks.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['heatmap', 'matrix', 'causal-map', 'dependency-map'], depthFloor: STANDARD_DEPTH_FLOOR },
  { file: '08-valuation.yaml', minSections: 3, maxSections: 8, minTables: 4, maxTables: 8, minFigures: 3, maxFigures: 6, requiredFigureTypes: ['logic-chain', 'sensitivity', 'scorecard', 'scenario-tree', 'range'], depthFloor: STANDARD_DEPTH_FLOOR },
];

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  return {
    folder: positional[0] ?? null,
    chapter: positional[1] ?? null,
    preLedger: argv.includes('--pre-ledger'),
    strict: argv.includes('--strict'),
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder || !args.chapter) {
  console.error('Usage: node scripts/audit-chapter-readiness.mjs <report-folder> <01-08-artifact.yaml> [--pre-ledger] [--strict]');
  process.exit(1);
}

const spec = ANALYSIS_ARTIFACTS.find((item) => item.file === args.chapter);
if (!spec) {
  console.error(`Unknown chapter artifact: ${args.chapter}`);
  console.error(`Expected one of: ${ANALYSIS_ARTIFACTS.map((item) => item.file).join(', ')}`);
  process.exit(1);
}

const reportFolder = resolve(args.folder);
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

function loadYamlFile(file) {
  const path = join(reportFolder, file);
  if (!existsSync(path)) {
    fail(`${file}: missing`);
    return null;
  }
  const result = tryReadYaml(path);
  if (!result.ok) {
    fail(`${file}: YAML parse failed: ${result.error}`);
    return null;
  }
  return result.value;
}

function figureTypeSet(doc) {
  return new Set((doc?.figures ?? []).map((figure) => figure?.type).filter(Boolean));
}

function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function figureDataPointCount(figure) {
  const data = figure?.data ?? {};
  return Math.max(
    data.items?.length ?? 0,
    data.nodes?.length ?? 0,
    data.edges?.length ?? 0,
    data.layers?.length ?? 0,
    data.series?.length ?? 0,
    data.rows?.length ?? 0,
    data.points?.length ?? 0,
    data.branches?.length ?? 0,
  );
}

function detailStats(doc) {
  const sectionWords = (doc.sections ?? []).map((section) => wordCount(section?.body));
  const tableRows = (doc.tables ?? []).map((table) => table?.rows?.length ?? 0);
  const figureDataPoints = (doc.figures ?? []).map(figureDataPointCount);
  return {
    minSectionWords: sectionWords.length ? Math.min(...sectionWords) : 0,
    sectionWordsTotal: sectionWords.reduce((sum, count) => sum + count, 0),
    tableRowsTotal: tableRows.reduce((sum, count) => sum + count, 0),
    figureDataPointsTotal: figureDataPoints.reduce((sum, count) => sum + count, 0),
  };
}

function checkDepthFloor(file, doc, floor) {
  const stats = detailStats(doc);
  if (stats.minSectionWords < floor.minSectionBodyWords) {
    fail(`${file}: thin section prose (${stats.minSectionWords} words in shortest section); expected every section body to have at least ${floor.minSectionBodyWords}`);
  }
  if (stats.sectionWordsTotal < floor.minSectionWordsTotal) {
    fail(`${file}: thin section prose (${stats.sectionWordsTotal} total section words); expected at least ${floor.minSectionWordsTotal}`);
  }
  if (stats.tableRowsTotal < floor.minTableRowsTotal) {
    fail(`${file}: thin table analysis (${stats.tableRowsTotal} total table rows); expected at least ${floor.minTableRowsTotal}`);
  }
  if (stats.figureDataPointsTotal < floor.minFigureDataPointsTotal) {
    fail(`${file}: thin figure data (${stats.figureDataPointsTotal} total figure data points); expected at least ${floor.minFigureDataPointsTotal}`);
  }
}

function normalizeAnalysisTokens(value) {
  const stop = new Set(['table', 'figure', 'fig', 'chart', 'graph', 'matrix', 'map', 'scorecard', 'analysis', 'overview', 'summary']);
  return new Set(String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stop.has(token)));
}

function jaccardSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function displayTitle(item) {
  return item?.title ?? item?.label ?? item?.name ?? item?.id ?? '';
}

function collectEmbeddedClaimRefs(value, refs = new Set()) {
  if (!value || typeof value !== 'object') return refs;
  if (Array.isArray(value)) {
    for (const item of value) collectEmbeddedClaimRefs(item, refs);
    return refs;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'claimRefs' && Array.isArray(child)) {
      for (const ref of child) if (typeof ref === 'string') refs.add(ref);
    } else {
      collectEmbeddedClaimRefs(child, refs);
    }
  }
  return refs;
}

function checkTableFigureOverlap(file, doc) {
  for (const table of doc.tables ?? []) {
    const tableTitle = displayTitle(table);
    const tableTokens = normalizeAnalysisTokens(tableTitle);
    const tableRefs = collectEmbeddedClaimRefs(table);
    for (const figure of doc.figures ?? []) {
      const figureTitle = displayTitle(figure);
      const titleSimilarity = jaccardSimilarity(tableTokens, normalizeAnalysisTokens(figureTitle));
      const figureRefs = collectEmbeddedClaimRefs(figure);
      const sharedRefs = [...tableRefs].filter((ref) => figureRefs.has(ref)).length;
      const smallerRefSet = Math.min(tableRefs.size, figureRefs.size);
      const highClaimOverlap = smallerRefSet >= 3 && sharedRefs / smallerRefSet >= 0.75;
      if (titleSimilarity >= 0.75 || highClaimOverlap) {
        warn(`${file}: possible duplicate table/figure analysis (${table.id ?? tableTitle} vs ${figure.id ?? figureTitle}); choose one representation unless they answer distinct questions`);
      }
    }
  }
}

function checkPreLedgerEvidence(file, doc, counts) {
  if (!doc.localEvidence) {
    fail(`${file}: missing localEvidence before ledger consolidation`);
    return;
  }
  if (!counts.sources) fail(`${file}: localEvidence.sources is empty`);
  if (!counts.claims) fail(`${file}: localEvidence.claims is empty`);
  if (counts.sources < MIN_LOCAL_SOURCES_PER_CHAPTER) {
    const message = `${file}: only ${counts.sources} retained local sources; expected at least ${MIN_LOCAL_SOURCES_PER_CHAPTER} before consolidation or explicit evidenceGaps[] explaining public-evidence limits`;
    if (counts.gaps > 0) warn(message);
    else fail(message);
  }
  if (counts.claims < MIN_LOCAL_CLAIMS_PER_CHAPTER) {
    const message = `${file}: only ${counts.claims} local claims; expected at least ${MIN_LOCAL_CLAIMS_PER_CHAPTER} before consolidation or explicit evidenceGaps[] explaining public-evidence limits`;
    if (counts.gaps > 0) warn(message);
    else fail(message);
  }
  const localClaimIds = new Set((doc.localEvidence.claims ?? []).map((claim) => claim?.id));
  for (const ref of collectClaimRefs(doc)) {
    if (!localClaimIds.has(ref)) {
      fail(`${file}: claimRef ${ref} does not resolve to localEvidence.claims before consolidation`);
    }
  }
}

const doc = loadYamlFile(spec.file);
if (doc) {
  const counts = {
    sections: doc.sections?.length ?? 0,
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sources: doc.localEvidence?.sources?.length ?? 0,
    claims: doc.localEvidence?.claims?.length ?? 0,
    gaps: doc.localEvidence?.evidenceGaps?.length ?? 0,
  };

  if (counts.sections < spec.minSections) fail(`${spec.file}: ${counts.sections} sections, expected at least ${spec.minSections}`);
  if (counts.tables < spec.minTables) fail(`${spec.file}: ${counts.tables} tables, expected at least ${spec.minTables}`);
  if (counts.figures < spec.minFigures) fail(`${spec.file}: ${counts.figures} figures, expected at least ${spec.minFigures}`);
  if (counts.sections > spec.maxSections) warn(`${spec.file}: ${counts.sections} sections exceeds target range maximum ${spec.maxSections}; verify the chapter is not over-fragmented or duplicative`);
  if (counts.tables > spec.maxTables) warn(`${spec.file}: ${counts.tables} tables exceeds target range maximum ${spec.maxTables}; verify the chapter is not over-fragmented or duplicative`);
  if (counts.figures > spec.maxFigures) warn(`${spec.file}: ${counts.figures} figures exceeds target range maximum ${spec.maxFigures}; verify the chapter is not over-fragmented or duplicative`);

  checkDepthFloor(spec.file, doc, spec.depthFloor);
  checkTableFigureOverlap(spec.file, doc);

  const types = figureTypeSet(doc);
  if (!spec.requiredFigureTypes.some((type) => types.has(type))) {
    warn(`${spec.file}: no preferred figure type found (${spec.requiredFigureTypes.join(' or ')})`);
  }

  if (args.preLedger) checkPreLedgerEvidence(spec.file, doc, counts);

  console.log(`[audit:chapter] reportFolder=${reportFolder}`);
  console.log(`[audit:chapter] artifact=${spec.file} mode=${args.preLedger ? 'pre-ledger' : 'general'} strict=${args.strict ? 'yes' : 'no'}`);
  console.log(`[audit:chapter] sections=${counts.sections} tables=${counts.tables} figures=${counts.figures} localSources=${counts.sources} localClaims=${counts.claims} gaps=${counts.gaps}`);
}

if (warnings.length) {
  console.warn('[audit:chapter] warnings:\n' + warnings.map((message) => `  - ${message}`).join('\n'));
}
if (failures.length) {
  console.error('[audit:chapter] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
  process.exit(1);
}
if (args.strict && warnings.length) process.exit(1);
console.log('[audit:chapter] ✓ chapter ready for next workflow stage.');
