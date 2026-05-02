#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { listDirs, normalizeCompanyName, normalizeDomain, readYaml, reportsDir, writeYaml } from './text-utils.mjs';

const args = new Set(process.argv.slice(2));
const outPath = join(reportsDir, '_index.yaml');
const required = ['102-report-card.yaml', '101-report-document.zh.yaml', '102-report-card.zh.yaml'];

function completeCardPath(runId) {
  const dir = join(reportsDir, runId);
  return required.every((file) => existsSync(join(dir, file))) ? join(dir, '102-report-card.yaml') : null;
}

function indexEntry(runId, card) {
  const company = card.company ?? {};
  const metrics = card.keyMetrics ?? {};
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
    recommendation: card.recommendation ?? null,
    riskRating: card.riskRating ?? null,
    valuationStance: card.valuationStance ?? null,
    rating: card.overallScore ?? null,
    sourcesRetained: card.sourceStats?.sourcesRetained ?? null,
    figureCount: card.figureCount ?? null,
    tableCount: card.tableCount ?? null,
    valuationUsdM: metrics.valuationUsdM ?? null,
    revenueRunRateUsdM: metrics.revenueRunRateUsdM ?? null,
    path: `reports/${runId}/102-report-card.yaml`,
  };
}

const failures = [];
const reports = listDirs(reportsDir).sort().reverse().flatMap((runId) => {
  const path = completeCardPath(runId);
  if (!path) return [];
  try { return [indexEntry(runId, readYaml(path))]; }
  catch (err) { failures.push(`${runId}: card parse failed: ${err.message}`); return []; }
});

if (failures.length && args.has('--strict')) {
  console.error('[build:reports-index] failures:\n' + failures.map((x) => `  - ${x}`).join('\n'));
  process.exit(1);
}

const output = yaml.dump({ count: reports.length, reports }, { lineWidth: 120, noRefs: true, sortKeys: false });
if (args.has('--check')) {
  if ((existsSync(outPath) ? readFileSync(outPath, 'utf8') : '') !== output) {
    console.error('[build:reports-index] reports/_index.yaml is out of date. Run npm run build:reports-index.');
    process.exit(1);
  }
  console.log(`[build:reports-index] ✓ reports/_index.yaml is current (${reports.length} report(s)).`);
} else {
  writeYaml(outPath, { count: reports.length, reports });
  console.log(`[build:reports-index] ✓ wrote ${outPath} (${reports.length} report(s)).`);
}
