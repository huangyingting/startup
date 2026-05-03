#!/usr/bin/env node
// Pre-ledger / general readiness audit for analysis artifacts 01-08.
// Produces deterministic counts and runs each chapter's machine contract.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { collectClaimRefs, repoRoot, tryReadYaml } from './text-utils.mjs';
import { ANALYSIS_ARTIFACTS } from './report-manifest.mjs';

const MIN_LOCAL_SOURCES = 50;
const MIN_LOCAL_CLAIMS = 90;

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  return {
    folder: positional[0] ?? null,
    preLedger: argv.includes('--pre-ledger'),
    strict: argv.includes('--strict'),
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder) {
  console.error('Usage: node scripts/audit-report-readiness.mjs <report-folder> [--pre-ledger] [--strict]');
  process.exit(1);
}

const reportFolder = resolve(args.folder);
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

function loadYamlFile(file, { required = true } = {}) {
  const path = join(reportFolder, file);
  if (!existsSync(path)) {
    if (required) fail(`${file}: missing`);
    return null;
  }
  const result = tryReadYaml(path);
  if (!result.ok) {
    fail(`${file}: YAML parse failed: ${result.error}`);
    return null;
  }
  return result.value;
}

function loadContract(skill) {
  const path = join(repoRoot, '.github', 'skills', skill, 'contract.yaml');
  if (!existsSync(path)) return null;
  const result = tryReadYaml(path);
  if (!result.ok) {
    fail(`${skill}/contract.yaml: parse failed: ${result.error}`);
    return null;
  }
  return result.value;
}

function figureTypeSet(doc) {
  return new Set((doc?.figures ?? []).map((figure) => figure?.type).filter(Boolean));
}

function textHaystack(doc) {
  return JSON.stringify({
    sections: doc?.sections ?? [],
    tables: doc?.tables ?? [],
    figures: doc?.figures ?? [],
    callouts: doc?.callouts ?? [],
    evidenceGaps: doc?.localEvidence?.evidenceGaps ?? [],
  }).toLowerCase();
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
  if (!floor) return;
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

function normalizeColumn(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function tableHasColumns(doc, requiredColumns) {
  if (!requiredColumns?.length) return true;
  const required = requiredColumns.map(normalizeColumn);
  return (doc?.tables ?? []).some((table) => {
    const columns = (table?.columns ?? []).map(normalizeColumn);
    return required.every((column) => columns.includes(column));
  });
}

function tableSatisfiesAnyColumnSet(doc, requiredColumnsAny) {
  if (!requiredColumnsAny?.length) return true;
  return requiredColumnsAny.some((columns) => tableHasColumns(doc, columns));
}

function reportContractIssue(message) {
  if (args.preLedger || args.strict) fail(message);
  else warn(message);
}

function checkContract(file, doc, contract, types) {
  if (!contract) return;
  if (contract.artifact && contract.artifact !== doc.artifact) {
    reportContractIssue(`${file}: skill contract artifact ${contract.artifact} does not match document artifact ${doc.artifact}`);
  }
  if (contract.chapter && contract.chapter !== doc.chapter?.number) {
    reportContractIssue(`${file}: skill contract chapter ${contract.chapter} does not match document chapter ${doc.chapter?.number}`);
  }
  const haystack = textHaystack(doc);
  for (const sectionReq of contract.requiredSections ?? []) {
    if (!sectionRequirementSatisfied(haystack, sectionReq.keywordsAny ?? [])) {
      reportContractIssue(`${file}: required section concept not satisfied (${sectionReq.key ?? sectionReq.purpose ?? 'unnamed'}); expected one of: ${JSON.stringify(sectionReq.keywordsAny ?? [])}`);
    }
  }
  for (const tableReq of contract.requiredTables ?? []) {
    if (!tableSatisfiesAnyColumnSet(doc, tableReq.requiredColumnsAny)) {
      reportContractIssue(`${file}: required table contract not satisfied (${tableReq.key ?? tableReq.purpose ?? 'unnamed'}); expected one of column sets: ${JSON.stringify(tableReq.requiredColumnsAny ?? [])}`);
    }
  }
  for (const figureReq of contract.requiredFigures ?? []) {
    const allowed = figureReq.allowedTypes ?? [];
    if (allowed.length && !allowed.some((type) => types.has(type))) {
      reportContractIssue(`${file}: required figure contract not satisfied (${figureReq.key ?? figureReq.purpose ?? 'unnamed'}); expected one of: ${allowed.join(', ')}`);
    }
  }
}

function sectionRequirementSatisfied(haystack, alternatives) {
  if (!alternatives.length) return true;
  return alternatives.some((alternative) => {
    const keywords = Array.isArray(alternative) ? alternative : [alternative];
    return keywords.every((keyword) => haystack.includes(String(keyword).toLowerCase()));
  });
}

function checkPreLedgerEvidence(file, doc, counts) {
  if (!doc.localEvidence) {
    fail(`${file}: missing localEvidence before ledger consolidation`);
    return;
  }
  if (!counts.sources) fail(`${file}: localEvidence.sources is empty`);
  if (!counts.claims) fail(`${file}: localEvidence.claims is empty`);
  const localClaimIds = new Set((doc.localEvidence.claims ?? []).map((claim) => claim?.id));
  for (const ref of collectClaimRefs(doc)) {
    if (!localClaimIds.has(ref)) {
      fail(`${file}: claimRef ${ref} does not resolve to localEvidence.claims before consolidation`);
    }
  }
}

function checkChineseSibling(zhFile, en, zh) {
  if (zh.artifact !== en.artifact) fail(`${zhFile}: artifact does not match English`);
  if (zh.slug !== en.slug) fail(`${zhFile}: slug does not match English`);
  if (zh.company?.name !== en.company?.name) fail(`${zhFile}: company.name does not match English`);
}

const totals = { sources: 0, claims: 0, gaps: 0 };
const rows = [];

for (const spec of ANALYSIS_ARTIFACTS) {
  const doc = loadYamlFile(spec.file);
  if (!doc) continue;
  const zhFile = spec.zhFile;
  const zh = loadYamlFile(zhFile, { required: false });
  const contract = loadContract(spec.skill);

  const counts = {
    sections: doc.sections?.length ?? 0,
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sources: doc.localEvidence?.sources?.length ?? 0,
    claims: doc.localEvidence?.claims?.length ?? 0,
    gaps: doc.localEvidence?.evidenceGaps?.length ?? 0,
  };
  totals.sources += counts.sources;
  totals.claims += counts.claims;
  totals.gaps += counts.gaps;
  rows.push({ file: spec.file, ...counts });

  if (counts.sections < spec.minSections) fail(`${spec.file}: ${counts.sections} sections, expected at least ${spec.minSections}`);
  if (counts.tables < spec.minTables) fail(`${spec.file}: ${counts.tables} tables, expected at least ${spec.minTables}`);
  if (counts.figures < spec.minFigures) fail(`${spec.file}: ${counts.figures} figures, expected at least ${spec.minFigures}`);
  checkDepthFloor(spec.file, doc, spec.depthFloor);

  const types = figureTypeSet(doc);
  if (!spec.requiredFigureTypes.some((type) => types.has(type))) {
    warn(`${spec.file}: no preferred figure type found (${spec.requiredFigureTypes.join(' or ')})`);
  }

  checkContract(spec.file, doc, contract, types);
  if (args.preLedger) checkPreLedgerEvidence(spec.file, doc, counts);
  if (zh) checkChineseSibling(zhFile, doc, zh);
}

if (args.preLedger) {
  if (totals.sources < MIN_LOCAL_SOURCES) {
    warn(`pre-ledger retained local sources total ${totals.sources}; visible companies usually need roughly ${MIN_LOCAL_SOURCES}+ before consolidation`);
  }
  if (totals.claims < MIN_LOCAL_CLAIMS) {
    warn(`pre-ledger local claims total ${totals.claims}; visible companies usually need roughly ${MIN_LOCAL_CLAIMS}+ before consolidation`);
  }
  if (totals.gaps === 0) {
    warn('pre-ledger evidenceGaps total is 0; verify unsupported private metrics and failed diligence paths were not silently omitted');
  }
}

console.log(`[audit:readiness] reportFolder=${reportFolder}`);
console.log(`[audit:readiness] mode=${args.preLedger ? 'pre-ledger' : 'general'} strict=${args.strict ? 'yes' : 'no'}`);
for (const row of rows) {
  console.log(`[audit:readiness] ${row.file}: sections=${row.sections} tables=${row.tables} figures=${row.figures} localSources=${row.sources} localClaims=${row.claims} gaps=${row.gaps}`);
}
console.log(`[audit:readiness] totals: localSources=${totals.sources} localClaims=${totals.claims} gaps=${totals.gaps}`);

if (warnings.length) {
  console.warn('[audit:readiness] warnings:\n' + warnings.map((message) => `  - ${message}`).join('\n'));
}
if (failures.length) {
  console.error('[audit:readiness] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
  process.exit(1);
}
if (args.strict && warnings.length) process.exit(1);
console.log('[audit:readiness] ✓ ready for next workflow stage.');
