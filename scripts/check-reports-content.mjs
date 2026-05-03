#!/usr/bin/env node
// Content-quality checks across all completed English reports.
// Schema and renderer-contract checks live in website/scripts/check-reports.mjs.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalSourceUrl, listDirs, readYaml, reportsDir, tryReadYaml } from './text-utils.mjs';
import { ANALYSIS_ARTIFACTS, ANALYSIS_FILES } from './report-manifest.mjs';
import { CLAIM_TYPES, CORROBORATION, FRESHNESS } from './evidence-registry.mjs';

const PUBLISHER_CONCENTRATION_LIMIT = 0.34;
const INDEPENDENT_FLOOR = 0.15;
const HIGH_PROFILE_VALUATION_USD_M = 100_000;
const HIGH_PROFILE_REVENUE_USD_M = 10_000;
const MIN_HIGH_PROFILE_SOURCES = 50;
const MIN_HIGH_PROFILE_CLAIMS = 90;
const REPORT_COVERAGE_FLOOR = 0.8;
const args = new Set(process.argv.slice(2));
const STRICT_FRESHNESS = args.has('--strict-freshness');
const ALLOWED_CLAIM_TYPES = new Set(CLAIM_TYPES);
const ALLOWED_CORROBORATION = new Set(CORROBORATION);
const ALLOWED_FRESHNESS = new Set(FRESHNESS);
const VOLATILE_EVIDENCE_TOPICS = new Set([
  'customer', 'customers', 'financials', 'funding', 'pricing', 'legal', 'regulatory',
  'regulation', 'compliance', 'governance', 'risk', 'valuation', 'traction', 'trust',
]);

const GENERIC_TITLES = new Set([
  'Evidence base', 'Investor interpretation', 'Contradictions and uncertainty',
  'Private diligence path', 'Snapshot conclusion',
]);
const GENERIC_FIGURE_LABELS = new Set([
  'Public anchor', 'Private bridge', 'Underwriting output', 'Evidence strength',
  'Unknown private inputs', 'Investment implication',
]);

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

function tableIdSignature(doc) {
  return (doc.tables ?? []).map((table) => table?.id).sort().join(',');
}

function figureIdSignature(doc) {
  return (doc.figures ?? []).map((figure) => figure?.id).sort().join(',');
}

function idSet(items) {
  return new Set((items ?? []).map((item) => item?.id).filter(Boolean));
}

function yamlFiles(dir) {
  return readdirSync(dir).filter((name) => name.endsWith('.yaml'));
}

function isRenderableScalar(value) {
  if (value === null || value === undefined) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  return value instanceof Date;
}

function loadYaml(path) {
  const result = tryReadYaml(path);
  return result.ok ? result.value : null;
}

// ---------------------------------------------------------------------------
// renderable-data checks (tables and timeline figures)
// ---------------------------------------------------------------------------

function checkRenderableData(run, file, doc) {
  for (const table of doc?.tables ?? []) {
    for (const [rowIndex, row] of (table.rows ?? []).entries()) {
      for (const [cellIndex, cell] of (row ?? []).entries()) {
        if (isRenderableScalar(cell)) continue;
        const kind = Array.isArray(cell) ? 'an array' : 'an object';
        fail(`${run}/${file}: table ${table.id} row ${rowIndex + 1} cell ${cellIndex + 1} is ${kind}; use a scalar value`);
      }
    }
  }
  for (const figure of doc?.figures ?? []) {
    if (figure.type !== 'timeline') continue;
    for (const [itemIndex, item] of (figure.data?.items ?? []).entries()) {
      for (const key of ['date', 'label', 'detail']) {
        if (isRenderableScalar(item?.[key])) continue;
        const kind = Array.isArray(item?.[key]) ? 'an array' : 'an object';
        fail(`${run}/${file}: timeline figure ${figure.id} item ${itemIndex + 1}.${key} is ${kind}; use a scalar value`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// evidence ledger checks
// ---------------------------------------------------------------------------

function checkLedger(run, ledger) {
  const { coverage = {}, sources = [], claims = [] } = ledger;
  const file = `${run}/90-evidence-ledger.yaml`;
  if (Number(coverage.sourcesRetained) !== sources.length) {
    fail(`${file}: coverage.sourcesRetained ${coverage.sourcesRetained} must equal sources.length ${sources.length}`);
  }
  if (Number(coverage.sourcesConsidered) < sources.length) {
    fail(`${file}: coverage.sourcesConsidered ${coverage.sourcesConsidered} cannot be less than sources.length ${sources.length}`);
  }
  if (Number(coverage.claimsCreated) !== claims.length) {
    fail(`${file}: coverage.claimsCreated ${coverage.claimsCreated} must equal claims.length ${claims.length}`);
  }
  if (!coverage.recencyNotes) {
    warn(`${file}: coverage.recencyNotes is empty; summarize source/claim freshness against runDate/currentDate`);
  }

  const seenUrls = new Map();
  for (const source of sources) {
    const url = canonicalSourceUrl(source.url);
    if (!url) continue;
    if (seenUrls.has(url)) {
      fail(`${file}: duplicate source URL ${source.url} appears in ${seenUrls.get(url)} and ${source.id}`);
    } else {
      seenUrls.set(url, source.id);
    }
  }

  const cited = new Set(claims.flatMap((claim) => claim.sourceRefs ?? []));
  const sourceIds = idSet(sources);
  const uncitedCount = sources.filter((source) => !cited.has(source.id)).length;
  if (sources.length && uncitedCount / sources.length > 0.5) {
    warn(`${file}: ${uncitedCount}/${sources.length} retained sources are not cited by claims; consider pruning irrelevant sources or creating missing claims`);
  }

  for (const claim of claims) {
    if (!claim?.statement || String(claim.statement).trim().length < 12) {
      fail(`${file}: claim ${claim?.id ?? '(missing id)'} has a missing or too-short statement`);
    }
    if (!ALLOWED_CLAIM_TYPES.has(claim?.claimType)) {
      fail(`${file}: claim ${claim?.id ?? '(missing id)'} has invalid claimType ${claim?.claimType}`);
    }
    if (!ALLOWED_CORROBORATION.has(claim?.corroboration)) {
      fail(`${file}: claim ${claim?.id ?? '(missing id)'} has invalid corroboration ${claim?.corroboration}`);
    }
    const refs = claim?.sourceRefs ?? [];
    if (claim?.claimType === 'open-question') {
      if (refs.length || claim?.corroboration !== 'none') {
        fail(`${file}: open-question claim ${claim.id} must use sourceRefs: [] and corroboration: none`);
      }
    } else if (!refs.length) {
      fail(`${file}: claim ${claim?.id ?? '(missing id)'} must cite at least one sourceRef`);
    }
    for (const ref of refs) {
      if (!sourceIds.has(ref)) fail(`${file}: claim ${claim.id} references missing source ${ref}`);
    }
    if (claim?.corroboration === 'multi-source' && new Set(refs).size < 2) {
      fail(`${file}: claim ${claim.id} is marked multi-source but cites fewer than two distinct sources`);
    }
    const freshness = claim?.freshness ?? 'unknown';
    if (!ALLOWED_FRESHNESS.has(freshness)) {
      fail(`${file}: claim ${claim?.id ?? '(missing id)'} has invalid freshness ${freshness}`);
      continue;
    }
    if (VOLATILE_EVIDENCE_TOPICS.has(claim?.topic) && ['historical', 'unknown'].includes(freshness)) {
      const message = `${file}: volatile claim ${claim.id} (${claim.topic}) has ${freshness} freshness; refresh against currentDate or document a gap`;
      if (STRICT_FRESHNESS) fail(message);
      else warn(message);
    }
  }

  if (sources.length < 20) return;

  const counts = new Map();
  for (const source of sources) {
    const publisher = source.publisher || 'unknown';
    counts.set(publisher, (counts.get(publisher) ?? 0) + 1);
  }
  const [topPublisher, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topPublisher && topCount / sources.length > PUBLISHER_CONCENTRATION_LIMIT) {
    warn(`${file}: publisher "${topPublisher}" accounts for ${topCount}/${sources.length} retained sources (>${Math.round(PUBLISHER_CONCENTRATION_LIMIT * 100)}%); diversify independent reporting`);
  }
  const independent = sources.filter((source) => source.independence === 'independent').length;
  if (independent / sources.length < INDEPENDENT_FLOOR) {
    warn(`${file}: only ${independent}/${sources.length} retained sources are independent (<${Math.round(INDEPENDENT_FLOOR * 100)}%); add tier-one-news, analyst-market-data, or filing sources`);
  }
}

// ---------------------------------------------------------------------------
// depth and template-risk checks
// ---------------------------------------------------------------------------

function genericFigureCount(figures) {
  return figures.filter((figure) => {
    const data = figure.data ?? {};
    const labels = [...(data.items ?? []), ...(data.nodes ?? []), ...(data.layers ?? [])]
      .map((item) => item?.label).filter(Boolean);
    return labels.length >= 3 && labels.filter((label) => GENERIC_FIGURE_LABELS.has(label)).length >= 3;
  }).length;
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

function checkDetailFloor(run, doc, file) {
  const spec = ANALYSIS_ARTIFACTS.find((item) => item.file === file);
  const floor = spec?.depthFloor;
  if (!floor) return;
  const stats = detailStats(doc);
  const misses = [];
  if (stats.minSectionWords < floor.minSectionBodyWords) misses.push(`shortest section ${stats.minSectionWords}<${floor.minSectionBodyWords} words`);
  if (stats.sectionWordsTotal < floor.minSectionWordsTotal) misses.push(`section words ${stats.sectionWordsTotal}<${floor.minSectionWordsTotal}`);
  if (stats.tableRowsTotal < floor.minTableRowsTotal) misses.push(`table rows ${stats.tableRowsTotal}<${floor.minTableRowsTotal}`);
  if (stats.figureDataPointsTotal < floor.minFigureDataPointsTotal) misses.push(`figure data points ${stats.figureDataPointsTotal}<${floor.minFigureDataPointsTotal}`);
  if (misses.length) warn(`${run}/${file}: below detailed-report depth floor (${misses.join('; ')})`);
}

function checkAnalysisFloors(run, doc, file) {
  const spec = ANALYSIS_ARTIFACTS.find((item) => item.file === file);
  const floors = {
    tables: spec?.minTables ?? 4,
    figures: spec?.minFigures ?? 2,
    sections: spec?.minSections ?? 4,
  };
  const counts = {
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sections: doc.sections?.length ?? 0,
  };
  for (const [key, min] of Object.entries(floors)) {
    if (counts[key] < min) fail(`${run}/${file}: thin analysis (${counts[key]} ${key.slice(0, -1)}(s)); expected at least ${min}`);
  }
  checkDetailFloor(run, doc, file);
  return { floors, counts };
}

function checkAnalysisTemplateRisks(run, doc, file, floors, counts) {
  const hitsFloorExactly = counts.tables === floors.tables && counts.figures === floors.figures && counts.sections === floors.sections;
  const sections = doc.sections ?? [];
  const genericTitles = sections.filter((section) => GENERIC_TITLES.has(section?.title)).length;
  const bodies = sections.map((section) => String(section?.body ?? '').trim()).filter(Boolean);
  const duplicateBodies = bodies.length - new Set(bodies).size;
  const genericFigures = genericFigureCount(doc.figures ?? []);
  const tables = doc.tables ?? [];
  const allShortTables = tables.length > 0 && tables.every((table) => (table.rows?.length ?? 0) <= 4);

  if (genericTitles >= 3 || duplicateBodies || genericFigures || (hitsFloorExactly && allShortTables)) {
    warn(`${run}/${file}: template-risk signal (${genericTitles} generic section title(s), ${duplicateBodies} duplicate section bod(y/ies), ${genericFigures} generic figure(s), ${hitsFloorExactly ? 'hits minimum counts exactly' : 'above floor'})`);
    return { hitsFloorExactly, templateRisk: true };
  }
  return { hitsFloorExactly, templateRisk: false };
}

function checkHighProfileEvidence(run, ledger, card) {
  const valuation = Number(card?.keyMetrics?.valuationUsdM ?? 0);
  const revenue = Number(card?.keyMetrics?.revenueRunRateUsdM ?? 0);
  const isHighProfile = valuation >= HIGH_PROFILE_VALUATION_USD_M || revenue >= HIGH_PROFILE_REVENUE_USD_M;
  if (!isHighProfile) return;
  const sourceCount = ledger.sources?.length ?? 0;
  const claimCount = ledger.claims?.length ?? 0;
  if (sourceCount < MIN_HIGH_PROFILE_SOURCES) {
    fail(`${run}/90-evidence-ledger.yaml: high-profile company has only ${sourceCount} retained sources; expected at least ${MIN_HIGH_PROFILE_SOURCES} or a documented reason`);
  }
  if (claimCount < MIN_HIGH_PROFILE_CLAIMS) {
    fail(`${run}/90-evidence-ledger.yaml: high-profile company has only ${claimCount} claims; expected at least ${MIN_HIGH_PROFILE_CLAIMS} or a documented reason`);
  }
}

function checkReportCoverage(run, docs, report) {
  const upstreamTables = idSet([...docs.values()].flatMap((doc) => doc.tables ?? []));
  const upstreamFigures = idSet([...docs.values()].flatMap((doc) => doc.figures ?? []));
  const reportTables = idSet(report.tables ?? []);
  const reportFigures = idSet(report.figures ?? []);
  const notes = String(report.reportMeta?.coverageNotes ?? '');
  const missingTables = [...upstreamTables].filter((id) => !reportTables.has(id) && !notes.includes(id));
  const missingFigures = [...upstreamFigures].filter((id) => !reportFigures.has(id) && !notes.includes(id));
  if (upstreamTables.size && reportTables.size / upstreamTables.size < REPORT_COVERAGE_FLOOR) {
    fail(`${run}/91-report-document.yaml: preserves only ${reportTables.size}/${upstreamTables.size} upstream tables`);
  }
  if (upstreamFigures.size && reportFigures.size / upstreamFigures.size < REPORT_COVERAGE_FLOOR) {
    fail(`${run}/91-report-document.yaml: preserves only ${reportFigures.size}/${upstreamFigures.size} upstream figures`);
  }
  if (missingTables.length) warn(`${run}/91-report-document.yaml: upstream table(s) missing without coverageNotes: ${missingTables.join(', ')}`);
  if (missingFigures.length) warn(`${run}/91-report-document.yaml: upstream figure(s) missing without coverageNotes: ${missingFigures.join(', ')}`);
}

function checkDepth(run, dir, ledger, report, card) {
  const docs = new Map();
  for (const file of ANALYSIS_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    docs.set(file, readYaml(path));
  }

  let floorHits = 0;
  let templateRisks = 0;
  for (const [file, doc] of docs) {
    const { floors, counts } = checkAnalysisFloors(run, doc, file);
    const { hitsFloorExactly, templateRisk } = checkAnalysisTemplateRisks(run, doc, file, floors, counts);
    if (hitsFloorExactly) floorHits += 1;
    if (templateRisk) templateRisks += 1;
  }

  if (floorHits >= 5) warn(`${run}: ${floorHits}/8 analysis artifacts hit their minimum section/table/figure floor exactly; investigate floor-targeted generation`);
  if (templateRisks >= 5) warn(`${run}: ${templateRisks} analysis artifacts show template-risk patterns; report may be schema-valid but not investor-grade`);

  checkHighProfileEvidence(run, ledger, card);
  checkReportCoverage(run, docs, report);
}

// ---------------------------------------------------------------------------
// per-run pipeline
// ---------------------------------------------------------------------------

function loadCoreArtifacts(run, dir) {
  const out = { ledger: null, report: null, card: null };
  for (const [key, file] of [['ledger', '90-evidence-ledger.yaml'], ['report', '91-report-document.yaml'], ['card', '92-report-card.yaml']]) {
    const value = loadYaml(join(dir, file));
    if (!value) {
      fail(`${run}/${file}: YAML parse failed or missing`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function checkRun(run) {
  const dir = join(reportsDir, run);
  if (!existsSync(join(dir, '92-report-card.yaml'))) {
    if (yamlFiles(dir).length) fail(`${run}: partial report folder has YAML files but is missing 92-report-card.yaml`);
    return false;
  }
  const { ledger, report, card } = loadCoreArtifacts(run, dir);
  for (const file of ANALYSIS_FILES) {
    const doc = loadYaml(join(dir, file));
    if (doc) checkRenderableData(run, file, doc);
  }
  if (report) checkRenderableData(run, '91-report-document.yaml', report);
  if (ledger) checkLedger(run, ledger);
  if (ledger && report && card) checkDepth(run, dir, ledger, report, card);
  return true;
}

try {
  if (!existsSync(reportsDir)) {
    console.warn(`[check:reports-content] ${reportsDir} not found; nothing to check.`);
    process.exit(0);
  }

  let checked = 0;
  for (const run of listDirs(reportsDir)) if (checkRun(run)) checked += 1;

  if (warnings.length) console.warn('[check:reports-content] warnings:\n' + warnings.map((message) => `  - ${message}`).join('\n'));
  if (failures.length) {
    console.error('[check:reports-content] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports-content] ✓ ${checked} report(s) verified.`);
} catch (err) {
  console.error(`[check:reports-content] fatal error: ${err.message}`);
  process.exit(1);
}
