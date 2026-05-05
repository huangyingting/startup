#!/usr/bin/env node
// Build reports/_index.yaml by walking every report folder that has a
// complete English report card.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  listDirs,
  normalizeCompanyName,
  normalizeDomain,
  readYaml,
  reportsDir,
  writeYaml,
} from './utils.mjs';

const REQUIRED_FILES = ['summary-card.yaml'];
const OUTPUT_PATH = join(reportsDir, '_index.yaml');
const args = new Set(process.argv.slice(2));

function completeCardPath(runId) {
  const dir = join(reportsDir, runId);
  return REQUIRED_FILES.every((file) => existsSync(join(dir, file)))
    ? join(dir, 'summary-card.yaml')
    : null;
}

function indexEntry(runId, card) {
  const company = card.company ?? {};
  const summary = card.summary ?? {};
  const metrics = summary.keyMetrics ?? {};
  return {
    runId,
    slug: card.slug ?? runId,
    schemaVersion: card.schemaVersion,
    date: card.runDate ?? null,
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
    unresolvedQuestionCount: card.sourceStats?.unresolvedQuestionCount ?? null,
    figureCount: card.figureCount ?? null,
    tableCount: card.tableCount ?? null,
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

const { reports, failures } = collectReports();
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
