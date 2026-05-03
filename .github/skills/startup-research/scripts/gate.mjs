#!/usr/bin/env node
// Chapter-scoped readiness check for one analysis artifact (01-08).
// Always runs the pre-ledger checks (localEvidence quotas, claimRef
// resolution); the post-ledger phase is handled by check-reports.mjs.
//
// `--format json` emits structured failures keyed by dimension so the agent's
// retry loop can target only the failing facets (researchQuestions, sources,
// claims, sections, artifacts, depth, claimRefs, etc.).
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { collectClaimRefs, getAnalysisArtifacts, tryReadYaml } from './utils.mjs';

const ANALYSIS_ARTIFACTS = getAnalysisArtifacts();

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  const formatIndex = argv.indexOf('--format');
  return {
    folder: positional[0] ?? null,
    chapter: positional[1] ?? null,
    strict: argv.includes('--strict'),
    format: formatIndex >= 0 ? argv[formatIndex + 1] : 'text',
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder || !args.chapter) {
  console.error('Usage: node .github/skills/startup-research/scripts/gate.mjs <report-folder> <01-08-artifact.yaml> [--strict] [--format text|json]');
  process.exit(1);
}
if (!['text', 'json'].includes(args.format)) {
  console.error(`Invalid --format value: ${args.format}; expected text or json`);
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

// dimension is a stable enum the retry loop can switch on:
//   missingArtifact | yamlParse | sectionsMin | sectionsMax | artifactsMin
//   | tablesMax | figuresMax | depthSection | depthSectionTotal
//   | depthTableRows | depthFigureData | duplicateAnalysis | figureType
//   | localEvidenceMissing | researchQuestions | sources | claims | claimRefs
function fail(dimension, message, extra = {}) {
  failures.push({ dimension, file: spec.file, message, ...extra });
}

function warn(dimension, message, extra = {}) {
  warnings.push({ dimension, file: spec.file, message, ...extra });
}

function loadYamlFile(file) {
  const path = join(reportFolder, file);
  if (!existsSync(path)) {
    fail('missingArtifact', `${file}: missing`);
    return null;
  }
  const result = tryReadYaml(path);
  if (!result.ok) {
    fail('yamlParse', `${file}: YAML parse failed: ${result.error}`);
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
    data.columns?.length ?? 0,
    data.rows?.length ?? 0,
    data.points?.length ?? 0,
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
    fail('depthSection', `${file}: thin section prose (${stats.minSectionWords} words in shortest section); expected every section body to have at least ${floor.minSectionBodyWords}`, { actual: stats.minSectionWords, required: floor.minSectionBodyWords });
  }
  if (stats.sectionWordsTotal < floor.minSectionWordsTotal) {
    fail('depthSectionTotal', `${file}: thin section prose (${stats.sectionWordsTotal} total section words); expected at least ${floor.minSectionWordsTotal}`, { actual: stats.sectionWordsTotal, required: floor.minSectionWordsTotal });
  }
  if (stats.tableRowsTotal < floor.minTableRowsTotal) {
    fail('depthTableRows', `${file}: thin table analysis (${stats.tableRowsTotal} total table rows); expected at least ${floor.minTableRowsTotal}`, { actual: stats.tableRowsTotal, required: floor.minTableRowsTotal });
  }
  if (stats.figureDataPointsTotal < floor.minFigureDataPointsTotal) {
    fail('depthFigureData', `${file}: thin figure data (${stats.figureDataPointsTotal} total figure data points); expected at least ${floor.minFigureDataPointsTotal}`, { actual: stats.figureDataPointsTotal, required: floor.minFigureDataPointsTotal });
  }
}

function normalizeAnalysisTokens(value) {
  const stop = new Set(['table', 'figure', 'fig', 'chart', 'graph', 'matrix', 'map', 'kpi', 'kpis', 'scorecard', 'analysis', 'overview', 'summary']);
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
        warn('duplicateAnalysis', `${file}: possible duplicate table/figure analysis (${table.id ?? tableTitle} vs ${figure.id ?? figureTitle}); choose one representation unless they answer distinct questions`);
      }
    }
  }
}

function checkLocalEvidence(file, doc, counts) {
  if (!doc.localEvidence) {
    fail('localEvidenceMissing', `${file}: missing localEvidence before ledger consolidation`);
    return;
  }
  const minimums = [
    ['researchQuestions', 'researchQuestions', 'localEvidence.researchQuestions[]', spec.gate.minResearchQuestions],
    ['sources', 'sources', 'localEvidence.sources[]', spec.gate.minLocalSources],
    ['claims', 'claims', 'localEvidence.claims[]', spec.gate.minLocalClaims],
  ];
  for (const [key, dimension, path, min] of minimums) {
    if (counts[key] < min) {
      fail(dimension, `${file}: ${path} has ${counts[key]}, expected at least ${min}`, { actual: counts[key], required: min });
    }
  }
  const localClaimIds = new Set((doc.localEvidence.claims ?? []).map((claim) => claim?.id));
  for (const ref of collectClaimRefs(doc)) {
    if (!localClaimIds.has(ref)) {
      fail('claimRefs', `${file}: claimRef ${ref} does not resolve to localEvidence.claims before consolidation`, { unresolvedRef: ref });
    }
  }
}

const doc = loadYamlFile(spec.file);
let counts = null;
if (doc) {
  counts = {
    sections: doc.sections?.length ?? 0,
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sources: doc.localEvidence?.sources?.length ?? 0,
    claims: doc.localEvidence?.claims?.length ?? 0,
    gaps: doc.localEvidence?.evidenceGaps?.length ?? 0,
    researchQuestions: doc.localEvidence?.researchQuestions?.length ?? 0,
  };

  const gate = spec.gate;
  // Tables and figures are interchangeable artifact slots: agents may swap a
  // required figure for an additional table when the collected data does not
  // fit the planned figure type. Enforce the combined floor so a substitution
  // does not fail the gate.
  const minArtifacts = Math.max(
    gate.minTables + gate.minFigures,
    spec.requiredTables.length + spec.requiredFigures.length,
  );
  const totalArtifacts = counts.tables + counts.figures;
  if (counts.sections < gate.minSections) {
    fail('sectionsMin', `${spec.file}: ${counts.sections} sections, expected at least ${gate.minSections}`, { actual: counts.sections, required: gate.minSections });
  }
  if (totalArtifacts < minArtifacts) {
    fail('artifactsMin', `${spec.file}: ${counts.tables} tables + ${counts.figures} figures = ${totalArtifacts} artifacts, expected at least ${minArtifacts} (requiredTables=${spec.requiredTables.length}, requiredFigures=${spec.requiredFigures.length}; figures may be substituted with tables when data shape does not fit)`, { actual: totalArtifacts, required: minArtifacts });
  }
  if (counts.sections > gate.maxSections) {
    warn('sectionsMax', `${spec.file}: ${counts.sections} sections exceeds target range maximum ${gate.maxSections}; verify the chapter is not over-fragmented or duplicative`, { actual: counts.sections, ceiling: gate.maxSections });
  }
  if (counts.tables > gate.maxTables) {
    warn('tablesMax', `${spec.file}: ${counts.tables} tables exceeds target range maximum ${gate.maxTables}; verify the chapter is not over-fragmented or duplicative`, { actual: counts.tables, ceiling: gate.maxTables });
  }
  if (counts.figures > gate.maxFigures) {
    warn('figuresMax', `${spec.file}: ${counts.figures} figures exceeds target range maximum ${gate.maxFigures}; verify the chapter is not over-fragmented or duplicative`, { actual: counts.figures, ceiling: gate.maxFigures });
  }

  checkDepthFloor(spec.file, doc, gate.depthFloor);
  checkTableFigureOverlap(spec.file, doc);

  const types = figureTypeSet(doc);
  const plannedTypes = new Set((spec.requiredFigures ?? []).flatMap((figure) => figure.types ?? []));
  if (counts.figures > 0 && plannedTypes.size && ![...plannedTypes].some((type) => types.has(type))) {
    warn('figureType', `${spec.file}: no required figure type rendered (planned: ${[...plannedTypes].join(', ')}); confirm the substitution is intentional`, { rendered: [...types], planned: [...plannedTypes] });
  }

  checkLocalEvidence(spec.file, doc, counts);
}

const ok = failures.length === 0 && (!args.strict || warnings.length === 0);

if (args.format === 'json') {
  const report = {
    ok,
    artifact: spec.file,
    chapterKey: spec.key,
    reportFolder,
    counts,
    failures,
    warnings,
    failedDimensions: [...new Set(failures.map((entry) => entry.dimension))],
    warningDimensions: [...new Set(warnings.map((entry) => entry.dimension))],
  };
  console.log(JSON.stringify(report, null, 2));
} else {
  if (counts) {
    console.log(`[check:chapter] reportFolder=${reportFolder}`);
    console.log(`[check:chapter] artifact=${spec.file} strict=${args.strict ? 'yes' : 'no'}`);
    console.log(`[check:chapter] sections=${counts.sections} tables=${counts.tables} figures=${counts.figures} localSources=${counts.sources} localClaims=${counts.claims} researchQuestions=${counts.researchQuestions} gaps=${counts.gaps}`);
  }
  if (warnings.length) {
    console.warn('[check:chapter] warnings:\n' + warnings.map((entry) => `  - [${entry.dimension}] ${entry.message}`).join('\n'));
  }
  if (failures.length) {
    console.error('[check:chapter] failures:\n' + failures.map((entry) => `  - [${entry.dimension}] ${entry.message}`).join('\n'));
  }
  if (ok) console.log('[check:chapter] ✓ chapter ready for next workflow stage.');
}

process.exit(ok ? 0 : 1);
