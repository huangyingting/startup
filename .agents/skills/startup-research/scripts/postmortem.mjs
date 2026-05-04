#!/usr/bin/env node
// Append a per-run postmortem record to reports/_postmortem.yaml so future
// gate calibration is data-driven, not anecdote-driven.
//
// MUST run BEFORE ledger.mjs consolidates per-chapter localEvidence into
// evidence.yaml — otherwise per-chapter source stance / accessStatus counts
// are unrecoverable. finalize.mjs places this step first.
//
// Reads the report folder (chapters with intact localEvidence + report-meta.yaml)
// and records, for each chapter:
//   - source counts (total, adverse, restricted-access)
//   - distinct registrable domains, distinct sourceType values
//   - researchQuestion counts (total, unanswered)
//   - claim counts by type
//   - acknowledgedWarnings dimensions
// Plus report-level totals.
//
// Idempotent for a given runId: re-running replaces the prior record instead
// of appending duplicates.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  canonicalSourceUrl,
  getAnalysisArtifacts,
  normalizeDomain,
  readYaml,
  reportsDir,
  tryReadYaml,
} from './utils.mjs';

const POSTMORTEM_PATH = join(reportsDir, '_postmortem.yaml');
const RESTRICTED_ACCESS = new Set(['paywall', 'js-only', 'broken', 'rate-limited']);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/postmortem.mjs <report-folder>');
  process.exit(1);
}

function registrableDomain(url) {
  const host = normalizeDomain(url);
  if (!host) return '';
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const multiPart = new Set(['co.uk', 'co.jp', 'com.cn', 'com.hk', 'com.au', 'com.br', 'gov.uk', 'gov.cn']);
  const lastTwo = parts.slice(-2).join('.');
  return multiPart.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo;
}

function chapterStats(reportFolder, spec) {
  const path = join(reportFolder, spec.file);
  if (!existsSync(path)) return null;
  const result = tryReadYaml(path);
  if (!result.ok) return { file: spec.file, parseError: result.error };
  const doc = result.value ?? {};

  const sources = doc.localEvidence?.sources ?? [];
  const claims = doc.localEvidence?.claims ?? [];
  const questions = doc.localEvidence?.researchQuestions ?? [];

  const domains = new Set();
  const sourceTypes = new Set();
  let adverse = 0;
  let restricted = 0;
  for (const s of sources) {
    if (s?.stance === 'adverse') adverse += 1;
    if (RESTRICTED_ACCESS.has(s?.accessStatus)) restricted += 1;
    if (s?.sourceType) sourceTypes.add(s.sourceType);
    const dom = registrableDomain(s?.url);
    if (dom) domains.add(dom);
  }

  const claimsByType = {};
  for (const c of claims) {
    const t = c?.type ?? 'unknown';
    claimsByType[t] = (claimsByType[t] ?? 0) + 1;
  }

  const unanswered = questions.filter((q) => q?.status !== 'answered').length;

  const acks = Array.isArray(doc.acknowledgedWarnings) ? doc.acknowledgedWarnings : [];
  const acknowledgedDimensions = [...new Set(acks.map((a) => a?.dimension).filter(Boolean))];

  const total = sources.length;
  return {
    file: spec.file,
    sources: total,
    adverseSources: adverse,
    adversePct: total ? +(adverse / total).toFixed(3) : 0,
    restrictedAccessPct: total ? +(restricted / total).toFixed(3) : 0,
    domains: domains.size,
    sourceTypes: sourceTypes.size,
    researchQuestions: questions.length,
    unanswered,
    claimsByType,
    acknowledgedDimensions,
  };
}

function buildRecord(reportFolder) {
  const runId = basename(reportFolder);
  // Prefer report-meta.yaml (hand-authored, present before ledger consolidation);
  // fall back to summary-card.yaml if postmortem is re-run after assemble.
  const metaPath = join(reportFolder, 'report-meta.yaml');
  const cardPath = join(reportFolder, 'summary-card.yaml');
  let meta = null;
  if (existsSync(metaPath)) meta = readYaml(metaPath);
  else if (existsSync(cardPath)) meta = readYaml(cardPath);
  else {
    console.error(`[postmortem] missing both ${metaPath} and ${cardPath}; cannot identify the run.`);
    process.exit(1);
  }
  const specs = getAnalysisArtifacts();

  const chapters = [];
  for (const spec of specs) {
    const stats = chapterStats(reportFolder, spec);
    if (stats) chapters.push(stats);
  }

  const totalSources = chapters.reduce((sum, c) => sum + (c.sources ?? 0), 0);
  const totalAdverse = chapters.reduce((sum, c) => sum + (c.adverseSources ?? 0), 0);
  const totalRestrictedSources = chapters.reduce((sum, c) => {
    const total = c.sources ?? 0;
    return sum + Math.round((c.restrictedAccessPct ?? 0) * total);
  }, 0);
  const acknowledgedDimensions = [...new Set(chapters.flatMap((c) => c.acknowledgedDimensions ?? []))];
  const claimsByType = {};
  for (const c of chapters) {
    for (const [t, n] of Object.entries(c.claimsByType ?? {})) {
      claimsByType[t] = (claimsByType[t] ?? 0) + n;
    }
  }

  return {
    runId,
    runDate: meta.runDate ?? null,
    companyName: meta.company?.name ?? null,
    sector: meta.company?.sector ?? null,
    stage: meta.company?.stage ?? null,
    disclosureProfile: meta.companyProfile?.disclosureProfile ?? null,
    recommendation: meta.summary?.recommendation ?? null,
    chapterCount: chapters.length,
    totals: {
      sources: totalSources,
      adverseSources: totalAdverse,
      adversePct: totalSources ? +(totalAdverse / totalSources).toFixed(3) : 0,
      restrictedAccessPct: totalSources ? +(totalRestrictedSources / totalSources).toFixed(3) : 0,
      claimsByType,
      acknowledgedDimensions,
    },
    chapters,
  };
}

function loadLedger() {
  if (!existsSync(POSTMORTEM_PATH)) return { schemaVersion: 'postmortem-v1', runs: [] };
  const text = readFileSync(POSTMORTEM_PATH, 'utf8');
  const doc = yaml.load(text) ?? {};
  return {
    schemaVersion: doc.schemaVersion ?? 'postmortem-v1',
    runs: Array.isArray(doc.runs) ? doc.runs : [],
  };
}

function writeLedger(ledger) {
  writeFileSync(
    POSTMORTEM_PATH,
    yaml.dump(ledger, { lineWidth: 120, noRefs: true, sortKeys: false }),
    'utf8',
  );
}

const folderArg = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
if (!folderArg) usage();

const reportFolder = resolve(folderArg);
if (!existsSync(reportFolder)) {
  console.error(`[postmortem] report folder not found: ${reportFolder}`);
  process.exit(1);
}

const record = buildRecord(reportFolder);
const ledger = loadLedger();
ledger.runs = ledger.runs.filter((entry) => entry.runId !== record.runId);
ledger.runs.push(record);
ledger.runs.sort((a, b) => String(b.runId).localeCompare(String(a.runId)));
writeLedger(ledger);

console.log(`[postmortem] ✓ recorded ${record.runId} (chapters=${record.chapterCount}, sources=${record.totals.sources}, adversePct=${record.totals.adversePct}, restrictedPct=${record.totals.restrictedAccessPct})`);
