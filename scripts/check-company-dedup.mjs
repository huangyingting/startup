#!/usr/bin/env node
// Reject a new report when reports/_index.yaml already contains the same
// normalized company name or domain. Run before creating or writing a report folder.
//
// Exit codes:
//   0 - low duplicate risk
//   1 - missing input or other invocation error
//   2 - duplicate detected
import { existsSync } from 'node:fs';
import { normalizeCompanyName, normalizeDomain, readYaml } from './text-utils.mjs';

function usage() {
  console.error('Usage: node scripts/check-company-dedup.mjs --company <name> [--website <url>] [--run-id <id>] [--index reports/_index.yaml]');
  process.exit(1);
}

function parseArgs(argv) {
  if (!argv.length) usage();
  const args = { indexPath: 'reports/_index.yaml', runId: null, company: '', website: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--company' || arg === '--name') args.company = argv[++i] ?? '';
    else if (arg === '--website' || arg === '--url' || arg === '--domain') args.website = argv[++i] ?? '';
    else if (arg === '--run-id') args.runId = argv[++i] ?? '';
    else if (arg === '--index') args.indexPath = argv[++i] ?? '';
    else usage();
  }
  if (!args.company && !args.website) usage();
  return args;
}

const args = parseArgs(process.argv.slice(2));
const candidate = { runId: args.runId, name: args.company, website: args.website };

const candidateName = normalizeCompanyName(candidate.name);
const candidateDomain = normalizeDomain(candidate.website);
if (!candidateName && !candidateDomain) {
  console.error('[check-company-dedup] missing usable company name or website/domain');
  process.exit(1);
}

if (!existsSync(args.indexPath)) {
  console.log('[check-company-dedup] no index found; duplicate risk low.');
  process.exit(0);
}

const index = readYaml(args.indexPath);
const reports = Array.isArray(index?.reports) ? index.reports : [];
const matches = reports.filter((report) => {
  if (candidate.runId && report.runId === candidate.runId) return false;
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
