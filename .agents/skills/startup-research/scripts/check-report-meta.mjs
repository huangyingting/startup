#!/usr/bin/env node
// Shape + enum validator for report-meta.yaml.
//
// Zod schemas in contracts/report-artifacts.schema.mjs are the source of truth
// for structure and enums. This script adds non-blocking display-completeness
// warnings and returns the shared validation-result envelope for agents.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EXIT, REPORT_META_FILE, tryReadYaml } from './utils.mjs';
import { OBSOLETE_SUMMARY_ROOT_FIELDS, ReportMetaSchema, schemaErrors } from './contracts/report-artifacts.schema.mjs';
import {
  formatValidationCompact,
  formatValidationText,
  validationEnvelope,
  validationIssue,
  validationWarning,
} from './contracts/validation-result.mjs';

const RECOMMENDED_COMPANY_PROFILE_FIELDS = [
  'foundedDate',
  'founders',
  'foundingLocation',
  'headquarters',
  'customerFocus',
  'businessModel',
  'stage',
  'fundingStatus',
  'claimRefs',
];

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/check-report-meta.mjs <report-folder> [--format text|json|compact]');
  process.exit(EXIT.failure);
}

function parseArgs(argv) {
  const args = { folder: null, format: 'text' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') {
      const next = argv[++i];
      if (next === undefined || next.startsWith('-')) {
        console.error('[check-report-meta] --format requires a value (text|json|compact)');
        process.exit(EXIT.failure);
      }
      args.format = next;
    } else if (arg === '-h' || arg === '--help') usage();
    else if (arg.startsWith('-')) usage();
    else if (!args.folder) args.folder = arg;
    else usage();
  }
  if (!args.folder) usage();
  if (!['text', 'json', 'compact'].includes(args.format)) {
    console.error(`[check-report-meta] invalid --format: ${args.format} (expected text|json|compact)`);
    process.exit(EXIT.failure);
  }
  return args;
}

function hasDisplayValue(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function displayWarnings(meta) {
  const warnings = [];
  const companyProfile = meta?.companyProfile;
  if (companyProfile && typeof companyProfile === 'object' && !Array.isArray(companyProfile)) {
    for (const field of RECOMMENDED_COMPANY_PROFILE_FIELDS) {
      if (!hasDisplayValue(companyProfile[field])) {
        warnings.push(validationWarning({
          path: `companyProfile.${field}`,
          message: `${field} is empty; the detail-page Company profile section will omit this row`,
          dimension: 'displayCompleteness',
          code: 'reportMeta.displayCompleteness',
          fix: 'Populate the field from evidence when known, or leave null only when genuinely unavailable.',
        }));
      }
    }
  }

  const coverFacts = meta?.coverFacts;
  if (coverFacts === undefined || coverFacts === null) {
    warnings.push(validationWarning({
      path: 'coverFacts',
      message: 'coverFacts is missing; the detail-page Cover facts grid may be blank because summary.keyMetrics does not backfill it',
      dimension: 'displayCompleteness',
      code: 'reportMeta.coverFactsMissing',
      fix: 'Add 6–8 concise evidence-backed cover facts when the report has displayable headline facts.',
    }));
  } else if (Array.isArray(coverFacts)) {
    if (coverFacts.length === 0) {
      warnings.push(validationWarning({
        path: 'coverFacts',
        message: 'coverFacts is empty; the detail-page Cover facts grid may be blank because summary.keyMetrics does not backfill it',
        dimension: 'displayCompleteness',
        code: 'reportMeta.coverFactsEmpty',
      }));
    } else if (coverFacts.length < 4) {
      warnings.push(validationWarning({
        path: 'coverFacts',
        message: `coverFacts has only ${coverFacts.length} item(s); mature reports should normally provide 6–8 headline facts`,
        dimension: 'displayCompleteness',
        code: 'reportMeta.coverFactsSparse',
      }));
    }
    coverFacts.forEach((fact, index) => {
      if (!hasDisplayValue(fact?.claimRefs)) {
        warnings.push(validationWarning({
          path: `coverFacts.${index}.claimRefs`,
          message: 'coverFact has no claimRefs; evidence-backed cover facts should cite canonical claims',
          dimension: 'displayCompleteness',
          code: 'reportMeta.coverFactClaimRefs',
          fix: 'Add claimRefs for evidence-backed display facts, or leave empty only for deliberately uncited labels.',
        }));
      }
    });
  }
  return warnings;
}

function obsoleteRootFieldIssues(meta) {
  const issues = [];
  for (const field of OBSOLETE_SUMMARY_ROOT_FIELDS) {
    if (meta?.[field] !== undefined) {
      issues.push(validationIssue({
        path: field,
        message: `top-level field '${field}' is obsolete; nest it under summary.${field}`,
        dimension: 'reportMetaShape',
        code: 'reportMeta.obsoleteRootField',
        fix: `Move ${field} under the top-level summary: mapping.`,
      }));
    }
  }
  if (meta?.company?.hq !== undefined) {
    issues.push(validationIssue({
      path: 'company.hq',
      message: 'unknown company field: company.hq; use company.headquarters instead',
      dimension: 'reportMetaShape',
      code: 'reportMeta.companyHqObsolete',
      fix: 'Rename company.hq to company.headquarters.',
    }));
  }
  return issues;
}

const args = parseArgs(process.argv.slice(2));
const reportFolder = resolve(args.folder);
const issues = [];
const warnings = [];

if (!existsSync(reportFolder)) {
  issues.push(validationIssue({
    path: reportFolder,
    message: `report folder not found: ${reportFolder}`,
    dimension: 'missingArtifact',
    code: 'reportMeta.reportFolderMissing',
    fix: 'Create the report folder with create-report-run.mjs before validating report-meta.yaml.',
  }));
} else {
  const metaPath = join(reportFolder, REPORT_META_FILE);
  if (!existsSync(metaPath)) {
    issues.push(validationIssue({
      path: REPORT_META_FILE,
      message: `missing ${REPORT_META_FILE} in ${reportFolder}; author it before finalizing`,
      dimension: 'missingArtifact',
      code: 'reportMeta.missing',
      fix: 'Write report-meta.yaml using the report-meta schema in references/contracts.md.',
    }));
  } else {
    const result = tryReadYaml(metaPath);
    if (!result.ok) {
      issues.push(validationIssue({
        path: REPORT_META_FILE,
        message: `YAML parse failed: ${result.error}`,
        dimension: 'yamlParse',
        code: 'reportMeta.yamlParse',
        fix: 'Fix YAML syntax in report-meta.yaml.',
      }));
    } else {
      issues.push(...schemaErrors(ReportMetaSchema, result.value, {
        path: REPORT_META_FILE,
        dimension: 'reportMetaShape',
        source: 'scripts/contracts/report-artifacts.schema.mjs',
        fix: 'Edit report-meta.yaml to match the report-meta shape in references/contracts.md.',
      }));
      issues.push(...obsoleteRootFieldIssues(result.value));
      warnings.push(...displayWarnings(result.value));
    }
  }
}

const envelope = validationEnvelope({
  ok: issues.length === 0,
  validator: 'check-report-meta',
  artifact: REPORT_META_FILE,
  reportFolder,
  issues,
  warnings,
  summary: { schema: 'scripts/contracts/report-artifacts.schema.mjs#ReportMetaSchema' },
});

if (args.format === 'json') console.log(JSON.stringify(envelope, null, 2));
else if (args.format === 'compact') console.log(formatValidationCompact(envelope));
else if (envelope.ok) {
  console.log(`[check-report-meta] ✓ ${REPORT_META_FILE} shape and enums OK.`);
  if (envelope.warnings.length) {
    console.warn(`[check-report-meta] ${REPORT_META_FILE} has ${envelope.warningCount} warning(s) (non-blocking display completeness checks):`);
    for (const warning of envelope.warnings) console.warn(`  - ${warning.path}: ${warning.message}`);
  }
} else {
  console.error(formatValidationText(envelope, { failureMessage: `[check-report-meta] ${REPORT_META_FILE} has issues` }));
  console.error('[check-report-meta] schema: .agents/skills/startup-research/references/contracts.md §Report meta shape');
}

process.exit(envelope.ok ? EXIT.ok : EXIT.failure);
