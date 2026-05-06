#!/usr/bin/env node
// Link a newly finalized refresh report to the previous report it replaces.
//
// Modes:
//   --prepare-current  Update only the new report's report-meta.yaml revision
//                      before the normal finalize Phase 1 runs.
//   default            Ensure the new report is marked current/refresh-of, then
//                      mark the old report superseded and reassemble/check the
//                      old report. Intended for finalize Phase 2 after the new
//                      report already passed its publishable gate.
//
// The previous report is resolved automatically: the newest finalized
// non-superseded report whose summary-card matches the new report's
// company.name or company.website. Refusing to refresh anything other than
// that single current report keeps the duplicate-guard invariants intact.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isFinalizedReportFolder,
  isRunId,
  listDirs,
  normalizeCompanyName,
  normalizeDomain,
  normalizeRevision,
  readYaml,
  reportsDir,
  writeYaml,
} from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/link-refresh.mjs <new-report-folder> [--refresh-reason <text>] [--prepare-current]');
  process.exit(1);
}

function abort(message, code = 1) {
  console.error(`[refresh] ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { folder: null, refreshReason: '', prepareCurrent: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--refresh-reason') args.refreshReason = argv[++i] ?? '';
    else if (arg === '--prepare-current') args.prepareCurrent = true;
    else if (arg.startsWith('-')) usage();
    else if (!args.folder) args.folder = arg;
    else usage();
  }
  if (!args.folder) usage();
  return args;
}

function resolveReportFolder(folderArg) {
  const folder = resolve(folderArg);
  if (!existsSync(folder)) abort(`report folder not found: ${folder}`, 2);
  const runId = basename(folder);
  if (resolve(reportsDir, runId) !== folder) abort(`report folder must live under ${reportsDir}: ${folder}`, 2);
  if (!isRunId(runId)) abort(`report folder name is not a valid run id: ${runId}`, 2);
  return { folder, runId };
}

function readReportMeta(folder) {
  const path = join(folder, 'report-meta.yaml');
  if (!existsSync(path)) abort(`missing report-meta.yaml in ${folder}`, 2);
  return { path, doc: readYaml(path) };
}

function readSummaryCard(runId) {
  const path = join(reportsDir, runId, 'summary-card.yaml');
  return existsSync(path) ? readYaml(path) : null;
}

function matchesCompany(card, company) {
  const candidateName = normalizeCompanyName(company?.name);
  const candidateDomain = normalizeDomain(company?.website);
  const cardName = normalizeCompanyName(card?.company?.name);
  const cardDomain = normalizeDomain(card?.company?.website);
  const sameName = candidateName && cardName && candidateName === cardName;
  const sameDomain = candidateDomain && cardDomain && candidateDomain === cardDomain;
  return Boolean(sameName || sameDomain);
}

function assertFinalizedRun(runId, label) {
  const folder = join(reportsDir, runId);
  if (!isFinalizedReportFolder(folder)) abort(`${label} is not a finalized report: reports/${runId}`, 2);
}

function resolvePreviousRunId({ newRunId, newMeta }) {
  const candidates = [];
  for (const runId of listDirs(reportsDir)) {
    if (runId === newRunId) continue;
    if (!isRunId(runId)) continue;
    if (!isFinalizedReportFolder(join(reportsDir, runId))) continue;
    const card = readSummaryCard(runId);
    if (!matchesCompany(card, newMeta.company)) continue;
    const revision = normalizeRevision(card?.revision);
    if (revision.status === 'superseded') continue;
    candidates.push(runId);
  }
  candidates.sort((a, b) => b.localeCompare(a));
  if (!candidates.length) abort('could not find a current finalized report matching the new report company/domain', 2);
  return candidates[0];
}

function assertRefreshableOld(oldRunId, newRunId) {
  const oldCard = readSummaryCard(oldRunId);
  const oldRevision = normalizeRevision(oldCard?.revision);
  if (oldRevision.status === 'superseded' && oldRevision.supersededByRunId !== newRunId) {
    abort(`${oldRunId} is already superseded by ${oldRevision.supersededByRunId}; refresh the current report instead.`, 2);
  }
}

function updateMetaRevision(metaPath, nextRevision) {
  const doc = readYaml(metaPath);
  const before = JSON.stringify(doc.revision ?? null);
  doc.revision = nextRevision;
  const after = JSON.stringify(doc.revision ?? null);
  if (before !== after) {
    writeYaml(metaPath, doc);
    return true;
  }
  return false;
}

function runScript(script, argv) {
  console.log(`[refresh] -> ${script} ${argv.join(' ')}`);
  const result = spawnSync(process.execPath, [resolve(here, script), ...argv], { stdio: 'inherit' });
  if (result.status !== 0) abort(`${script} failed (exit ${result.status})`, result.status ?? 1);
}

function setCurrentRevision({ newFolder, newRunId, oldRunId, refreshReason }) {
  assertRefreshableOld(oldRunId, newRunId);
  const { path: newMetaPath, doc: newMeta } = readReportMeta(newFolder);
  const existing = normalizeRevision(newMeta.revision);
  const nextRevision = {
    status: 'current',
    refreshOfRunId: oldRunId,
    supersededByRunId: null,
    refreshReason: refreshReason || existing.refreshReason || null,
  };
  return updateMetaRevision(newMetaPath, nextRevision);
}

function setOldRevision({ oldRunId, newRunId, refreshReason }) {
  const oldFolder = join(reportsDir, oldRunId);
  const { path: oldMetaPath, doc: oldMeta } = readReportMeta(oldFolder);
  const existing = normalizeRevision(oldMeta.revision);
  if (existing.status === 'superseded' && existing.supersededByRunId === newRunId) return false;
  if (existing.status === 'superseded') abort(`${oldRunId} is already superseded by ${existing.supersededByRunId}; refusing to relink.`, 2);
  const nextRevision = {
    status: 'superseded',
    refreshOfRunId: existing.refreshOfRunId,
    supersededByRunId: newRunId,
    refreshReason: existing.refreshReason || refreshReason || null,
  };
  return updateMetaRevision(oldMetaPath, nextRevision);
}

const args = parseArgs(process.argv.slice(2));
const { folder: newFolder, runId: newRunId } = resolveReportFolder(args.folder);
const { doc: newMeta } = readReportMeta(newFolder);
const oldRunId = resolvePreviousRunId({ newRunId, newMeta });
if (oldRunId === newRunId) abort('new report cannot refresh itself', 2);

const currentChanged = setCurrentRevision({ newFolder, newRunId, oldRunId, refreshReason: args.refreshReason });
console.log(`[refresh] current report ${newRunId} refreshOfRunId=${oldRunId}${currentChanged ? ' (updated)' : ' (already set)'}`);

if (args.prepareCurrent) {
  process.exit(0);
}

if (currentChanged) {
  runScript('assemble.mjs', [newFolder]);
  runScript('check-report.mjs', [newFolder]);
}

assertFinalizedRun(newRunId, 'new refresh report');
const oldChanged = setOldRevision({ oldRunId, newRunId, refreshReason: args.refreshReason });
console.log(`[refresh] previous report ${oldRunId} supersededByRunId=${newRunId}${oldChanged ? ' (updated)' : ' (already set)'}`);
if (oldChanged) {
  const oldFolder = join(reportsDir, oldRunId);
  runScript('assemble.mjs', [oldFolder]);
  runScript('check-report.mjs', [oldFolder]);
}
console.log(`[refresh] ✓ linked ${oldRunId} -> ${newRunId}`);
