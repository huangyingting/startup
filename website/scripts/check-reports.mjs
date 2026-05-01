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
        if (doc.schemaVersion !== V2_SCHEMA) failures.push(`${run}/${file}: expected schemaVersion ${V2_SCHEMA}, got ${doc.schemaVersion}`);
        if (!doc.artifact) failures.push(`${run}/${file}: missing document head field artifact`);
        if (!doc.slug) failures.push(`${run}/${file}: missing document head field slug`);
        if (!doc.runDate) failures.push(`${run}/${file}: missing document head field runDate`);
        if (!doc.company || typeof doc.company !== 'object' || !doc.company.name) failures.push(`${run}/${file}: missing document head field company.name`);
      } catch (err) {
        failures.push(`${run}/${file}: YAML parse failed: ${err.message.split('\n')[0]}`);
      }
    }

    const ledger = parsed.get('01-evidence-ledger.yaml');
    const reportDoc = parsed.get('10-report-document.yaml');
    const card = parsed.get('11-report-card.yaml');

    const claimIds = new Set((ledger?.claims ?? []).map((claim) => claim.id));
    const sourceIds = new Set((ledger?.sources ?? []).map((source) => source.id));
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
