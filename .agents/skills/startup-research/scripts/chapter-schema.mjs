// Schema and renderer-contract checks that operate on a SINGLE chapter's
// data (sources, claims, callouts, tables, figures). Shared by:
//   - check-chapter.mjs (chapter-time, reads localEvidence and chapter blocks)
//   - check-report.mjs  (post-finalize, reads evidence.yaml + each chapter)
// Keeping the rules in one module ensures the two checkers can never drift
// and means an evidence-shape problem the agent ships in chapter authoring
// is caught at chapter-time with the same message as the post-finalize gate.
//
// Each helper returns { errors: [{ message, ...extra }] }. Callers wrap the
// errors with their own dimension/fix mapping (check-chapter uses dimensions
// + retry hints; check-report appends to a flat failure list).

import {
  FIGURE_ALLOWED_POPULATED_FIELDS,
  FIGURE_ARRAY_FIELDS,
  FIGURE_CONTRACTS,
  FIGURE_DATA_FIELDS,
  FIGURE_LAYOUTS,
  FIGURE_TYPES,
} from '../../../../website/src/lib/figures.mjs';
import { asDateString, hasText } from './utils.mjs';
import {
  BLOCK_TYPES as DIMENSION_BLOCK_TYPES,
  CALLOUT_TYPES as DIMENSION_CALLOUT_TYPES,
  CLAIM_CONFIDENCES,
  CLAIM_FRESHNESS,
  CLAIM_TYPES,
  ENUMERATION_COVERAGE as DIMENSION_ENUMERATION_COVERAGE,
  SOURCE_ACCESS_STATUSES,
  SOURCE_INDEPENDENCE,
  SOURCE_REPUTATION_TIERS,
  SOURCE_STANCES,
  SOURCE_TYPES,
  TONE_VALUES,
  formatEnumChoices,
} from './check-dimensions.mjs';

// Single source of truth for the report schema version. Imported by both
// check-chapter (per-file head check) and check-report (cross-file head
// + cross-artifact identity checks).
export const SCHEMA_VERSION = 'report-v2';

const FIGURE_TYPE_SET = new Set(FIGURE_TYPES);
const FIGURE_LAYOUT_SET = new Set(FIGURE_LAYOUTS);
const FIGURE_DATA_FIELD_SET = new Set(FIGURE_DATA_FIELDS);
const FIGURE_CONTRACT_MAP = new Map(Object.entries(FIGURE_CONTRACTS));
const FIGURE_ALLOWED_POPULATED_MAP = new Map(
  Object.entries(FIGURE_ALLOWED_POPULATED_FIELDS).map(([type, fields]) => [type, new Set(fields)])
);
const COORDINATE_FIGURE_TYPES = new Set(['quadrant']);
const NUMERIC_VALUE_FIGURE_TYPES = new Set(['bar', 'waterfall', 'funnel']);
const MATRIX_FIGURE_TYPES = new Set(['matrix', 'cohort']);

// ---- enum sets ----------------------------------------------------------
// Field-level enum vocab is imported from check-dimensions.mjs (the single
// source of truth shared with check-chapter and load-chapter packet exports).
// CALLOUT_TYPES and ENUMERATION_COVERAGE are re-exported here so older
// consumers that import them from chapter-schema keep working.

export const CALLOUT_TYPES = DIMENSION_CALLOUT_TYPES;
export const ENUMERATION_COVERAGE = DIMENSION_ENUMERATION_COVERAGE;
export const BLOCK_TYPES = DIMENSION_BLOCK_TYPES;

// ---- helpers --------------------------------------------------------------

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

function checkToneValues(value, path, c, figureId) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkToneValues(item, `${path}.${index}`, c, figureId));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Object.prototype.hasOwnProperty.call(value, 'tone') && value.tone != null && !TONE_VALUES.has(value.tone)) {
    c.fail(`${path}.tone must be one of ${formatEnumChoices(TONE_VALUES)}`, { figureId, actual: value.tone });
  }
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') checkToneValues(child, `${path}.${key}`, c, figureId);
  }
}

// Internal builder so each public helper can collect errors with a stable
// shape ({ message, ...extra }) and an optional id field for caller routing.
function makeCollector() {
  const errors = [];
  return {
    errors,
    fail(message, extra = {}) { errors.push({ message, ...extra }); },
  };
}

// ---- source schema --------------------------------------------------------

// Validates one source object's shape. `path` is a human-readable prefix
// included in every message (e.g. "01-company-overview.yaml: source S001").
// `id` is also surfaced as `extra.id` for callers that want to group failures.
export function checkSourceSchema(source, { path }) {
  const c = makeCollector();
  const id = source?.id;

  // Required fields. Each missing field becomes its own error so the agent
  // sees the full list, not just the first.
  const REQUIRED = ['publisher', 'title', 'accessDate', 'url', 'sourceType', 'reputationTier', 'independence', 'topics', 'accessStatus', 'stance'];
  for (const field of REQUIRED) {
    if (source?.[field] === undefined) c.fail(`${path} missing ${field}`, { id, field });
  }

  if (source?.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(asDateString(source.date))) {
    c.fail(`${path} date must be YYYY-MM-DD or null`, { id });
  }
  if (source?.accessDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(asDateString(source?.accessDate))) {
    c.fail(`${path} accessDate must be YYYY-MM-DD`, { id });
  }
  if (source?.topics !== undefined && (!Array.isArray(source.topics) || source.topics.length === 0)) {
    c.fail(`${path} topics must be a non-empty array`, { id });
  }
  if (source?.accessStatus && !SOURCE_ACCESS_STATUSES.has(source.accessStatus)) {
    c.fail(`${path} accessStatus must be one of ${formatEnumChoices(SOURCE_ACCESS_STATUSES)}`, { id, actual: source.accessStatus });
  }
  if (source?.stance && !SOURCE_STANCES.has(source.stance)) {
    c.fail(`${path} stance must be one of ${formatEnumChoices(SOURCE_STANCES)}`, { id, actual: source.stance });
  }
  if (source?.sourceType && !SOURCE_TYPES.has(source.sourceType)) {
    c.fail(`${path} sourceType must be one of ${formatEnumChoices(SOURCE_TYPES)}`, { id, actual: source.sourceType });
  }
  if (source?.reputationTier && !SOURCE_REPUTATION_TIERS.has(source.reputationTier)) {
    c.fail(`${path} reputationTier must be one of ${formatEnumChoices(SOURCE_REPUTATION_TIERS)}`, { id, actual: source.reputationTier });
  }
  if (source?.independence && !SOURCE_INDEPENDENCE.has(source.independence)) {
    c.fail(`${path} independence must be one of ${formatEnumChoices(SOURCE_INDEPENDENCE)}`, { id, actual: source.independence });
  }
  return { errors: c.errors };
}

// ---- claim schema ---------------------------------------------------------

export function checkClaimSchema(claim, { path }) {
  const c = makeCollector();
  const id = claim?.id;

  const REQUIRED = ['statement', 'type', 'topic', 'sourceRefs', 'confidence', 'freshness'];
  for (const field of REQUIRED) {
    if (claim?.[field] === undefined) c.fail(`${path} missing ${field}`, { id, field });
  }
  if (claim?.statement !== undefined && !hasText(claim.statement)) {
    c.fail(`${path} statement must be non-empty`, { id });
  }
  if (claim?.sourceRefs !== undefined && !Array.isArray(claim.sourceRefs)) {
    c.fail(`${path} sourceRefs must be an array`, { id });
  }
  if (claim?.claimType !== undefined) {
    c.fail(`${path} uses obsolete field 'claimType'; rename to 'type'`, { id });
  }
  if (claim?.corroboration !== undefined) {
    c.fail(`${path} must not store corroboration; it is derived from sourceRefs.length and contradictsClaimRefs`, { id });
  }
  if (claim?.answersQuestionRefs !== undefined && !Array.isArray(claim.answersQuestionRefs)) {
    c.fail(`${path} answersQuestionRefs must be an array when present`, { id });
  }
  if (claim?.contradictsClaimRefs !== undefined && !Array.isArray(claim.contradictsClaimRefs)) {
    c.fail(`${path} contradictsClaimRefs must be an array when present`, { id });
  }
  if (claim?.type === 'conflicting' && !(claim.contradictsClaimRefs ?? []).length) {
    c.fail(`${path} type=conflicting requires non-empty contradictsClaimRefs`, { id });
  }
  if (claim?.type && !CLAIM_TYPES.has(claim.type)) {
    c.fail(`${path} type must be one of ${formatEnumChoices(CLAIM_TYPES)}`, { id, actual: claim.type });
  }
  if (claim?.confidence && !CLAIM_CONFIDENCES.has(claim.confidence)) {
    c.fail(`${path} confidence must be one of ${formatEnumChoices(CLAIM_CONFIDENCES)}`, { id, actual: claim.confidence });
  }
  if (claim?.freshness && !CLAIM_FRESHNESS.has(claim.freshness)) {
    c.fail(`${path} freshness must be one of ${formatEnumChoices(CLAIM_FRESHNESS)}`, { id, actual: claim.freshness });
  }
  if (claim?.type !== 'open-question' && Array.isArray(claim?.sourceRefs) && claim.sourceRefs.length === 0) {
    c.fail(`${path} sourceRefs must be non-empty unless type is open-question`, { id });
  }
  return { errors: c.errors };
}

// ---- callout schema -------------------------------------------------------

export function checkCalloutSchema(callout, { path }) {
  const c = makeCollector();
  if (!hasText(callout?.title)) c.fail(`${path} requires title`);
  if (!hasText(callout?.body)) c.fail(`${path} requires body`);
  if (!Array.isArray(callout?.claimRefs)) c.fail(`${path} requires claimRefs array`);
  if (callout?.calloutType !== undefined && !CALLOUT_TYPES.has(callout.calloutType)) {
    c.fail(`${path} calloutType must be one of ${formatEnumChoices(CALLOUT_TYPES)}`, { actual: callout.calloutType });
  }
  return { errors: c.errors };
}

// ---- table schema ---------------------------------------------------------

// Validates table column/row alignment and (optional) enumerationScope shape.
// Note: enumeration *coverage* rules (per-row corroboration, gap requirement
// for partial/sample) live in check-chapter; those need source/claim context
// the helper does not have.
export function checkTableSchema(table, { path }) {
  const c = makeCollector();
  const id = table?.id;
  if (!Array.isArray(table?.columns) || table.columns.length === 0) {
    c.fail(`${path} requires non-empty data.columns`, { tableId: id });
    return { errors: c.errors };
  }
  const expectedCols = table.columns.length;
  for (const [index, row] of (table.rows ?? []).entries()) {
    if (!Array.isArray(row)) {
      c.fail(`${path} row ${index + 1} must be an array`, { tableId: id, rowIndex: index });
      continue;
    }
    if (row.length !== expectedCols) {
      c.fail(`${path} row ${index + 1} has ${row.length} cells but columns declares ${expectedCols}`, { tableId: id, rowIndex: index, actual: row.length, expected: expectedCols });
    }
  }
  if (table.enumerationScope !== undefined) {
    const scope = table.enumerationScope;
    if (!scope || typeof scope !== 'object') {
      c.fail(`${path} enumerationScope must be an object`, { tableId: id });
    } else {
      if (!ENUMERATION_COVERAGE.has(scope.coverage)) {
        c.fail(`${path} enumerationScope.coverage must be one of ${formatEnumChoices(ENUMERATION_COVERAGE)}`, { tableId: id, actual: scope.coverage });
      }
      if (typeof scope.basis !== 'string' || scope.basis.trim().length < 20) {
        c.fail(`${path} enumerationScope.basis must be a non-empty string (>=20 chars)`, { tableId: id });
      }
    }
  }
  return { errors: c.errors };
}

// ---- figure deep schema ---------------------------------------------------

// Validates the renderer-contract details that go beyond the lightweight
// `validateFigureShape` (in figures.mjs). This covers:
//   - common structure (id/title/type in enum, layout in enum, data is object)
//   - per-type contract (FIGURE_CONTRACTS required fields; mutually exclusive
//     populated fields; disallowed populated fields per type)
//   - item label requirements (items/nodes/points/layers/rows)
//   - matrix/cohort cell shape (column/value alignment, cell text resolution)
//   - numeric-value figures (bar/waterfall/funnel value must be finite number)
//   - range figures (numeric low/high; high >= low)
//   - cohort figures (cells 0–100 retention percentages)
//   - quadrant figures (numeric x/y)
//
// `validateFigureShape` from figures.mjs is intentionally NOT invoked here
// to avoid double-reporting; check-chapter calls both (light + deep).
export function checkFigureDeep(figure, { path }) {
  const c = makeCollector();
  const id = figure?.id;
  const figurePath = `${path}: figure ${id ?? '?'}`;

  // Common structure
  if (!FIGURE_TYPE_SET.has(figure?.type)) {
    c.fail(`${figurePath} has invalid type ${figure?.type}`, { figureId: id, actual: figure?.type });
  }
  if (figure?.layout !== undefined && !FIGURE_LAYOUT_SET.has(figure.layout)) {
    c.fail(`${figurePath} has invalid layout ${figure.layout}`, { figureId: id, actual: figure.layout });
  }
  if (!figure?.data || typeof figure.data !== 'object' || Array.isArray(figure.data)) {
    c.fail(`${figurePath} missing structured data object`, { figureId: id });
    return { errors: c.errors };
  }
  for (const field of Object.keys(figure.data)) {
    if (!FIGURE_DATA_FIELD_SET.has(field)) {
      c.fail(`${figurePath} uses unsupported data.${field}; allowed fields are ${FIGURE_DATA_FIELDS.join(', ')}`, { figureId: id });
    }
    if (FIGURE_ARRAY_FIELDS.includes(field) && Array.isArray(figure.data[field]) && figure.data[field].length === 0) {
      c.fail(`${figurePath} must not include empty placeholder data.${field}; omit unused figure data arrays`, { figureId: id });
    }
  }
  checkToneValues(figure.data, `${figurePath} data`, c, id);

  // Per-type contract (required + exclusive + allowed populated fields)
  const contract = FIGURE_CONTRACT_MAP.get(figure.type) ?? [];
  for (const alternatives of contract) {
    if (!hasAnyPopulatedField(figure.data, alternatives)) {
      c.fail(`${figurePath} type ${figure.type} requires data.${alternatives.join(' or data.')}`, { figureId: id });
    }
    const populated = alternatives.filter((key) => hasPopulatedField(figure.data, key));
    if (populated.length > 1) {
      c.fail(`${figurePath} type ${figure.type} must use exactly one of data.${alternatives.join(' or data.')}, not ${populated.map((key) => `data.${key}`).join(' and ')}`, { figureId: id });
    }
  }
  const allowed = FIGURE_ALLOWED_POPULATED_MAP.get(figure.type) ?? new Set();
  for (const field of FIGURE_ARRAY_FIELDS) {
    if (hasPopulatedField(figure.data, field) && !allowed.has(field)) {
      c.fail(`${figurePath} type ${figure.type} must not populate data.${field}`, { figureId: id });
    }
  }

  // Item labels
  for (const [field, singular] of [['items', 'item'], ['nodes', 'node'], ['points', 'point']]) {
    for (const [index, entry] of (figure.data[field] ?? []).entries()) {
      if (!hasText(entry?.label)) c.fail(`${figurePath} ${singular} ${index + 1} requires label`, { figureId: id });
    }
  }
  for (const [index, layer] of (figure.data.layers ?? []).entries()) {
    if (!hasText(layer?.label)) {
      c.fail(`${figurePath} layer ${index + 1} requires label`, { figureId: id });
    }
    if (figure.type === 'stack' && !hasText(layer?.detail) && !hasAnyPopulatedField(layer, ['modules', 'outputs'])) {
      c.fail(`${figurePath} stack layer ${index + 1} has no detail, modules, or outputs`, { figureId: id });
    }
  }
  for (const [index, row] of (figure.data.rows ?? []).entries()) {
    if (!hasText(row?.label)) c.fail(`${figurePath} row ${index + 1} requires label`, { figureId: id });
    if (Array.isArray(row?.values) && row.values.length === 0) {
      c.fail(`${figurePath} row ${index + 1} has empty values`, { figureId: id });
    }
  }

  // Matrix / cohort: row/column alignment + cell shape
  if (MATRIX_FIGURE_TYPES.has(figure.type)) {
    const cols = Array.isArray(figure.data.columns) ? figure.data.columns : [];
    const rows = Array.isArray(figure.data.rows) ? figure.data.rows : [];
    if (cols.length < 1) {
      c.fail(`${figurePath} type ${figure.type} requires at least 1 data.columns entry (X-axis label per value column)`, { figureId: id });
    }
    for (const [index, row] of rows.entries()) {
      const values = Array.isArray(row?.values) ? row.values : [];
      if (values.length !== cols.length) {
        c.fail(`${figurePath} row ${index + 1} (${row?.label ?? '?'}) has ${values.length} values but data.columns declares ${cols.length}; columns are X-axis labels and row.label is the Y-axis label, so values.length must equal columns.length`, { figureId: id, rowIndex: index, actual: values.length, expected: cols.length });
      }
      // Cohort cells are validated separately below; only matrix cells need
      // text-resolution checks here.
      if (figure.type !== 'matrix') continue;
      for (const [colIndex, cell] of values.entries()) {
        if (cell == null) continue; // null = no-data placeholder
        if (typeof cell === 'string' || typeof cell === 'number') continue;
        if (typeof cell !== 'object') {
          c.fail(`${figurePath} matrix row ${index + 1} (${row?.label ?? '?'}) cell ${colIndex + 1} must be a string, number, or object, got ${typeof cell}`, { figureId: id, rowIndex: index, colIndex });
          continue;
        }
        const text = cell.label ?? cell.text ?? cell.name ?? cell.displayValue ?? cell.value ?? cell.score;
        const hasEmptyTextWithTone = (cell.label === '' || cell.text === '') && cell.tone != null;
        if ((text == null || String(text).trim() === '') && !hasEmptyTextWithTone) {
          c.fail(`${figurePath} matrix row ${index + 1} (${row?.label ?? '?'}) cell ${colIndex + 1} is missing a text field; provide one of label/text/value/score (label is canonical), or use null / '' for a no-data placeholder`, { figureId: id, rowIndex: index, colIndex });
        }
      }
    }
  }

  // Numeric value figures (bar / waterfall / funnel)
  if (NUMERIC_VALUE_FIGURE_TYPES.has(figure.type)) {
    for (const [index, item] of (figure.data.items ?? []).entries()) {
      if (!isFiniteNumber(item?.value)) c.fail(`${figurePath} item ${index + 1} requires numeric value`, { figureId: id });
    }
    for (const [seriesIndex, series] of (figure.data.series ?? []).entries()) {
      for (const [pointIndex, point] of (series.points ?? []).entries()) {
        if (!hasText(point?.label)) {
          c.fail(`${figurePath} series ${seriesIndex + 1} point ${pointIndex + 1} requires label`, { figureId: id });
        }
        if (!isFiniteNumber(point?.value)) {
          c.fail(`${figurePath} series ${seriesIndex + 1} point ${pointIndex + 1} requires numeric value`, { figureId: id });
        }
      }
    }
  }

  // Range
  if (figure.type === 'range') {
    for (const [index, item] of (figure.data.items ?? []).entries()) {
      const low = item?.low ?? item?.min;
      const high = item?.high ?? item?.max;
      if (!isFiniteNumber(low) || !isFiniteNumber(high)) {
        c.fail(`${figurePath} range item ${index + 1} requires numeric low/min and high/max`, { figureId: id });
      } else if (high < low) {
        c.fail(`${figurePath} range item ${index + 1} has high/max below low/min`, { figureId: id });
      }
      if (item?.mid != null && !isFiniteNumber(item.mid)) {
        c.fail(`${figurePath} range item ${index + 1} mid must be numeric when present`, { figureId: id });
      }
    }
  }

  // Cohort: numeric retention percentages 0–100
  if (figure.type === 'cohort') {
    for (const [rowIndex, row] of (figure.data.rows ?? []).entries()) {
      for (const [colIndex, cell] of (row?.values ?? []).entries()) {
        const raw = cell?.value ?? (typeof cell === 'object' ? cell?.label : cell);
        const value = Number(typeof raw === 'string' ? raw.replace(/[^0-9.-]/g, '') : raw);
        if (!Number.isFinite(value)) {
          c.fail(`${figurePath} cohort row ${rowIndex + 1} cell ${colIndex + 1} requires a numeric retention percentage; cohort cells must be 0–100, not ordinal labels (use a matrix figure for ordinal scoring).`, { figureId: id, rowIndex, colIndex });
          continue;
        }
        if (value < 0 || value > 100) {
          c.fail(`${figurePath} cohort row ${rowIndex + 1} cell ${colIndex + 1} value ${value} is outside 0–100; cohort cells must be retention percentages. Use a matrix figure for non-percentage scoring.`, { figureId: id, rowIndex, colIndex, actual: value });
        }
      }
    }
  }

  // Quadrant: numeric x/y
  if (COORDINATE_FIGURE_TYPES.has(figure.type)) {
    for (const [index, point] of (figure.data.points ?? []).entries()) {
      if (!isFiniteNumber(point?.x) || !isFiniteNumber(point?.y)) {
        c.fail(`${figurePath} point ${index + 1} requires numeric x and y`, { figureId: id });
      }
    }
  }

  return { errors: c.errors };
}

// ---- document-head schema -------------------------------------------------

// Validates the per-file head fields every chapter / final artifact carries:
//   schemaVersion / artifact / slug / runDate / company.name (+ optional
//   chapter.number for analysis chapters). `expected` is the artifact spec
//   for this file (from getAnalysisArtifacts / getCoreArtifacts).
//   - expected.artifact: required string identifier
//   - expected.chapter:  optional 1-based chapter number (only analysis chs)
export function checkDocumentHeadSchema(doc, { path, expected }) {
  const c = makeCollector();
  if (doc?.schemaVersion !== SCHEMA_VERSION) {
    c.fail(`${path}: expected schemaVersion ${SCHEMA_VERSION}, got ${doc?.schemaVersion}`);
  }
  if (!doc?.artifact) c.fail(`${path}: missing document head field artifact`);
  else if (expected?.artifact && doc.artifact !== expected.artifact) {
    c.fail(`${path}: expected artifact ${expected.artifact}, got ${doc.artifact}`);
  }
  if (!doc?.slug) c.fail(`${path}: missing document head field slug`);
  if (!doc?.runDate) c.fail(`${path}: missing document head field runDate`);
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(asDateString(doc.runDate))) {
    c.fail(`${path}: runDate must be YYYY-MM-DD`);
  }
  if (!doc?.company || typeof doc.company !== 'object' || !doc.company.name) {
    c.fail(`${path}: missing document head field company.name`);
  }
  if (expected?.chapter && doc?.chapter?.number !== expected.chapter) {
    c.fail(`${path}: expected chapter.number ${expected.chapter}`);
  }
  return { errors: c.errors };
}

// ---- unique IDs -----------------------------------------------------------

// Validates that every row in a list has an id matching `pattern` and that
// no id repeats. Used for chapter-local table/figure ids (T### / F###) and
// for ledger-level source/claim ids (S### / C###).
export function checkUniqueIds(rows, { label, pattern, path }) {
  const c = makeCollector();
  const seen = new Set();
  for (const row of rows ?? []) {
    if (!row?.id || !pattern.test(row.id)) {
      c.fail(`${path}: invalid ${label} id ${row?.id}`, { id: row?.id });
      continue;
    }
    if (seen.has(row.id)) c.fail(`${path}: duplicate ${label} id ${row.id}`, { id: row.id });
    else seen.add(row.id);
  }
  return { errors: c.errors };
}

// ---- artifact (figure / table) refs --------------------------------------

// Walks any value recursively and collects every embedded
//   { figureRef: 'F###' } / { tableRef: 'T###' }
// occurrence, returning [['figure', id], ['table', id], ...]. Internal helper
// for checkArtifactRefs.
function collectArtifactRefs(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectArtifactRefs(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (value.figureRef) out.push(['figure', value.figureRef]);
  if (value.tableRef) out.push(['table', value.tableRef]);
  for (const child of Object.values(value)) collectArtifactRefs(child, out);
  return out;
}

// Validates every figureRef / tableRef in `doc` resolves to an id present
// in the supplied id sets. `requireUniqueHome=true` additionally enforces
// that each id is referenced at most once (used by check-report on the
// assembled full-report; check-chapter passes false because a chapter may
// legitimately reference the same artifact in narrative + a callout).
export function checkArtifactRefs(doc, { path, figureIds, tableIds, requireUniqueHome = false }) {
  const c = makeCollector();
  const refs = collectArtifactRefs(doc);
  for (const [type, ref] of refs) {
    if (type === 'figure' && !figureIds.has(ref)) c.fail(`${path}: missing figure ${ref}`, { type, ref });
    if (type === 'table' && !tableIds.has(ref)) c.fail(`${path}: missing table ${ref}`, { type, ref });
  }
  if (requireUniqueHome) {
    const counts = new Map();
    for (const [type, ref] of refs) {
      const key = `${type}:${ref}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      if (count > 1) {
        c.fail(`${path}: ${key.replace(':', ' ')} is referenced ${count} times; each table/figure must have exactly one home`, { ref: key, count });
      }
    }
  }
  return { errors: c.errors };
}
