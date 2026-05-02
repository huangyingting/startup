#!/usr/bin/env node
// Rendering-contract checks for report YAML, run before astro build.
// Content-quality and translation-parity checks live in scripts/check-reports-content.mjs.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../reports');
const V2_SCHEMA = 'startup-diligence-report-v2';
const V2_REQUIRED = [
  '100-evidence-ledger.yaml',
  '01-company-snapshot.yaml',
  '02-market-macro.yaml',
  '03-competitive-benchmarking.yaml',
  '04-financial-unit-economics.yaml',
  '05-product-technology.yaml',
  '06-customer-retention.yaml',
  '07-risk-regulatory.yaml',
  '08-investment-valuation.yaml',
  '101-report-document.yaml',
  '102-report-card.yaml',
];
const ARTIFACTS = new Map([
  ['100-evidence-ledger.yaml', { artifact: 'evidence-ledger' }],
  ['01-company-snapshot.yaml', { artifact: 'company-snapshot', chapter: 1 }],
  ['02-market-macro.yaml', { artifact: 'market-macro', chapter: 2 }],
  ['03-competitive-benchmarking.yaml', { artifact: 'competitive-benchmarking', chapter: 3 }],
  ['04-financial-unit-economics.yaml', { artifact: 'financial-unit-economics', chapter: 4 }],
  ['05-product-technology.yaml', { artifact: 'product-technology', chapter: 5 }],
  ['06-customer-retention.yaml', { artifact: 'customer-retention', chapter: 6 }],
  ['07-risk-regulatory.yaml', { artifact: 'risk-regulatory', chapter: 7 }],
  ['08-investment-valuation.yaml', { artifact: 'investment-valuation', chapter: 8 }],
  ['101-report-document.yaml', { artifact: 'report-document' }],
  ['102-report-card.yaml', { artifact: 'report-card' }],
]);
const RECOMMENDATIONS = new Set(['strong-buy', 'buy', 'track', 'research-more', 'avoid']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const RISK_RATINGS = new Set(['low', 'moderate', 'significant', 'critical', 'unknown']);
const VALUATION_STANCES = new Set(['attractive', 'fair', 'stretched', 'expensive', 'unknown']);
const FIGURE_TYPES = new Set(['timeline', 'flow', 'decision-map', 'evidence-map', 'quadrant', 'competitive-matrix', 'metric-bars', 'bars', 'waterfall', 'risk-heatmap', 'matrix', 'architecture-stack', 'market-sizing-lens', 'unit-economics-waterfall', 'customer-surface-map', 'recommendation-logic', 'risk-transmission-map', 'stack', 'sensitivity', 'xy', 'other']);
const FIGURE_LAYOUTS = new Set(['compact', 'standard', 'wide']);
const FIGURE_CONTRACTS = new Map([
  ['timeline', [['items']]],
  ['flow', [['nodes'], ['edges']]],
  ['decision-map', [['nodes']]],
  ['evidence-map', [['nodes']]],
  ['quadrant', [['points']]],
  ['competitive-matrix', [['points']]],
  ['metric-bars', [['items', 'series']]],
  ['bars', [['items', 'series']]],
  ['waterfall', [['items']]],
  ['risk-heatmap', [['columns'], ['rows']]],
  ['matrix', [['columns'], ['rows']]],
  ['architecture-stack', [['layers']]],
  ['market-sizing-lens', [['nodes', 'items']]],
  ['unit-economics-waterfall', [['nodes', 'items']]],
  ['customer-surface-map', [['nodes', 'items']]],
  ['recommendation-logic', [['nodes']]],
  ['risk-transmission-map', [['nodes'], ['edges']]],
  ['stack', [['layers', 'items']]],
  ['sensitivity', [['series']]],
  ['xy', [['points', 'series']]],
]);
const NON_CANONICAL_FIGURE_DATA_FIELDS = new Set(['children', 'steps', 'cards', 'buckets', 'groups', 'components', 'name']);

function asDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

function pushIfInvalidEnum(failures, path, label, value, allowed) {
  if (!allowed.has(value)) failures.push(`${path}: invalid ${label} ${value}`);
}

function checkUniqueId(failures, run, label, rows, pattern) {
  const seen = new Set();
  for (const row of rows ?? []) {
    if (!row?.id || !pattern.test(row.id)) failures.push(`${run}: invalid ${label} id ${row?.id}`);
    else if (seen.has(row.id)) failures.push(`${run}: duplicate ${label} id ${row.id}`);
    else seen.add(row.id);
  }
}

function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
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
function hasAnyArray(data, keys) {
  return keys.some((key) => Array.isArray(data?.[key]) && data[key].length > 0);
}
function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
function checkFigure(failures, path, figure) {
  if (!FIGURE_TYPES.has(figure.type)) failures.push(`${path}: figure ${figure.id} has invalid type ${figure.type}`);
  if (!FIGURE_LAYOUTS.has(figure.layout)) failures.push(`${path}: figure ${figure.id} has invalid layout ${figure.layout}`);
  if (!figure.data || typeof figure.data !== 'object' || Array.isArray(figure.data)) {
    failures.push(`${path}: figure ${figure.id} missing structured data object`);
    return;
  }
  for (const field of Object.keys(figure.data)) {
    if (NON_CANONICAL_FIGURE_DATA_FIELDS.has(field)) failures.push(`${path}: figure ${figure.id} uses non-canonical data.${field}`);
  }
  const contract = FIGURE_CONTRACTS.get(figure.type) ?? [];
  for (const alternatives of contract) {
    if (!hasAnyArray(figure.data, alternatives)) failures.push(`${path}: figure ${figure.id} type ${figure.type} requires data.${alternatives.join(' or data.')}`);
  }
  for (const [index, item] of (figure.data.items ?? []).entries()) {
    if (!hasText(item?.label)) failures.push(`${path}: figure ${figure.id} item ${index + 1} requires label`);
  }
  for (const [index, node] of (figure.data.nodes ?? []).entries()) {
    if (!hasText(node?.label)) failures.push(`${path}: figure ${figure.id} node ${index + 1} requires label`);
  }
  for (const [index, point] of (figure.data.points ?? []).entries()) {
    if (!hasText(point?.label)) failures.push(`${path}: figure ${figure.id} point ${index + 1} requires label`);
  }
  for (const [index, layer] of (figure.data.layers ?? []).entries()) {
    if (!hasText(layer?.label)) failures.push(`${path}: figure ${figure.id} layer ${index + 1} requires label`);
    if (figure.type === 'architecture-stack' && !hasText(layer?.detail) && !hasAnyArray(layer, ['modules', 'outputs'])) failures.push(`${path}: figure ${figure.id} architecture layer ${index + 1} has no detail, modules, or outputs`);
  }
  for (const [index, row] of (figure.data.rows ?? []).entries()) {
    if (!hasText(row?.label)) failures.push(`${path}: figure ${figure.id} row ${index + 1} requires label`);
    if (Array.isArray(row?.values) && row.values.length === 0) failures.push(`${path}: figure ${figure.id} row ${index + 1} has empty values`);
  }
  if (['matrix', 'risk-heatmap'].includes(figure.type)) {
    const cols = Array.isArray(figure.data.columns) ? figure.data.columns : [];
    const rows = Array.isArray(figure.data.rows) ? figure.data.rows : [];
    if (cols.length < 1) failures.push(`${path}: figure ${figure.id} type ${figure.type} requires at least 1 data.columns entry (X-axis label per value column)`);
    for (const [index, row] of rows.entries()) {
      const values = Array.isArray(row?.values) ? row.values : [];
      if (values.length !== cols.length) failures.push(`${path}: figure ${figure.id} row ${index + 1} (${row?.label ?? '?'}) has ${values.length} values but data.columns declares ${cols.length}; columns are X-axis labels and row.label is the Y-axis label, so values.length must equal columns.length`);
    }
  }
  if (['bars', 'metric-bars', 'waterfall'].includes(figure.type)) {
    for (const [index, item] of (figure.data.items ?? []).entries()) {
      if (!isNumber(item?.value)) failures.push(`${path}: figure ${figure.id} item ${index + 1} requires numeric value`);
    }
  }
  if (['quadrant', 'competitive-matrix', 'xy'].includes(figure.type)) {
    for (const [index, point] of (figure.data.points ?? []).entries()) {
      if (!isNumber(point?.x) || !isNumber(point?.y)) failures.push(`${path}: figure ${figure.id} point ${index + 1} requires numeric x and y`);
    }
  }
  if (figure.type === 'sensitivity') {
    for (const [seriesIndex, series] of (figure.data.series ?? []).entries()) {
      for (const [pointIndex, point] of (series.points ?? []).entries()) {
        if (!hasText(point?.label)) failures.push(`${path}: figure ${figure.id} series ${seriesIndex + 1} point ${pointIndex + 1} requires label`);
        if (!isNumber(point?.value)) failures.push(`${path}: figure ${figure.id} series ${seriesIndex + 1} point ${pointIndex + 1} requires numeric value`);
      }
    }
  }
  // Company milestone timeline (F102 in 01-company-snapshot.yaml or 101-report-document.yaml)
  // must be substantive: at least 8 items spanning founding → near-current.
  if (figure.type === 'timeline' && /\/(01-company-snapshot|101-report-document)\.yaml$/.test(path) && figure.id === 'F102') {
    const items = Array.isArray(figure.data.items) ? figure.data.items : [];
    if (items.length < 8) failures.push(`${path}: figure ${figure.id} (company milestone timeline) has ${items.length} items but must include at least 8 (founding, every priced funding round, major product launches, scale milestones, partnerships, governance/legal events). Run a milestone-discovery search batch and document any unfilled gaps in evidenceGaps.`);
  }
}

try {
  if (!existsSync(REPORTS_DIR)) {
    console.warn(`[check:reports] ${REPORTS_DIR} not found; nothing to check.`);
    process.exit(0);
  }

  const runs = readdirSync(REPORTS_DIR).filter((name) => {
    const p = join(REPORTS_DIR, name);
    try { return statSync(p).isDirectory() && !name.startsWith('.') && !name.startsWith('_'); }
    catch { return false; }
  });

  const failures = [];
  let checked = 0;

  for (const run of runs) {
    const dir = join(REPORTS_DIR, run);
    if (!existsSync(join(dir, '102-report-card.yaml'))) continue;
    checked += 1;

    for (const file of V2_REQUIRED) {
      if (!existsSync(join(dir, file))) failures.push(`${run}/${file}: missing required v2 artifact`);
    }
    if (failures.some((f) => f.startsWith(`${run}/`))) continue;

    const parsed = new Map();
    for (const file of V2_REQUIRED.filter((f) => f.endsWith('.yaml'))) {
      try {
        const doc = readYaml(join(dir, file));
        parsed.set(file, doc);
        const expected = ARTIFACTS.get(file);
        if (doc.schemaVersion !== V2_SCHEMA) failures.push(`${run}/${file}: expected schemaVersion ${V2_SCHEMA}, got ${doc.schemaVersion}`);
        if (!doc.artifact) failures.push(`${run}/${file}: missing document head field artifact`);
        else if (expected && doc.artifact !== expected.artifact) failures.push(`${run}/${file}: expected artifact ${expected.artifact}, got ${doc.artifact}`);
        if (!doc.slug) failures.push(`${run}/${file}: missing document head field slug`);
        if (!doc.runDate) failures.push(`${run}/${file}: missing document head field runDate`);
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(asDateString(doc.runDate))) failures.push(`${run}/${file}: runDate must be YYYY-MM-DD`);
        if (!doc.company || typeof doc.company !== 'object' || !doc.company.name) failures.push(`${run}/${file}: missing document head field company.name`);
        if (expected?.chapter && doc.chapter?.number !== expected.chapter) failures.push(`${run}/${file}: expected chapter.number ${expected.chapter}`);
      } catch (err) {
        failures.push(`${run}/${file}: YAML parse failed: ${err.message.split('\n')[0]}`);
      }
    }

    const ledger = parsed.get('100-evidence-ledger.yaml');
    const reportDoc = parsed.get('101-report-document.yaml');
    const card = parsed.get('102-report-card.yaml');

    const names = new Set([...parsed.values()].map((doc) => doc?.company?.name).filter(Boolean));
    if (names.size > 1) failures.push(`${run}: company.name is inconsistent across artifacts`);
    const slugs = new Set([...parsed.values()].map((doc) => doc?.slug).filter(Boolean));
    if (slugs.size > 1) failures.push(`${run}: slug is inconsistent across artifacts`);

    const claimIds = new Set((ledger?.claims ?? []).map((claim) => claim.id));
    const sourceIds = new Set((ledger?.sources ?? []).map((source) => source.id));
    checkUniqueId(failures, run, 'source', ledger?.sources, /^S\d{3}$/);
    checkUniqueId(failures, run, 'claim', ledger?.claims, /^C\d{3}$/);
    for (const claim of ledger?.claims ?? []) {
      for (const ref of claim.sourceRefs ?? []) {
        if (!sourceIds.has(ref)) failures.push(`${run}: claim ${claim.id} references missing source ${ref}`);
      }
    }
    for (const [file, doc] of parsed) {
      if (file === '100-evidence-ledger.yaml') continue;
      for (const ref of walkClaimRefs(doc)) {
        if (!claimIds.has(ref)) failures.push(`${run}/${file}: missing claimRef ${ref}`);
      }
    }

    const figureIds = new Set((reportDoc?.figures ?? []).map((figure) => figure.id));
    const tableIds = new Set((reportDoc?.tables ?? []).map((table) => table.id));
    checkUniqueId(failures, run, 'figure', reportDoc?.figures, /^F\d{3}$/);
    checkUniqueId(failures, run, 'table', reportDoc?.tables, /^T\d{3}$/);
    const refs = [];
    const walkBlocks = (value) => {
      if (Array.isArray(value)) return value.forEach(walkBlocks);
      if (value && typeof value === 'object') {
        if (value.figureRef) refs.push(['figure', value.figureRef]);
        if (value.tableRef) refs.push(['table', value.tableRef]);
        Object.values(value).forEach(walkBlocks);
      }
    };
    walkBlocks(reportDoc?.chapters ?? []);
    walkBlocks(reportDoc?.appendices ?? []);
    for (const [type, ref] of refs) {
      if (type === 'figure' && !figureIds.has(ref)) failures.push(`${run}/101-report-document.yaml: missing figure ${ref}`);
      if (type === 'table' && !tableIds.has(ref)) failures.push(`${run}/101-report-document.yaml: missing table ${ref}`);
    }
    // Tables must not be referenced from more than one location (chapter section or appendix block).
    const refCounts = new Map();
    for (const [type, ref] of refs) {
      const key = `${type}:${ref}`;
      refCounts.set(key, (refCounts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of refCounts) {
      if (count > 1) failures.push(`${run}/101-report-document.yaml: ${key.replace(':', ' ')} is referenced ${count} times; each table/figure must have exactly one home in the report`);
    }
    // Validate column/cell shape inside every table.
    for (const [file, doc] of parsed) {
      for (const table of doc?.tables ?? []) {
        if (!Array.isArray(table?.columns) || table.columns.length === 0) {
          failures.push(`${run}/${file}: table ${table?.id ?? '?'} requires non-empty data.columns`);
          continue;
        }
        const expectedCols = table.columns.length;
        for (const [index, row] of (table.rows ?? []).entries()) {
          if (!Array.isArray(row)) {
            failures.push(`${run}/${file}: table ${table.id} row ${index + 1} must be an array`);
            continue;
          }
          if (row.length !== expectedCols) failures.push(`${run}/${file}: table ${table.id} row ${index + 1} has ${row.length} cells but columns declares ${expectedCols}`);
        }
      }
    }
    for (const [file, doc] of parsed) {
      for (const figure of doc?.figures ?? []) checkFigure(failures, `${run}/${file}`, figure);
    }
    pushIfInvalidEnum(failures, `${run}/102-report-card.yaml`, 'recommendation', card?.recommendation, RECOMMENDATIONS);
    pushIfInvalidEnum(failures, `${run}/102-report-card.yaml`, 'confidence', card?.confidence, CONFIDENCE);
    pushIfInvalidEnum(failures, `${run}/102-report-card.yaml`, 'riskRating', card?.riskRating, RISK_RATINGS);
    pushIfInvalidEnum(failures, `${run}/102-report-card.yaml`, 'valuationStance', card?.valuationStance, VALUATION_STANCES);
    pushIfInvalidEnum(failures, `${run}/101-report-document.yaml`, 'recommendation', reportDoc?.reportMeta?.recommendation, RECOMMENDATIONS);
    pushIfInvalidEnum(failures, `${run}/101-report-document.yaml`, 'confidence', reportDoc?.reportMeta?.confidence, CONFIDENCE);
    pushIfInvalidEnum(failures, `${run}/101-report-document.yaml`, 'riskRating', reportDoc?.reportMeta?.riskRating, RISK_RATINGS);
    pushIfInvalidEnum(failures, `${run}/101-report-document.yaml`, 'valuationStance', reportDoc?.reportMeta?.valuationStance, VALUATION_STANCES);
    if (!reportDoc?.startupIntroduction || typeof reportDoc.startupIntroduction !== 'object') failures.push(`${run}/101-report-document.yaml: missing startupIntroduction object`);
    else if (typeof reportDoc.startupIntroduction.summary !== 'string' || !reportDoc.startupIntroduction.summary.trim()) failures.push(`${run}/101-report-document.yaml: startupIntroduction.summary is required`);
    if (typeof card?.figureCount !== 'number') failures.push(`${run}/102-report-card.yaml: figureCount is required and must be a number`);
    else if (card.figureCount !== (reportDoc?.figures ?? []).length) failures.push(`${run}/102-report-card.yaml: figureCount does not match report document`);
    if (typeof card?.tableCount !== 'number') failures.push(`${run}/102-report-card.yaml: tableCount is required and must be a number`);
    else if (card.tableCount !== (reportDoc?.tables ?? []).length) failures.push(`${run}/102-report-card.yaml: tableCount does not match report document`);
    if (typeof card?.overallScore !== 'number' || card.overallScore < 0 || card.overallScore > 10) failures.push(`${run}/102-report-card.yaml: overallScore must be a number between 0 and 10`);
    if (card?.reportFiles?.reportDocument !== '101-report-document.yaml') failures.push(`${run}/102-report-card.yaml: reportFiles.reportDocument must be 101-report-document.yaml`);
    if (card?.reportFiles?.reportCard !== '102-report-card.yaml') failures.push(`${run}/102-report-card.yaml: reportFiles.reportCard must be 102-report-card.yaml`);
    if (card?.sourceStats?.claimsReviewed !== undefined && ledger?.claims && card.sourceStats.claimsReviewed > ledger.claims.length) {
      failures.push(`${run}/102-report-card.yaml: claimsReviewed exceeds ledger claims`);
    }
  }

  if (failures.length) {
    console.error('[check:reports] failures:\n' + failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports] ✓ ${checked} v2 report(s) verified.`);
} catch (err) {
  console.error(`[check:reports] fatal error: ${err.message}`);
  process.exit(1);
}
