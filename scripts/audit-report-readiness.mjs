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

function valuesForChapter(value, chapter) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => !item?.chapter || item.chapter === chapter);
  if (typeof value === 'object') return value[chapter] ?? [];
  return [];
}

function chapterCustomizationFor(customization, chapter) {
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

function topicLabel(topic) {
  if (typeof topic === 'string') return topic;
  return topic?.name ?? topic?.topic ?? topic?.title ?? JSON.stringify(topic);
}

function questionKeywords(question) {
  return String(question)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5)
    .slice(0, 3);
}

function checkContract(file, doc, contract, types) {
  if (!contract) return;
  if (contract.artifact && contract.artifact !== doc.artifact) {
    reportContractIssue(`${file}: skill contract artifact ${contract.artifact} does not match document artifact ${doc.artifact}`);
  }
  if (contract.chapter && contract.chapter !== doc.chapter?.number) {
    reportContractIssue(`${file}: skill contract chapter ${contract.chapter} does not match document chapter ${doc.chapter?.number}`);
  }
  for (const tableReq of contract.requiredTables ?? []) {
    if (!tableSatisfiesAnyColumnSet(doc, tableReq.requiredColumnsAny)) {
      reportContractIssue(`${file}: required table contract not satisfied (${tableReq.key ?? tableReq.purpose ?? 'unnamed'}); expected one of column sets: ${JSON.stringify(tableReq.requiredColumnsAny ?? [])}`);
    }
    if (tableReq.purpose) {
      const probe = String(tableReq.purpose).toLowerCase().split(/[^a-z0-9]+/).find((word) => word.length >= 5) ?? '';
      if (probe && !textHaystack(doc).includes(probe)) {
        warn(`${file}: required table purpose not obvious in artifact text: ${tableReq.purpose}`);
      }
    }
  }
  for (const figureReq of contract.requiredFigures ?? []) {
    const allowed = figureReq.allowedTypes ?? [];
    if (allowed.length && !allowed.some((type) => types.has(type))) {
      reportContractIssue(`${file}: required figure contract not satisfied (${figureReq.key ?? figureReq.purpose ?? 'unnamed'}); expected one of: ${allowed.join(', ')}`);
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

function checkCustomization(file, doc, types, chapterReq) {
  const haystack = textHaystack(doc);
  for (const topic of chapterReq.topics) {
    const label = topicLabel(topic);
    if (label && !haystack.includes(String(label).toLowerCase())) {
      fail(`${file}: customization required topic not addressed: ${label}`);
    }
  }
  for (const figure of chapterReq.figures) {
    if (figure?.type && !types.has(figure.type)) {
      fail(`${file}: customization required figure type missing: ${figure.type}`);
    }
    if (figure?.purpose && !haystack.includes(String(figure.purpose).toLowerCase())) {
      warn(`${file}: customization figure purpose not obvious in artifact: ${figure.purpose}`);
    }
  }
  for (const table of chapterReq.tables) {
    if (!tableHasColumns(doc, table?.requiredColumns)) {
      fail(`${file}: customization required table columns missing: ${(table?.requiredColumns ?? []).join(', ')}`);
    }
    if (table?.purpose && !haystack.includes(String(table.purpose).toLowerCase())) {
      warn(`${file}: customization table purpose not obvious in artifact: ${table.purpose}`);
    }
  }
  for (const metric of chapterReq.metrics) {
    if (metric?.required && metric?.name && !haystack.includes(String(metric.name).toLowerCase())) {
      fail(`${file}: customization required metric not addressed: ${metric.name}`);
    }
  }
  for (const question of chapterReq.questions) {
    const keywords = questionKeywords(question);
    if (keywords.length && !keywords.some((word) => haystack.includes(word))) {
      warn(`${file}: customization diligence question may be unaddressed: ${question}`);
    }
  }
}

function readCustomization() {
  const doc = loadYamlFile('000-run-customization.yaml', { required: false })
    ?? loadYamlFile('000-customization.yaml', { required: false });
  if (doc && doc.artifact && doc.artifact !== 'run-customization') {
    warn('run customization: artifact should be run-customization when present');
  }
  return doc;
}

const customization = readCustomization();
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

  const types = figureTypeSet(doc);
  if (!spec.requiredFigureTypes.some((type) => types.has(type))) {
    warn(`${spec.file}: no preferred figure type found (${spec.requiredFigureTypes.join(' or ')})`);
  }

  checkContract(spec.file, doc, contract, types);
  if (args.preLedger) checkPreLedgerEvidence(spec.file, doc, counts);
  if (zh) checkChineseSibling(zhFile, doc, zh);
  checkCustomization(spec.file, doc, types, chapterCustomizationFor(customization, spec.chapterKey));
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
