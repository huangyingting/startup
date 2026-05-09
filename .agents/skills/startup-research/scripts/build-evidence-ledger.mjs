#!/usr/bin/env node
// Consolidate localEvidence from configured analysis artifacts into a single
// evidence.yaml.
//
// New ID architecture: each chapter generates its own IDs from its
// `letter:` (per workflow-config.yaml), e.g. SO001/CO045 for company-overview,
// SM001/CM045 for market-analysis. IDs are never renumbered.
//
// Consolidation:
//   - Sources: deduped by canonical URL. The first occurrence wins as
//     `canonical`; subsequent duplicates are kept in the ledger but tagged
//     with `canonical: <firstId>` so the website can resolve to one entry.
//   - Claims: same treatment, keyed by statement+topic+canonicalized sourceRefs.
//   - evidenceGaps: aggregated from all chapters as-is (no dedup needed
//     because each gap carries chapter-letter-scoped relatedQuestionRefs).
//
// Chapter YAMLs are NEVER rewritten. The local IDs in each chapter file are
// already the canonical (or canonicalable) IDs because of the chapter-letter
// namespace. This makes chapter generation fully parallel-safe.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EXIT, canonicalSourceUrl, FINAL_ARTIFACTS, getAnalysisArtifacts, loadWorkflowConfig, parseDate, readYaml, registrableDomain, writeYaml } from './utils.mjs';
import { FRESHNESS_THRESHOLDS, EVIDENCE_QUALITY_TIERS } from './validation-catalog.mjs';

// Local: collapse all whitespace runs to single spaces, trim, and lowercase
// for source/claim deduplication keys.
function textKey(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

const WORKFLOW_CONFIG = loadWorkflowConfig();
const ANALYSIS_FILES = getAnalysisArtifacts(WORKFLOW_CONFIG).map((item) => item.file);
const EVIDENCE_FILE = FINAL_ARTIFACTS.evidence.file;

function parseArgs(argv) {
  const args = { folder: null };
  for (const arg of argv) {
    if (arg.startsWith('-')) {
      console.error(`[evidence-ledger] unknown flag: ${arg}\nUsage: node .agents/skills/startup-research/scripts/build-evidence-ledger.mjs <report-folder>`);
      process.exit(EXIT.failure);
    } else if (!args.folder) args.folder = arg;
    else {
      console.error(`[evidence-ledger] unexpected positional argument: ${arg}\nUsage: node .agents/skills/startup-research/scripts/build-evidence-ledger.mjs <report-folder>`);
      process.exit(EXIT.failure);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder) {
  console.error('Usage: node .agents/skills/startup-research/scripts/build-evidence-ledger.mjs <report-folder>');
  process.exit(EXIT.failure);
}

const reportFolder = resolve(args.folder);
const docs = loadAnalysisDocs(reportFolder);
if (!docs.size) {
  console.error(`[evidence-ledger] no report artifacts found in ${reportFolder}`);
  process.exit(EXIT.notFound);
}

const { sources, claims, evidenceGaps, duplicateSourceCount, duplicateClaimCount } = consolidate(docs);
const ledger = buildLedger(docs, sources, claims, evidenceGaps);

writeYaml(join(reportFolder, EVIDENCE_FILE), ledger);
console.log(`[evidence-ledger] wrote ${join(reportFolder, EVIDENCE_FILE)} (${sources.length} sources [${duplicateSourceCount} duplicates], ${claims.length} claims [${duplicateClaimCount} duplicates])`);

// ---------------------------------------------------------------------------

function loadAnalysisDocs(folder) {
  const map = new Map();
  for (const file of ANALYSIS_FILES) {
    const path = join(folder, file);
    if (existsSync(path)) map.set(file, readYaml(path));
  }
  return map;
}

function sourceKey(source) {
  return canonicalSourceUrl(source?.url)
    || ['fallback', source?.publisher, source?.title, source?.date].map(textKey).join('|');
}

function claimKey(claim, canonicalIdBySourceId = new Map()) {
  const sourceRefs = claim.sourceRefs ?? [];
  const canonicalRefs = sourceRefs.map((ref) => canonicalIdBySourceId.get(ref) ?? ref);
  return [textKey(claim?.statement), textKey(claim?.topic), [...canonicalRefs].sort().join(',')].join('|');
}

// Aggregate sources from every chapter, preserving original chapter-letter
// IDs (SO001, SM045, ...). The first occurrence of a canonical URL becomes
// the canonical entry; later duplicates keep their own id but carry a
// `canonical` field pointing to the first id so the website can resolve to
// one bibliography entry.
function consolidateSources(docs) {
  const sources = [];
  const canonicalByKey = new Map(); // urlKey -> first id seen
  const canonicalIdBySourceId = new Map(); // source id -> canonical source id
  let duplicateCount = 0;
  for (const [, doc] of docs) {
    for (const source of doc.localEvidence?.sources ?? []) {
      const key = sourceKey(source);
      const existingCanonical = canonicalByKey.get(key);
      if (existingCanonical && existingCanonical !== source.id) {
        // Keep the duplicate but tag it as canonical-of the first id.
        sources.push({ ...source, canonical: existingCanonical });
        if (source?.id) canonicalIdBySourceId.set(source.id, existingCanonical);
        duplicateCount += 1;
      } else {
        if (!existingCanonical) canonicalByKey.set(key, source.id);
        if (source?.id) canonicalIdBySourceId.set(source.id, source.id);
        sources.push({ ...source });
      }
    }
  }
  return { sources, duplicateCount, canonicalIdBySourceId };
}

// Aggregate claims from every chapter, preserving original chapter-letter
// IDs (CO001, CM045, ...). Same canonical-tagging strategy as sources.
function consolidateClaims(docs, canonicalIdBySourceId) {
  const claims = [];
  const evidenceGaps = [];
  const canonicalByKey = new Map();
  let duplicateCount = 0;
  for (const [, doc] of docs) {
    const local = doc.localEvidence ?? {};
    evidenceGaps.push(...(local.evidenceGaps ?? []));
    for (const claim of local.claims ?? []) {
      // `corroboration` is derived from sourceRefs.length; do not persist it.
      const { corroboration: _drop, ...rest } = claim;
      const key = claimKey(claim, canonicalIdBySourceId);
      const existingCanonical = canonicalByKey.get(key);
      if (existingCanonical && existingCanonical !== claim.id) {
        claims.push({ ...rest, canonical: existingCanonical });
        duplicateCount += 1;
      } else {
        if (!existingCanonical) canonicalByKey.set(key, claim.id);
        claims.push({ ...rest });
      }
    }
  }
  return { claims, evidenceGaps, duplicateCount };
}

function monthDelta(from, to) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

function sourceFreshness(source, anchorDate) {
  const date = parseDate(source?.date ?? source?.accessDate);
  if (!date || !anchorDate) return 'unknown';
  const months = monthDelta(date, anchorDate);
  if (months < 0) return 'current';
  if (months <= FRESHNESS_THRESHOLDS.current) return 'current';
  if (months <= FRESHNESS_THRESHOLDS.recent) return 'recent';
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
  const sourceResult = consolidateSources(docs);
  const claimResult = consolidateClaims(docs, sourceResult.canonicalIdBySourceId);
  return {
    sources: sourceResult.sources,
    claims: claimResult.claims,
    evidenceGaps: claimResult.evidenceGaps,
    duplicateSourceCount: sourceResult.duplicateCount,
    duplicateClaimCount: claimResult.duplicateCount,
  };
}

function buildLedger(docs, sources, claims, evidenceGaps) {
  const first = docs.values().next().value;
  const recencyNotes = summarizeRecency(first.runDate, sources, claims);
  const coverageMatrix = buildCoverageMatrix(docs, sources, claims);
  return {
    schemaVersion: first.schemaVersion,
    artifact: 'evidence',
    slug: first.slug,
    runDate: first.runDate,
    company: first.company,
    coverage: {
      evidenceQuality: inferEvidenceQuality(sources, claims),
      sourceDiversityNotes: null,
      deduplicationNotes: `Consolidated from ${docs.size} artifacts; sources deduplicated by canonical URL or publisher/title/date fallback; claims deduplicated by statement, topic, and canonicalized sourceRefs.`,
      recencyNotes,
      coverageGaps: [],
    },
    coverageMatrix,
    sources,
    claims,
    evidenceGaps,
  };
}

function buildCoverageMatrix(docs, sources, claims) {
  const byChapter = {};
  for (const [file, doc] of docs) {
    const localSources = doc.localEvidence?.sources ?? [];
    const localClaims = doc.localEvidence?.claims ?? [];
    const localQuestions = doc.localEvidence?.researchQuestions ?? [];
    const adverseQuestions = localQuestions.filter((q) => q?.type === 'adverse').length;
    const unresolvedQuestions = localQuestions.filter((q) => q?.status && q.status !== 'answered').length;
    const distinctDomains = new Set(
      localSources
        .map((s) => registrableDomain(s?.url))
        .filter(Boolean),
    );
    byChapter[file] = {
      sources: localSources.length,
      claims: localClaims.length,
      researchQuestions: localQuestions.length,
      adverseQuestions,
      unresolvedQuestions,
      distinctDomains: distinctDomains.size,
    };
  }
  const byType = {};
  for (const source of sources) {
    const key = source?.sourceType ?? 'unknown';
    byType[key] = (byType[key] ?? 0) + 1;
  }
  const byStance = {};
  for (const source of sources) {
    const key = source?.stance ?? 'unknown';
    byStance[key] = (byStance[key] ?? 0) + 1;
  }
  const byAccessStatus = {};
  for (const source of sources) {
    const key = source?.accessStatus ?? 'unknown';
    byAccessStatus[key] = (byAccessStatus[key] ?? 0) + 1;
  }
  const byClaimType = {};
  for (const claim of claims) {
    const key = claim?.type ?? 'unknown';
    byClaimType[key] = (byClaimType[key] ?? 0) + 1;
  }
  const distinctDomains = new Set(sources.map((s) => registrableDomain(s?.url)).filter(Boolean));
  return {
    totalDistinctDomains: distinctDomains.size,
    byChapter,
    byType,
    byStance,
    byAccessStatus,
    byClaimType,
  };
}

function inferEvidenceQuality(sources, claims) {
  if (!sources.length || !claims.length) return 'unknown';
  const independentCount = sources.filter((source) => source.independence === 'independent').length;
  const highReputationCount = sources.filter((source) => source.reputationTier === 'high').length;
  // corroboration is derived from sourceRefs length (≥2 sources => multi-source).
  const multiSourceClaims = claims.filter((claim) => (claim.sourceRefs ?? []).length >= 2).length;
  const independentShare = independentCount / sources.length;
  const highReputationShare = highReputationCount / sources.length;
  const multiSourceShare = multiSourceClaims / claims.length;
  
  const high = EVIDENCE_QUALITY_TIERS.high;
  if (
    sources.length >= high.minSources &&
    claims.length >= high.minClaims &&
    independentShare >= high.minIndependentShare &&
    highReputationShare >= high.minHighReputationShare &&
    multiSourceShare >= high.minMultiSourceShare
  ) return 'high';
  
  const medium = EVIDENCE_QUALITY_TIERS.medium;
  const reputationOk = highReputationShare >= medium.minHighReputationShare;
  const independenceOk = independentShare >= medium.minIndependentShare;
  const reputationCheck = medium.requireBoth ? (reputationOk && independenceOk) : (reputationOk || independenceOk);
  if (sources.length >= medium.minSources && claims.length >= medium.minClaims && reputationCheck) return 'medium';
  return 'low';
}

