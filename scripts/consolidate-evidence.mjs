#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { canonicalSourceUrl, compactText, readYaml, writeYaml } from './text-utils.mjs';
import { ANALYSIS_FILES } from './report-manifest.mjs';

const FILES = ANALYSIS_FILES;

const [folder] = process.argv.slice(2);
const keepLocal = process.argv.includes('--keep-local');
if (!folder) {
  console.error('Usage: node scripts/consolidate-evidence.mjs <report-folder> [--keep-local]');
  process.exit(1);
}

const reportFolder = resolve(folder);
const docs = new Map(FILES.flatMap((file) => {
  const path = join(reportFolder, file);
  return existsSync(path) ? [[file, readYaml(path)]] : [];
}));
if (!docs.size) {
  console.error(`[consolidate-evidence] no report artifacts found in ${reportFolder}`);
  process.exit(1);
}

const nextId = (prefix, count) => `${prefix}${String(count + 1).padStart(3, '0')}`;
const keyText = (value) => compactText(value).toLowerCase();
const sourceKey = (s) => canonicalSourceUrl(s?.url) || ['fallback', s?.publisher, s?.title, s?.date].map(keyText).join('|');
const claimKey = (c, refs) => [keyText(c?.statement), keyText(c?.topic), [...refs].sort().join(',')].join('|');

const sourceIds = new Map();
const sourceKeys = new Map();
const claimIds = new Map();
const claimKeys = new Map();
const sources = [];
const claims = [];
const evidenceGaps = [];
let sourcesConsidered = 0;

for (const [file, doc] of docs) {
  const localSources = doc.localEvidence?.sources ?? [];
  sourcesConsidered += Number(doc.localEvidence?.coverage?.sourcesConsidered ?? localSources.length) || 0;
  for (const source of localSources) {
    const key = sourceKey(source);
    const finalId = sourceKeys.get(key) ?? nextId('S', sources.length);
    if (!sourceKeys.has(key)) {
      sourceKeys.set(key, finalId);
      sources.push({ ...source, id: finalId });
    }
    if (source.id) sourceIds.set(`${file}:${source.id}`, finalId);
  }
}

for (const [file, doc] of docs) {
  const local = doc.localEvidence ?? {};
  evidenceGaps.push(...(local.evidenceGaps ?? []));
  for (const claim of local.claims ?? []) {
    const sourceRefs = (claim.sourceRefs ?? []).map((ref) => sourceIds.get(`${file}:${ref}`) ?? ref);
    const key = claimKey(claim, sourceRefs);
    const finalId = claimKeys.get(key) ?? nextId('C', claims.length);
    if (!claimKeys.has(key)) {
      claimKeys.set(key, finalId);
      claims.push({ ...claim, id: finalId, sourceRefs });
    }
    if (claim.id) claimIds.set(`${file}:${claim.id}`, finalId);
  }
}

function rewrite(value, file) {
  if (Array.isArray(value)) return value.map((item) => rewrite(item, file));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
      if (key === 'localEvidence' && !keepLocal) return [];
      if (key === 'claimRefs' && Array.isArray(child)) return [[key, child.map((ref) => claimIds.get(`${file}:${ref}`) ?? ref)]];
      return [[key, rewrite(child, file)]];
    }));
  }
  return typeof value === 'string'
    ? value.replace(/\[C\d{3}\]/g, (match) => `[${claimIds.get(`${file}:${match.slice(1, -1)}`) ?? match.slice(1, -1)}]`)
    : value;
}

const first = docs.values().next().value;
writeYaml(join(reportFolder, '100-evidence-ledger.yaml'), {
  schemaVersion: first.schemaVersion,
  artifact: 'evidence-ledger',
  slug: first.slug,
  runDate: first.runDate,
  company: first.company,
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
  evidenceGaps,
});

for (const [file, doc] of docs) writeYaml(join(reportFolder, file), rewrite(doc, file));
const zhCount = FILES.filter((file) => {
  const path = join(reportFolder, file.replace(/\.yaml$/, '.zh.yaml'));
  if (!existsSync(path)) return false;
  writeYaml(path, rewrite(readYaml(path), file));
  return true;
}).length;

console.log(`[consolidate-evidence] wrote ${join(reportFolder, '100-evidence-ledger.yaml')} (${sources.length} sources, ${claims.length} claims)`);
if (zhCount) console.log(`[consolidate-evidence] rewrote claimRefs in ${zhCount} Simplified Chinese sibling artifact(s).`);