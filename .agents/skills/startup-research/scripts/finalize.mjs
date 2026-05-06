#!/usr/bin/env node
// Run the post-chapter finalization pipeline as a single command. The pipeline
// has two phases:
//
// Phase 1 — per-report (everything that touches THIS report only):
//   1. ledger.mjs       -> evidence.yaml + rewrite chapter claimRefs (only on
//                          first finalize, or when --rebuild is passed)
//   2. cross-chapter.mjs -> drift checks across chapters (caught BEFORE
//                           assemble so fixing report-meta.yaml or a chapter
//                           does not require throwing away assembled output)
//   3. assemble.mjs     -> full-report.yaml + summary-card.yaml
//   4. check-report.mjs -> schema/contract validation; this is the gate that
//                          decides whether the report is publishable
//
// Phase 2 — commit (global state, only runs after Phase 1 succeeds):
//   5. link-refresh.mjs -> optional; mark the previous report superseded
//   6. postmortem.mjs   -> append a record to reports/_postmortem.yaml
//   7. build-index.mjs  -> rebuild reports/_index.yaml (skip with --skip-index)
//
// Splitting like this means a failure in Phase 1 leaves global state untouched
// (no half-published report in _index.yaml, no postmortem entry for a report
// that never validated). Re-runs after fixing report-meta.yaml or a chapter
// reuse the existing evidence.yaml; pass --rebuild to force a full rebuild
// (ledger reassigns canonical claim IDs, so this only when you want fresh ones).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FINAL_ARTIFACTS } from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/finalize.mjs <report-folder> [--skip-index] [--rebuild] [--refresh-of <runId|latest>] [--refresh-reason <text>]');
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = { folder: null, skipIndex: false, rebuild: false, refreshOf: '', refreshReason: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skip-index') parsed.skipIndex = true;
    else if (arg === '--rebuild') parsed.rebuild = true;
    else if (arg === '--refresh-of') parsed.refreshOf = argv[++i] ?? '';
    else if (arg === '--refresh-reason') parsed.refreshReason = argv[++i] ?? '';
    else if (arg.startsWith('-')) usage();
    else if (!parsed.folder) parsed.folder = arg;
    else usage();
  }
  return parsed;
}

const parsedArgs = parseArgs(args);
const folderArg = parsedArgs.folder;
const skipIndex = parsedArgs.skipIndex;
const rebuild = parsedArgs.rebuild;
const refreshOf = parsedArgs.refreshOf;
const refreshReason = parsedArgs.refreshReason;

if (!folderArg) {
  usage();
}

const reportFolder = resolve(folderArg);
if (!existsSync(reportFolder)) {
  console.error(`[finalize] report folder not found: ${reportFolder}`);
  process.exit(1);
}
if (!existsSync(`${reportFolder}/report-meta.yaml`)) {
  console.error(`[finalize] missing report-meta.yaml in ${reportFolder}; author it before finalizing.`);
  process.exit(1);
}

function runStep(step) {
  console.log(`[finalize] -> ${step.name}`);
  const result = spawnSync(process.execPath, [resolve(here, step.script), ...step.argv], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[finalize] ${step.name} failed (exit ${result.status}); fix the reported issues and re-run finalize.`);
    process.exit(result.status ?? 1);
  }
}

if (refreshOf) {
  const refreshArgs = [reportFolder, '--refresh-of', refreshOf, '--prepare-current'];
  if (refreshReason) refreshArgs.push('--refresh-reason', refreshReason);
  runStep({ name: 'prepare-refresh', script: 'link-refresh.mjs', argv: refreshArgs });
}

// Phase 1 — per-report. ledger only when there is no evidence.yaml yet (or
// when --rebuild forces a fresh consolidation). evidence.yaml is preserved
// across re-runs so canonical claim IDs stay stable; the chapter source of
// truth (localEvidence) is preserved by ledger so the agent always has a
// place to fix evidence-shape problems.
const hasExistingEvidence = existsSync(join(reportFolder, FINAL_ARTIFACTS.evidence.file));
const needsLedger = !hasExistingEvidence || rebuild;
const phase1 = [];
if (needsLedger) {
  phase1.push({ name: 'ledger', script: 'ledger.mjs', argv: [reportFolder] });
} else {
  console.log('[finalize] reusing existing evidence.yaml; pass --rebuild to force a full ledger rebuild.');
}
phase1.push({ name: 'cross-chapter', script: 'cross-chapter.mjs', argv: [reportFolder] });
phase1.push({ name: 'assemble', script: 'assemble.mjs', argv: [reportFolder] });
phase1.push({ name: 'check-report', script: 'check-report.mjs', argv: [reportFolder] });

// Phase 2 — commit. postmortem records the run; build-index publishes it to
// the global catalog. We never reach this phase unless every Phase 1 step
// (including the publishable gate) succeeded.
const phase2 = [];
if (refreshOf) {
  const refreshArgs = [reportFolder, '--refresh-of', refreshOf];
  if (refreshReason) refreshArgs.push('--refresh-reason', refreshReason);
  phase2.push({ name: 'link-refresh', script: 'link-refresh.mjs', argv: refreshArgs });
}
phase2.push({ name: 'postmortem', script: 'postmortem.mjs', argv: [reportFolder] });
if (!skipIndex) {
  phase2.push({ name: 'build-index', script: 'build-index.mjs', argv: ['--strict'] });
}

for (const step of phase1) runStep(step);
for (const step of phase2) runStep(step);
console.log('[finalize] ✓ pipeline complete; report passed schema validation.');
