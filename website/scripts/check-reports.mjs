#!/usr/bin/env node
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../reports');
const V2_SCHEMA = 'startup-diligence-report-v2';
const V2_REQUIRED = [
  '00-report-brief.yaml',
  '01-evidence-ledger.yaml',
  '02-company-snapshot.yaml',
  '03-market-macro.yaml',
  '04-competitive-benchmarking.yaml',
  '05-financial-unit-economics.yaml',
  '06-product-technology.yaml',
  '07-customer-retention.yaml',
  '08-risk-regulatory.yaml',
  '09-investment-valuation.yaml',
  '10-report-document.yaml',
  '11-report-card.yaml',
];
const ARTIFACTS = new Map([
  ['00-report-brief.yaml', { artifact: 'report-brief' }],
  ['01-evidence-ledger.yaml', { artifact: 'evidence-ledger' }],
  ['02-company-snapshot.yaml', { artifact: 'company-snapshot', chapter: 1 }],
  ['03-market-macro.yaml', { artifact: 'market-macro', chapter: 2 }],
  ['04-competitive-benchmarking.yaml', { artifact: 'competitive-benchmarking', chapter: 3 }],
  ['05-financial-unit-economics.yaml', { artifact: 'financial-unit-economics', chapter: 4 }],
  ['06-product-technology.yaml', { artifact: 'product-technology', chapter: 5 }],
  ['07-customer-retention.yaml', { artifact: 'customer-retention', chapter: 6 }],
  ['08-risk-regulatory.yaml', { artifact: 'risk-regulatory', chapter: 7 }],
  ['09-investment-valuation.yaml', { artifact: 'investment-valuation', chapter: 8 }],
  ['10-report-document.yaml', { artifact: 'report-document' }],
  ['11-report-card.yaml', { artifact: 'report-card' }],
]);
const RECOMMENDATIONS = new Set(['strong-buy', 'buy', 'track', 'research-more', 'avoid']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const RISK_RATINGS = new Set(['low', 'moderate', 'significant', 'critical', 'unknown']);
const VALUATION_STANCES = new Set(['attractive', 'fair', 'stretched', 'expensive', 'unknown']);

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
  const warnings = [];
  let checked = 0;

  for (const run of runs) {
    const dir = join(REPORTS_DIR, run);
    const hasV2Card = existsSync(join(dir, '11-report-card.yaml'));
    if (!hasV2Card) continue;
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

    const ledger = parsed.get('01-evidence-ledger.yaml');
    const reportDoc = parsed.get('10-report-document.yaml');
    const card = parsed.get('11-report-card.yaml');

    const names = new Set([...parsed.values()].map((doc) => doc?.company?.name).filter(Boolean));
    if (names.size > 1) failures.push(`${run}: company.name is inconsistent across artifacts`);
    const slugs = new Set([...parsed.values()].map((doc) => doc?.slug).filter(Boolean));
    if (slugs.size > 1) failures.push(`${run}: slug is inconsistent across artifacts`);

    const claimIds = new Set((ledger?.claims ?? []).map((claim) => claim.id));
    const sourceIds = new Set((ledger?.sources ?? []).map((source) => source.id));
    checkUniqueId(failures, run, 'source', ledger?.sources, /^S\d{3}$/);
    checkUniqueId(failures, run, 'claim', ledger?.claims, /^C\d{3}$/);
    for (const source of ledger?.sources ?? []) {
      if (source.fetchVerified !== true) failures.push(`${run}: source ${source.id} is not fetchVerified`);
    }
    for (const claim of ledger?.claims ?? []) {
      for (const ref of claim.sourceRefs ?? []) {
        if (!sourceIds.has(ref)) failures.push(`${run}: claim ${claim.id} references missing source ${ref}`);
      }
    }
    for (const [file, doc] of parsed) {
      if (file === '01-evidence-ledger.yaml') continue;
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
    for (const [type, ref] of refs) {
      if (type === 'figure' && !figureIds.has(ref)) failures.push(`${run}/10-report-document.yaml: missing figure ${ref}`);
      if (type === 'table' && !tableIds.has(ref)) failures.push(`${run}/10-report-document.yaml: missing table ${ref}`);
    }
    for (const figure of reportDoc?.figures ?? []) {
      if (!figure.mermaid) failures.push(`${run}/10-report-document.yaml: figure ${figure.id} missing mermaid body`);
    }
    pushIfInvalidEnum(failures, `${run}/11-report-card.yaml`, 'recommendation', card?.recommendation, RECOMMENDATIONS);
    pushIfInvalidEnum(failures, `${run}/11-report-card.yaml`, 'confidence', card?.confidence, CONFIDENCE);
    pushIfInvalidEnum(failures, `${run}/11-report-card.yaml`, 'riskRating', card?.riskRating, RISK_RATINGS);
    pushIfInvalidEnum(failures, `${run}/11-report-card.yaml`, 'valuationStance', card?.valuationStance, VALUATION_STANCES);
    pushIfInvalidEnum(failures, `${run}/10-report-document.yaml`, 'recommendation', reportDoc?.reportMeta?.recommendation, RECOMMENDATIONS);
    pushIfInvalidEnum(failures, `${run}/10-report-document.yaml`, 'confidence', reportDoc?.reportMeta?.confidence, CONFIDENCE);
    pushIfInvalidEnum(failures, `${run}/10-report-document.yaml`, 'riskRating', reportDoc?.reportMeta?.riskRating, RISK_RATINGS);
    pushIfInvalidEnum(failures, `${run}/10-report-document.yaml`, 'valuationStance', reportDoc?.reportMeta?.valuationStance, VALUATION_STANCES);
    if (card?.figureCount !== undefined && card.figureCount !== (reportDoc?.figures ?? []).length) failures.push(`${run}/11-report-card.yaml: figureCount does not match report document`);
    if (card?.tableCount !== undefined && card.tableCount !== (reportDoc?.tables ?? []).length) failures.push(`${run}/11-report-card.yaml: tableCount does not match report document`);
    if (card?.reportFiles?.reportDocument !== '10-report-document.yaml') failures.push(`${run}/11-report-card.yaml: reportFiles.reportDocument must be 10-report-document.yaml`);
    if (card?.reportFiles?.reportCard !== '11-report-card.yaml') failures.push(`${run}/11-report-card.yaml: reportFiles.reportCard must be 11-report-card.yaml`);
    if (card?.sourceStats?.claimsReviewed !== undefined && ledger?.claims && card.sourceStats.claimsReviewed > ledger.claims.length) {
      failures.push(`${run}/11-report-card.yaml: claimsReviewed exceeds ledger claims`);
    }
  }

  if (warnings.length) console.warn('[check:reports] warnings:\n' + warnings.map((w) => `  - ${w}`).join('\n'));
  if (failures.length) {
    console.error('[check:reports] failures:\n' + failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports] ✓ ${checked} v2 report(s) verified.`);
} catch (err) {
  console.error(`[check:reports] fatal error: ${err.message}`);
  process.exit(1);
}
