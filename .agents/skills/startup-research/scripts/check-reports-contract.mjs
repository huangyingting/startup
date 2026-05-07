#!/usr/bin/env node
// Validate every finalized report against the stable schema / renderer
// contract. This intentionally runs check-report.mjs with --contract, so
// historical reports are not forced to satisfy content gates added after they
// were produced (for example adverse-source distribution floors).
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXIT,
  isFinalizedReportFolder,
  isRunId,
  listDirs,
  reportsDir,
} from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const checkReportScript = resolve(here, 'check-report.mjs');
const failures = [];
let checked = 0;

for (const runId of listDirs(reportsDir).sort()) {
  if (!isRunId(runId)) continue;
  const folder = join(reportsDir, runId);
  if (!isFinalizedReportFolder(folder)) continue;
  const result = spawnSync(process.execPath, [checkReportScript, folder, '--contract'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    failures.push({
      runId,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    });
    continue;
  }
  checked += 1;
}

if (failures.length) {
  console.error('[check:reports-contract] failures:');
  for (const failure of failures) {
    console.error(`\n--- ${failure.runId} ---`);
    console.error(failure.output || '(no output)');
  }
  process.exit(EXIT.validation);
}

console.log(`[check:reports-contract] ✓ ${checked} finalized report(s); contract checks passed.`);