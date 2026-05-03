#!/usr/bin/env node
// Consolidate localEvidence from analysis artifacts 01-08 into a single
// 100-evidence-ledger.yaml, deduplicating sources by canonical URL and claims
// by statement+topic+sourceRefs. Rewrites claimRefs in-place across English
// analysis artifacts.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { asDateString, canonicalSourceUrl, compactText, readYaml, writeYaml } from './text-utils.mjs';
import { ANALYSIS_FILES } from './report-manifest.mjs';

function parseArgs(argv) {
  return {
    folder: argv.find((arg) => !arg.startsWith('-')) ?? null,
    keepLocal: argv.includes('--keep-local'),
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder) {
  console.error('Usage: node scripts/consolidate-evidence.mjs <report-folder> [--keep-local]');
  process.exit(1);
}

const reportFolder = resolve(args.folder);
const docs = loadAnalysisDocs(reportFolder);
if (!docs.size) {
  console.error(`[consolidate-evidence] no report artifacts found in ${reportFolder}`);
  process.exit(1);
}
for (const downstream of ['101-report-document.yaml', '102-report-card.yaml']) {
  if (existsSync(join(reportFolder, downstream))) {
    console.warn(`[consolidate-evidence] warning: ${downstream} already exists; canonical claim IDs will be reassigned, so re-run startup-report and startup-card after consolidation.`);
    break;
  }
}

const { sources, claims, sourceIds, claimIds, evidenceGaps, sourcesConsidered } = consolidate(docs);
const ledger = buildLedger(docs, sources, claims, evidenceGaps, sourcesConsidered);

writeYaml(join(reportFolder, '100-evidence-ledger.yaml'), ledger);
for (const [file, doc] of docs) {
  writeYaml(join(reportFolder, file), rewrite(doc, file, claimIds));
}

console.log(`[consolidate-evidence] wrote ${join(reportFolder, '100-evidence-ledger.yaml')} (${sources.length} sources, ${claims.length} claims)`);

// ---------------------------------------------------------------------------

function loadAnalysisDocs(folder) {
  const map = new Map();
  for (const file of ANALYSIS_FILES) {
    const path = join(folder, file);
    if (existsSync(path)) map.set(file, readYaml(path));
  }
  return map;
}

function nextId(prefix, count) {
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}

function sourceKey(source) {
  return canonicalSourceUrl(source?.url)
    || ['fallback', source?.publisher, source?.title, source?.date].map(textKey).join('|');
}

function textKey(value) {
  return compactText(value).toLowerCase();
}

function claimKey(claim, sourceRefs) {
  return [textKey(claim?.statement), textKey(claim?.topic), [...sourceRefs].sort().join(',')].join('|');
}

function consolidateSources(docs) {
  const sourceIds = new Map();
  const sources = [];
  const seen = new Map();
  let sourcesConsidered = 0;
  for (const [file, doc] of docs) {
    const localSources = doc.localEvidence?.sources ?? [];
    sourcesConsidered += Number(doc.localEvidence?.coverage?.sourcesConsidered ?? localSources.length) || 0;
    for (const source of localSources) {
      const key = sourceKey(source);
      let finalId = seen.get(key);
      if (!finalId) {
        finalId = nextId('S', sources.length);
        seen.set(key, finalId);
        sources.push({ ...source, id: finalId });
      }
      if (source.id) sourceIds.set(`${file}:${source.id}`, finalId);
    }
  }
  return { sources, sourceIds, sourcesConsidered };
}

function consolidateClaims(docs, sourceIds) {
  const claimIds = new Map();
  const claims = [];
  const evidenceGaps = [];
  const seen = new Map();
  for (const [file, doc] of docs) {
    const local = doc.localEvidence ?? {};
    evidenceGaps.push(...(local.evidenceGaps ?? []));
    for (const claim of local.claims ?? []) {
      const sourceRefs = (claim.sourceRefs ?? []).map((ref) => sourceIds.get(`${file}:${ref}`) ?? ref);
      const key = claimKey(claim, sourceRefs);
      let finalId = seen.get(key);
      if (!finalId) {
        finalId = nextId('C', claims.length);
        seen.set(key, finalId);
        claims.push({ ...claim, id: finalId, sourceRefs });
      }
      if (claim.id) claimIds.set(`${file}:${claim.id}`, finalId);
    }
  }
  return { claims, claimIds, evidenceGaps };
}

function parseDate(value) {
  const text = asDateString(value);
  if (!text) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function monthDelta(from, to) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

function sourceFreshness(source, anchorDate) {
  const date = parseDate(source?.date ?? source?.accessDate);
  if (!date || !anchorDate) return 'unknown';
  const months = monthDelta(date, anchorDate);
  if (months < 0) return 'current';
  if (months <= 24) return 'current';
  if (months <= 60) return 'recent';
  return 'historical';
}

function summarizeRecency(runDate, sources, claims) {
  const anchorDate = parseDate(runDate);
  const sourceCounts = { current: 0, recent: 0, historical: 0, unknown: 0 };
  for (const source of sources) sourceCounts[sourceFreshness(source, anchorDate)] += 1;
  const claimCounts = { current: 0, recent: 0, historical: 0, unknown: 0 };
  for (const claim of claims) claimCounts[claim?.freshness || 'unknown'] = (claimCounts[claim?.freshness || 'unknown'] ?? 0) + 1;
  return `Anchor date ${runDate}; source dates current/recent/historical/unknown = ${sourceCounts.current}/${sourceCounts.recent}/${sourceCounts.historical}/${sourceCounts.unknown}; claim freshness current/recent/historical/unknown = ${claimCounts.current}/${claimCounts.recent}/${claimCounts.historical}/${claimCounts.unknown}.`;
}

function consolidate(docs) {
  const { sources, sourceIds, sourcesConsidered } = consolidateSources(docs);
  const { claims, claimIds, evidenceGaps } = consolidateClaims(docs, sourceIds);
  return { sources, claims, sourceIds, claimIds, evidenceGaps, sourcesConsidered };
}

function rewrite(value, file, claimIds) {
  if (Array.isArray(value)) return value.map((item) => rewrite(item, file, claimIds));
  if (value && typeof value === 'object') {
    const entries = [];
    for (const [key, child] of Object.entries(value)) {
      if (key === 'localEvidence' && !args.keepLocal) continue;
      if (key === 'claimRefs' && Array.isArray(child)) {
        entries.push([key, child.map((ref) => claimIds.get(`${file}:${ref}`) ?? ref)]);
      } else {
        entries.push([key, rewrite(child, file, claimIds)]);
      }
    }
    return Object.fromEntries(entries);
  }
  if (typeof value === 'string') {
    return value.replace(/\[C\d{3}\]/g, (match) => {
      const local = match.slice(1, -1);
      return `[${claimIds.get(`${file}:${local}`) ?? local}]`;
    });
  }
  return value;
}

function buildLedger(docs, sources, claims, evidenceGaps, sourcesConsidered) {
  const first = docs.values().next().value;
  const recencyNotes = summarizeRecency(first.runDate, sources, claims);
  return {
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
      recencyNotes,
      coverageGaps: [],
    },
    sources,
    claims,
    evidenceGaps,
  };
}

