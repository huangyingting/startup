#!/usr/bin/env node
// Content-quality and translation-parity checks across all completed reports.
// Schema and renderer-contract checks live in website/scripts/check-reports.mjs.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asDateString, canonicalSourceUrl, listDirs, readYaml, reportsDir, tryReadYaml } from './text-utils.mjs';
import { ANALYSIS_FILES, REQUIRED_LOCALIZED_PAIRS, SCHEMA_VERSION } from './report-manifest.mjs';
import { CARD_ENUM_FIELDS } from './report-registry.mjs';

const PUBLISHER_CONCENTRATION_LIMIT = 0.34;
const INDEPENDENT_FLOOR = 0.15;
const HIGH_PROFILE_VALUATION_USD_M = 100_000;
const HIGH_PROFILE_REVENUE_USD_M = 10_000;
const MIN_HIGH_PROFILE_SOURCES = 50;
const MIN_HIGH_PROFILE_CLAIMS = 90;
const REPORT_COVERAGE_FLOOR = 0.8;

// Fields that legitimately contain prose and therefore must be translated for
// the Simplified Chinese sibling.
const TRANSLATABLE_KEYS = new Set([
  'background', 'body', 'businessModel', 'customerFocus', 'detail', 'diligencePath',
  'disclaimer', 'fundingStatus', 'gap', 'headline', 'headquarters', 'label', 'notes',
  'productSummary', 'role', 'sector', 'shortDescription', 'stage', 'subtitle', 'summary',
  'title', 'unit',
]);

// Domain proper nouns and acronyms that legitimately appear in Chinese text.
const ALLOWED_ASCII_TOKENS = new Set([
  'AI', 'API', 'APIs', 'ARR', 'AWS', 'Azure', 'Bedrock', 'Bloomberg', 'CAC', 'ChatGPT',
  'CNBC', 'Codex', 'DALL', 'DPA', 'Forbes', 'GPT', 'GRR', 'Llama', 'LTV', 'Meta',
  'Microsoft', 'NRR', 'Nvidia', 'OpenAI', 'PBC', 'SOC', 'SoftBank', 'Sora', 'TAM', 'USD',
  'Vertex', 'Anthropic', 'Google', 'Amazon', 'Claude', 'Code', 'Cowork', 'Free', 'Pro',
  'Max', 'Team', 'Enterprise', 'Coherent', 'Market', 'Insights', 'Mordor', 'Artificial',
  'Analysis', 'Opus', 'Sonnet', 'Gemini', 'Preview', 'Compliance', 'HIPAA', 'SCIM', 'SSO',
  'Messages', 'Managed', 'Agents', 'Web', 'Search', 'GitHub', 'Copilot', 'token', 'SaaS',
  'IPO',
]);

const CHINESE_TRANSLATION_MARKER = /中文(?:摘要)?[：:]/;
const CJK_RANGE = /[\u3400-\u9fff]/;
const ENGLISH_PROSE_HINT = /\b(the|and|with|because|should|requires?|reported|public|customer|revenue|valuation|risk|market|product|evidence|diligence|summary|analysis|recommendation|company|business|enterprise)\b/i;
const ASCII_WORD = /[A-Za-z]{4,}/g;

const GENERIC_TITLES = new Set([
  'Evidence base', 'Investor interpretation', 'Contradictions and uncertainty',
  'Private diligence path', 'Snapshot conclusion',
]);
const GENERIC_FIGURE_LABELS = new Set([
  'Public anchor', 'Private bridge', 'Underwriting output', 'Evidence strength',
  'Unknown private inputs', 'Investment implication',
]);

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

function tableIdSignature(doc) {
  return (doc.tables ?? []).map((table) => table?.id).sort().join(',');
}

function figureIdSignature(doc) {
  return (doc.figures ?? []).map((figure) => figure?.id).sort().join(',');
}

function idSet(items) {
  return new Set((items ?? []).map((item) => item?.id).filter(Boolean));
}

function yamlFiles(dir) {
  return readdirSync(dir).filter((name) => name.endsWith('.yaml'));
}

function isRenderableScalar(value) {
  if (value === null || value === undefined) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  return value instanceof Date;
}

function loadYaml(path) {
  const result = tryReadYaml(path);
  return result.ok ? result.value : null;
}

// ---------------------------------------------------------------------------
// renderable-data checks (tables and timeline figures)
// ---------------------------------------------------------------------------

function checkRenderableData(run, file, doc) {
  for (const table of doc?.tables ?? []) {
    for (const [rowIndex, row] of (table.rows ?? []).entries()) {
      for (const [cellIndex, cell] of (row ?? []).entries()) {
        if (isRenderableScalar(cell)) continue;
        const kind = Array.isArray(cell) ? 'an array' : 'an object';
        fail(`${run}/${file}: table ${table.id} row ${rowIndex + 1} cell ${cellIndex + 1} is ${kind}; use a scalar value`);
      }
    }
  }
  for (const figure of doc?.figures ?? []) {
    if (figure.type !== 'timeline') continue;
    for (const [itemIndex, item] of (figure.data?.items ?? []).entries()) {
      for (const key of ['date', 'label', 'detail']) {
        if (isRenderableScalar(item?.[key])) continue;
        const kind = Array.isArray(item?.[key]) ? 'an array' : 'an object';
        fail(`${run}/${file}: timeline figure ${figure.id} item ${itemIndex + 1}.${key} is ${kind}; use a scalar value`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// translation completeness
// ---------------------------------------------------------------------------

function isSkippableForTranslation(value) {
  const text = String(value ?? '').trim();
  if (!text) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[A-Z]\d{3}$/.test(text)) return true;
  if (/^[$€¥]?[0-9,.]+[A-Za-z%+.-]*$/.test(text)) return true;
  if (/^\d{4}(-\d{2}){0,2}$/.test(text)) return true;
  if (/^[a-z]+(?:-[a-z]+)*$/.test(text) && text.length < 24) return true;
  return false;
}

function looksLikeUntranslatedEnglish(value) {
  const text = String(value ?? '').trim();
  if (isSkippableForTranslation(text)) return false;
  const words = (text.match(ASCII_WORD) ?? []).filter((word) => !ALLOWED_ASCII_TOKENS.has(word));
  if (words.length < 6) return false;
  return CJK_RANGE.test(text) ? ENGLISH_PROSE_HINT.test(words.join(' ')) : ENGLISH_PROSE_HINT.test(text);
}

function isTranslatableLocation(path) {
  const key = path.at(-1) ?? '';
  if (TRANSLATABLE_KEYS.has(key)) return true;
  if (path.includes('tables') && (path.includes('rows') || path.includes('columns') || ['notes', 'title'].includes(key))) return true;
  if (path.includes('figures') && TRANSLATABLE_KEYS.has(key)) return true;
  if (['topStrengths', 'topRisks', 'unresolvedGaps'].some((name) => path.includes(name))) return true;
  return false;
}

function walkChineseDocument(run, file, value, path = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkChineseDocument(run, file, item, [...path, String(index)]));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['statement', 'keyQuote', 'url'].includes(key)) continue;
      walkChineseDocument(run, file, child, [...path, key]);
    }
    return;
  }
  if (typeof value !== 'string') return;
  if (!isTranslatableLocation(path)) return;
  if (CHINESE_TRANSLATION_MARKER.test(value)) {
    fail(`${run}/${file}: placeholder translation marker at ${path.join('.')}`);
    return;
  }
  if (looksLikeUntranslatedEnglish(value)) {
    fail(`${run}/${file}: likely untranslated English text at ${path.join('.')}: "${value.slice(0, 120)}"`);
  }
}

// ---------------------------------------------------------------------------
// evidence ledger checks
// ---------------------------------------------------------------------------

function checkLedger(run, ledger) {
  const { coverage = {}, sources = [], claims = [] } = ledger;
  const file = `${run}/100-evidence-ledger.yaml`;
  if (Number(coverage.sourcesRetained) !== sources.length) {
    fail(`${file}: coverage.sourcesRetained ${coverage.sourcesRetained} must equal sources.length ${sources.length}`);
  }
  if (Number(coverage.sourcesConsidered) < sources.length) {
    fail(`${file}: coverage.sourcesConsidered ${coverage.sourcesConsidered} cannot be less than sources.length ${sources.length}`);
  }
  if (Number(coverage.claimsCreated) !== claims.length) {
    fail(`${file}: coverage.claimsCreated ${coverage.claimsCreated} must equal claims.length ${claims.length}`);
  }

  const seenUrls = new Map();
  for (const source of sources) {
    const url = canonicalSourceUrl(source.url);
    if (!url) continue;
    if (seenUrls.has(url)) {
      fail(`${file}: duplicate source URL ${source.url} appears in ${seenUrls.get(url)} and ${source.id}`);
    } else {
      seenUrls.set(url, source.id);
    }
  }

  const cited = new Set(claims.flatMap((claim) => claim.sourceRefs ?? []));
  const uncitedCount = sources.filter((source) => !cited.has(source.id)).length;
  if (sources.length && uncitedCount / sources.length > 0.5) {
    warn(`${file}: ${uncitedCount}/${sources.length} retained sources are not cited by claims; consider pruning irrelevant sources or creating missing claims`);
  }

  if (sources.length < 20) return;

  const counts = new Map();
  for (const source of sources) {
    const publisher = source.publisher || 'unknown';
    counts.set(publisher, (counts.get(publisher) ?? 0) + 1);
  }
  const [topPublisher, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topPublisher && topCount / sources.length > PUBLISHER_CONCENTRATION_LIMIT) {
    warn(`${file}: publisher "${topPublisher}" accounts for ${topCount}/${sources.length} retained sources (>${Math.round(PUBLISHER_CONCENTRATION_LIMIT * 100)}%); diversify independent reporting`);
  }
  const independent = sources.filter((source) => source.independence === 'independent').length;
  if (independent / sources.length < INDEPENDENT_FLOOR) {
    warn(`${file}: only ${independent}/${sources.length} retained sources are independent (<${Math.round(INDEPENDENT_FLOOR * 100)}%); add tier-one-news, analyst-market-data, or filing sources`);
  }
}

// ---------------------------------------------------------------------------
// English/Chinese sibling parity
// ---------------------------------------------------------------------------

function parsePair(run, dir, enFile, zhFile) {
  const enPath = join(dir, enFile);
  const zhPath = join(dir, zhFile);
  if (!existsSync(enPath)) return null;
  if (!existsSync(zhPath)) {
    fail(`${run}/${zhFile}: required Simplified Chinese localization is missing`);
    return null;
  }
  const enResult = tryReadYaml(enPath);
  if (!enResult.ok) {
    fail(`${run}/${enFile}: YAML parse failed: ${enResult.error}`);
    return null;
  }
  const zhResult = tryReadYaml(zhPath);
  if (!zhResult.ok) {
    fail(`${run}/${zhFile}: YAML parse failed: ${zhResult.error}`);
    return null;
  }
  return { en: enResult.value, zh: zhResult.value, zhPath };
}

function checkCardEnumParity(run, zhFile, en, zh) {
  for (const [field, allowed] of Object.entries(CARD_ENUM_FIELDS)) {
    if (zh[field] !== en[field]) {
      fail(`${run}/${zhFile}: ${field} must equal English (translator must preserve enums)`);
    }
    if (zh[field] !== undefined && !allowed.includes(zh[field])) {
      fail(`${run}/${zhFile}: invalid ${field} ${zh[field]}`);
    }
  }
  for (const field of ['figureCount', 'tableCount', 'overallScore']) {
    if (zh[field] !== en[field]) fail(`${run}/${zhFile}: ${field} must equal English`);
  }
}

function checkPair(run, dir, enFile, zhFile) {
  const parsed = parsePair(run, dir, enFile, zhFile);
  if (!parsed) return;
  const { en, zh, zhPath } = parsed;

  checkRenderableData(run, enFile, en);
  checkRenderableData(run, zhFile, zh);

  if (CHINESE_TRANSLATION_MARKER.test(readFileSync(zhPath, 'utf8'))) {
    fail(`${run}/${zhFile}: contains placeholder translation marker "中文:" or "中文摘要:"`);
  }
  walkChineseDocument(run, zhFile, zh);

  if (zh.schemaVersion !== SCHEMA_VERSION) {
    fail(`${run}/${zhFile}: expected schemaVersion ${SCHEMA_VERSION}, got ${zh.schemaVersion}`);
  }
  if (zh.artifact !== en.artifact) fail(`${run}/${zhFile}: artifact must equal ${en.artifact}`);
  if (zh.slug !== en.slug) fail(`${run}/${zhFile}: slug must equal ${en.slug}`);
  if (asDateString(zh.runDate) !== asDateString(en.runDate)) {
    fail(`${run}/${zhFile}: runDate must equal English version`);
  }
  if (Array.isArray(en.tables) && tableIdSignature(en) !== tableIdSignature(zh)) {
    fail(`${run}/${zhFile}: table IDs must match English`);
  }
  if (Array.isArray(en.figures) && figureIdSignature(en) !== figureIdSignature(zh)) {
    fail(`${run}/${zhFile}: figure IDs must match English`);
  }
  if (Array.isArray(en.sections) && Array.isArray(zh.sections) && en.sections.length !== zh.sections.length) {
    fail(`${run}/${zhFile}: sections count ${zh.sections.length} must equal English ${en.sections.length}`);
  }
  if (zhFile === '102-report-card.zh.yaml') checkCardEnumParity(run, zhFile, en, zh);
}

// ---------------------------------------------------------------------------
// depth and template-risk checks
// ---------------------------------------------------------------------------

function genericFigureCount(figures) {
  return figures.filter((figure) => {
    const data = figure.data ?? {};
    const labels = [...(data.items ?? []), ...(data.nodes ?? []), ...(data.layers ?? [])]
      .map((item) => item?.label).filter(Boolean);
    return labels.length >= 3 && labels.filter((label) => GENERIC_FIGURE_LABELS.has(label)).length >= 3;
  }).length;
}

function checkAnalysisFloors(run, doc, file) {
  const isSnapshot = file === '01-company-snapshot.yaml';
  const floors = { tables: isSnapshot ? 3 : 4, figures: 2, sections: isSnapshot ? 5 : 4 };
  const counts = {
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sections: doc.sections?.length ?? 0,
  };
  for (const [key, min] of Object.entries(floors)) {
    if (counts[key] < min) fail(`${run}/${file}: thin analysis (${counts[key]} ${key.slice(0, -1)}(s)); expected at least ${min}`);
  }
  return { isSnapshot, counts };
}

function checkAnalysisTemplateRisks(run, doc, file, isSnapshot, counts) {
  const hitsFloorExactly = !isSnapshot && counts.tables === 4 && counts.figures === 2 && counts.sections === 4;
  const sections = doc.sections ?? [];
  const genericTitles = sections.filter((section) => GENERIC_TITLES.has(section?.title)).length;
  const bodies = sections.map((section) => String(section?.body ?? '').trim()).filter(Boolean);
  const duplicateBodies = bodies.length - new Set(bodies).size;
  const genericFigures = genericFigureCount(doc.figures ?? []);
  const tables = doc.tables ?? [];
  const allShortTables = tables.length > 0 && tables.every((table) => (table.rows?.length ?? 0) <= 4);

  if (genericTitles >= 3 || duplicateBodies || genericFigures || (hitsFloorExactly && allShortTables)) {
    warn(`${run}/${file}: template-risk signal (${genericTitles} generic section title(s), ${duplicateBodies} duplicate section bod(y/ies), ${genericFigures} generic figure(s), ${hitsFloorExactly ? 'hits minimum counts exactly' : 'above floor'})`);
    return { hitsFloorExactly, templateRisk: true };
  }
  return { hitsFloorExactly, templateRisk: false };
}

function checkHighProfileEvidence(run, ledger, card) {
  const valuation = Number(card?.keyMetrics?.valuationUsdM ?? 0);
  const revenue = Number(card?.keyMetrics?.revenueRunRateUsdM ?? 0);
  const isHighProfile = valuation >= HIGH_PROFILE_VALUATION_USD_M || revenue >= HIGH_PROFILE_REVENUE_USD_M;
  if (!isHighProfile) return;
  const sourceCount = ledger.sources?.length ?? 0;
  const claimCount = ledger.claims?.length ?? 0;
  if (sourceCount < MIN_HIGH_PROFILE_SOURCES) {
    fail(`${run}/100-evidence-ledger.yaml: high-profile company has only ${sourceCount} retained sources; expected at least ${MIN_HIGH_PROFILE_SOURCES} or a documented reason`);
  }
  if (claimCount < MIN_HIGH_PROFILE_CLAIMS) {
    fail(`${run}/100-evidence-ledger.yaml: high-profile company has only ${claimCount} claims; expected at least ${MIN_HIGH_PROFILE_CLAIMS} or a documented reason`);
  }
}

function checkReportCoverage(run, docs, report) {
  const upstreamTables = idSet([...docs.values()].flatMap((doc) => doc.tables ?? []));
  const upstreamFigures = idSet([...docs.values()].flatMap((doc) => doc.figures ?? []));
  const reportTables = idSet(report.tables ?? []);
  const reportFigures = idSet(report.figures ?? []);
  const notes = String(report.reportMeta?.coverageNotes ?? '');
  const missingTables = [...upstreamTables].filter((id) => !reportTables.has(id) && !notes.includes(id));
  const missingFigures = [...upstreamFigures].filter((id) => !reportFigures.has(id) && !notes.includes(id));
  if (upstreamTables.size && reportTables.size / upstreamTables.size < REPORT_COVERAGE_FLOOR) {
    fail(`${run}/101-report-document.yaml: preserves only ${reportTables.size}/${upstreamTables.size} upstream tables`);
  }
  if (upstreamFigures.size && reportFigures.size / upstreamFigures.size < REPORT_COVERAGE_FLOOR) {
    fail(`${run}/101-report-document.yaml: preserves only ${reportFigures.size}/${upstreamFigures.size} upstream figures`);
  }
  if (missingTables.length) warn(`${run}/101-report-document.yaml: upstream table(s) missing without coverageNotes: ${missingTables.join(', ')}`);
  if (missingFigures.length) warn(`${run}/101-report-document.yaml: upstream figure(s) missing without coverageNotes: ${missingFigures.join(', ')}`);
}

function checkDepth(run, dir, ledger, report, card) {
  const docs = new Map();
  for (const file of ANALYSIS_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    docs.set(file, readYaml(path));
  }

  let floorHits = 0;
  let templateRisks = 0;
  for (const [file, doc] of docs) {
    const { isSnapshot, counts } = checkAnalysisFloors(run, doc, file);
    const { hitsFloorExactly, templateRisk } = checkAnalysisTemplateRisks(run, doc, file, isSnapshot, counts);
    if (hitsFloorExactly) floorHits += 1;
    if (templateRisk) templateRisks += 1;
  }

  if (floorHits >= 5) warn(`${run}: ${floorHits}/7 domain artifacts hit the minimum 4-section/4-table/2-figure floor exactly; investigate floor-targeted generation`);
  if (templateRisks >= 5) warn(`${run}: ${templateRisks} analysis artifacts show template-risk patterns; report may be schema-valid but not investor-grade`);

  checkHighProfileEvidence(run, ledger, card);
  checkReportCoverage(run, docs, report);
}

// ---------------------------------------------------------------------------
// per-run pipeline
// ---------------------------------------------------------------------------

function loadCoreArtifacts(run, dir) {
  const out = { ledger: null, report: null, card: null };
  for (const [key, file] of [['ledger', '100-evidence-ledger.yaml'], ['report', '101-report-document.yaml'], ['card', '102-report-card.yaml']]) {
    const value = loadYaml(join(dir, file));
    if (!value) {
      fail(`${run}/${file}: YAML parse failed or missing`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function checkRun(run) {
  const dir = join(reportsDir, run);
  if (!existsSync(join(dir, '102-report-card.yaml'))) {
    if (yamlFiles(dir).length) fail(`${run}: partial report folder has YAML files but is missing 102-report-card.yaml`);
    return false;
  }
  const { ledger, report, card } = loadCoreArtifacts(run, dir);
  if (ledger) checkLedger(run, ledger);
  if (ledger && report && card) checkDepth(run, dir, ledger, report, card);
  for (const [enFile, zhFile] of REQUIRED_LOCALIZED_PAIRS) checkPair(run, dir, enFile, zhFile);
  return true;
}

try {
  if (!existsSync(reportsDir)) {
    console.warn(`[check:reports-content] ${reportsDir} not found; nothing to check.`);
    process.exit(0);
  }

  let checked = 0;
  for (const run of listDirs(reportsDir)) if (checkRun(run)) checked += 1;

  if (warnings.length) console.warn('[check:reports-content] warnings:\n' + warnings.map((message) => `  - ${message}`).join('\n'));
  if (failures.length) {
    console.error('[check:reports-content] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports-content] ✓ ${checked} report(s) verified.`);
} catch (err) {
  console.error(`[check:reports-content] fatal error: ${err.message}`);
  process.exit(1);
}
