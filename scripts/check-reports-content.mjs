#!/usr/bin/env node
// Content-quality and translation-parity checks for generated reports.
// Rendering-contract checks (schema head, figure types, enums, refs) live
// in website/scripts/check-reports.mjs and run at website build time.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../reports');
const V2_SCHEMA = 'startup-diligence-report-v2';
const RECOMMENDATIONS = new Set(['strong-buy', 'buy', 'track', 'research-more', 'avoid']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const RISK_RATINGS = new Set(['low', 'moderate', 'significant', 'critical', 'unknown']);
const VALUATION_STANCES = new Set(['attractive', 'fair', 'stretched', 'expensive', 'unknown']);

function asDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}

function checkEvidenceCoverage(failures, warnings, run, ledger) {
  const coverage = ledger?.coverage ?? {};
  const sources = ledger?.sources ?? [];
  const claims = ledger?.claims ?? [];
  const sourceTarget = Number(coverage.sourceTarget);
  const sourcesFetched = Number(coverage.sourcesFetched);
  const sourcesRetained = Number(coverage.sourcesRetained);
  const claimsCreated = Number(coverage.claimsCreated);

  if (Number.isFinite(sourceTarget) && sourceTarget > 0 && sources.length < sourceTarget) {
    failures.push(`${run}/01-evidence-ledger.yaml: sources.length ${sources.length} is below coverage.sourceTarget ${sourceTarget}`);
  }
  if (Number.isFinite(sourcesRetained) && sourcesRetained !== sources.length) {
    failures.push(`${run}/01-evidence-ledger.yaml: coverage.sourcesRetained ${sourcesRetained} must equal sources.length ${sources.length}`);
  }
  if (Number.isFinite(sourcesFetched) && sourcesFetched < sources.length) {
    failures.push(`${run}/01-evidence-ledger.yaml: coverage.sourcesFetched ${sourcesFetched} cannot be less than sources.length ${sources.length}`);
  }
  if (Number.isFinite(claimsCreated) && claimsCreated !== claims.length) {
    failures.push(`${run}/01-evidence-ledger.yaml: coverage.claimsCreated ${claimsCreated} must equal claims.length ${claims.length}`);
  }
  if (coverage.depth === 'deep' && Number.isFinite(sourceTarget) && sourceTarget < 100) {
    warnings.push(`${run}/01-evidence-ledger.yaml: legacy deep sourceTarget ${sourceTarget} is below the current 100-source standard; regenerate when practical`);
  } else if (coverage.depth === 'deep' && sources.length < 100) {
    failures.push(`${run}/01-evidence-ledger.yaml: deep evidence requires at least 100 retained sources, got ${sources.length}`);
  }
  if (coverage.depth === 'standard' && Number.isFinite(sourceTarget) && sourceTarget < 40) {
    warnings.push(`${run}/01-evidence-ledger.yaml: legacy standard sourceTarget ${sourceTarget} is below the current 40-source standard; regenerate when practical`);
  } else if (coverage.depth === 'standard' && sources.length < 40) {
    failures.push(`${run}/01-evidence-ledger.yaml: standard evidence requires at least 40 retained sources, got ${sources.length}`);
  }

  const citedSourceIds = new Set(claims.flatMap((claim) => claim.sourceRefs ?? []));
  const uncitedCount = sources.filter((source) => !citedSourceIds.has(source.id)).length;
  if (sources.length > 0 && uncitedCount / sources.length > 0.5) {
    warnings.push(`${run}/01-evidence-ledger.yaml: ${uncitedCount}/${sources.length} retained sources are not cited by claims; consider pruning irrelevant sources or creating missing claims`);
  }

  if (sources.length >= 20) {
    const publishers = new Map();
    for (const s of sources) {
      const key = s.publisher || 'unknown';
      publishers.set(key, (publishers.get(key) ?? 0) + 1);
    }
    const [topPublisher, topCount] = [...publishers.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (topPublisher && topCount / sources.length > 0.34) {
      warnings.push(`${run}/01-evidence-ledger.yaml: publisher "${topPublisher}" accounts for ${topCount}/${sources.length} retained sources (>34%); diversify independent reporting`);
    }
    const independentCount = sources.filter((s) => s.independence === 'independent').length;
    if (independentCount / sources.length < 0.15) {
      warnings.push(`${run}/01-evidence-ledger.yaml: only ${independentCount}/${sources.length} retained sources are independent (<15%); add tier-one-news, analyst-market-data, or filing sources`);
    }
  }
}

function checkZhParity(failures, run, dir) {
  for (const [enFile, zhFile] of [['10-report-document.yaml', '10-report-document.zh.yaml'], ['11-report-card.yaml', '11-report-card.zh.yaml']]) {
    const zhPath = join(dir, zhFile);
    const enPath = join(dir, enFile);
    if (!existsSync(enPath)) continue;
    if (!existsSync(zhPath)) {
      failures.push(`${run}/${zhFile}: required Simplified Chinese localization is missing`);
      continue;
    }
    let enDoc, zhDoc;
    try { enDoc = readYaml(enPath); } catch (err) { failures.push(`${run}/${enFile}: YAML parse failed: ${err.message.split('\n')[0]}`); continue; }
    try { zhDoc = readYaml(zhPath); } catch (err) { failures.push(`${run}/${zhFile}: YAML parse failed: ${err.message.split('\n')[0]}`); continue; }

    if (zhDoc.schemaVersion !== V2_SCHEMA) failures.push(`${run}/${zhFile}: expected schemaVersion ${V2_SCHEMA}, got ${zhDoc.schemaVersion}`);
    if (zhDoc.artifact !== enDoc.artifact) failures.push(`${run}/${zhFile}: artifact must equal ${enDoc.artifact}`);
    if (zhDoc.slug !== enDoc.slug) failures.push(`${run}/${zhFile}: slug must equal ${enDoc.slug}`);
    if (asDateString(zhDoc.runDate) !== asDateString(enDoc.runDate)) failures.push(`${run}/${zhFile}: runDate must equal English version`);

    if (zhFile === '11-report-card.zh.yaml') {
      for (const [field, allowed] of [['recommendation', RECOMMENDATIONS], ['confidence', CONFIDENCE], ['riskRating', RISK_RATINGS], ['valuationStance', VALUATION_STANCES]]) {
        if (zhDoc[field] !== enDoc[field]) failures.push(`${run}/${zhFile}: ${field} must equal English (translator must preserve enums)`);
        if (zhDoc[field] !== undefined && !allowed.has(zhDoc[field])) failures.push(`${run}/${zhFile}: invalid ${field} ${zhDoc[field]}`);
      }
      if (zhDoc.figureCount !== enDoc.figureCount) failures.push(`${run}/${zhFile}: figureCount must equal English`);
      if (zhDoc.tableCount !== enDoc.tableCount) failures.push(`${run}/${zhFile}: tableCount must equal English`);
      if (zhDoc.overallScore !== enDoc.overallScore) failures.push(`${run}/${zhFile}: overallScore must equal English`);
    }
    if (zhFile === '10-report-document.zh.yaml') {
      const enFigIds = (enDoc.figures ?? []).map((f) => f.id).sort().join(',');
      const zhFigIds = (zhDoc.figures ?? []).map((f) => f.id).sort().join(',');
      if (enFigIds !== zhFigIds) failures.push(`${run}/${zhFile}: figure IDs must match English`);
      const enTabIds = (enDoc.tables ?? []).map((t) => t.id).sort().join(',');
      const zhTabIds = (zhDoc.tables ?? []).map((t) => t.id).sort().join(',');
      if (enTabIds !== zhTabIds) failures.push(`${run}/${zhFile}: table IDs must match English`);
    }
  }
}

try {
  if (!existsSync(REPORTS_DIR)) {
    console.warn(`[check:reports-content] ${REPORTS_DIR} not found; nothing to check.`);
    process.exit(0);
  }

  const runs = readdirSync(REPORTS_DIR).filter((name) => {
    const p = join(REPORTS_DIR, name);
    try { return statSync(p).isDirectory() && !name.startsWith('.') && !name.startsWith('_'); }
    catch { return false; }
  });

  const failures = [];
  const warnings = [];
  let checked = 0;

  for (const run of runs) {
    const dir = join(REPORTS_DIR, run);
    const hasYaml = readdirSync(dir).some((name) => name.endsWith('.yaml'));
    if (!existsSync(join(dir, '11-report-card.yaml'))) {
      if (hasYaml) failures.push(`${run}: partial report folder has YAML files but is missing 11-report-card.yaml`);
      continue;
    }
    checked += 1;

    const ledgerPath = join(dir, '01-evidence-ledger.yaml');
    if (existsSync(ledgerPath)) {
      try {
        const ledger = readYaml(ledgerPath);
        checkEvidenceCoverage(failures, warnings, run, ledger);
      } catch (err) {
        failures.push(`${run}/01-evidence-ledger.yaml: YAML parse failed: ${err.message.split('\n')[0]}`);
      }
    }

    checkZhParity(failures, run, dir);
  }

  if (warnings.length) console.warn('[check:reports-content] warnings:\n' + warnings.map((w) => `  - ${w}`).join('\n'));
  if (failures.length) {
    console.error('[check:reports-content] failures:\n' + failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports-content] ✓ ${checked} report(s) verified.`);
} catch (err) {
  console.error(`[check:reports-content] fatal error: ${err.message}`);
  process.exit(1);
}
