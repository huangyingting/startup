#!/usr/bin/env node
// Schema and renderer-contract checks for report YAML.
// Run before `astro build`. Chapter content readiness is checked by the startup-research skill scripts.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  asDateString,
  collectClaimRefs,
  FINAL_ARTIFACTS,
  getAnalysisArtifacts,
  getCoreArtifacts,
  loadWorkflowConfig,
  tryReadYaml,
} from './utils.mjs';
import {
  FIGURE_ALLOWED_POPULATED_FIELDS,
  FIGURE_ARRAY_FIELDS,
  FIGURE_CONTRACTS,
  FIGURE_DATA_FIELDS,
  FIGURE_LAYOUTS,
  FIGURE_TYPES,
} from '../src/lib/figures.mjs';
const REPORTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../reports');
const SCHEMA_VERSION = 'report-v2';
const WORKFLOW_CONFIG = loadWorkflowConfig();
const ANALYSIS_ARTIFACTS = getAnalysisArtifacts(WORKFLOW_CONFIG);
const CORE_ARTIFACTS = getCoreArtifacts(WORKFLOW_CONFIG);
const ANALYSIS_FILES = ANALYSIS_ARTIFACTS.map((item) => item.file);
const REQUIRED_ENGLISH_FILES = CORE_ARTIFACTS.map((item) => item.file);
const ARTIFACT_BY_FILE = new Map(CORE_ARTIFACTS.map((item) => [item.file, item]));
const EVIDENCE_FILE = FINAL_ARTIFACTS.evidence.file;
const FULL_REPORT_FILE = FINAL_ARTIFACTS.fullReport.file;
const SUMMARY_CARD_FILE = FINAL_ARTIFACTS.summaryCard.file;

const SET = {
  figureType: new Set(FIGURE_TYPES),
  figureLayout: new Set(FIGURE_LAYOUTS),
  figureDataField: new Set(FIGURE_DATA_FIELDS),
};

const FIGURE_CONTRACT_MAP = new Map(Object.entries(FIGURE_CONTRACTS));
const FIGURE_ALLOWED_POPULATED_MAP = new Map(
  Object.entries(FIGURE_ALLOWED_POPULATED_FIELDS).map(([type, fields]) => [type, new Set(fields)])
);
const COORDINATE_FIGURE_TYPES = new Set(['quadrant']);
const NUMERIC_VALUE_FIGURE_TYPES = new Set(['bar', 'waterfall', 'funnel']);
const MATRIX_FIGURE_TYPES = new Set(['matrix', 'cohort']);

const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasPopulatedField(data, key) {
  if (key === 'series') {
    return Array.isArray(data?.series)
      && data.series.some((series) => Array.isArray(series?.points) && series.points.length > 0);
  }
  return Array.isArray(data?.[key]) && data[key].length > 0;
}

function hasAnyPopulatedField(data, keys) {
  return keys.some((key) => hasPopulatedField(data, key));
}

function checkUniqueIds(run, label, rows, pattern) {
  const seen = new Set();
  for (const row of rows ?? []) {
    if (!row?.id || !pattern.test(row.id)) {
      fail(`${run}: invalid ${label} id ${row?.id}`);
      continue;
    }
    if (seen.has(row.id)) fail(`${run}: duplicate ${label} id ${row.id}`);
    else seen.add(row.id);
  }
}

// ---------------------------------------------------------------------------
// document-head check (schemaVersion, artifact, slug, runDate, company.name)
// ---------------------------------------------------------------------------

function checkDocumentHead(run, file, doc) {
  const expected = ARTIFACT_BY_FILE.get(file);
  if (doc.schemaVersion !== SCHEMA_VERSION) {
    fail(`${run}/${file}: expected schemaVersion ${SCHEMA_VERSION}, got ${doc.schemaVersion}`);
  }
  if (!doc.artifact) fail(`${run}/${file}: missing document head field artifact`);
  else if (expected && doc.artifact !== expected.artifact) {
    fail(`${run}/${file}: expected artifact ${expected.artifact}, got ${doc.artifact}`);
  }
  if (!doc.slug) fail(`${run}/${file}: missing document head field slug`);
  if (!doc.runDate) fail(`${run}/${file}: missing document head field runDate`);
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(asDateString(doc.runDate))) {
    fail(`${run}/${file}: runDate must be YYYY-MM-DD`);
  }
  if (!doc.company || typeof doc.company !== 'object' || !doc.company.name) {
    fail(`${run}/${file}: missing document head field company.name`);
  }
  if (expected?.chapter && doc.chapter?.number !== expected.chapter) {
    fail(`${run}/${file}: expected chapter.number ${expected.chapter}`);
  }
}

// ---------------------------------------------------------------------------
// ledger schema
// ---------------------------------------------------------------------------

function checkLedgerSources(run, sources) {
  const ACCESS_STATUSES = new Set(['ok', 'paywall', 'js-only', 'broken', 'rate-limited']);
  const STANCES = new Set(['confirming', 'adverse', 'neutral', 'unknown']);
  const SOURCE_TYPES = new Set(['official', 'filing', 'regulatory', 'news', 'analyst-market-data', 'technical-docs', 'customer-proof', 'partner-proof', 'developer-signal', 'review', 'legal', 'other']);
  const REPUTATION_TIERS = new Set(['high', 'medium', 'low']);
  const INDEPENDENCE = new Set(['company', 'partner', 'customer', 'competitor', 'independent', 'unknown']);
  for (const source of sources) {
    const path = `${run}/${EVIDENCE_FILE}: source ${source?.id ?? '?'}`;
    for (const field of ['publisher', 'title', 'accessDate', 'url', 'sourceType', 'reputationTier', 'independence', 'topics', 'accessStatus', 'stance']) {
      if (source?.[field] === undefined) fail(`${path} missing ${field}`);
    }
    if (source?.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(asDateString(source.date))) {
      fail(`${path} date must be YYYY-MM-DD or null`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asDateString(source?.accessDate))) {
      fail(`${path} accessDate must be YYYY-MM-DD`);
    }
    if (!Array.isArray(source?.topics) || source.topics.length === 0) {
      fail(`${path} topics must be a non-empty array`);
    }
    if (source?.accessStatus && !ACCESS_STATUSES.has(source.accessStatus)) {
      fail(`${path} accessStatus must be one of ${[...ACCESS_STATUSES].join('|')}`);
    }
    if (source?.stance && !STANCES.has(source.stance)) {
      fail(`${path} stance must be one of ${[...STANCES].join('|')}`);
    }
    if (source?.sourceType && !SOURCE_TYPES.has(source.sourceType)) {
      fail(`${path} sourceType must be one of ${[...SOURCE_TYPES].join('|')}`);
    }
    if (source?.reputationTier && !REPUTATION_TIERS.has(source.reputationTier)) {
      fail(`${path} reputationTier must be one of ${[...REPUTATION_TIERS].join('|')}`);
    }
    if (source?.independence && !INDEPENDENCE.has(source.independence)) {
      fail(`${path} independence must be one of ${[...INDEPENDENCE].join('|')}`);
    }
  }
}

function checkLedgerCoverage(run, coverage) {
  const path = `${run}/${EVIDENCE_FILE}: coverage`;
  if (coverage?.evidenceQuality === undefined) fail(`${path} missing evidenceQuality`);
}

function checkLedgerClaims(run, claims) {
  const CLAIM_TYPES = new Set(['observed', 'company-claimed', 'third-party-reported', 'estimated', 'inferred', 'open-question', 'conflicting']);
  const CONFIDENCES = new Set(['high', 'medium', 'low']);
  const FRESHNESS = new Set(['current', 'recent', 'historical', 'unknown']);
  for (const claim of claims) {
    const path = `${run}/${EVIDENCE_FILE}: claim ${claim?.id ?? '?'}`;
    for (const field of ['statement', 'type', 'topic', 'sourceRefs', 'confidence', 'freshness']) {
      if (claim?.[field] === undefined) fail(`${path} missing ${field}`);
    }
    if (!hasText(claim?.statement)) fail(`${path} statement must be non-empty`);
    if (!Array.isArray(claim?.sourceRefs)) fail(`${path} sourceRefs must be an array`);
    if (claim?.claimType !== undefined) {
      fail(`${path} uses obsolete field 'claimType'; rename to 'type'`);
    }
    if (claim?.corroboration !== undefined) {
      fail(`${path} must not store corroboration; it is derived from sourceRefs.length and contradictsClaimRefs`);
    }
    if (claim?.answersQuestionRefs !== undefined && !Array.isArray(claim.answersQuestionRefs)) {
      fail(`${path} answersQuestionRefs must be an array when present`);
    }
    if (claim?.contradictsClaimRefs !== undefined && !Array.isArray(claim.contradictsClaimRefs)) {
      fail(`${path} contradictsClaimRefs must be an array when present`);
    }
    if (claim?.type === 'conflicting' && !(claim.contradictsClaimRefs ?? []).length) {
      fail(`${path} type=conflicting requires non-empty contradictsClaimRefs`);
    }
    if (claim?.type && !CLAIM_TYPES.has(claim.type)) {
      fail(`${path} type must be one of ${[...CLAIM_TYPES].join('|')}`);
    }
    if (claim?.confidence && !CONFIDENCES.has(claim.confidence)) {
      fail(`${path} confidence must be one of ${[...CONFIDENCES].join('|')}`);
    }
    if (claim?.freshness && !FRESHNESS.has(claim.freshness)) {
      fail(`${path} freshness must be one of ${[...FRESHNESS].join('|')}`);
    }
    if (claim?.type !== 'open-question' && Array.isArray(claim?.sourceRefs) && claim.sourceRefs.length === 0) {
      fail(`${path} sourceRefs must be non-empty unless type is open-question`);
    }
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
  const CALLOUT_TYPES = new Set(['strength', 'risk', 'recommendation', 'insight', 'assumption']);
  for (const [index, callout] of (doc?.callouts ?? []).entries()) {
    const path = `${run}/${file}: callout ${index + 1}`;
    if (!hasText(callout?.title)) fail(`${path} requires title`);
    if (!hasText(callout?.body)) fail(`${path} requires body`);
    if (!Array.isArray(callout?.claimRefs)) fail(`${path} requires claimRefs array`);
    if (callout?.calloutType !== undefined && !CALLOUT_TYPES.has(callout.calloutType)) {
      fail(`${path} calloutType must be one of ${[...CALLOUT_TYPES].join('|')}`);
    }
  }
}

// ---------------------------------------------------------------------------
// figure schema
// ---------------------------------------------------------------------------

function checkFigureCommonStructure(path, figure) {
  if (!SET.figureType.has(figure.type)) {
    fail(`${path}: figure ${figure.id} has invalid type ${figure.type}`);
  }
  if (!SET.figureLayout.has(figure.layout)) {
    fail(`${path}: figure ${figure.id} has invalid layout ${figure.layout}`);
  }
  if (!figure.data || typeof figure.data !== 'object' || Array.isArray(figure.data)) {
    fail(`${path}: figure ${figure.id} missing structured data object`);
    return false;
  }
  for (const field of Object.keys(figure.data)) {
    if (!SET.figureDataField.has(field)) {
      fail(`${path}: figure ${figure.id} uses unsupported data.${field}; allowed fields are ${FIGURE_DATA_FIELDS.join(', ')}`);
    }
    if (FIGURE_ARRAY_FIELDS.includes(field) && Array.isArray(figure.data[field]) && figure.data[field].length === 0) {
      fail(`${path}: figure ${figure.id} must not include empty placeholder data.${field}; omit unused figure data arrays`);
    }
  }
  return true;
}

function checkFigureContract(path, figure) {
  const contract = FIGURE_CONTRACT_MAP.get(figure.type) ?? [];
  for (const alternatives of contract) {
    if (!hasAnyPopulatedField(figure.data, alternatives)) {
      fail(`${path}: figure ${figure.id} type ${figure.type} requires data.${alternatives.join(' or data.')}`);
    }
    const populated = alternatives.filter((key) => hasPopulatedField(figure.data, key));
    if (populated.length > 1) {
      fail(`${path}: figure ${figure.id} type ${figure.type} must use exactly one of data.${alternatives.join(' or data.')}, not ${populated.map((key) => `data.${key}`).join(' and ')}`);
    }
  }
  const allowed = FIGURE_ALLOWED_POPULATED_MAP.get(figure.type) ?? new Set();
  for (const field of FIGURE_ARRAY_FIELDS) {
    if (hasPopulatedField(figure.data, field) && !allowed.has(field)) {
      fail(`${path}: figure ${figure.id} type ${figure.type} must not populate data.${field}`);
    }
  }
}

function checkFigureItemLabels(path, figure) {
  const namedFields = [['items', 'item'], ['nodes', 'node'], ['points', 'point']];
  for (const [field, singular] of namedFields) {
    for (const [index, entry] of (figure.data[field] ?? []).entries()) {
      if (!hasText(entry?.label)) fail(`${path}: figure ${figure.id} ${singular} ${index + 1} requires label`);
    }
  }
  for (const [index, layer] of (figure.data.layers ?? []).entries()) {
    if (!hasText(layer?.label)) {
      fail(`${path}: figure ${figure.id} layer ${index + 1} requires label`);
    }
    if (figure.type === 'stack' && !hasText(layer?.detail) && !hasAnyPopulatedField(layer, ['modules', 'outputs'])) {
      fail(`${path}: figure ${figure.id} stack layer ${index + 1} has no detail, modules, or outputs`);
    }
  }
  for (const [index, row] of (figure.data.rows ?? []).entries()) {
    if (!hasText(row?.label)) fail(`${path}: figure ${figure.id} row ${index + 1} requires label`);
    if (Array.isArray(row?.values) && row.values.length === 0) {
      fail(`${path}: figure ${figure.id} row ${index + 1} has empty values`);
    }
  }
}

function checkMatrixFigure(path, figure) {
  if (!MATRIX_FIGURE_TYPES.has(figure.type)) return;
  const cols = Array.isArray(figure.data.columns) ? figure.data.columns : [];
  const rows = Array.isArray(figure.data.rows) ? figure.data.rows : [];
  if (cols.length < 1) {
    fail(`${path}: figure ${figure.id} type ${figure.type} requires at least 1 data.columns entry (X-axis label per value column)`);
  }
  for (const [index, row] of rows.entries()) {
    const values = Array.isArray(row?.values) ? row.values : [];
    if (values.length !== cols.length) {
      fail(`${path}: figure ${figure.id} row ${index + 1} (${row?.label ?? '?'}) has ${values.length} values but data.columns declares ${cols.length}; columns are X-axis labels and row.label is the Y-axis label, so values.length must equal columns.length`);
    }
    // matrix cells must resolve to a renderable text value. Cohort cells are
    // numeric and validated separately by checkCohortFigure.
    if (figure.type !== 'matrix') continue;
    for (const [colIndex, cell] of values.entries()) {
      // null and bare empty strings are valid 'no-data placeholder' cells in
      // heatmap-style matrices (e.g. an unfilled cell on a likelihood ×
      // impact grid). They render as a styled em-dash.
      if (cell == null) continue;
      if (typeof cell === 'string' || typeof cell === 'number') continue;
      if (typeof cell !== 'object') {
        fail(`${path}: figure ${figure.id} matrix row ${index + 1} (${row?.label ?? '?'}) cell ${colIndex + 1} must be a string, number, or object, got ${typeof cell}`);
        continue;
      }
      const text = cell.label ?? cell.text ?? cell.name ?? cell.displayValue ?? cell.value ?? cell.score;
      // Object cells with explicit empty text but a tone are valid heatmap
      // placeholders (e.g. an unfilled cell on a likelihood × impact grid).
      const hasEmptyTextWithTone = (cell.label === '' || cell.text === '') && cell.tone != null;
      if ((text == null || String(text).trim() === '') && !hasEmptyTextWithTone) {
        fail(`${path}: figure ${figure.id} matrix row ${index + 1} (${row?.label ?? '?'}) cell ${colIndex + 1} is missing a text field; provide one of label/text/value/score (label is canonical), or use null / '' for a no-data placeholder`);
      }
    }
  }
}

function checkNumericValueFigure(path, figure) {
  if (!NUMERIC_VALUE_FIGURE_TYPES.has(figure.type)) return;
  for (const [index, item] of (figure.data.items ?? []).entries()) {
    if (!isFiniteNumber(item?.value)) fail(`${path}: figure ${figure.id} item ${index + 1} requires numeric value`);
  }
  for (const [seriesIndex, series] of (figure.data.series ?? []).entries()) {
    for (const [pointIndex, point] of (series.points ?? []).entries()) {
      if (!hasText(point?.label)) {
        fail(`${path}: figure ${figure.id} series ${seriesIndex + 1} point ${pointIndex + 1} requires label`);
      }
      if (!isFiniteNumber(point?.value)) {
        fail(`${path}: figure ${figure.id} series ${seriesIndex + 1} point ${pointIndex + 1} requires numeric value`);
      }
    }
  }
}

function checkRangeFigure(path, figure) {
  if (figure.type !== 'range') return;
  for (const [index, item] of (figure.data.items ?? []).entries()) {
    const low = item?.low ?? item?.min;
    const high = item?.high ?? item?.max;
    if (!isFiniteNumber(low) || !isFiniteNumber(high)) {
      fail(`${path}: figure ${figure.id} range item ${index + 1} requires numeric low/min and high/max`);
    } else if (high < low) {
      fail(`${path}: figure ${figure.id} range item ${index + 1} has high/max below low/min`);
    }
    if (item?.mid != null && !isFiniteNumber(item.mid)) {
      fail(`${path}: figure ${figure.id} range item ${index + 1} mid must be numeric when present`);
    }
  }
}

function checkCohortFigure(path, figure) {
  if (figure.type !== 'cohort') return;
  for (const [rowIndex, row] of (figure.data.rows ?? []).entries()) {
    for (const [colIndex, cell] of (row?.values ?? []).entries()) {
      const raw = cell?.value ?? (typeof cell === 'object' ? cell?.label : cell);
      const value = Number(typeof raw === 'string' ? raw.replace(/[^0-9.-]/g, '') : raw);
      if (!Number.isFinite(value)) {
        fail(`${path}: figure ${figure.id} cohort row ${rowIndex + 1} cell ${colIndex + 1} requires a numeric retention percentage; cohort cells must be 0–100, not ordinal labels (use a matrix figure for ordinal scoring).`);
        continue;
      }
      if (value < 0 || value > 100) {
        fail(`${path}: figure ${figure.id} cohort row ${rowIndex + 1} cell ${colIndex + 1} value ${value} is outside 0–100; cohort cells must be retention percentages. Use a matrix figure for non-percentage scoring.`);
      }
    }
  }
}

function checkCoordinateFigure(path, figure) {
  if (!COORDINATE_FIGURE_TYPES.has(figure.type)) return;
  for (const [index, point] of (figure.data.points ?? []).entries()) {
    if (!isFiniteNumber(point?.x) || !isFiniteNumber(point?.y)) {
      fail(`${path}: figure ${figure.id} point ${index + 1} requires numeric x and y`);
    }
  }
}

function checkFigure(path, figure) {
  if (!checkFigureCommonStructure(path, figure)) return;
  checkFigureContract(path, figure);
  checkFigureItemLabels(path, figure);
  checkMatrixFigure(path, figure);
  checkCohortFigure(path, figure);
  checkNumericValueFigure(path, figure);
  checkRangeFigure(path, figure);
  checkCoordinateFigure(path, figure);
}

// ---------------------------------------------------------------------------
// table schema
// ---------------------------------------------------------------------------

function checkTables(run, file, doc) {
  const ENUM_COVERAGE = new Set(['exhaustive', 'partial', 'sample']);
  for (const table of doc?.tables ?? []) {
    if (!Array.isArray(table?.columns) || table.columns.length === 0) {
      fail(`${run}/${file}: table ${table?.id ?? '?'} requires non-empty data.columns`);
      continue;
    }
    const expectedCols = table.columns.length;
    for (const [index, row] of (table.rows ?? []).entries()) {
      if (!Array.isArray(row)) {
        fail(`${run}/${file}: table ${table.id} row ${index + 1} must be an array`);
        continue;
      }
      if (row.length !== expectedCols) {
        fail(`${run}/${file}: table ${table.id} row ${index + 1} has ${row.length} cells but columns declares ${expectedCols}`);
      }
    }
    if (table.enumerationScope !== undefined) {
      const scope = table.enumerationScope;
      if (!scope || typeof scope !== 'object') {
        fail(`${run}/${file}: table ${table.id} enumerationScope must be an object`);
      } else {
        if (!ENUM_COVERAGE.has(scope.coverage)) fail(`${run}/${file}: table ${table.id} enumerationScope.coverage must be one of ${[...ENUM_COVERAGE].join('|')}`);
        if (typeof scope.basis !== 'string' || scope.basis.trim().length < 20) fail(`${run}/${file}: table ${table.id} enumerationScope.basis must be a non-empty string (>=20 chars)`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// table/figure ref usage
// ---------------------------------------------------------------------------

function collectRefs(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.figureRef) out.push(['figure', value.figureRef]);
  if (value.tableRef) out.push(['table', value.tableRef]);
  for (const child of Object.values(value)) collectRefs(child, out);
}

function checkRefs(run, reportDoc) {
  const figureIds = new Set((reportDoc?.figures ?? []).map((figure) => figure.id));
  const tableIds = new Set((reportDoc?.tables ?? []).map((table) => table.id));
  const refs = [];
  collectRefs(reportDoc?.chapters ?? [], refs);
  collectRefs(reportDoc?.appendices ?? [], refs);

  for (const [type, ref] of refs) {
    if (type === 'figure' && !figureIds.has(ref)) {
      fail(`${run}/${FULL_REPORT_FILE}: missing figure ${ref}`);
    }
    if (type === 'table' && !tableIds.has(ref)) {
      fail(`${run}/${FULL_REPORT_FILE}: missing table ${ref}`);
    }
  }

  const counts = new Map();
  for (const [type, ref] of refs) {
    const key = `${type}:${ref}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) {
    if (count > 1) {
      fail(`${run}/${FULL_REPORT_FILE}: ${key.replace(':', ' ')} is referenced ${count} times; each table/figure must have exactly one home in the report`);
    }
  }
}

// ---------------------------------------------------------------------------
// per-run pipeline
// ---------------------------------------------------------------------------

function listRuns() {
  return readdirSync(REPORTS_DIR).filter((name) => {
    if (name.startsWith('.') || name.startsWith('_')) return false;
    try {
      return statSync(join(REPORTS_DIR, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

function parseRunArtifacts(run, dir) {
  const parsed = new Map();
  for (const file of REQUIRED_ENGLISH_FILES.filter((name) => name.endsWith('.yaml'))) {
    const result = tryReadYaml(join(dir, file));
    if (!result.ok) {
      fail(`${run}/${file}: YAML parse failed: ${result.error}`);
      continue;
    }
    parsed.set(file, result.value);
    checkDocumentHead(run, file, result.value);
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
  checkUniqueIds(run, 'source', ledger.sources, /^S\d{3}$/);
  checkUniqueIds(run, 'claim', ledger.claims, /^C\d{3}$/);
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
    checkUniqueIds(run, 'figure', reportDoc.figures, /^F\d{3}$/);
    checkUniqueIds(run, 'table', reportDoc.tables, /^T\d{3}$/);
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

try {
  if (!existsSync(REPORTS_DIR)) {
    console.warn(`[check:reports] ${REPORTS_DIR} not found; nothing to check.`);
    process.exit(0);
  }
  let checked = 0;
  for (const run of listRuns()) if (checkRun(run)) checked += 1;

  if (failures.length) {
    console.error('[check:reports] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports] ✓ ${checked} v2 report(s) verified.`);
} catch (err) {
  console.error(`[check:reports] fatal error: ${err.message}`);
  process.exit(1);
}
