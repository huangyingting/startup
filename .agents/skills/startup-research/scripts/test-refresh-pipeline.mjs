#!/usr/bin/env node
// Smoke-test the report-refresh wiring without invoking the LLM.
//
// Picks a finalized "current" report, copies its 8 chapter YAMLs +
// report-meta.yaml + evidence.yaml into a fresh run folder, runs the standard
// create-report-run -> finalize-report (with --refresh) pipeline, and (unless --keep is
// passed) restores every byte we touched on the way out so the working tree
// looks like it did before the run.
//
// What this exercises end-to-end (no LLM, no network):
//   - create-report-run.mjs duplicate-guard + --refresh acceptance
//   - finalize-report prepare-refresh (link-refresh --prepare-current)
//   - finalize-report build-evidence-ledger reuse, cross-chapter consistency, assemble-report, check-report
//   - finalize-report link-refresh (mark old superseded + reassemble)
//   - revision-graph check via `npm run validate`
//
// Usage:
//   node .agents/skills/startup-research/scripts/test-refresh-pipeline.mjs \
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
  getAnalysisChapterFiles,
  companySlugFromRunId,
  EXIT,
  FINAL_ARTIFACTS,
  isFinalizedReportFolder,
  isRunId,
  listDirs,
  normalizeRevision,
  nowRunTimestamp,
  readYaml,
  REPORT_META_FILE,
  reportsDir,
  researchCacheDir,
  runDateFromRunId,
  writeYaml,
} from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const EVIDENCE_FILE = FINAL_ARTIFACTS.evidence.file;
const FULL_REPORT_FILE = FINAL_ARTIFACTS.fullReport.file;
const SUMMARY_CARD_FILE = FINAL_ARTIFACTS.summaryCard.file;

function usage(message) {
  if (message) console.error(`[refresh-test] ${message}`);
  console.error('Usage: node .agents/skills/startup-research/scripts/test-refresh-pipeline.mjs [<source-run-id>] [--reason <text>] [--keep]');
  process.exit(EXIT.failure);
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
    const card = readYaml(join(folder, SUMMARY_CARD_FILE));
    if (normalizeRevision(card?.revision).status === 'superseded') continue;
    candidates.push(runId);
  }
  candidates.sort((a, b) => b.localeCompare(a));
  if (!candidates.length) {
    console.error('[refresh-test] no current finalized report available to use as a source.');
    process.exit(EXIT.alreadyExists);
  }
  return candidates[0];
}

function rewriteMetaIdentity(filePath, newSlug, newRunDate) {
  const doc = readYaml(filePath);
  if (!doc || typeof doc !== 'object') {
    console.error(`[refresh-test] failed to parse ${filePath} as YAML object`);
    process.exit(EXIT.failure);
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
  console.log(`[refresh-test] -> ${label}`);
  const result = spawnSync(process.execPath, [scriptPath, ...argv], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

function runNpm(label, scriptName) {
  console.log(`[refresh-test] -> ${label}`);
  const result = spawnSync('npm', ['run', scriptName], { stdio: 'inherit', cwd: repoRoot });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

const args = parseArgs(process.argv.slice(2));
const sourceRunId = args.source || pickLatestCurrentRunId();
const sourceFolder = join(reportsDir, sourceRunId);
if (!isFinalizedReportFolder(sourceFolder)) {
  console.error(`[refresh-test] source ${sourceRunId} is not a finalized report folder.`);
  process.exit(EXIT.failure);
}
const sourceMeta = readYaml(join(sourceFolder, REPORT_META_FILE));
const sourceCard = readYaml(join(sourceFolder, SUMMARY_CARD_FILE));
if (normalizeRevision(sourceCard?.revision).status !== 'current') {
  console.error(`[refresh-test] source ${sourceRunId} is not a current report; pick a different source.`);
  process.exit(EXIT.failure);
}
const companyName = sourceMeta?.company?.name;
const companyWebsite = sourceMeta?.company?.website ?? '';
if (!companyName) {
  console.error(`[refresh-test] source ${sourceRunId} has no company.name in report-meta.yaml.`);
  process.exit(EXIT.failure);
}

const sourceSlug = companySlugFromRunId(sourceRunId);
const newTimestamp = nowRunTimestamp();
const newRunId = `${newTimestamp}-${sourceSlug}`;
const newFolder = join(reportsDir, newRunId);
const newCacheFolder = researchCacheDir(newRunId);
const newRunDate = runDateFromRunId(newRunId);
const refreshReason = args.reason || `Fixture smoke test (${new Date().toISOString()})`;

if (existsSync(newFolder)) {
  console.error(`[refresh-test] target folder already exists: reports/${newRunId}`);
  process.exit(EXIT.alreadyExists);
}

const TOUCHED_SOURCE = [
  join(sourceFolder, REPORT_META_FILE),
  join(sourceFolder, SUMMARY_CARD_FILE),
  join(sourceFolder, FULL_REPORT_FILE),
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
  console.log('[refresh-test] -> rollback (restoring snapshots, removing fixture folder)');
  for (const [path, bytes] of SNAPSHOTS) {
    try { restoreFile(path, bytes); }
    catch (err) { console.error(`[refresh-test] failed to restore ${path}: ${err.message}`); }
  }
  for (const path of [newFolder, newCacheFolder]) {
    try { if (existsSync(path)) rmSync(path, { recursive: true, force: true }); }
    catch (err) { console.error(`[refresh-test] failed to remove ${path}: ${err.message}`); }
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(130); });   // POSIX 128 + SIGINT(2)
process.on('SIGTERM', () => { cleanup(); process.exit(143); });  // POSIX 128 + SIGTERM(15)

console.log(`[refresh-test] source: ${sourceRunId} (${companyName})`);
console.log(`[refresh-test] new:    ${newRunId}`);

try {
  runNode(
    'create-report-run',
    resolve(here, 'create-report-run.mjs'),
    [
      // Pin --timestamp so the predict-then-invoke pattern (snapshots /
      // cleanup tracking computed before the script runs) sees the same
      // runId the script materializes. Production callers omit --timestamp
      // and let create-report-run.mjs anchor the run with the system clock.
      '--timestamp', newTimestamp,
      companyName,
      ...(companyWebsite ? ['--website', companyWebsite] : []),
      '--refresh',
      '--refresh-reason', refreshReason,
    ],
  );

  if (!existsSync(newFolder)) {
    throw new Error(`create-report-run did not create ${newFolder}`);
  }

  console.log('[refresh-test] -> copy chapter fixtures + evidence + meta from source');
  // Pull the chapter file list from the workflow config so adding/removing a
  // chapter only requires editing workflow-config.yaml, not this fixture script.
  const COPY_FILES = [
    ...getAnalysisChapterFiles(),
    REPORT_META_FILE,
    EVIDENCE_FILE,
  ];
  for (const fileName of COPY_FILES) {
    cpSync(join(sourceFolder, fileName), join(newFolder, fileName));
    rewriteMetaIdentity(join(newFolder, fileName), sourceSlug, newRunDate);
  }

  runNode(
    'finalize-report',
    resolve(here, 'finalize-report.mjs'),
    [newFolder, '--refresh', '--refresh-reason', refreshReason],
  );

  runNpm('npm run validate', 'validate');

  console.log('[refresh-test] ✓ refresh pipeline test passed');
  if (args.keep) {
    cleanupArmed = false;
    console.log(`[refresh-test] --keep set; leaving reports/${newRunId} (and mutated source ${sourceRunId}) in place.`);
    console.log('[refresh-test] manual rollback:');
    console.log(`  rm -rf reports/${newRunId} .research-cache/${newRunId}`);
    console.log(`  git checkout -- reports/${sourceRunId}/{report-meta,summary-card,full-report}.yaml`);
  }
} catch (err) {
  console.error(`[refresh-test] ✗ ${err.message}`);
  exitCode = 1;
} finally {
  cleanup();
}

process.exit(exitCode);
