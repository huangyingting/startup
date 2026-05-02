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
const ANALYSIS_FILES = [
  '01-company-snapshot.yaml',
  '02-market-macro.yaml',
  '03-competitive-benchmarking.yaml',
  '04-financial-unit-economics.yaml',
  '05-product-technology.yaml',
  '06-customer-retention.yaml',
  '07-risk-regulatory.yaml',
  '08-investment-valuation.yaml',
];
const ANALYSIS_PAIRS = ANALYSIS_FILES.map((file) => [file, file.replace(/\.yaml$/, '.zh.yaml')]);
const TRANSLATABLE_KEYS = new Set([
  'background',
  'body',
  'businessModel',
  'customerFocus',
  'detail',
  'diligencePath',
  'disclaimer',
  'fundingStatus',
  'gap',
  'headline',
  'headquarters',
  'label',
  'notes',
  'productSummary',
  'role',
  'sector',
  'shortDescription',
  'stage',
  'subtitle',
  'summary',
  'title',
  'unit',
]);
const ZH_PLACEHOLDER_RE = /中文(?:摘要)?[：:]/;
const CJK_RE = /[\u3400-\u9fff]/;
const ASCII_WORD_RE = /[A-Za-z]{4,}/g;
const ENGLISH_SENTENCE_RE = /\b(the|and|with|because|should|requires?|reported|public|customer|revenue|valuation|risk|market|product|evidence|diligence|summary|analysis|recommendation|company|business|enterprise)\b/i;
const GENERIC_SECTION_TITLES = new Set([
  'Evidence base',
  'Investor interpretation',
  'Contradictions and uncertainty',
  'Private diligence path',
  'Snapshot conclusion',
]);
const GENERIC_FIGURE_LABELS = new Set([
  'Public anchor',
  'Private bridge',
  'Underwriting output',
  'Evidence strength',
  'Unknown private inputs',
  'Investment implication',
]);
const ALLOWED_ZH_ASCII_WORDS = new Set([
  'AI',
  'API',
  'APIs',
  'ARR',
  'AWS',
  'Azure',
  'Bedrock',
  'Bloomberg',
  'CAC',
  'ChatGPT',
  'CNBC',
  'Codex',
  'DALL',
  'DPA',
  'Forbes',
  'GPT',
  'GRR',
  'Llama',
  'LTV',
  'Meta',
  'Microsoft',
  'NRR',
  'Nvidia',
  'OpenAI',
  'PBC',
  'SOC',
  'SoftBank',
  'Sora',
  'TAM',
  'USD',
  'Vertex',
  'Anthropic',
  'Google',
  'Amazon',
  'Claude',
  'Code',
  'Cowork',
  'Free',
  'Pro',
  'Max',
  'Team',
  'Enterprise',
  'Coherent',
  'Market',
  'Insights',
  'Mordor',
  'Artificial',
  'Analysis',
  'Opus',
  'Sonnet',
  'Gemini',
  'Preview',
  'Compliance',
  'HIPAA',
  'SCIM',
  'SSO',
  'Messages',
  'Managed',
  'Agents',
  'Web',
  'Search',
  'GitHub',
  'Copilot',
  'token',
  'SaaS',
  'IPO',
]);

function asDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}

function isSkippableTranslationString(value) {
  const text = String(value ?? '').trim();
  if (!text) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[A-Z]\d{3}$/.test(text)) return true;
  if (/^[$€¥]?[0-9,.]+[A-Za-z%+.-]*$/.test(text)) return true;
  if (/^\d{4}(-\d{2}){0,2}$/.test(text)) return true;
  if (/^[a-z]+(?:-[a-z]+)*$/.test(text) && text.length < 24) return true;
  return false;
}

function looksUntranslatedEnglish(value) {
  const text = String(value ?? '').trim();
  if (isSkippableTranslationString(text)) return false;
  const words = (text.match(ASCII_WORD_RE) ?? []).filter((word) => !ALLOWED_ZH_ASCII_WORDS.has(word));
  if (CJK_RE.test(text)) {
    return words.length >= 6 && ENGLISH_SENTENCE_RE.test(words.join(' '));
  }
  return words.length >= 6 && ENGLISH_SENTENCE_RE.test(text);
}

function canonicalSourceUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(lower)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/#.*$/, '').replace(/\?.*utm_[^#]*/i, '').replace(/\/$/, '').toLowerCase();
  }
}

function checkEvidenceCoverage(failures, warnings, run, ledger) {
  const coverage = ledger?.coverage ?? {};
  const sources = ledger?.sources ?? [];
  const claims = ledger?.claims ?? [];
  const sourcesConsidered = Number(coverage.sourcesConsidered);
  const sourcesRetained = Number(coverage.sourcesRetained);
  const claimsCreated = Number(coverage.claimsCreated);

  if (Number.isFinite(sourcesRetained) && sourcesRetained !== sources.length) {
    failures.push(`${run}/100-evidence-ledger.yaml: coverage.sourcesRetained ${sourcesRetained} must equal sources.length ${sources.length}`);
  }
  if (Number.isFinite(sourcesConsidered) && sourcesConsidered < sources.length) {
    failures.push(`${run}/100-evidence-ledger.yaml: coverage.sourcesConsidered ${sourcesConsidered} cannot be less than sources.length ${sources.length}`);
  }
  if (Number.isFinite(claimsCreated) && claimsCreated !== claims.length) {
    failures.push(`${run}/100-evidence-ledger.yaml: coverage.claimsCreated ${claimsCreated} must equal claims.length ${claims.length}`);
  }

  const urls = new Map();
  for (const source of sources) {
    if (!source.url) continue;
    const normalized = canonicalSourceUrl(source.url);
    if (!normalized) continue;
    const existing = urls.get(normalized);
    if (existing) failures.push(`${run}/100-evidence-ledger.yaml: duplicate source URL ${source.url} appears in ${existing} and ${source.id}`);
    else urls.set(normalized, source.id);
  }

  const citedSourceIds = new Set(claims.flatMap((claim) => claim.sourceRefs ?? []));
  const uncitedCount = sources.filter((source) => !citedSourceIds.has(source.id)).length;
  if (sources.length > 0 && uncitedCount / sources.length > 0.5) {
    warnings.push(`${run}/100-evidence-ledger.yaml: ${uncitedCount}/${sources.length} retained sources are not cited by claims; consider pruning irrelevant sources or creating missing claims`);
  }

  if (sources.length >= 20) {
    const publishers = new Map();
    for (const s of sources) {
      const key = s.publisher || 'unknown';
      publishers.set(key, (publishers.get(key) ?? 0) + 1);
    }
    const [topPublisher, topCount] = [...publishers.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (topPublisher && topCount / sources.length > 0.34) {
      warnings.push(`${run}/100-evidence-ledger.yaml: publisher "${topPublisher}" accounts for ${topCount}/${sources.length} retained sources (>34%); diversify independent reporting`);
    }
    const independentCount = sources.filter((s) => s.independence === 'independent').length;
    if (independentCount / sources.length < 0.15) {
      warnings.push(`${run}/100-evidence-ledger.yaml: only ${independentCount}/${sources.length} retained sources are independent (<15%); add tier-one-news, analyst-market-data, or filing sources`);
    }
  }
}

function walkZhStrings(failures, run, file, value, path = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkZhStrings(failures, run, file, item, [...path, String(index)]));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'statement' || key === 'keyQuote' || key === 'url') continue;
      walkZhStrings(failures, run, file, child, [...path, key]);
    }
    return;
  }
  if (typeof value !== 'string') return;

  const key = path.at(-1) ?? '';
  const inTableText = path.includes('tables') && (path.includes('rows') || path.includes('columns') || key === 'notes' || key === 'title');
  const inFigureText = path.includes('figures') && TRANSLATABLE_KEYS.has(key);
  const inCardList = ['topStrengths', 'topRisks', 'unresolvedGaps'].some((name) => path.includes(name));
  const shouldCheck = TRANSLATABLE_KEYS.has(key) || inTableText || inFigureText || inCardList;
  if (!shouldCheck) return;

  if (ZH_PLACEHOLDER_RE.test(value)) {
    failures.push(`${run}/${file}: placeholder translation marker at ${path.join('.')}`);
  } else if (looksUntranslatedEnglish(value)) {
    failures.push(`${run}/${file}: likely untranslated English text at ${path.join('.')}: "${value.slice(0, 120)}"`);
  }
}

function checkZhQuality(failures, run, file, zhPath, zhDoc) {
  const raw = readFileSync(zhPath, 'utf8');
  if (ZH_PLACEHOLDER_RE.test(raw)) failures.push(`${run}/${file}: contains placeholder translation marker "中文:" or "中文摘要:"`);
  walkZhStrings(failures, run, file, zhDoc);
}

function checkDepthQuality(failures, warnings, run, dir, ledger, reportDoc, card) {
  const docs = new Map();
  for (const file of ANALYSIS_FILES) {
    const path = join(dir, file);
    if (existsSync(path)) docs.set(file, readYaml(path));
  }

  let floorHitArtifacts = 0;
  let templateRiskArtifacts = 0;
  for (const [file, doc] of docs) {
    const tables = doc.tables?.length ?? 0;
    const figures = doc.figures?.length ?? 0;
    const sections = doc.sections?.length ?? 0;
    const isSnapshot = file === '01-company-snapshot.yaml';
    const minTables = isSnapshot ? 3 : 4;
    const minFigures = 2;
    const minSections = isSnapshot ? 5 : 4;
    if (tables < minTables) failures.push(`${run}/${file}: thin analysis (${tables} table(s)); expected at least ${minTables} or an explicit evidence-backed reason`);
    if (figures < minFigures) failures.push(`${run}/${file}: thin analysis (${figures} figure(s)); expected at least ${minFigures}`);
    if (sections < minSections) failures.push(`${run}/${file}: thin analysis (${sections} section(s)); expected at least ${minSections}`);

    const hitsFloor = !isSnapshot && tables === minTables && figures === minFigures && sections === minSections;
    if (hitsFloor) floorHitArtifacts += 1;

    const genericSectionCount = (doc.sections ?? []).filter((section) => GENERIC_SECTION_TITLES.has(section?.title)).length;
    const sectionBodies = (doc.sections ?? []).map((section) => String(section?.body ?? '').trim()).filter(Boolean);
    const duplicateBodyCount = sectionBodies.length - new Set(sectionBodies).size;
    const genericFigureCount = (doc.figures ?? []).filter((figure) => {
      const data = figure?.data ?? {};
      const labels = [...(data.items ?? []), ...(data.nodes ?? []), ...(data.layers ?? [])]
        .map((item) => item?.label)
        .filter(Boolean);
      return labels.length >= 3 && labels.filter((label) => GENERIC_FIGURE_LABELS.has(label)).length >= 3;
    }).length;
    const allTablesShort = (doc.tables ?? []).length > 0 && (doc.tables ?? []).every((table) => (table?.rows?.length ?? 0) <= 4);
    const templateRisk = genericSectionCount >= 3 || duplicateBodyCount >= 1 || genericFigureCount >= 1 || (hitsFloor && allTablesShort);
    if (templateRisk) {
      templateRiskArtifacts += 1;
      warnings.push(`${run}/${file}: template-risk signal (${genericSectionCount} generic section title(s), ${duplicateBodyCount} duplicate section bod(y/ies), ${genericFigureCount} generic figure(s), ${hitsFloor ? 'hits minimum counts exactly' : 'above floor'})`);
    }
  }
  if (floorHitArtifacts >= 5) {
    warnings.push(`${run}: ${floorHitArtifacts}/7 domain artifacts hit the minimum 4-section/4-table/2-figure floor exactly; investigate floor-targeted generation`);
  }
  if (templateRiskArtifacts >= 5) {
    warnings.push(`${run}: ${templateRiskArtifacts} analysis artifacts show template-risk patterns; report may be schema-valid but not investor-grade`);
  }

  const valuationUsdM = Number(card?.keyMetrics?.valuationUsdM ?? 0);
  const revenueRunRateUsdM = Number(card?.keyMetrics?.revenueRunRateUsdM ?? 0);
  const highProfile = valuationUsdM >= 100000 || revenueRunRateUsdM >= 10000;
  if (highProfile && (ledger?.sources?.length ?? 0) < 50) {
    failures.push(`${run}/100-evidence-ledger.yaml: high-profile company has only ${ledger?.sources?.length ?? 0} retained sources; expected at least 50 or a documented reason`);
  }
  if (highProfile && (ledger?.claims?.length ?? 0) < 90) {
    failures.push(`${run}/100-evidence-ledger.yaml: high-profile company has only ${ledger?.claims?.length ?? 0} claims; expected at least 90 or a documented reason`);
  }

  const upstreamTables = new Set([...docs.values()].flatMap((doc) => (doc.tables ?? []).map((table) => table.id)));
  const upstreamFigures = new Set([...docs.values()].flatMap((doc) => (doc.figures ?? []).map((figure) => figure.id)));
  const reportTables = new Set((reportDoc?.tables ?? []).map((table) => table.id));
  const reportFigures = new Set((reportDoc?.figures ?? []).map((figure) => figure.id));
  const coverageNotes = String(reportDoc?.reportMeta?.coverageNotes ?? '');
  const missingTables = [...upstreamTables].filter((id) => !reportTables.has(id) && !coverageNotes.includes(id));
  const missingFigures = [...upstreamFigures].filter((id) => !reportFigures.has(id) && !coverageNotes.includes(id));
  const preservedTableRatio = upstreamTables.size ? reportTables.size / upstreamTables.size : 1;
  const preservedFigureRatio = upstreamFigures.size ? reportFigures.size / upstreamFigures.size : 1;
  if (preservedTableRatio < 0.8) failures.push(`${run}/101-report-document.yaml: preserves only ${reportTables.size}/${upstreamTables.size} upstream tables`);
  if (preservedFigureRatio < 0.8) failures.push(`${run}/101-report-document.yaml: preserves only ${reportFigures.size}/${upstreamFigures.size} upstream figures`);
  if (missingTables.length) warnings.push(`${run}/101-report-document.yaml: upstream table(s) missing without coverageNotes: ${missingTables.join(', ')}`);
  if (missingFigures.length) warnings.push(`${run}/101-report-document.yaml: upstream figure(s) missing without coverageNotes: ${missingFigures.join(', ')}`);
}

function checkZhParity(failures, run, dir) {
  const reportPairs = [
    ['101-report-document.yaml', '101-report-document.zh.yaml'],
    ['102-report-card.yaml', '102-report-card.zh.yaml'],
  ];
  for (const [enFile, zhFile] of [...ANALYSIS_PAIRS, ...reportPairs]) {
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
    checkZhQuality(failures, run, zhFile, zhPath, zhDoc);

    if (zhDoc.schemaVersion !== V2_SCHEMA) failures.push(`${run}/${zhFile}: expected schemaVersion ${V2_SCHEMA}, got ${zhDoc.schemaVersion}`);
    if (zhDoc.artifact !== enDoc.artifact) failures.push(`${run}/${zhFile}: artifact must equal ${enDoc.artifact}`);
    if (zhDoc.slug !== enDoc.slug) failures.push(`${run}/${zhFile}: slug must equal ${enDoc.slug}`);
    if (asDateString(zhDoc.runDate) !== asDateString(enDoc.runDate)) failures.push(`${run}/${zhFile}: runDate must equal English version`);

    if (Array.isArray(enDoc.tables)) {
      const enTabIds = enDoc.tables.map((t) => t?.id).sort().join(',');
      const zhTabIds = (zhDoc.tables ?? []).map((t) => t?.id).sort().join(',');
      if (enTabIds !== zhTabIds) failures.push(`${run}/${zhFile}: table IDs must match English`);
    }
    if (Array.isArray(enDoc.figures)) {
      const enFigIds = enDoc.figures.map((f) => f?.id).sort().join(',');
      const zhFigIds = (zhDoc.figures ?? []).map((f) => f?.id).sort().join(',');
      if (enFigIds !== zhFigIds) failures.push(`${run}/${zhFile}: figure IDs must match English`);
    }
    if (Array.isArray(enDoc.sections) && Array.isArray(zhDoc.sections) && enDoc.sections.length !== zhDoc.sections.length) {
      failures.push(`${run}/${zhFile}: sections count ${zhDoc.sections.length} must equal English ${enDoc.sections.length}`);
    }

    if (zhFile === '102-report-card.zh.yaml') {
      for (const [field, allowed] of [['recommendation', RECOMMENDATIONS], ['confidence', CONFIDENCE], ['riskRating', RISK_RATINGS], ['valuationStance', VALUATION_STANCES]]) {
        if (zhDoc[field] !== enDoc[field]) failures.push(`${run}/${zhFile}: ${field} must equal English (translator must preserve enums)`);
        if (zhDoc[field] !== undefined && !allowed.has(zhDoc[field])) failures.push(`${run}/${zhFile}: invalid ${field} ${zhDoc[field]}`);
      }
      if (zhDoc.figureCount !== enDoc.figureCount) failures.push(`${run}/${zhFile}: figureCount must equal English`);
      if (zhDoc.tableCount !== enDoc.tableCount) failures.push(`${run}/${zhFile}: tableCount must equal English`);
      if (zhDoc.overallScore !== enDoc.overallScore) failures.push(`${run}/${zhFile}: overallScore must equal English`);
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
    if (!existsSync(join(dir, '102-report-card.yaml'))) {
      if (hasYaml) failures.push(`${run}: partial report folder has YAML files but is missing 102-report-card.yaml`);
      continue;
    }
    checked += 1;

    const ledgerPath = join(dir, '100-evidence-ledger.yaml');
    let ledger = null;
    if (existsSync(ledgerPath)) {
      try {
        ledger = readYaml(ledgerPath);
        checkEvidenceCoverage(failures, warnings, run, ledger);
      } catch (err) {
        failures.push(`${run}/100-evidence-ledger.yaml: YAML parse failed: ${err.message.split('\n')[0]}`);
      }
    }

    let reportDoc = null;
    let card = null;
    try {
      reportDoc = readYaml(join(dir, '101-report-document.yaml'));
    } catch (err) {
      failures.push(`${run}/101-report-document.yaml: YAML parse failed: ${err.message.split('\n')[0]}`);
    }
    try {
      card = readYaml(join(dir, '102-report-card.yaml'));
    } catch (err) {
      failures.push(`${run}/102-report-card.yaml: YAML parse failed: ${err.message.split('\n')[0]}`);
    }
    if (ledger && reportDoc && card) checkDepthQuality(failures, warnings, run, dir, ledger, reportDoc, card);

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
