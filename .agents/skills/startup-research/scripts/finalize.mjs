#!/usr/bin/env node
// Run the post-chapter finalization pipeline as a single command. Every step
// here only touches the given report folder (and, with --refresh, the prior
// report folder it supersedes). No cross-report catalog is written; the
// website discovers reports by walking reports/<runId>/summary-card.yaml.
//
// Pipeline:
//   1. (refresh only) link-refresh.mjs --prepare-current
//                       -> mark the new report as revision.status=current
//   2. ledger.mjs       -> evidence.yaml + rewrite chapter claimRefs (only on
//                          first finalize, or when --rebuild is passed)
//   3. cross-chapter.mjs -> drift checks across chapters (caught BEFORE
//                           assemble so fixing report-meta.yaml or a chapter
//                           does not require throwing away assembled output)
//   4. assemble.mjs     -> full-report.yaml + summary-card.yaml
//   5. check-report.mjs -> schema/contract validation; this is the gate that
//                          decides whether the report is publishable
//   6. (refresh only) link-refresh.mjs
//                       -> mark the previous report as revision.status=superseded
//                          and reassemble it
//
// Re-runs after fixing report-meta.yaml or a chapter reuse the existing
// evidence.yaml; pass --rebuild to force a full ledger consolidation (which
// reassigns canonical claim IDs).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FINAL_ARTIFACTS } from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/finalize.mjs <report-folder> [--rebuild] [--refresh] [--refresh-reason <text>]');
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = { folder: null, rebuild: false, refresh: false, refreshReason: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--rebuild') parsed.rebuild = true;
    else if (arg === '--refresh') parsed.refresh = true;
    else if (arg === '--refresh-reason') parsed.refreshReason = argv[++i] ?? '';
    else if (arg.startsWith('-')) usage();
    else if (!parsed.folder) parsed.folder = arg;
    else usage();
  }
  return parsed;
}

const parsedArgs = parseArgs(args);
const folderArg = parsedArgs.folder;
const rebuild = parsedArgs.rebuild;
const refresh = parsedArgs.refresh;
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

if (refresh) {
  const refreshArgs = [reportFolder, '--prepare-current'];
  if (refreshReason) refreshArgs.push('--refresh-reason', refreshReason);
  runStep({ name: 'prepare-refresh', script: 'link-refresh.mjs', argv: refreshArgs });
}

// Per-report pipeline. ledger only when there is no evidence.yaml yet (or when
// --rebuild forces a fresh consolidation). evidence.yaml is preserved across
// re-runs so canonical claim IDs stay stable; the chapter source of truth
// (localEvidence) is preserved by ledger so the agent always has a place to
// fix evidence-shape problems.
const hasExistingEvidence = existsSync(join(reportFolder, FINAL_ARTIFACTS.evidence.file));
const needsLedger = !hasExistingEvidence || rebuild;
const steps = [];
if (needsLedger) {
  steps.push({ name: 'ledger', script: 'ledger.mjs', argv: [reportFolder] });
} else {
  console.log('[finalize] reusing existing evidence.yaml; pass --rebuild to force a full ledger rebuild.');
}
steps.push({ name: 'cross-chapter', script: 'cross-chapter.mjs', argv: [reportFolder] });
steps.push({ name: 'assemble', script: 'assemble.mjs', argv: [reportFolder] });
steps.push({ name: 'check-report', script: 'check-report.mjs', argv: [reportFolder] });

// link-refresh runs after the publishability gate so we never mark a prior
// report superseded by a report that did not validate. It only touches the
// two report folders (new + previous), not any cross-report ledger.
if (refresh) {
  const refreshArgs = [reportFolder];
  if (refreshReason) refreshArgs.push('--refresh-reason', refreshReason);
  steps.push({ name: 'link-refresh', script: 'link-refresh.mjs', argv: refreshArgs });
}

for (const step of steps) runStep(step);
console.log('[finalize] ✓ pipeline complete; report passed schema validation.');
