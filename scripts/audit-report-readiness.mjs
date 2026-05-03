#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readYaml, repoRoot } from './text-utils.mjs';
import { ANALYSIS_ARTIFACTS } from './report-manifest.mjs';

const ANALYSIS = ANALYSIS_ARTIFACTS.map((item) => ({ ...item, chapter: item.chapterKey }));

const args = process.argv.slice(2);
const folderArg = args.find((arg) => !arg.startsWith('-'));
const preLedger = args.includes('--pre-ledger');
const strict = args.includes('--strict');

if (!folderArg) {
  console.error('Usage: node scripts/audit-report-readiness.mjs <report-folder> [--pre-ledger] [--strict]');
  process.exit(1);
}

const reportFolder = resolve(folderArg);
const failures = [];
const warnings = [];
const rows = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

function loadYaml(file, required = true) {
  const path = join(reportFolder, file);
  if (!existsSync(path)) {
    if (required) fail(`${file}: missing`);
    return null;
  }
  try {
    return readYaml(path);
  } catch (err) {
    fail(`${file}: YAML parse failed: ${err.message.split('\n')[0]}`);
    return null;
  }
}

function loadYamlPath(path, required = true) {
  if (!existsSync(path)) {
    if (required) fail(`${path}: missing`);
    return null;
  }
  try {
    return readYaml(path);
  } catch (err) {
    fail(`${path}: YAML parse failed: ${err.message.split('\n')[0]}`);
    return null;
  }
}

function loadContract(spec) {
  return loadYamlPath(join(repoRoot, '.github', 'skills', spec.skill, 'contract.yaml'), false);
}

function walkClaimRefs(value, refs = []) {
  if (Array.isArray(value)) value.forEach((item) => walkClaimRefs(item, refs));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'claimRefs' && Array.isArray(child)) refs.push(...child);
      else walkClaimRefs(child, refs);
    }
  }
  return refs;
}

function figureTypes(doc) {
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

function hasTableWithColumns(doc, requiredColumns = []) {
  if (!requiredColumns.length) return true;
  const required = requiredColumns.map(normalizeColumn);
  return (doc?.tables ?? []).some((table) => {
    const columns = (table?.columns ?? []).map(normalizeColumn);
    return required.every((column) => columns.includes(column));
  });
}

function normalizeColumn(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasTableWithAnyColumnSet(doc, requiredColumnsAny = []) {
  if (!requiredColumnsAny.length) return true;
  return requiredColumnsAny.some((requiredColumns) => hasTableWithColumns(doc, requiredColumns.map(normalizeColumn)));
}

function contractCheck(message) {
  if (preLedger || strict) fail(message);
  else warn(message);
}

function valuesForChapter(value, chapter) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => !item?.chapter || item.chapter === chapter);
  if (typeof value === 'object') return value[chapter] ?? [];
  return [];
}

function chapterCustomization(customization, chapter) {
  if (!customization) return { topics: [], figures: [], tables: [], metrics: [], questions: [] };
  return {
    topics: [
      ...valuesForChapter(customization.requiredTopics, chapter),
      ...valuesForChapter(customization.requiredSections, chapter),
    ],
    figures: valuesForChapter(customization.requiredFigures, chapter),
    tables: valuesForChapter(customization.requiredTables, chapter),
    metrics: valuesForChapter(customization.requiredMetrics, chapter),
    questions: [
      ...valuesForChapter(customization.requiredQuestions, chapter),
      ...valuesForChapter(customization.diligenceQuestions, chapter),
    ],
  };
}

const customization = loadYaml('000-run-customization.yaml', false) ?? loadYaml('000-customization.yaml', false);
if (customization && customization.artifact && customization.artifact !== 'run-customization') {
  warn('run customization: artifact should be run-customization when present');
}

let totalLocalSources = 0;
let totalLocalClaims = 0;
let totalGaps = 0;

for (const spec of ANALYSIS) {
  const doc = loadYaml(spec.file);
  const zhFile = spec.file.replace(/\.yaml$/, '.zh.yaml');
  const zh = loadYaml(zhFile);
  const contract = loadContract(spec);
  if (!doc) continue;

  const counts = {
    sections: doc.sections?.length ?? 0,
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sources: doc.localEvidence?.sources?.length ?? 0,
    claims: doc.localEvidence?.claims?.length ?? 0,
    gaps: doc.localEvidence?.evidenceGaps?.length ?? 0,
  };
  totalLocalSources += counts.sources;
  totalLocalClaims += counts.claims;
  totalGaps += counts.gaps;
  rows.push({ file: spec.file, ...counts });

  if (counts.sections < spec.minSections) fail(`${spec.file}: ${counts.sections} sections, expected at least ${spec.minSections}`);
  if (counts.tables < spec.minTables) fail(`${spec.file}: ${counts.tables} tables, expected at least ${spec.minTables}`);
  if (counts.figures < spec.minFigures) fail(`${spec.file}: ${counts.figures} figures, expected at least ${spec.minFigures}`);

  const types = figureTypes(doc);
  if (!spec.requiredFigureTypes.some((type) => types.has(type))) {
    warn(`${spec.file}: no preferred figure type found (${spec.requiredFigureTypes.join(' or ')})`);
  }

  if (contract) {
    if (contract.artifact && contract.artifact !== doc.artifact) contractCheck(`${spec.file}: skill contract artifact ${contract.artifact} does not match document artifact ${doc.artifact}`);
    if (contract.chapter && contract.chapter !== doc.chapter?.number) contractCheck(`${spec.file}: skill contract chapter ${contract.chapter} does not match document chapter ${doc.chapter?.number}`);
    for (const tableReq of contract.requiredTables ?? []) {
      if (!hasTableWithAnyColumnSet(doc, tableReq.requiredColumnsAny ?? [])) {
        contractCheck(`${spec.file}: required table contract not satisfied (${tableReq.key ?? tableReq.purpose ?? 'unnamed'}); expected one of column sets: ${JSON.stringify(tableReq.requiredColumnsAny ?? [])}`);
      }
      if (tableReq.purpose && !textHaystack(doc).includes(String(tableReq.purpose).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5)[0] ?? '')) {
        warn(`${spec.file}: required table purpose not obvious in artifact text: ${tableReq.purpose}`);
      }
    }
    for (const figureReq of contract.requiredFigures ?? []) {
      const allowed = figureReq.allowedTypes ?? [];
      if (allowed.length && !allowed.some((type) => types.has(type))) {
        contractCheck(`${spec.file}: required figure contract not satisfied (${figureReq.key ?? figureReq.purpose ?? 'unnamed'}); expected one of: ${allowed.join(', ')}`);
      }
    }
  }

  if (preLedger) {
    if (!doc.localEvidence) fail(`${spec.file}: missing localEvidence before ledger consolidation`);
    else {
      if (!counts.sources) fail(`${spec.file}: localEvidence.sources is empty`);
      if (!counts.claims) fail(`${spec.file}: localEvidence.claims is empty`);
      const localClaimIds = new Set((doc.localEvidence.claims ?? []).map((claim) => claim?.id));
      for (const ref of walkClaimRefs(doc)) {
        if (!localClaimIds.has(ref)) fail(`${spec.file}: claimRef ${ref} does not resolve to localEvidence.claims before consolidation`);
      }
    }
  }

  if (zh) {
    if (zh.artifact !== doc.artifact) fail(`${zhFile}: artifact does not match English`);
    if (zh.slug !== doc.slug) fail(`${zhFile}: slug does not match English`);
    if (zh.company?.name !== doc.company?.name) fail(`${zhFile}: company.name does not match English`);
  }

  const chapterReq = chapterCustomization(customization, spec.chapter);
  const haystack = textHaystack(doc);
  for (const topic of chapterReq.topics) {
    const label = typeof topic === 'string' ? topic : topic?.name ?? topic?.topic ?? topic?.title ?? JSON.stringify(topic);
    if (label && !haystack.includes(String(label).toLowerCase())) fail(`${spec.file}: customization required topic not addressed: ${label}`);
  }
  for (const figure of chapterReq.figures) {
    if (figure?.type && !types.has(figure.type)) fail(`${spec.file}: customization required figure type missing: ${figure.type}`);
    if (figure?.purpose && !haystack.includes(String(figure.purpose).toLowerCase())) warn(`${spec.file}: customization figure purpose not obvious in artifact: ${figure.purpose}`);
  }
  for (const table of chapterReq.tables) {
    if (!hasTableWithColumns(doc, table?.requiredColumns ?? [])) fail(`${spec.file}: customization required table columns missing: ${(table?.requiredColumns ?? []).join(', ')}`);
    if (table?.purpose && !haystack.includes(String(table.purpose).toLowerCase())) warn(`${spec.file}: customization table purpose not obvious in artifact: ${table.purpose}`);
  }
  for (const metric of chapterReq.metrics) {
    if (metric?.required && metric?.name && !haystack.includes(String(metric.name).toLowerCase())) fail(`${spec.file}: customization required metric not addressed: ${metric.name}`);
  }
  for (const question of chapterReq.questions) {
    const keywords = String(question).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 5).slice(0, 3);
    if (keywords.length && !keywords.some((word) => haystack.includes(word))) warn(`${spec.file}: customization diligence question may be unaddressed: ${question}`);
  }
}

if (preLedger) {
  if (totalLocalSources < 50) warn(`pre-ledger retained local sources total ${totalLocalSources}; visible companies usually need roughly 50+ before consolidation`);
  if (totalLocalClaims < 90) warn(`pre-ledger local claims total ${totalLocalClaims}; visible companies usually need roughly 90+ before consolidation`);
  if (totalGaps === 0) warn('pre-ledger evidenceGaps total is 0; verify unsupported private metrics and failed diligence paths were not silently omitted');
}

console.log(`[audit:readiness] reportFolder=${reportFolder}`);
console.log(`[audit:readiness] mode=${preLedger ? 'pre-ledger' : 'general'} strict=${strict ? 'yes' : 'no'}`);
for (const row of rows) {
  console.log(`[audit:readiness] ${row.file}: sections=${row.sections} tables=${row.tables} figures=${row.figures} localSources=${row.sources} localClaims=${row.claims} gaps=${row.gaps}`);
}
console.log(`[audit:readiness] totals: localSources=${totalLocalSources} localClaims=${totalLocalClaims} gaps=${totalGaps}`);

if (warnings.length) console.warn('[audit:readiness] warnings:\n' + warnings.map((message) => `  - ${message}`).join('\n'));
if (failures.length) {
  console.error('[audit:readiness] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
  process.exit(1);
}
if (strict && warnings.length) process.exit(1);
console.log('[audit:readiness] ✓ ready for next workflow stage.');
