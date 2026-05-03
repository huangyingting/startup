#!/usr/bin/env node
// Reject a new 01-company-snapshot.yaml when reports/_index.yaml already
// contains the same normalized company name or domain.
//
// Exit codes:
//   0 - low duplicate risk
//   1 - missing input or other invocation error
//   2 - duplicate detected
import { existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { normalizeCompanyName, normalizeDomain, readYaml } from './text-utils.mjs';

const [snapshotPath, indexPath = 'reports/_index.yaml'] = process.argv.slice(2);
if (!snapshotPath) {
  console.error('Usage: node scripts/check-company-dedup.mjs <01-company-snapshot.yaml> [reports/_index.yaml]');
  process.exit(1);
}
if (!existsSync(snapshotPath)) {
  console.error(`[check-company-dedup] missing ${snapshotPath}`);
  process.exit(1);
}
if (!existsSync(indexPath)) {
  console.log('[check-company-dedup] no index found; duplicate risk low.');
  process.exit(0);
}

const snapshot = readYaml(snapshotPath);
const runId = basename(dirname(snapshotPath));
const candidateName = normalizeCompanyName(snapshot.company?.name);
const candidateDomain = normalizeDomain(
  snapshot.company?.website ?? snapshot.startupIntroduction?.website
);

const index = readYaml(indexPath);
const reports = Array.isArray(index?.reports) ? index.reports : [];
const matches = reports.filter((report) => {
  if (report.runId === runId) return false;
  const sameName = candidateName && normalizeCompanyName(report.companyName) === candidateName;
  const sameDomain = candidateDomain && normalizeDomain(report.website) === candidateDomain;
  return sameName || sameDomain;
});

if (matches.length) {
  console.error('[check-company-dedup] duplicate-risk: high');
  for (const match of matches) {
    console.error(`  - ${match.companyName ?? match.slug} (${match.path})`);
  }
  process.exit(2);
}
console.log('[check-company-dedup] duplicate risk low.');
