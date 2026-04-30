#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import yaml from 'js-yaml';
import { normalizeCompanyName, normalizeDomain } from './text-utils.mjs';

const [companyYamlPath, indexPath = 'reports/_index.yaml'] = process.argv.slice(2);
if (!companyYamlPath) {
  console.error('Usage: node scripts/check-company-dedup.mjs <company.yaml> [reports/_index.yaml]');
  process.exit(1);
}

if (!existsSync(companyYamlPath)) {
  console.error(`[check-company-dedup] missing ${companyYamlPath}`);
  process.exit(1);
}

const companyDoc = yaml.load(readFileSync(companyYamlPath, 'utf8')) ?? {};
const candidateName = normalizeCompanyName(companyDoc.company?.name);
const candidateDomain = normalizeDomain(companyDoc.officialWebsite);
const currentRunId = basename(dirname(companyYamlPath));

if (!existsSync(indexPath)) {
  console.log('[check-company-dedup] no index found; duplicate risk low.');
  process.exit(0);
}

const indexDoc = yaml.load(readFileSync(indexPath, 'utf8')) ?? {};
const reports = Array.isArray(indexDoc.reports) ? indexDoc.reports : [];
const matches = reports.filter((report) => {
  if (report.runId && report.runId === currentRunId) return false;
  const sameDomain = candidateDomain && normalizeDomain(report.website) === candidateDomain;
  const sameName = candidateName && normalizeCompanyName(report.companyName) === candidateName;
  return sameDomain || sameName;
});

if (matches.length) {
  console.error('[check-company-dedup] duplicate-risk: high');
  for (const match of matches) {
    console.error(`  - ${match.companyName ?? match.slug} (${match.path})`);
  }
  process.exit(2);
}

console.log('[check-company-dedup] duplicate risk low.');
