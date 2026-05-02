#!/usr/bin/env node
// Consolidate per-artifact localEvidence blocks into final 100-evidence-ledger.yaml.
// Usage: node scripts/consolidate-evidence.mjs <report-folder> [--keep-local]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

const REPORT_FILES = [
  '01-company-snapshot.yaml',
  '02-market-macro.yaml',
  '03-competitive-benchmarking.yaml',
  '04-financial-unit-economics.yaml',
  '05-product-technology.yaml',
  '06-customer-retention.yaml',
  '07-risk-regulatory.yaml',
  '08-investment-valuation.yaml',
];

const folderArg = process.argv[2];
const keepLocal = process.argv.includes('--keep-local');

if (!folderArg) {
  console.error('Usage: node scripts/consolidate-evidence.mjs <report-folder> [--keep-local]');
  process.exit(1);
}

const reportFolder = resolve(folderArg);

function readYaml(filePath) {
  return yaml.load(readFileSync(filePath, 'utf8')) ?? {};
}

function writeYaml(filePath, data) {
  writeFileSync(filePath, yaml.dump(data, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
}

function id(prefix, index) {
  return `${prefix}${String(index).padStart(3, '0')}`;
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function canonicalSourceUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(lower)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/#.*$/, '').replace(/\?.*utm_[^#]*/i, '').replace(/\/$/, '').toLowerCase();
  }
}

function sourceKey(source) {
  const url = canonicalSourceUrl(source?.url);
  if (url) return `url:${url}`;
  return ['fallback', source?.publisher, source?.title, source?.date].map(normalizeText).join('|');
}

function claimKey(claim, sourceRefs) {
  return [normalizeText(claim?.statement), normalizeText(claim?.topic), [...sourceRefs].sort().join(',')].join('|');
}

function rewriteClaimRefs(value, claimMap, file) {
  if (Array.isArray(value)) return value.map((item) => rewriteClaimRefs(item, claimMap, file));
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === 'localEvidence' && !keepLocal) continue;
      if (key === 'claimRefs' && Array.isArray(child)) {
        next[key] = child.map((ref) => claimMap.get(`${file}:${ref}`) ?? ref);
      } else {
        next[key] = rewriteClaimRefs(child, claimMap, file);
      }
    }
    return next;
  }
  if (typeof value === 'string') {
    return value.replace(/\[C\d{3}\]/g, (match) => {
      const localId = match.slice(1, -1);
      return `[${claimMap.get(`${file}:${localId}`) ?? localId}]`;
    });
  }
  return value;
}

const docs = new Map();
for (const file of REPORT_FILES) {
  const path = join(reportFolder, file);
  if (!existsSync(path)) continue;
  docs.set(file, readYaml(path));
}

if (docs.size === 0) {
  console.error(`[consolidate-evidence] no report artifacts found in ${reportFolder}`);
  process.exit(1);
}

const firstDoc = docs.values().next().value;
const sourceByKey = new Map();
const sourceMap = new Map();
const sources = [];
let sourcesConsidered = 0;

for (const [file, doc] of docs) {
  const local = doc.localEvidence ?? {};
  const localSources = Array.isArray(local.sources) ? local.sources : [];
  sourcesConsidered += Number(local.coverage?.sourcesConsidered ?? localSources.length) || 0;
  for (const source of localSources) {
    const key = sourceKey(source);
    let finalId = sourceByKey.get(key);
    if (!finalId) {
      finalId = id('S', sources.length + 1);
      sourceByKey.set(key, finalId);
      sources.push({ ...source, id: finalId });
    }
    if (source?.id) sourceMap.set(`${file}:${source.id}`, finalId);
  }
}

const claimByKey = new Map();
const claimMap = new Map();
const claims = [];
const evidenceGaps = [];

for (const [file, doc] of docs) {
  const local = doc.localEvidence ?? {};
  for (const gap of local.evidenceGaps ?? []) evidenceGaps.push(gap);
  for (const claim of local.claims ?? []) {
    const finalSourceRefs = (claim.sourceRefs ?? []).map((ref) => sourceMap.get(`${file}:${ref}`) ?? ref);
    const key = claimKey(claim, finalSourceRefs);
    let finalId = claimByKey.get(key);
    if (!finalId) {
      finalId = id('C', claims.length + 1);
      claimByKey.set(key, finalId);
      claims.push({ ...claim, id: finalId, sourceRefs: finalSourceRefs });
    }
    if (claim?.id) claimMap.set(`${file}:${claim.id}`, finalId);
  }
}

const ledger = {
  schemaVersion: firstDoc.schemaVersion,
  artifact: 'evidence-ledger',
  slug: firstDoc.slug,
  runDate: firstDoc.runDate,
  company: firstDoc.company,
  coverage: {
    sourcesConsidered: Math.max(sourcesConsidered, sources.length),
    sourcesRetained: sources.length,
    claimsCreated: claims.length,
    sourceDiversityNotes: null,
    deduplicationNotes: `Consolidated from ${docs.size} artifacts; sources deduplicated by canonical URL or publisher/title/date fallback.`,
    recencyNotes: null,
    coverageGaps: [],
  },
  sources,
  claims,
  bibliography: sources.map((source) => ({
    sourceRef: source.id,
    citation: [source.publisher, source.title, source.date, source.url].filter(Boolean).join(' — '),
  })),
  evidenceGaps,
};

writeYaml(join(reportFolder, '100-evidence-ledger.yaml'), ledger);

for (const [file, doc] of docs) {
  writeYaml(join(reportFolder, file), rewriteClaimRefs(doc, claimMap, file));
}

console.log(`[consolidate-evidence] wrote ${join(reportFolder, '100-evidence-ledger.yaml')} (${sources.length} sources, ${claims.length} claims)`);