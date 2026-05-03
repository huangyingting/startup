#!/usr/bin/env node
// Create a fresh report folder under reports/<timestamp>-<slug>/ after checking
// reports/_index.yaml for duplicate company name or website/domain risk.
// Adds a numeric suffix when the slug already exists.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeCompanyName, normalizeDomain, readYaml, reportsDir, slugify } from './utils.mjs';

function usage() {
  console.error('Usage: node .github/skills/startup-research/scripts/new.mjs <YYYYMMDDHHmmss> <company name> [--website <url>] [--allow-duplicate] [--index reports/_index.yaml]');
  process.exit(1);
}

function parseArgs(argv) {
  const [timestamp, ...rest] = argv;
  const args = { timestamp, nameParts: [], website: '', allowDuplicate: false, indexPath: 'reports/_index.yaml' };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--website' || arg === '--url' || arg === '--domain') args.website = rest[++i] ?? '';
    else if (arg === '--allow-duplicate') args.allowDuplicate = true;
    else if (arg === '--index') args.indexPath = rest[++i] ?? '';
    else if (arg.startsWith('--')) usage();
    else args.nameParts.push(arg);
  }
  if (!/^\d{14}$/.test(args.timestamp ?? '')) usage();
  return args;
}

function checkDuplicateRisk({ companyName, website, indexPath, allowDuplicate }) {
  if (allowDuplicate || !existsSync(indexPath)) return;
  const candidateName = normalizeCompanyName(companyName);
  const candidateDomain = normalizeDomain(website);
  if (!candidateName && !candidateDomain) return;

  const index = readYaml(indexPath);
  const reports = Array.isArray(index?.reports) ? index.reports : [];
  const matches = reports.filter((report) => {
    const sameName = candidateName && normalizeCompanyName(report.companyName) === candidateName;
    const sameDomain = candidateDomain && normalizeDomain(report.website) === candidateDomain;
    return sameName || sameDomain;
  });
  if (!matches.length) return;

  console.error('[create-report-run] duplicate-risk: high');
  for (const match of matches) {
    console.error(`  - ${match.companyName ?? match.slug} (${match.path})`);
  }
  console.error('[create-report-run] stop unless this is an intentional refresh/update; pass --allow-duplicate to override.');
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));
const companyName = args.nameParts.join(' ') || 'startup';
checkDuplicateRisk({ companyName, website: args.website, indexPath: args.indexPath, allowDuplicate: args.allowDuplicate });

const base = `${args.timestamp}-${slugify(companyName)}`;
let path = join(reportsDir, base);
for (let suffix = 2; existsSync(path); suffix += 1) {
  path = join(reportsDir, `${base}-${suffix}`);
}
mkdirSync(path, { recursive: true });
console.log(path);
