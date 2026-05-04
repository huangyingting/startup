#!/usr/bin/env node
// Run the post-chapter finalization pipeline as a single command:
//   1. ledger.mjs       -> evidence.yaml
//   2. cross-chapter.mjs -> drift checks against report-meta.yaml
//   3. assemble.mjs     -> full-report.yaml + summary-card.yaml
//   4. index.mjs --strict -> rebuild reports/_index.yaml
//
// The agent must still hand-author report-meta.yaml before invoking this
// script. cross-chapter runs BEFORE assemble so metric drift is caught while
// it can still be fixed in report-meta.yaml without rebuilding twice.
//
// Stops at the first failing step and prints which step failed; downstream
// steps are skipped so the agent can fix and re-run.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const folderArg = args.find((arg) => !arg.startsWith('-'));
const skipIndex = args.includes('--skip-index');

if (!folderArg) {
  console.error('Usage: node .agents/skills/startup-research/scripts/finalize.mjs <report-folder> [--skip-index]');
  process.exit(1);
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

const steps = [
  // postmortem runs FIRST so it can read per-chapter localEvidence (sources,
  // claims, researchQuestions) before ledger consolidates and removes it.
  { name: 'postmortem', script: 'postmortem.mjs', argv: [reportFolder] },
  { name: 'ledger', script: 'ledger.mjs', argv: [reportFolder] },
  { name: 'cross-chapter', script: 'cross-chapter.mjs', argv: [reportFolder] },
  { name: 'assemble', script: 'assemble.mjs', argv: [reportFolder] },
];
if (!skipIndex) {
  steps.push({ name: 'index', script: 'index.mjs', argv: ['--strict'] });
}

for (const step of steps) {
  console.log(`[finalize] -> ${step.name}`);
  const result = spawnSync(process.execPath, [resolve(here, step.script), ...step.argv], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[finalize] ${step.name} failed (exit ${result.status}); fix the reported issues and re-run finalize.`);
    process.exit(result.status ?? 1);
  }
}
console.log('[finalize] ✓ pipeline complete; run `npm run validate` to re-run schema checks.');
