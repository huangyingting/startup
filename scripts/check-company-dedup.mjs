#!/usr/bin/env node
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

const doc = readYaml(snapshotPath);
const runId = basename(dirname(snapshotPath));
const name = normalizeCompanyName(doc.company?.name);
const domain = normalizeDomain(doc.company?.website ?? doc.startupIntroduction?.website);
const reports = readYaml(indexPath).reports ?? [];
const matches = reports.filter((r) => r.runId !== runId && ((name && normalizeCompanyName(r.companyName) === name) || (domain && normalizeDomain(r.website) === domain)));

if (matches.length) {
  console.error('[check-company-dedup] duplicate-risk: high');
  for (const m of matches) console.error(`  - ${m.companyName ?? m.slug} (${m.path})`);
  process.exit(2);
}
console.log('[check-company-dedup] duplicate risk low.');
