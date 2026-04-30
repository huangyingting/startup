#!/usr/bin/env node
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../reports');
const REQUIRED = [
  '00-research-plan.yaml',
  '01-company-identity.yaml',
  '02-source-ledger.yaml',
  '03-market-customers.yaml',
  '04-product-technology.yaml',
  '05-traction-gtm.yaml',
  '06-competition-positioning.yaml',
  '07-business-financials.yaml',
  '08-risk-governance.yaml',
  '09-investment-memo.yaml',
  '10-summary-card.yaml',
];
// v3 introduces optional artifacts. They must parse + obey claimRefs rules when present.
const OPTIONAL_V3 = [
  '11-team-people.yaml',
  '12-comparables-valuation.yaml',
  '13-milestones-catalysts.yaml',
];
const OPTIONAL_LOCALIZED = [...REQUIRED, ...OPTIONAL_V3].map((file) => file.replace('.yaml', '.zh.yaml'));
const ALLOWED_YAML = new Set([...REQUIRED, ...OPTIONAL_V3, ...OPTIONAL_LOCALIZED]);
const VALID_SCHEMA_VERSIONS = new Set(['startup-diligence-v2', 'startup-diligence-v3']);

function requiredFields(file, doc) {
  const checks = {
    '00-research-plan.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'researchScope'],
    '01-company-identity.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'identity', 'profile', 'identitySources'],
    '02-source-ledger.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'sources', 'claims'],
    '03-market-customers.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'marketDefinition', 'marketVerdict'],
    '04-product-technology.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'productOverview', 'productVerdict'],
    '05-traction-gtm.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'tractionSummary', 'gtmMotion'],
    '06-competition-positioning.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'competitiveSet', 'positioningVerdict'],
    '07-business-financials.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'businessModel', 'financialVerdict'],
    '08-risk-governance.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'riskRegister', 'riskVerdict'],
    '09-investment-memo.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'memo', 'scorecard'],
    '10-summary-card.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'headline', 'recommendation', 'sourceStats'],
    '11-team-people.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'teamSnapshot', 'founders'],
    '12-comparables-valuation.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'valuationFramework'],
    '13-milestones-catalysts.yaml': ['schemaVersion', 'artifact', 'slug', 'runDate', 'company', 'horizons'],
  }[file] ?? [];
  return checks.filter((field) => !(doc && typeof doc === 'object' && field in doc));
}

try {
  if (!existsSync(REPORTS_DIR)) {
    console.warn(`[check:reports] ${REPORTS_DIR} not found; nothing to check.`);
    process.exit(0);
  }

  const runs = readdirSync(REPORTS_DIR).filter((name) => {
    const p = join(REPORTS_DIR, name);
    try {
      return statSync(p).isDirectory() && !name.startsWith('.') && !name.startsWith('_');
    } catch {
      return false;
    }
  });

  const failures = [];
  const unexpected = [];
  const parseFailures = [];
  const fieldFailures = [];
  const consistencyFailures = [];

  for (const run of runs) {
    const dir = join(REPORTS_DIR, run);
    const files = readdirSync(dir).filter((file) => statSync(join(dir, file)).isFile());
    const parsed = new Map();

    for (const file of REQUIRED) {
      if (!existsSync(join(dir, file))) failures.push(`${run}/${file}`);
    }

    for (const file of files) {
      if (!file.endsWith('.yaml')) continue;
      if (!ALLOWED_YAML.has(file)) unexpected.push(`${run}/${file}`);
      try {
        const doc = yaml.load(readFileSync(join(dir, file), 'utf8'));
        parsed.set(file, doc);
        if (REQUIRED.includes(file) || OPTIONAL_V3.includes(file)) {
          const missing = requiredFields(file, doc);
          for (const field of missing) fieldFailures.push(`${run}/${file}: missing ${field}`);
          if (doc && typeof doc === 'object' && doc.schemaVersion && !VALID_SCHEMA_VERSIONS.has(doc.schemaVersion)) {
            consistencyFailures.push(`${run}/${file}: unknown schemaVersion ${doc.schemaVersion}`);
          }
        }
      } catch (err) {
        parseFailures.push(`${run}/${file}: ${err.message.split('\n')[0]}`);
      }
    }

    const summary = parsed.get('10-summary-card.yaml');
    const identity = parsed.get('01-company-identity.yaml');
    const ledger = parsed.get('02-source-ledger.yaml');
    if (summary && identity && summary.slug && identity.slug && summary.slug !== identity.slug) {
      consistencyFailures.push(`${run}: 10-summary-card.yaml slug (${summary.slug}) does not match 01-company-identity.yaml slug (${identity.slug})`);
    }
    if (ledger?.sources && ledger?.claims) {
      const sourceIds = new Set(ledger.sources.map((source) => source.id));
      const claimIds = new Set(ledger.claims.map((claim) => claim.id));
      for (const source of ledger.sources) {
        if (source.fetchVerified !== true) consistencyFailures.push(`${run}: source ${source.id} is not fetchVerified`);
      }
      for (const claim of ledger.claims) {
        for (const ref of claim.sourceRefs ?? []) {
          if (!sourceIds.has(ref)) consistencyFailures.push(`${run}: claim ${claim.id} references missing source ${ref}`);
        }
      }
      for (const [file, doc] of parsed) {
        if (file === '02-source-ledger.yaml') continue;
        if (!REQUIRED.includes(file) && !OPTIONAL_V3.includes(file)) continue;
        const refs = [];
        const walk = (value) => {
          if (Array.isArray(value)) return value.forEach(walk);
          if (value && typeof value === 'object') {
            for (const [key, child] of Object.entries(value)) {
              if (key === 'claimRefs' && Array.isArray(child)) refs.push(...child);
              else walk(child);
            }
          }
        };
        walk(doc);
        for (const ref of refs) {
          if (!claimIds.has(ref)) consistencyFailures.push(`${run}/${file}: claimRefs references missing claim ${ref}`);
        }
      }
    }
  }

  if (failures.length || unexpected.length || parseFailures.length || fieldFailures.length || consistencyFailures.length) {
    if (failures.length) console.error('[check:reports] missing required files:\n' + failures.map((f) => `  - reports/${f}`).join('\n'));
    if (unexpected.length) console.error('[check:reports] unexpected YAML files:\n' + unexpected.map((f) => `  - reports/${f}`).join('\n'));
    if (parseFailures.length) console.error('[check:reports] YAML parse failures:\n' + parseFailures.map((f) => `  - ${f}`).join('\n'));
    if (fieldFailures.length) console.error('[check:reports] missing fields:\n' + fieldFailures.map((f) => `  - ${f}`).join('\n'));
    if (consistencyFailures.length) console.error('[check:reports] consistency failures:\n' + consistencyFailures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }

  console.log(`[check:reports] ✓ ${runs.length} report(s) verified.`);
} catch (err) {
  console.error(`[check:reports] fatal error: ${err.message}`);
  process.exit(1);
}
