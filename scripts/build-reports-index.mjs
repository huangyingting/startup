#!/usr/bin/env node
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { normalizeCompanyName, normalizeDomain } from './text-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const reportsDir = join(repoRoot, 'reports');
const outPath = join(reportsDir, '_index.yaml');
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const check = args.has('--check');

function listRuns() {
  if (!existsSync(reportsDir)) return [];
  return readdirSync(reportsDir)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      try {
        return statSync(join(reportsDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort()
    .reverse();
}

const reports = [];
const failures = [];
for (const runId of listRuns()) {
  const summaryPath = join(reportsDir, runId, '10-summary-card.yaml');
  if (!existsSync(summaryPath)) {
    failures.push(`${runId}/10-summary-card.yaml missing`);
    continue;
  }
  try {
    const data = yaml.load(readFileSync(summaryPath, 'utf8')) ?? {};
    const company = data.company ?? {};
    reports.push({
      runId,
      slug: data.slug ?? runId,
      date: data.runDate ?? null,
      companyName: company.name ?? null,
      companyNameNormalized: normalizeCompanyName(company.name),
      website: company.website ?? null,
      domain: normalizeDomain(company.website),
      sector: company.sector ?? null,
      stage: company.stage ?? null,
      rating: data.overallScore ?? null,
      sourceCount: data.sourceStats?.sourcesRetained ?? null,
      path: `reports/${runId}/10-summary-card.yaml`,
    });
  } catch (err) {
    failures.push(`${runId}/10-summary-card.yaml parse failed: ${err.message}`);
  }
}

if (failures.length && strict) {
  console.error('[build:reports-index] failures:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const output = yaml.dump({ count: reports.length, reports }, { lineWidth: 120, noRefs: true });
if (check) {
  const existing = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (existing !== output) {
    console.error('[build:reports-index] reports/_index.yaml is out of date. Run npm run build:reports-index.');
    process.exit(1);
  }
  console.log(`[build:reports-index] ✓ reports/_index.yaml is current (${reports.length} report(s)).`);
} else {
  writeFileSync(outPath, output);
  console.log(`[build:reports-index] ✓ wrote ${outPath} (${reports.length} report(s)).`);
}
