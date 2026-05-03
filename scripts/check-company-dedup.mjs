#!/usr/bin/env node
// Reject a new report when reports/_index.yaml already contains the same
// normalized company name or domain. Prefer running with --company/--website
// before creating or writing a report folder; the legacy snapshot-file mode is
// retained for compatibility.
//
// Exit codes:
//   0 - low duplicate risk
//   1 - missing input or other invocation error
//   2 - duplicate detected
import { existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { normalizeCompanyName, normalizeDomain, readYaml } from './text-utils.mjs';

function usage() {
  console.error('Usage:');
  console.error('  node scripts/check-company-dedup.mjs --company <name> [--website <url>] [--run-id <id>] [--index reports/_index.yaml]');
  console.error('  node scripts/check-company-dedup.mjs <01-company-snapshot.yaml> [reports/_index.yaml]');
  process.exit(1);
}

function parseArgs(argv) {
  if (!argv.length) usage();
  if (!argv[0].startsWith('-')) {
    return { mode: 'snapshot', snapshotPath: argv[0], indexPath: argv[1] ?? 'reports/_index.yaml' };
  }
  const args = { mode: 'input', indexPath: 'reports/_index.yaml', runId: null, company: '', website: '' };
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

function candidateFromSnapshot(snapshotPath) {
  if (!existsSync(snapshotPath)) {
    console.error(`[check-company-dedup] missing ${snapshotPath}`);
    process.exit(1);
  }
  const snapshot = readYaml(snapshotPath);
  return {
    runId: basename(dirname(snapshotPath)),
    name: snapshot.company?.name,
    website: snapshot.company?.website ?? snapshot.startupIntroduction?.website,
  };
}

const args = parseArgs(process.argv.slice(2));
const candidate = args.mode === 'snapshot'
  ? candidateFromSnapshot(args.snapshotPath)
  : { runId: args.runId, name: args.company, website: args.website };

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
