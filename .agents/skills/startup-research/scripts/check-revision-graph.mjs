#!/usr/bin/env node
// Walk every reports/<runId>/summary-card.yaml and validate that the
// revision graph (current ↔ superseded pointers) is internally consistent.
// Read-only: writes nothing, owns no on-disk catalog.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  isRunId,
  listDirs,
  normalizeRevision,
  readYaml,
  reportsDir,
} from './utils.mjs';

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectReports() {
  const reports = [];
  const failures = [];
  for (const runId of listDirs(reportsDir).sort().reverse()) {
    const cardPath = join(reportsDir, runId, 'summary-card.yaml');
    if (!existsSync(cardPath)) continue;
    let card;
    try { card = readYaml(cardPath); }
    catch (err) {
      failures.push(`${runId}: card parse failed: ${err.message}`);
      continue;
    }
    const revision = normalizeRevision(card?.revision);
    reports.push({
      runId,
      revisionStatus: revision.status,
      refreshOfRunId: revision.refreshOfRunId,
      supersededByRunId: revision.supersededByRunId,
    });
  }
  return { reports, failures };
}

function validateRevisionGraph(reports) {
  const failures = [];
  const byRunId = new Map(reports.map((report) => [report.runId, report]));
  for (const report of reports) {
    const path = `${report.runId}: revision`;
    const status = report.revisionStatus ?? 'current';
    const refreshOfRunId = report.refreshOfRunId;
    const supersededByRunId = report.supersededByRunId;

    if (status === 'current' && hasValue(supersededByRunId)) {
      failures.push(`${path}: current reports must not set supersededByRunId`);
    }
    if (status === 'superseded' && !hasValue(supersededByRunId)) {
      failures.push(`${path}: superseded reports must set supersededByRunId`);
    }
    if (hasValue(refreshOfRunId) && refreshOfRunId === supersededByRunId) {
      failures.push(`${path}: refreshOfRunId and supersededByRunId cannot point to the same run`);
    }

    for (const [field, value] of Object.entries({ refreshOfRunId, supersededByRunId })) {
      if (value == null) continue;
      if (!hasValue(value)) {
        failures.push(`${path}.${field} must be a non-empty runId string or null`);
        continue;
      }
      if (!isRunId(value)) failures.push(`${path}.${field}=${value} is not a valid report run id`);
      if (value === report.runId) failures.push(`${path}.${field} cannot reference the same report run`);
      if (!byRunId.has(value)) failures.push(`${path}.${field} references a missing finalized report: ${value}`);
    }

    if (hasValue(refreshOfRunId) && byRunId.has(refreshOfRunId)) {
      const previous = byRunId.get(refreshOfRunId);
      if (previous.supersededByRunId !== report.runId) {
        failures.push(`${path}: refreshOfRunId=${refreshOfRunId} must point to a report whose revision.supersededByRunId is ${report.runId}`);
      }
    }
    if (hasValue(supersededByRunId) && byRunId.has(supersededByRunId)) {
      const next = byRunId.get(supersededByRunId);
      if (next.refreshOfRunId !== report.runId) {
        failures.push(`${path}: supersededByRunId=${supersededByRunId} must point to a report whose revision.refreshOfRunId is ${report.runId}`);
      }
    }
  }
  return failures;
}

const { reports, failures } = collectReports();
failures.push(...validateRevisionGraph(reports));
if (failures.length) {
  console.error('[check:revision-graph] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
  process.exit(1);
}
console.log(`[check:revision-graph] ✓ ${reports.length} report(s); revision graph consistent.`);
