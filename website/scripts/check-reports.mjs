#!/usr/bin/env node
// Schema and renderer-contract checks for report YAML.
// Run before `astro build`. Chapter content readiness is checked by scripts/audit-chapter-readiness.mjs.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  asDateString,
  collectClaimRefs,
  tryReadYaml,
} from '../../scripts/text-utils.mjs';
import {
  CLAIM_TYPES,
  CORROBORATION,
  EVIDENCE_QUALITY,
  EVIDENCE_TOPICS,
  FRESHNESS,
  INDEPENDENCE,
  REPUTATION_TIERS,
  SOURCE_TYPES,
} from '../../scripts/evidence-registry.mjs';
import {
  FIGURE_ALLOWED_POPULATED_FIELDS,
  FIGURE_ARRAY_FIELDS,
  FIGURE_CONTRACTS,
  FIGURE_DATA_FIELDS,
  FIGURE_LAYOUTS,
  FIGURE_TYPES,
} from '../../scripts/figure-registry.mjs';
import {
  ANALYSIS_CALLOUT_TYPES,
  BLOCK_TYPES,
  CALLOUT_TYPES,
  CONFIDENCE,
  RECOMMENDATIONS,
  RISK_RATINGS,
  VALUATION_STANCES,
} from '../../scripts/report-registry.mjs';

const REPORTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../reports');
const SCHEMA_VERSION = 'report-v2';
const ANALYSIS_ARTIFACTS = [
  { file: '01-company-overview.yaml', artifact: 'company-overview', chapter: 1 },
  { file: '02-market-analysis.yaml', artifact: 'market-analysis', chapter: 2 },
  { file: '03-competitors.yaml', artifact: 'competitors', chapter: 3 },
  { file: '04-financials.yaml', artifact: 'financials', chapter: 4 },
  { file: '05-product-tech.yaml', artifact: 'product-tech', chapter: 5 },
  { file: '06-customers.yaml', artifact: 'customers', chapter: 6 },
  { file: '07-risks.yaml', artifact: 'risks', chapter: 7 },
  { file: '08-valuation.yaml', artifact: 'valuation', chapter: 8 },
];
const CORE_ARTIFACTS = [
  ...ANALYSIS_ARTIFACTS,
  { file: '90-evidence.yaml', artifact: 'evidence' },
  { file: '91-full-report.yaml', artifact: 'full-report' },
  { file: '92-summary-card.yaml', artifact: 'summary-card' },
];
const ANALYSIS_FILES = ANALYSIS_ARTIFACTS.map((item) => item.file);
const REQUIRED_ENGLISH_FILES = CORE_ARTIFACTS.map((item) => item.file);
const ARTIFACT_BY_FILE = new Map(CORE_ARTIFACTS.map((item) => [item.file, item]));

const SET = {
  recommendations: new Set(RECOMMENDATIONS),
  confidence: new Set(CONFIDENCE),
  riskRatings: new Set(RISK_RATINGS),
  valuationStances: new Set(VALUATION_STANCES),
  claimType: new Set(CLAIM_TYPES),
  evidenceQuality: new Set(EVIDENCE_QUALITY),
  topic: new Set(EVIDENCE_TOPICS),
  freshness: new Set(FRESHNESS),
  corroboration: new Set(CORROBORATION),
  sourceType: new Set(SOURCE_TYPES),
  reputationTier: new Set(REPUTATION_TIERS),
  independence: new Set(INDEPENDENCE),
  blockType: new Set(BLOCK_TYPES),
  calloutType: new Set(CALLOUT_TYPES),
  analysisCalloutType: new Set(ANALYSIS_CALLOUT_TYPES),
  figureType: new Set(FIGURE_TYPES),
  figureLayout: new Set(FIGURE_LAYOUTS),
  figureDataField: new Set(FIGURE_DATA_FIELDS),
};

const FIGURE_CONTRACT_MAP = new Map(Object.entries(FIGURE_CONTRACTS));
const FIGURE_ALLOWED_POPULATED_MAP = new Map(
  Object.entries(FIGURE_ALLOWED_POPULATED_FIELDS).map(([type, fields]) => [type, new Set(fields)])
);
const COORDINATE_FIGURE_TYPES = new Set(['quadrant', 'positioning-map', 'scatter']);
const NUMERIC_VALUE_FIGURE_TYPES = new Set(['bars', 'waterfall', 'funnel']);
const MATRIX_FIGURE_TYPES = new Set(['matrix', 'heatmap', 'cohort']);

const failures = [];
const fail = (message) => failures.push(message);
const failEnum = (path, label, value, allowed) => {
  if (!allowed.has(value)) fail(`${path}: invalid ${label} ${value}`);
};

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
  for (const source of sources) {
    const path = `${run}/90-evidence.yaml: source ${source?.id ?? '?'}`;
    for (const field of ['publisher', 'title', 'accessDate', 'url', 'sourceType', 'reputationTier', 'independence', 'topics']) {
      if (source?.[field] === undefined) fail(`${path} missing ${field}`);
    }
    if (source?.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(asDateString(source.date))) {
      fail(`${path} date must be YYYY-MM-DD or null`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asDateString(source?.accessDate))) {
      fail(`${path} accessDate must be YYYY-MM-DD`);
    }
    failEnum(path, 'sourceType', source?.sourceType, SET.sourceType);
    failEnum(path, 'reputationTier', source?.reputationTier, SET.reputationTier);
    failEnum(path, 'independence', source?.independence, SET.independence);
    if (!Array.isArray(source?.topics) || source.topics.length === 0) {
      fail(`${path} topics must be a non-empty array`);
    }
    for (const topic of source?.topics ?? []) failEnum(path, 'topic', topic, SET.topic);
  }
}

function checkLedgerCoverage(run, coverage) {
  const path = `${run}/90-evidence.yaml: coverage`;
  for (const field of ['sourcesConsidered', 'sourcesRetained', 'claimsCreated', 'evidenceQuality']) {
    if (coverage?.[field] === undefined) fail(`${path} missing ${field}`);
  }
  failEnum(path, 'evidenceQuality', coverage?.evidenceQuality, SET.evidenceQuality);
}

function checkLedgerClaims(run, claims) {
  for (const claim of claims) {
    const path = `${run}/90-evidence.yaml: claim ${claim?.id ?? '?'}`;
    for (const field of ['statement', 'claimType', 'topic', 'sourceRefs', 'confidence', 'freshness', 'corroboration']) {
      if (claim?.[field] === undefined) fail(`${path} missing ${field}`);
    }
    if (!hasText(claim?.statement)) fail(`${path} statement must be non-empty`);
    failEnum(path, 'claimType', claim?.claimType, SET.claimType);
    failEnum(path, 'topic', claim?.topic, SET.topic);
    failEnum(path, 'confidence', claim?.confidence, SET.confidence);
    failEnum(path, 'freshness', claim?.freshness, SET.freshness);
    failEnum(path, 'corroboration', claim?.corroboration, SET.corroboration);
    if (!Array.isArray(claim?.sourceRefs)) fail(`${path} sourceRefs must be an array`);
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
    const path = `${run}/91-full-report.yaml:${location}`;
    if (!SET.blockType.has(block.type)) {
      fail(`${path} invalid block.type ${block.type}`);
      continue;
    }
    if (block.type === 'paragraph' && !hasText(block.body)) fail(`${path} paragraph block requires body`);
    if (block.type === 'list' && (!Array.isArray(block.items) || block.items.length === 0)) {
      fail(`${path} list block requires non-empty items`);
    }
    if (block.type === 'equation' && !hasText(block.equation)) fail(`${path} equation block requires equation`);
    if (block.type === 'callout') {
      if (!hasText(block.body)) fail(`${path} callout block requires body`);
      if (block.calloutType != null && !SET.calloutType.has(block.calloutType)) {
        fail(`${path} invalid calloutType ${block.calloutType}`);
      }
    }
    if (block.type === 'table' && !hasText(block.tableRef)) fail(`${path} table block requires tableRef`);
    if (block.type === 'figure' && !hasText(block.figureRef)) fail(`${path} figure block requires figureRef`);
  }
}

function checkAnalysisCallouts(run, file, doc) {
  if (!ANALYSIS_FILES.includes(file)) return;
  for (const [index, callout] of (doc?.callouts ?? []).entries()) {
    const path = `${run}/${file}: callout ${index + 1}`;
    if (!SET.analysisCalloutType.has(callout?.type)) {
      fail(`${path} invalid type ${callout?.type}`);
    }
    if (!hasText(callout?.title)) fail(`${path} requires title`);
    if (!hasText(callout?.body)) fail(`${path} requires body`);
    if (!Array.isArray(callout?.claimRefs)) fail(`${path} requires claimRefs array`);
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

function checkCoordinateFigure(path, figure) {
  if (!COORDINATE_FIGURE_TYPES.has(figure.type)) return;
  for (const [index, point] of (figure.data.points ?? []).entries()) {
    if (!isFiniteNumber(point?.x) || !isFiniteNumber(point?.y)) {
      fail(`${path}: figure ${figure.id} point ${index + 1} requires numeric x and y`);
    }
  }
  if (figure.type !== 'scatter') return;
  for (const [seriesIndex, series] of (figure.data.series ?? []).entries()) {
    for (const [pointIndex, point] of (series.points ?? []).entries()) {
      if (!hasText(point?.label)) {
        fail(`${path}: figure ${figure.id} series ${seriesIndex + 1} point ${pointIndex + 1} requires label`);
      }
      if (!isFiniteNumber(point?.x) || !isFiniteNumber(point?.y)) {
        fail(`${path}: figure ${figure.id} series ${seriesIndex + 1} point ${pointIndex + 1} requires numeric x and y`);
      }
    }
  }
}

function checkSensitivityFigure(path, figure) {
  if (figure.type !== 'sensitivity') return;
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

const COMPANY_TIMELINE_PATH_RE = /\/(01-company-overview|91-full-report)\.yaml$/;

function checkCompanyMilestoneTimeline(path, figure) {
  if (figure.type !== 'timeline') return;
  if (!COMPANY_TIMELINE_PATH_RE.test(path) || figure.id !== 'F102') return;
  const items = Array.isArray(figure.data.items) ? figure.data.items : [];
  if (items.length < 8) {
    fail(`${path}: figure ${figure.id} (company milestone timeline) has ${items.length} items but must include at least 8 (founding, every priced funding round, major product launches, scale milestones, partnerships, governance/legal events). Run a milestone-discovery search batch and document any unfilled gaps in evidenceGaps.`);
  }
}

function checkFigure(path, figure) {
  if (!checkFigureCommonStructure(path, figure)) return;
  checkFigureContract(path, figure);
  checkFigureItemLabels(path, figure);
  checkMatrixFigure(path, figure);
  checkNumericValueFigure(path, figure);
  checkRangeFigure(path, figure);
  checkCoordinateFigure(path, figure);
  checkSensitivityFigure(path, figure);
  checkCompanyMilestoneTimeline(path, figure);
}

// ---------------------------------------------------------------------------
// table schema
// ---------------------------------------------------------------------------

function checkTables(run, file, doc) {
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
      fail(`${run}/91-full-report.yaml: missing figure ${ref}`);
    }
    if (type === 'table' && !tableIds.has(ref)) {
      fail(`${run}/91-full-report.yaml: missing table ${ref}`);
    }
  }

  const counts = new Map();
  for (const [type, ref] of refs) {
    const key = `${type}:${ref}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) {
    if (count > 1) {
      fail(`${run}/91-full-report.yaml: ${key.replace(':', ' ')} is referenced ${count} times; each table/figure must have exactly one home in the report`);
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
    if (file === '90-evidence.yaml') continue;
    for (const ref of collectClaimRefs(doc)) {
      if (!claimIds.has(ref)) fail(`${run}/${file}: missing claimRef ${ref}`);
    }
  }
}

function checkCardConsistency(run, card, reportDoc, ledger) {
  const cardPath = `${run}/92-summary-card.yaml`;
  failEnum(cardPath, 'recommendation', card?.recommendation, SET.recommendations);
  failEnum(cardPath, 'confidence', card?.confidence, SET.confidence);
  failEnum(cardPath, 'riskRating', card?.riskRating, SET.riskRatings);
  failEnum(cardPath, 'valuationStance', card?.valuationStance, SET.valuationStances);

  if (typeof card?.figureCount !== 'number') fail(`${cardPath}: figureCount is required and must be a number`);
  else if (card.figureCount !== (reportDoc?.figures ?? []).length) fail(`${cardPath}: figureCount does not match report document`);
  if (typeof card?.tableCount !== 'number') fail(`${cardPath}: tableCount is required and must be a number`);
  else if (card.tableCount !== (reportDoc?.tables ?? []).length) fail(`${cardPath}: tableCount does not match report document`);
  if (typeof card?.overallScore !== 'number' || card.overallScore < 0 || card.overallScore > 10) {
    fail(`${cardPath}: overallScore must be a number between 0 and 10`);
  }
  if (card?.reportFiles?.fullReport !== '91-full-report.yaml') {
    fail(`${cardPath}: reportFiles.fullReport must be 91-full-report.yaml`);
  }
  if (card?.reportFiles?.summaryCard !== '92-summary-card.yaml') {
    fail(`${cardPath}: reportFiles.summaryCard must be 92-summary-card.yaml`);
  }
  if (card?.sourceStats?.claimsReviewed !== undefined && ledger?.claims && card.sourceStats.claimsReviewed > ledger.claims.length) {
    fail(`${cardPath}: claimsReviewed exceeds ledger claims`);
  }
}

function checkReportConsistency(run, reportDoc) {
  const reportPath = `${run}/91-full-report.yaml`;
  failEnum(reportPath, 'recommendation', reportDoc?.reportMeta?.recommendation, SET.recommendations);
  failEnum(reportPath, 'confidence', reportDoc?.reportMeta?.confidence, SET.confidence);
  failEnum(reportPath, 'riskRating', reportDoc?.reportMeta?.riskRating, SET.riskRatings);
  failEnum(reportPath, 'valuationStance', reportDoc?.reportMeta?.valuationStance, SET.valuationStances);
  if (!reportDoc?.startupIntroduction || typeof reportDoc.startupIntroduction !== 'object') {
    fail(`${reportPath}: missing startupIntroduction object`);
  } else if (typeof reportDoc.startupIntroduction.summary !== 'string' || !reportDoc.startupIntroduction.summary.trim()) {
    fail(`${reportPath}: startupIntroduction.summary is required`);
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
  if (!existsSync(join(dir, '92-summary-card.yaml'))) return false;

  const beforeMissing = failures.length;
  for (const file of REQUIRED_ENGLISH_FILES) {
    if (!existsSync(join(dir, file))) fail(`${run}/${file}: missing required v2 artifact`);
  }
  if (failures.length > beforeMissing) return true;

  const parsed = parseRunArtifacts(run, dir);
  const ledger = parsed.get('90-evidence.yaml');
  const reportDoc = parsed.get('91-full-report.yaml');
  const card = parsed.get('92-summary-card.yaml');

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
