#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asDateString, canonicalSourceUrl, listDirs, readYaml, reportsDir } from './text-utils.mjs';

const SCHEMA = 'startup-diligence-report-v2';
const ANALYSIS = [
  '01-company-snapshot.yaml',
  '02-market-macro.yaml',
  '03-competitive-benchmarking.yaml',
  '04-financial-unit-economics.yaml',
  '05-product-technology.yaml',
  '06-customer-retention.yaml',
  '07-risk-regulatory.yaml',
  '08-investment-valuation.yaml',
];
const PAIRS = [
  ...ANALYSIS.map((file) => [file, file.replace(/\.yaml$/, '.zh.yaml')]),
  ['101-report-document.yaml', '101-report-document.zh.yaml'],
  ['102-report-card.yaml', '102-report-card.zh.yaml'],
];
const ENUMS = {
  recommendation: new Set(['strong-buy', 'buy', 'track', 'research-more', 'avoid']),
  confidence: new Set(['high', 'medium', 'low']),
  riskRating: new Set(['low', 'moderate', 'significant', 'critical', 'unknown']),
  valuationStance: new Set(['attractive', 'fair', 'stretched', 'expensive', 'unknown']),
};
const TRANSLATABLE = new Set(['background', 'body', 'businessModel', 'customerFocus', 'detail', 'diligencePath', 'disclaimer', 'fundingStatus', 'gap', 'headline', 'headquarters', 'label', 'notes', 'productSummary', 'role', 'sector', 'shortDescription', 'stage', 'subtitle', 'summary', 'title', 'unit']);
const ALLOWED_ASCII = new Set(['AI', 'API', 'APIs', 'ARR', 'AWS', 'Azure', 'Bedrock', 'Bloomberg', 'CAC', 'ChatGPT', 'CNBC', 'Codex', 'DALL', 'DPA', 'Forbes', 'GPT', 'GRR', 'Llama', 'LTV', 'Meta', 'Microsoft', 'NRR', 'Nvidia', 'OpenAI', 'PBC', 'SOC', 'SoftBank', 'Sora', 'TAM', 'USD', 'Vertex', 'Anthropic', 'Google', 'Amazon', 'Claude', 'Code', 'Cowork', 'Free', 'Pro', 'Max', 'Team', 'Enterprise', 'Coherent', 'Market', 'Insights', 'Mordor', 'Artificial', 'Analysis', 'Opus', 'Sonnet', 'Gemini', 'Preview', 'Compliance', 'HIPAA', 'SCIM', 'SSO', 'Messages', 'Managed', 'Agents', 'Web', 'Search', 'GitHub', 'Copilot', 'token', 'SaaS', 'IPO']);
const EN_WORDS = /\b(the|and|with|because|should|requires?|reported|public|customer|revenue|valuation|risk|market|product|evidence|diligence|summary|analysis|recommendation|company|business|enterprise)\b/i;
const ASCII_WORD = /[A-Za-z]{4,}/g;
const CJK = /[\u3400-\u9fff]/;
const GENERIC_TITLES = new Set(['Evidence base', 'Investor interpretation', 'Contradictions and uncertainty', 'Private diligence path', 'Snapshot conclusion']);
const GENERIC_FIGURE_LABELS = new Set(['Public anchor', 'Private bridge', 'Underwriting output', 'Evidence strength', 'Unknown private inputs', 'Investment implication']);

const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);
const warn = (msg) => warnings.push(msg);

function tableIds(doc) { return (doc.tables ?? []).map((x) => x?.id).sort().join(','); }
function figureIds(doc) { return (doc.figures ?? []).map((x) => x?.id).sort().join(','); }
function idSet(items) { return new Set((items ?? []).map((x) => x?.id).filter(Boolean)); }
function yamlFiles(dir) { return readdirSync(dir).filter((name) => name.endsWith('.yaml')); }
function isRenderableScalar(value) { return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value) || value instanceof Date; }

function checkRenderableData(run, file, doc) {
  for (const table of doc?.tables ?? []) {
    for (const [rowIndex, row] of (table.rows ?? []).entries()) {
      for (const [cellIndex, cell] of (row ?? []).entries()) {
        if (!isRenderableScalar(cell)) fail(`${run}/${file}: table ${table.id} row ${rowIndex + 1} cell ${cellIndex + 1} is ${Array.isArray(cell) ? 'an array' : 'an object'}; use a scalar value`);
      }
    }
  }

  for (const figure of doc?.figures ?? []) {
    if (figure.type !== 'timeline') continue;
    for (const [itemIndex, item] of (figure.data?.items ?? []).entries()) {
      for (const key of ['date', 'label', 'detail']) {
        if (!isRenderableScalar(item?.[key])) fail(`${run}/${file}: timeline figure ${figure.id} item ${itemIndex + 1}.${key} is ${Array.isArray(item?.[key]) ? 'an array' : 'an object'}; use a scalar value`);
      }
    }
  }
}

function skippableText(value) {
  const text = String(value ?? '').trim();
  return !text || /^https?:\/\//i.test(text) || /^[A-Z]\d{3}$/.test(text) || /^[$€¥]?[0-9,.]+[A-Za-z%+.-]*$/.test(text) || /^\d{4}(-\d{2}){0,2}$/.test(text) || (/^[a-z]+(?:-[a-z]+)*$/.test(text) && text.length < 24);
}

function looksEnglish(value) {
  const text = String(value ?? '').trim();
  if (skippableText(text)) return false;
  const words = (text.match(ASCII_WORD) ?? []).filter((word) => !ALLOWED_ASCII.has(word));
  return CJK.test(text) ? words.length >= 6 && EN_WORDS.test(words.join(' ')) : words.length >= 6 && EN_WORDS.test(text);
}

function walkZh(run, file, value, path = []) {
  if (Array.isArray(value)) return value.forEach((x, i) => walkZh(run, file, x, [...path, String(i)]));
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) if (!['statement', 'keyQuote', 'url'].includes(key)) walkZh(run, file, child, [...path, key]);
    return;
  }
  if (typeof value !== 'string') return;
  const key = path.at(-1) ?? '';
  const inTable = path.includes('tables') && (path.includes('rows') || path.includes('columns') || ['notes', 'title'].includes(key));
  const inFigure = path.includes('figures') && TRANSLATABLE.has(key);
  const inCardList = ['topStrengths', 'topRisks', 'unresolvedGaps'].some((name) => path.includes(name));
  if (!(TRANSLATABLE.has(key) || inTable || inFigure || inCardList)) return;
  if (/中文(?:摘要)?[：:]/.test(value)) fail(`${run}/${file}: placeholder translation marker at ${path.join('.')}`);
  else if (looksEnglish(value)) fail(`${run}/${file}: likely untranslated English text at ${path.join('.')}: "${value.slice(0, 120)}"`);
}

function checkLedger(run, ledger) {
  const { coverage = {}, sources = [], claims = [] } = ledger;
  if (Number(coverage.sourcesRetained) !== sources.length) fail(`${run}/100-evidence-ledger.yaml: coverage.sourcesRetained ${coverage.sourcesRetained} must equal sources.length ${sources.length}`);
  if (Number(coverage.sourcesConsidered) < sources.length) fail(`${run}/100-evidence-ledger.yaml: coverage.sourcesConsidered ${coverage.sourcesConsidered} cannot be less than sources.length ${sources.length}`);
  if (Number(coverage.claimsCreated) !== claims.length) fail(`${run}/100-evidence-ledger.yaml: coverage.claimsCreated ${coverage.claimsCreated} must equal claims.length ${claims.length}`);

  const urls = new Map();
  for (const source of sources) {
    const url = canonicalSourceUrl(source.url);
    if (!url) continue;
    if (urls.has(url)) fail(`${run}/100-evidence-ledger.yaml: duplicate source URL ${source.url} appears in ${urls.get(url)} and ${source.id}`);
    else urls.set(url, source.id);
  }

  const cited = new Set(claims.flatMap((claim) => claim.sourceRefs ?? []));
  const uncited = sources.filter((source) => !cited.has(source.id)).length;
  if (sources.length && uncited / sources.length > 0.5) warn(`${run}/100-evidence-ledger.yaml: ${uncited}/${sources.length} retained sources are not cited by claims; consider pruning irrelevant sources or creating missing claims`);

  if (sources.length >= 20) {
    const counts = new Map();
    for (const source of sources) counts.set(source.publisher || 'unknown', (counts.get(source.publisher || 'unknown') ?? 0) + 1);
    const [publisher, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (publisher && count / sources.length > 0.34) warn(`${run}/100-evidence-ledger.yaml: publisher "${publisher}" accounts for ${count}/${sources.length} retained sources (>34%); diversify independent reporting`);
    const independent = sources.filter((source) => source.independence === 'independent').length;
    if (independent / sources.length < 0.15) warn(`${run}/100-evidence-ledger.yaml: only ${independent}/${sources.length} retained sources are independent (<15%); add tier-one-news, analyst-market-data, or filing sources`);
  }
}

function checkZhPair(run, dir, enFile, zhFile) {
  const enPath = join(dir, enFile);
  const zhPath = join(dir, zhFile);
  if (!existsSync(enPath)) return;
  if (!existsSync(zhPath)) return fail(`${run}/${zhFile}: required Simplified Chinese localization is missing`);

  let en, zh;
  try { en = readYaml(enPath); } catch (err) { return fail(`${run}/${enFile}: YAML parse failed: ${err.message.split('\n')[0]}`); }
  try { zh = readYaml(zhPath); } catch (err) { return fail(`${run}/${zhFile}: YAML parse failed: ${err.message.split('\n')[0]}`); }

  checkRenderableData(run, enFile, en);
  checkRenderableData(run, zhFile, zh);

  if (/中文(?:摘要)?[：:]/.test(readFileSync(zhPath, 'utf8'))) fail(`${run}/${zhFile}: contains placeholder translation marker "中文:" or "中文摘要:"`);
  walkZh(run, zhFile, zh);
  if (zh.schemaVersion !== SCHEMA) fail(`${run}/${zhFile}: expected schemaVersion ${SCHEMA}, got ${zh.schemaVersion}`);
  if (zh.artifact !== en.artifact) fail(`${run}/${zhFile}: artifact must equal ${en.artifact}`);
  if (zh.slug !== en.slug) fail(`${run}/${zhFile}: slug must equal ${en.slug}`);
  if (asDateString(zh.runDate) !== asDateString(en.runDate)) fail(`${run}/${zhFile}: runDate must equal English version`);
  if (Array.isArray(en.tables) && tableIds(en) !== tableIds(zh)) fail(`${run}/${zhFile}: table IDs must match English`);
  if (Array.isArray(en.figures) && figureIds(en) !== figureIds(zh)) fail(`${run}/${zhFile}: figure IDs must match English`);
  if (Array.isArray(en.sections) && Array.isArray(zh.sections) && en.sections.length !== zh.sections.length) fail(`${run}/${zhFile}: sections count ${zh.sections.length} must equal English ${en.sections.length}`);

  if (zhFile === '102-report-card.zh.yaml') {
    for (const [field, allowed] of Object.entries(ENUMS)) {
      if (zh[field] !== en[field]) fail(`${run}/${zhFile}: ${field} must equal English (translator must preserve enums)`);
      if (zh[field] !== undefined && !allowed.has(zh[field])) fail(`${run}/${zhFile}: invalid ${field} ${zh[field]}`);
    }
    for (const field of ['figureCount', 'tableCount', 'overallScore']) if (zh[field] !== en[field]) fail(`${run}/${zhFile}: ${field} must equal English`);
  }
}

function checkDepth(run, dir, ledger, report, card) {
  const docs = new Map(ANALYSIS.flatMap((file) => existsSync(join(dir, file)) ? [[file, readYaml(join(dir, file))]] : []));
  let floorHits = 0;
  let templateRisks = 0;

  for (const [file, doc] of docs) {
    const snapshot = file === '01-company-snapshot.yaml';
    const floors = { tables: snapshot ? 3 : 4, figures: 2, sections: snapshot ? 5 : 4 };
    const counts = { tables: doc.tables?.length ?? 0, figures: doc.figures?.length ?? 0, sections: doc.sections?.length ?? 0 };
    for (const [key, min] of Object.entries(floors)) if (counts[key] < min) fail(`${run}/${file}: thin analysis (${counts[key]} ${key.slice(0, -1)}(s)); expected at least ${min}`);

    const hitsFloor = !snapshot && counts.tables === 4 && counts.figures === 2 && counts.sections === 4;
    const genericTitles = (doc.sections ?? []).filter((s) => GENERIC_TITLES.has(s?.title)).length;
    const bodies = (doc.sections ?? []).map((s) => String(s?.body ?? '').trim()).filter(Boolean);
    const duplicateBodies = bodies.length - new Set(bodies).size;
    const genericFigures = (doc.figures ?? []).filter((figure) => {
      const data = figure.data ?? {};
      const labels = [...(data.items ?? []), ...(data.nodes ?? []), ...(data.layers ?? [])].map((x) => x?.label).filter(Boolean);
      return labels.length >= 3 && labels.filter((label) => GENERIC_FIGURE_LABELS.has(label)).length >= 3;
    }).length;
    const allShortTables = (doc.tables ?? []).length > 0 && (doc.tables ?? []).every((t) => (t.rows?.length ?? 0) <= 4);
    if (hitsFloor) floorHits += 1;
    if (genericTitles >= 3 || duplicateBodies || genericFigures || (hitsFloor && allShortTables)) {
      templateRisks += 1;
      warn(`${run}/${file}: template-risk signal (${genericTitles} generic section title(s), ${duplicateBodies} duplicate section bod(y/ies), ${genericFigures} generic figure(s), ${hitsFloor ? 'hits minimum counts exactly' : 'above floor'})`);
    }
  }

  if (floorHits >= 5) warn(`${run}: ${floorHits}/7 domain artifacts hit the minimum 4-section/4-table/2-figure floor exactly; investigate floor-targeted generation`);
  if (templateRisks >= 5) warn(`${run}: ${templateRisks} analysis artifacts show template-risk patterns; report may be schema-valid but not investor-grade`);

  const valuation = Number(card?.keyMetrics?.valuationUsdM ?? 0);
  const revenue = Number(card?.keyMetrics?.revenueRunRateUsdM ?? 0);
  if ((valuation >= 100000 || revenue >= 10000) && (ledger.sources?.length ?? 0) < 50) fail(`${run}/100-evidence-ledger.yaml: high-profile company has only ${ledger.sources?.length ?? 0} retained sources; expected at least 50 or a documented reason`);
  if ((valuation >= 100000 || revenue >= 10000) && (ledger.claims?.length ?? 0) < 90) fail(`${run}/100-evidence-ledger.yaml: high-profile company has only ${ledger.claims?.length ?? 0} claims; expected at least 90 or a documented reason`);

  const upstreamTables = idSet([...docs.values()].flatMap((doc) => doc.tables ?? []));
  const upstreamFigures = idSet([...docs.values()].flatMap((doc) => doc.figures ?? []));
  const reportTables = idSet(report.tables ?? []);
  const reportFigures = idSet(report.figures ?? []);
  const notes = String(report.reportMeta?.coverageNotes ?? '');
  const missingTables = [...upstreamTables].filter((id) => !reportTables.has(id) && !notes.includes(id));
  const missingFigures = [...upstreamFigures].filter((id) => !reportFigures.has(id) && !notes.includes(id));
  if (upstreamTables.size && reportTables.size / upstreamTables.size < 0.8) fail(`${run}/101-report-document.yaml: preserves only ${reportTables.size}/${upstreamTables.size} upstream tables`);
  if (upstreamFigures.size && reportFigures.size / upstreamFigures.size < 0.8) fail(`${run}/101-report-document.yaml: preserves only ${reportFigures.size}/${upstreamFigures.size} upstream figures`);
  if (missingTables.length) warn(`${run}/101-report-document.yaml: upstream table(s) missing without coverageNotes: ${missingTables.join(', ')}`);
  if (missingFigures.length) warn(`${run}/101-report-document.yaml: upstream figure(s) missing without coverageNotes: ${missingFigures.join(', ')}`);
}

try {
  if (!existsSync(reportsDir)) {
    console.warn(`[check:reports-content] ${reportsDir} not found; nothing to check.`);
    process.exit(0);
  }

  let checked = 0;
  for (const run of listDirs(reportsDir)) {
    const dir = join(reportsDir, run);
    if (!existsSync(join(dir, '102-report-card.yaml'))) {
      if (yamlFiles(dir).length) fail(`${run}: partial report folder has YAML files but is missing 102-report-card.yaml`);
      continue;
    }
    checked += 1;

    let ledger = null;
    let report = null;
    let card = null;
    try { ledger = readYaml(join(dir, '100-evidence-ledger.yaml')); checkLedger(run, ledger); } catch (err) { fail(`${run}/100-evidence-ledger.yaml: YAML parse failed: ${err.message.split('\n')[0]}`); }
    try { report = readYaml(join(dir, '101-report-document.yaml')); } catch (err) { fail(`${run}/101-report-document.yaml: YAML parse failed: ${err.message.split('\n')[0]}`); }
    try { card = readYaml(join(dir, '102-report-card.yaml')); } catch (err) { fail(`${run}/102-report-card.yaml: YAML parse failed: ${err.message.split('\n')[0]}`); }
    if (ledger && report && card) checkDepth(run, dir, ledger, report, card);
    for (const pair of PAIRS) checkZhPair(run, dir, ...pair);
  }

  if (warnings.length) console.warn('[check:reports-content] warnings:\n' + warnings.map((x) => `  - ${x}`).join('\n'));
  if (failures.length) {
    console.error('[check:reports-content] failures:\n' + failures.map((x) => `  - ${x}`).join('\n'));
    process.exit(1);
  }
  console.log(`[check:reports-content] ✓ ${checked} report(s) verified.`);
} catch (err) {
  console.error(`[check:reports-content] fatal error: ${err.message}`);
  process.exit(1);
}
