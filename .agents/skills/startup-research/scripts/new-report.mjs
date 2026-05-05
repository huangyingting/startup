#!/usr/bin/env node
// Create a fresh report folder under reports/<timestamp>-<slug>/ after checking
// reports/_index.yaml for duplicate company name or website/domain risk.
// Adds a numeric suffix when the slug already exists.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { normalizeCompanyName, normalizeDomain, readYaml, reportsDir, slugify } from './utils.mjs';

const DISCLOSURE_PROFILES = new Set(['public', 'private-disclosed', 'private-undisclosed', 'stealth']);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/new-report.mjs <YYYYMMDDHHmmss> <company name> [--website <url>] [--disclosure <public|private-disclosed|private-undisclosed|stealth>] [--allow-duplicate] [--index reports/_index.yaml]');
  process.exit(1);
}

function parseArgs(argv) {
  const [timestamp, ...rest] = argv;
  const args = { timestamp, nameParts: [], website: '', disclosure: '', allowDuplicate: false, indexPath: 'reports/_index.yaml' };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--website' || arg === '--url' || arg === '--domain') args.website = rest[++i] ?? '';
    else if (arg === '--disclosure' || arg === '--disclosure-profile') args.disclosure = rest[++i] ?? '';
    else if (arg === '--allow-duplicate') args.allowDuplicate = true;
    else if (arg === '--index') args.indexPath = rest[++i] ?? '';
    else if (arg.startsWith('--')) usage();
    else args.nameParts.push(arg);
  }
  if (!/^\d{14}$/.test(args.timestamp ?? '')) usage();
  if (args.disclosure && !DISCLOSURE_PROFILES.has(args.disclosure)) {
    console.error(`[new] invalid --disclosure value: ${args.disclosure} (allowed: ${[...DISCLOSURE_PROFILES].join(', ')})`);
    process.exit(1);
  }
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

  console.error('[new] duplicate-risk: high');
  for (const match of matches) {
    console.error(`  - ${match.companyName ?? match.slug} (${match.path})`);
  }
  console.error('[new] stop unless this is an intentional refresh/update; pass --allow-duplicate to override.');
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

if (args.disclosure) {
  // Write a hint file the agent reads when authoring chapters; also printed
  // to stderr so the spawning workflow surfaces it. The hint lists canonical
  // evidenceGap topics that are almost-certain to remain unsupported for the
  // given disclosureProfile, so chapter 04 can pre-populate them rather than
  // rediscovering they are unavailable.
  const undisclosedGaps = [
    'Annual Recurring Revenue (ARR) — not publicly disclosed.',
    'Trailing-twelve-month revenue or revenue run-rate — not publicly disclosed.',
    'Headcount — no public filing or verified headcount source.',
    'Gross margin / unit economics — not publicly disclosed.',
    'Customer count — not publicly disclosed.',
  ];
  const stealthGaps = [
    ...undisclosedGaps,
    'Product release timeline — company in stealth, no public roadmap.',
    'Named customer references — company in stealth, no public deployments.',
  ];
  const canonicalGaps = args.disclosure === 'stealth'
    ? stealthGaps
    : args.disclosure === 'private-undisclosed'
      ? undisclosedGaps
      : [];
  const hint = {
    disclosureProfile: args.disclosure,
    note: 'Set companyProfile.disclosureProfile in report-meta.yaml to this value. Pre-populate the canonical evidenceGaps below in chapter 04 (financials) instead of rediscovering they are unavailable.',
    canonicalEvidenceGaps: canonicalGaps,
  };
  writeFileSync(join(path, '_disclosure-hint.yaml'), yaml.dump(hint, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
  console.error(`[new] disclosureProfile=${args.disclosure}; wrote _disclosure-hint.yaml with ${canonicalGaps.length} canonical evidenceGaps.`);
}

console.log(path);
