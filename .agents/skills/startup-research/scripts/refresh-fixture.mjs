#!/usr/bin/env node
// Smoke-test the report-refresh wiring without invoking the LLM.
//
// Picks a finalized "current" report, copies its 8 chapter YAMLs +
// report-meta.yaml + evidence.yaml into a fresh run folder, runs the standard
// new-report -> finalize (with --refresh) pipeline, and (unless --keep is
// passed) restores every byte we touched on the way out so the working tree
// looks like it did before the run.
//
// What this exercises end-to-end (no LLM, no network):
//   - new-report.mjs duplicate-guard + --refresh acceptance
//   - finalize prepare-refresh (link-refresh --prepare-current)
//   - finalize ledger reuse, cross-chapter, assemble, check-report
//   - finalize link-refresh (mark old superseded + reassemble)
//   - revision-graph check via `npm run validate`
//
// Usage:
//   node .agents/skills/startup-research/scripts/refresh-fixture.mjs \
//     [<source-run-id>] [--reason <text>] [--keep]
//
//   <source-run-id>  Defaults to the newest current finalized report.
//   --reason <text>  Refresh reason recorded in revision metadata.
//   --keep           Skip post-run rollback (leaves new folder + mutated
//                    source files in place; useful for inspection).
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isFinalizedReportFolder,
  isRunId,
  listDirs,
  normalizeRevision,
  readYaml,
  reportsDir,
  writeYaml,
} from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const cacheRoot = join(repoRoot, '.research-cache');

function usage(message) {
  if (message) console.error(`[fixture] ${message}`);
  console.error('Usage: node .agents/skills/startup-research/scripts/refresh-fixture.mjs [<source-run-id>] [--reason <text>] [--keep]');
  process.exit(1);
}

function parseArgs(argv) {
  const args = { source: '', reason: '', keep: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--reason') args.reason = argv[++i] ?? '';
    else if (arg === '--keep') args.keep = true;
    else if (arg === '-h' || arg === '--help') usage();
    else if (arg.startsWith('-')) usage(`unknown flag: ${arg}`);
    else if (!args.source) args.source = arg;
    else usage(`unexpected positional argument: ${arg}`);
  }
  if (args.source && !isRunId(args.source)) usage(`invalid source run id: ${args.source}`);
  return args;
}

function pickLatestCurrentRunId() {
  const candidates = [];
  for (const runId of listDirs(reportsDir)) {
    if (!isRunId(runId)) continue;
    const folder = join(reportsDir, runId);
    if (!isFinalizedReportFolder(folder)) continue;
    const card = readYaml(join(folder, 'summary-card.yaml'));
    if (normalizeRevision(card?.revision).status === 'superseded') continue;
    candidates.push(runId);
  }
  candidates.sort((a, b) => b.localeCompare(a));
  if (!candidates.length) {
    console.error('[fixture] no current finalized report available to use as a source.');
    process.exit(2);
  }
  return candidates[0];
}

function timestampUtc(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}`
  );
}

function dateUtc(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function rewriteMetaIdentity(filePath, newSlug, newRunDate) {
  const doc = readYaml(filePath);
  if (!doc || typeof doc !== 'object') {
    console.error(`[fixture] failed to parse ${filePath} as YAML object`);
    process.exit(1);
  }
  doc.slug = newSlug;
  doc.runDate = newRunDate;
  writeYaml(filePath, doc);
}

function snapshotFile(path) {
  return existsSync(path) ? readFileSync(path) : null;
}

function restoreFile(path, bytes) {
  if (bytes === null) {
    if (existsSync(path)) rmSync(path);
    return;
  }
  writeFileSync(path, bytes);
}

function runNode(label, scriptPath, argv) {
  console.log(`[fixture] -> ${label}`);
  const result = spawnSync(process.execPath, [scriptPath, ...argv], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

function runNpm(label, scriptName) {
  console.log(`[fixture] -> ${label}`);
  const result = spawnSync('npm', ['run', scriptName], { stdio: 'inherit', cwd: repoRoot });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

const args = parseArgs(process.argv.slice(2));
const sourceRunId = args.source || pickLatestCurrentRunId();
const sourceFolder = join(reportsDir, sourceRunId);
if (!isFinalizedReportFolder(sourceFolder)) {
  console.error(`[fixture] source ${sourceRunId} is not a finalized report folder.`);
  process.exit(2);
}
const sourceMeta = readYaml(join(sourceFolder, 'report-meta.yaml'));
const sourceCard = readYaml(join(sourceFolder, 'summary-card.yaml'));
if (normalizeRevision(sourceCard?.revision).status !== 'current') {
  console.error(`[fixture] source ${sourceRunId} is not a current report; pick a different source.`);
  process.exit(2);
}
const companyName = sourceMeta?.company?.name;
const companyWebsite = sourceMeta?.company?.website ?? '';
if (!companyName) {
  console.error(`[fixture] source ${sourceRunId} has no company.name in report-meta.yaml.`);
  process.exit(2);
}

const sourceSlug = sourceRunId.slice(15); // strip leading "YYYYMMDDHHmmss-"
const newTimestamp = timestampUtc();
const newRunId = `${newTimestamp}-${sourceSlug}`;
const newFolder = join(reportsDir, newRunId);
const newCacheFolder = join(cacheRoot, newRunId);
const newRunDate = dateUtc();
const refreshReason = args.reason || `Fixture smoke test (${new Date().toISOString()})`;

if (existsSync(newFolder)) {
  console.error(`[fixture] target folder already exists: reports/${newRunId}`);
  process.exit(2);
}

const TOUCHED_SOURCE = [
  join(sourceFolder, 'report-meta.yaml'),
  join(sourceFolder, 'summary-card.yaml'),
  join(sourceFolder, 'full-report.yaml'),
];
const SNAPSHOTS = new Map();
for (const path of TOUCHED_SOURCE) {
  SNAPSHOTS.set(path, snapshotFile(path));
}

let cleanupArmed = !args.keep;
let exitCode = 0;

function cleanup() {
  if (!cleanupArmed) return;
  cleanupArmed = false;
  console.log('[fixture] -> rollback (restoring snapshots, removing fixture folder)');
  for (const [path, bytes] of SNAPSHOTS) {
    try { restoreFile(path, bytes); }
    catch (err) { console.error(`[fixture] failed to restore ${path}: ${err.message}`); }
  }
  for (const path of [newFolder, newCacheFolder]) {
    try { if (existsSync(path)) rmSync(path, { recursive: true, force: true }); }
    catch (err) { console.error(`[fixture] failed to remove ${path}: ${err.message}`); }
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

console.log(`[fixture] source: ${sourceRunId} (${companyName})`);
console.log(`[fixture] new:    ${newRunId}`);

try {
  runNode(
    'new-report',
    resolve(here, 'new-report.mjs'),
    [
      newTimestamp,
      companyName,
      ...(companyWebsite ? ['--website', companyWebsite] : []),
      '--refresh',
      '--refresh-reason', refreshReason,
    ],
  );

  if (!existsSync(newFolder)) {
    throw new Error(`new-report did not create ${newFolder}`);
  }

  console.log('[fixture] -> copy chapter fixtures + evidence + meta from source');
  const COPY_FILES = [
    '01-company-overview.yaml',
    '02-market-analysis.yaml',
    '03-competitors.yaml',
    '04-financials.yaml',
    '05-product-tech.yaml',
    '06-customers.yaml',
    '07-risks.yaml',
    '08-valuation.yaml',
    'report-meta.yaml',
    'evidence.yaml',
  ];
  for (const fileName of COPY_FILES) {
    cpSync(join(sourceFolder, fileName), join(newFolder, fileName));
    rewriteMetaIdentity(join(newFolder, fileName), newRunId, newRunDate);
  }

  runNode(
    'finalize',
    resolve(here, 'finalize.mjs'),
    [newFolder, '--refresh', '--refresh-reason', refreshReason],
  );

  runNpm('npm run validate', 'validate');

  console.log('[fixture] ✓ refresh fixture passed');
  if (args.keep) {
    cleanupArmed = false;
    console.log(`[fixture] --keep set; leaving reports/${newRunId} (and mutated source ${sourceRunId}) in place.`);
    console.log('[fixture] manual rollback:');
    console.log(`  rm -rf reports/${newRunId} .research-cache/${newRunId}`);
    console.log(`  git checkout -- reports/${sourceRunId}/{report-meta,summary-card,full-report}.yaml`);
  }
} catch (err) {
  console.error(`[fixture] ✗ ${err.message}`);
  exitCode = 1;
} finally {
  cleanup();
}

process.exit(exitCode);
