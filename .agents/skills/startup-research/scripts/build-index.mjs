#!/usr/bin/env node
// Build reports/_index.yaml by walking every report folder that has a
// complete English report card.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  isRunId,
  listDirs,
  normalizeCompanyName,
  normalizeDomain,
  normalizeRevision,
  readYaml,
  reportsDir,
  writeYaml,
} from './utils.mjs';

const REQUIRED_FILES = ['summary-card.yaml'];
const FULL_REPORT_FILE = 'full-report.yaml';
const OUTPUT_PATH = join(reportsDir, '_index.yaml');
const args = new Set(process.argv.slice(2));

function completeCardPath(runId) {
  const dir = join(reportsDir, runId);
  return REQUIRED_FILES.every((file) => existsSync(join(dir, file)))
    ? join(dir, 'summary-card.yaml')
    : null;
}

function artifactCounts(runId) {
  const path = join(reportsDir, runId, FULL_REPORT_FILE);
  if (!existsSync(path)) return { figureCount: null, tableCount: null };
  try {
    const report = readYaml(path);
    return {
      figureCount: Array.isArray(report.figures) ? report.figures.length : null,
      tableCount: Array.isArray(report.tables) ? report.tables.length : null,
    };
  } catch {
    return { figureCount: null, tableCount: null };
  }
}

function indexEntry(runId, card) {
  const company = card.company ?? {};
  const summary = card.summary ?? {};
  const metrics = summary.keyMetrics ?? {};
  const counts = artifactCounts(runId);
  const revision = normalizeRevision(card.revision);
  return {
    runId,
    slug: card.slug ?? runId,
    schemaVersion: card.schemaVersion,
    date: card.runDate ?? null,
    revisionStatus: revision.status,
    refreshOfRunId: revision.refreshOfRunId,
    supersededByRunId: revision.supersededByRunId,
    refreshReason: revision.refreshReason,
    companyName: company.name ?? null,
    companyNameNormalized: normalizeCompanyName(company.name),
    website: company.website ?? null,
    domain: normalizeDomain(company.website),
    sector: company.sector ?? null,
    stage: company.stage ?? null,
    recommendation: summary.recommendation ?? null,
    riskRating: summary.riskRating ?? null,
    valuationStance: summary.valuationStance ?? null,
    rating: summary.overallScore ?? null,
    sourcesRetained: card.sourceStats?.sourcesRetained ?? null,
    domainCount: card.sourceStats?.domainCount ?? null,
    adverseSourceCount: card.sourceStats?.adverseSourceCount ?? null,
    // Question closure breakdown. openQuestionCount is the canonical "still
    // open" total (alias unresolvedQuestionCount for back-compat with older
    // cards that predate the split); documented vs blocking distinguishes
    // closed-out gaps from gate escapes.
    openQuestionCount: card.sourceStats?.openQuestionCount ?? card.sourceStats?.unresolvedQuestionCount ?? null,
    documentedGapQuestionCount: card.sourceStats?.documentedGapQuestionCount ?? null,
    blockingQuestionCount: card.sourceStats?.blockingQuestionCount ?? null,
    unresolvedQuestionCount: card.sourceStats?.unresolvedQuestionCount ?? card.sourceStats?.openQuestionCount ?? null,
    figureCount: counts.figureCount,
    tableCount: counts.tableCount,
    valuationUsdM: metrics.valuationUsdM ?? null,
    revenueRunRateUsdM: metrics.revenueRunRateUsdM ?? null,
    path: `reports/${runId}/summary-card.yaml`,
  };
}

function collectReports() {
  const failures = [];
  const reports = [];
  for (const runId of listDirs(reportsDir).sort().reverse()) {
    const path = completeCardPath(runId);
    if (!path) continue;
    try {
      reports.push(indexEntry(runId, readYaml(path)));
    } catch (err) {
      failures.push(`${runId}: card parse failed: ${err.message}`);
    }
  }
  return { reports, failures };
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
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
if (args.has('--strict')) failures.push(...validateRevisionGraph(reports));
if (failures.length && args.has('--strict')) {
  console.error('[build:report-index] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
  process.exit(1);
}

const document = { count: reports.length, reports };
const serialized = yaml.dump(document, { lineWidth: 120, noRefs: true, sortKeys: false });

if (args.has('--check')) {
  const onDisk = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : '';
  if (onDisk !== serialized) {
    console.error('[build:report-index] reports/_index.yaml is out of date. Run node .agents/skills/startup-research/scripts/build-index.mjs --strict.');
    process.exit(1);
  }
  console.log(`[build:report-index] ✓ reports/_index.yaml is current (${reports.length} report(s)).`);
} else {
  writeYaml(OUTPUT_PATH, document);
  console.log(`[build:report-index] ✓ wrote ${OUTPUT_PATH} (${reports.length} report(s)).`);
}
