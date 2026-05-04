#!/usr/bin/env node
// Chapter-scoped readiness check for one analysis artifact (01-08).
// Always runs the pre-ledger checks (localEvidence quotas, claimRef
// resolution); the post-ledger phase is handled by check-reports.mjs.
//
// `--format json` emits structured failures keyed by dimension so the agent's
// retry loop can target only the failing facets (researchQuestions, sources,
// claims, sections, artifacts, depth, claimRefs, etc.).
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { canonicalSourceUrl, collectClaimRefs, getAnalysisArtifacts, normalizeDomain, tryReadYaml } from './utils.mjs';
import { validateFigureShape } from './figures.mjs';

const ANALYSIS_ARTIFACTS = getAnalysisArtifacts();

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  const formatIndex = argv.indexOf('--format');
  return {
    folder: positional[0] ?? null,
    chapter: positional[1] ?? null,
    strict: argv.includes('--strict'),
    format: formatIndex >= 0 ? argv[formatIndex + 1] : 'text',
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.folder || !args.chapter) {
  console.error('Usage: node .agents/skills/startup-research/scripts/gate.mjs <report-folder> <01-08-artifact.yaml> [--strict] [--format text|json]');
  process.exit(1);
}
if (!['text', 'json'].includes(args.format)) {
  console.error(`Invalid --format value: ${args.format}; expected text or json`);
  process.exit(1);
}

const spec = ANALYSIS_ARTIFACTS.find((item) => item.file === args.chapter);
if (!spec) {
  console.error(`Unknown chapter artifact: ${args.chapter}`);
  console.error(`Expected one of: ${ANALYSIS_ARTIFACTS.map((item) => item.file).join(', ')}`);
  process.exit(1);
}

const reportFolder = resolve(args.folder);
const failures = [];
const warnings = [];

// dimension is a stable enum the retry loop can switch on:
//   missingArtifact | yamlParse | sectionsMin | sectionsMax | artifactsMin
//   | tablesMax | figuresMax | depthSection | depthSectionTotal
//   | depthTableRows | depthFigureData | duplicateAnalysis | figureType
//   | figureShape
//   | localEvidenceMissing | researchQuestions | sources | claims | claimRefs
function fail(dimension, message, extra = {}) {
  failures.push({ dimension, file: spec.file, message, ...extra });
}

function warn(dimension, message, extra = {}) {
  warnings.push({ dimension, file: spec.file, message, ...extra });
}

function loadYamlFile(file) {
  const path = join(reportFolder, file);
  if (!existsSync(path)) {
    fail('missingArtifact', `${file}: missing`);
    return null;
  }
  const result = tryReadYaml(path);
  if (!result.ok) {
    fail('yamlParse', `${file}: YAML parse failed: ${result.error}`);
    return null;
  }
  return result.value;
}

function figureTypeSet(doc) {
  return new Set((doc?.figures ?? []).map((figure) => figure?.type).filter(Boolean));
}

function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function figureDataPointCount(figure) {
  const data = figure?.data ?? {};
  return Math.max(
    data.items?.length ?? 0,
    data.nodes?.length ?? 0,
    data.edges?.length ?? 0,
    data.layers?.length ?? 0,
    data.series?.length ?? 0,
    data.columns?.length ?? 0,
    data.rows?.length ?? 0,
    data.points?.length ?? 0,
  );
}

function detailStats(doc) {
  const sectionWords = (doc.sections ?? []).map((section) => wordCount(section?.body));
  const tableRows = (doc.tables ?? []).map((table) => table?.rows?.length ?? 0);
  const figureDataPoints = (doc.figures ?? []).map(figureDataPointCount);
  return {
    minSectionWords: sectionWords.length ? Math.min(...sectionWords) : 0,
    sectionWordsTotal: sectionWords.reduce((sum, count) => sum + count, 0),
    tableRowsTotal: tableRows.reduce((sum, count) => sum + count, 0),
    figureDataPointsTotal: figureDataPoints.reduce((sum, count) => sum + count, 0),
  };
}

function checkDepthFloor(file, doc, floor) {
  const stats = detailStats(doc);
  if (stats.minSectionWords < floor.minSectionBodyWords) {
    fail('depthSection', `${file}: thin section prose (${stats.minSectionWords} words in shortest section); expected every section body to have at least ${floor.minSectionBodyWords}`, { actual: stats.minSectionWords, required: floor.minSectionBodyWords });
  }
  if (stats.sectionWordsTotal < floor.minSectionWordsTotal) {
    fail('depthSectionTotal', `${file}: thin section prose (${stats.sectionWordsTotal} total section words); expected at least ${floor.minSectionWordsTotal}`, { actual: stats.sectionWordsTotal, required: floor.minSectionWordsTotal });
  }
  if (stats.tableRowsTotal < floor.minTableRowsTotal) {
    fail('depthTableRows', `${file}: thin table analysis (${stats.tableRowsTotal} total table rows); expected at least ${floor.minTableRowsTotal}`, { actual: stats.tableRowsTotal, required: floor.minTableRowsTotal });
  }
  if (stats.figureDataPointsTotal < floor.minFigureDataPointsTotal) {
    fail('depthFigureData', `${file}: thin figure data (${stats.figureDataPointsTotal} total figure data points); expected at least ${floor.minFigureDataPointsTotal}`, { actual: stats.figureDataPointsTotal, required: floor.minFigureDataPointsTotal });
  }
}

function normalizeAnalysisTokens(value) {
  const stop = new Set(['table', 'figure', 'fig', 'chart', 'graph', 'matrix', 'map', 'kpi', 'kpis', 'scorecard', 'analysis', 'overview', 'summary']);
  return new Set(String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stop.has(token)));
}

function jaccardSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function displayTitle(item) {
  return item?.title ?? item?.label ?? item?.name ?? item?.id ?? '';
}

function collectEmbeddedClaimRefs(value, refs = new Set()) {
  if (!value || typeof value !== 'object') return refs;
  if (Array.isArray(value)) {
    for (const item of value) collectEmbeddedClaimRefs(item, refs);
    return refs;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'claimRefs' && Array.isArray(child)) {
      for (const ref of child) if (typeof ref === 'string') refs.add(ref);
    } else {
      collectEmbeddedClaimRefs(child, refs);
    }
  }
  return refs;
}

function checkTableFigureOverlap(file, doc) {
  for (const table of doc.tables ?? []) {
    const tableTitle = displayTitle(table);
    const tableTokens = normalizeAnalysisTokens(tableTitle);
    const tableRefs = collectEmbeddedClaimRefs(table);
    for (const figure of doc.figures ?? []) {
      const figureTitle = displayTitle(figure);
      const titleSimilarity = jaccardSimilarity(tableTokens, normalizeAnalysisTokens(figureTitle));
      const figureRefs = collectEmbeddedClaimRefs(figure);
      const sharedRefs = [...tableRefs].filter((ref) => figureRefs.has(ref)).length;
      const smallerRefSet = Math.min(tableRefs.size, figureRefs.size);
      const highClaimOverlap = smallerRefSet >= 3 && sharedRefs / smallerRefSet >= 0.75;
      if (titleSimilarity >= 0.75 || highClaimOverlap) {
        warn('duplicateAnalysis', `${file}: possible duplicate table/figure analysis (${table.id ?? tableTitle} vs ${figure.id ?? figureTitle}); choose one representation unless they answer distinct questions`);
      }
    }
  }
}

const ACCESS_STATUSES = new Set(['ok', 'paywall', 'js-only', 'broken', 'rate-limited']);
const STANCES = new Set(['confirming', 'adverse', 'neutral']);
const PRIMARY_TIER_TYPES = new Set(['filing', 'regulatory', 'legal', 'official']);

function registrableDomain(url) {
  const host = normalizeDomain(url);
  if (!host) return '';
  const parts = host.split('.');
  // Keep last two labels for normal TLDs; last three for known multi-part TLDs (rough heuristic).
  if (parts.length <= 2) return host;
  const multiPart = new Set(['co.uk', 'co.jp', 'com.cn', 'com.hk', 'com.au', 'com.br', 'gov.uk', 'gov.cn']);
  const lastTwo = parts.slice(-2).join('.');
  return multiPart.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo;
}

function loadEarlierChapterUrls(reportFolder, currentSpec, allSpecs) {
  const urls = new Set();
  const earlier = allSpecs.filter((s) => s.order < currentSpec.order);
  for (const s of earlier) {
    const path = join(reportFolder, s.file);
    if (!existsSync(path)) continue;
    const result = tryReadYaml(path);
    if (!result.ok) continue;
    for (const source of result.value?.localEvidence?.sources ?? []) {
      const key = canonicalSourceUrl(source?.url);
      if (key) urls.add(key);
    }
  }
  return urls;
}

function checkSearchQueries(file, doc) {
  const queries = doc.localEvidence?.searchQueries;
  if (!Array.isArray(queries)) {
    fail('searchQueriesMissing', `${file}: localEvidence.searchQueries[] is required (use [] only when researchQuestions is also empty)`);
    return;
  }
  const questionsCount = (doc.localEvidence?.researchQuestions ?? []).length;
  if (questionsCount > 0 && queries.length === 0) {
    fail('searchQueriesMissing', `${file}: ${questionsCount} researchQuestions but searchQueries is empty (every chapter must record the queries it actually ran)`);
  }
  for (const [index, q] of queries.entries()) {
    if (typeof q !== 'object' || q === null || typeof q.query !== 'string' || !q.query.trim()) {
      fail('searchQueriesMissing', `${file}: localEvidence.searchQueries[${index}] must have a non-empty query string`);
    }
  }
}

function checkSources(file, doc, gate, earlierUrls) {
  const sources = doc.localEvidence?.sources ?? [];
  let shapeFails = 0;
  const domains = new Set();
  const types = new Set();
  let netNew = 0;
  let adverseCount = 0;
  for (const source of sources) {
    const path = `${file}: source ${source?.id ?? '?'}`;
    if (!ACCESS_STATUSES.has(source?.accessStatus)) {
      fail('sourceShape', `${path} accessStatus must be one of ${[...ACCESS_STATUSES].join('|')}`, { id: source?.id });
      shapeFails += 1;
    }
    if (!STANCES.has(source?.stance)) {
      fail('sourceShape', `${path} stance must be one of ${[...STANCES].join('|')}`, { id: source?.id });
      shapeFails += 1;
    } else if (source.stance === 'adverse') {
      adverseCount += 1;
    }
    if (source?.sourceType) types.add(source.sourceType);
    const domain = registrableDomain(source?.url);
    if (domain) domains.add(domain);
    const canonical = canonicalSourceUrl(source?.url);
    if (canonical && !earlierUrls.has(canonical)) netNew += 1;
  }
  if (shapeFails > 0) return; // skip diversity checks until shape is fixed

  if (sources.length === 0) return; // count check handled by checkLocalEvidence
  if (domains.size < gate.minSourceDomains) {
    fail('sourceDomains', `${file}: ${domains.size} distinct registrable domains across sources, expected at least ${gate.minSourceDomains}`, { actual: domains.size, required: gate.minSourceDomains });
  }
  if (types.size < gate.minSourceTypeSpread) {
    fail('sourceTypeSpread', `${file}: ${types.size} distinct sourceType values, expected at least ${gate.minSourceTypeSpread}`, { actual: types.size, required: gate.minSourceTypeSpread });
  }
  for (const required of gate.requiredSourceTypes ?? []) {
    if (!types.has(required)) {
      fail('requiredSourceTypes', `${file}: missing required sourceType "${required}" (chapter requires ${(gate.requiredSourceTypes ?? []).join(', ')})`, { missing: required });
    }
  }
  if (netNew < gate.minNetNewSources) {
    fail('netNewSources', `${file}: only ${netNew} sources are new vs earlier chapters, expected at least ${gate.minNetNewSources} (per-chapter research must add fresh sources, not reuse the global pool)`, { actual: netNew, required: gate.minNetNewSources });
  }
  // adverse-source bookkeeping is informational; the binding constraint is on adverse questions (P1) and on risks chapter sourceType requirements above.
}

function checkHighConfidenceCorroboration(file, doc, gate) {
  const sourceById = new Map((doc.localEvidence?.sources ?? []).map((s) => [s?.id, s]));
  const min = gate.minHighConfidenceCorroboration;
  for (const claim of doc.localEvidence?.claims ?? []) {
    if (claim?.confidence !== 'high') continue;
    const refs = claim.sourceRefs ?? [];
    if (refs.length < min) {
      fail('highConfidenceCorroboration', `${file}: claim ${claim.id} has confidence=high but only ${refs.length} sourceRefs (need >= ${min})`, { claimId: claim.id, actual: refs.length, required: min });
      continue;
    }
    const hasPrimary = refs.some((ref) => {
      const s = sourceById.get(ref);
      return s && (PRIMARY_TIER_TYPES.has(s.sourceType) || s.reputationTier === 'high');
    });
    if (!hasPrimary) {
      fail('highConfidenceCorroboration', `${file}: claim ${claim.id} has confidence=high but no sourceRef is primary tier (filing/regulatory/legal/official) or reputationTier=high`, { claimId: claim.id });
    }
  }
}

const ENUMERATION_COVERAGE = new Set(['exhaustive', 'partial', 'sample']);

function checkEnumerationTables(file, doc, gate, plannedTablesByName) {
  const enumerationPlans = [...plannedTablesByName.values()].filter((plan) => plan.enumeration === true);
  if (enumerationPlans.length === 0) return;
  const sourceById = new Map((doc.localEvidence?.sources ?? []).map((s) => [s?.id, s]));
  const claimById = new Map((doc.localEvidence?.claims ?? []).map((c) => [c?.id, c]));
  const gapTopics = new Set((doc.localEvidence?.evidenceGaps ?? []).map((gap) => String(gap?.topic ?? '').toLowerCase()).filter(Boolean));
  for (const plan of enumerationPlans) {
    const planSlug = slugify(plan.name);
    const table = (doc.tables ?? []).find((t) => slugify(t?.title) === planSlug);
    if (!table) {
      fail('enumerationScope', `${file}: planned enumeration table "${plan.name}" not present in tables[] (slug=${planSlug})`, { planned: plan.name });
      continue;
    }
    const scope = table.enumerationScope;
    if (!scope || typeof scope !== 'object') {
      fail('enumerationScope', `${file}: table ${table.id} ("${table.title}") is an enumeration table; enumerationScope { coverage, basis } is required`, { tableId: table.id });
      continue;
    }
    if (!ENUMERATION_COVERAGE.has(scope.coverage)) {
      fail('enumerationScope', `${file}: table ${table.id} enumerationScope.coverage must be one of ${[...ENUMERATION_COVERAGE].join('|')}`, { tableId: table.id, actual: scope.coverage });
    }
    if (typeof scope.basis !== 'string' || scope.basis.trim().length < 20) {
      fail('enumerationScope', `${file}: table ${table.id} enumerationScope.basis must be at least 20 chars (explain how completeness was verified)`, { tableId: table.id });
    }
    const rowCount = Array.isArray(table.rows) ? table.rows.length : 0;
    if (rowCount < (plan.expectedMinRows ?? 0) && scope.coverage === 'exhaustive') {
      fail('enumerationRows', `${file}: table ${table.id} ("${table.title}") has ${rowCount} rows < expectedMinRows ${plan.expectedMinRows} for an exhaustive enumeration; either add rows or set coverage to partial/sample with rationale`, { tableId: table.id, actual: rowCount, required: plan.expectedMinRows });
    }
    if (scope.coverage !== 'exhaustive') {
      const titleKey = String(table.title ?? '').toLowerCase();
      const referenced = (doc.localEvidence?.evidenceGaps ?? []).some((gap) => {
        const topic = String(gap?.topic ?? '').toLowerCase();
        return topic.includes(titleKey.slice(0, 30)) || (gap?.relatedTableRefs ?? []).includes(table.id);
      });
      if (!referenced) {
        fail('enumerationCoverageGap', `${file}: table ${table.id} coverage=${scope.coverage} requires an evidenceGap entry whose topic mentions the table or whose relatedTableRefs[] includes ${table.id}`, { tableId: table.id, coverage: scope.coverage });
      }
    }
    // Per-row corroboration: each row must be supported by claims pointing to >= minSourcesPerEnumerationRow distinct registrable domains.
    const tableClaimRefs = new Set(table.claimRefs ?? []);
    for (const claim of doc.localEvidence?.claims ?? []) {
      // skip; per-row check below uses table-level claimRefs instead
      void claim;
    }
    const tableDomains = new Set();
    for (const ref of tableClaimRefs) {
      const claim = claimById.get(ref);
      if (!claim) continue;
      for (const sref of claim.sourceRefs ?? []) {
        const s = sourceById.get(sref);
        const dom = registrableDomain(s?.url);
        if (dom) tableDomains.add(dom);
      }
    }
    if (rowCount > 0 && tableDomains.size < gate.minSourcesPerEnumerationRow) {
      fail('enumerationRowCorroboration', `${file}: table ${table.id} backed by sources from only ${tableDomains.size} distinct domains (need >= ${gate.minSourcesPerEnumerationRow}); enumeration tables must be cross-checked across independent sources`, { tableId: table.id, actual: tableDomains.size, required: gate.minSourcesPerEnumerationRow });
    }
  }
}

const QUESTION_TYPES = new Set(['enumeration', 'quantification', 'verification', 'adverse', 'freshness', 'comparison', 'mechanism']);
const QUESTION_STATUSES = new Set(['answered', 'partial', 'unresolved']);

function checkResearchQuestions(file, doc, gate, plannedTablesByName, plannedFiguresByName, contentRequirementsCount) {
  const questions = doc.localEvidence?.researchQuestions ?? [];
  const seenIds = new Set();
  const typeCounts = new Map();
  let answeredCount = 0;
  const targetedReqIndices = new Set();
  const gapTopics = new Set((doc.localEvidence?.evidenceGaps ?? []).map((gap) => String(gap?.topic ?? '').toLowerCase()).filter(Boolean));

  for (const [index, question] of questions.entries()) {
    if (typeof question !== 'object' || question === null) {
      fail('researchQuestionShape', `${file}: localEvidence.researchQuestions[${index}] must be an object with id/question/type/targets/status`);
      continue;
    }
    if (!/^RQ\d{3}$/.test(String(question.id ?? ''))) {
      fail('researchQuestionShape', `${file}: localEvidence.researchQuestions[${index}].id must match RQ###`, { id: question.id });
      continue;
    }
    if (seenIds.has(question.id)) {
      fail('researchQuestionShape', `${file}: duplicate researchQuestions id ${question.id}`, { id: question.id });
    }
    seenIds.add(question.id);
    if (typeof question.question !== 'string' || question.question.trim().length < 20) {
      fail('researchQuestionShape', `${file}: ${question.id} question text must be at least 20 chars`, { id: question.id });
    }
    if (!QUESTION_TYPES.has(question.type)) {
      fail('researchQuestionShape', `${file}: ${question.id} type must be one of ${[...QUESTION_TYPES].join('|')}`, { id: question.id, actual: question.type });
    } else {
      typeCounts.set(question.type, (typeCounts.get(question.type) ?? 0) + 1);
    }
    if (!QUESTION_STATUSES.has(question.status)) {
      fail('researchQuestionShape', `${file}: ${question.id} status must be one of ${[...QUESTION_STATUSES].join('|')}`, { id: question.id, actual: question.status });
    } else if (question.status === 'answered') {
      answeredCount += 1;
    } else if (!gapTopics.has(String(question.question).toLowerCase().slice(0, 80)) && !(doc.localEvidence?.evidenceGaps ?? []).some((gap) => (gap?.relatedQuestionRefs ?? []).includes(question.id))) {
      fail('researchQuestionClosure', `${file}: ${question.id} status=${question.status} but no evidenceGap entry references it via relatedQuestionRefs[] or matching topic`, { id: question.id });
    }
    if (!Array.isArray(question.targets) || question.targets.length === 0) {
      fail('researchQuestionShape', `${file}: ${question.id} targets[] must be a non-empty array`, { id: question.id });
    } else {
      for (const target of question.targets) {
        const reqMatch = /^contentRequirements\/(\d+)$/.exec(String(target));
        if (reqMatch) {
          const idx = Number(reqMatch[1]);
          if (idx < 0 || idx >= contentRequirementsCount) {
            fail('researchQuestionTargets', `${file}: ${question.id} target "${target}" out of range (chapter has ${contentRequirementsCount} contentRequirements)`, { id: question.id });
          } else {
            targetedReqIndices.add(idx);
          }
          continue;
        }
        const tableMatch = /^plannedTables\/(.+)$/.exec(String(target));
        if (tableMatch) {
          if (!plannedTablesByName.has(tableMatch[1])) {
            fail('researchQuestionTargets', `${file}: ${question.id} target "${target}" does not match any plannedTables[].name (slug)`, { id: question.id });
          }
          continue;
        }
        const figureMatch = /^plannedFigures\/(.+)$/.exec(String(target));
        if (figureMatch) {
          if (!plannedFiguresByName.has(figureMatch[1])) {
            fail('researchQuestionTargets', `${file}: ${question.id} target "${target}" does not match any plannedFigures[].name (slug)`, { id: question.id });
          }
          continue;
        }
        fail('researchQuestionTargets', `${file}: ${question.id} target "${target}" must be contentRequirements/<index>, plannedTables/<slug>, or plannedFigures/<slug>`, { id: question.id });
      }
    }
  }

  if (questions.length === 0) return; // researchQuestions count check is handled by checkLocalEvidence

  const distinctTypes = typeCounts.size;
  if (distinctTypes < gate.minQuestionTypeSpread) {
    fail('researchQuestionTypeMix', `${file}: researchQuestions[] cover ${distinctTypes} distinct types, expected at least ${gate.minQuestionTypeSpread} (${[...QUESTION_TYPES].join('|')})`, { actual: distinctTypes, required: gate.minQuestionTypeSpread });
  }
  const adverseCount = typeCounts.get('adverse') ?? 0;
  if (adverseCount < gate.minAdverseQuestions) {
    fail('researchQuestionAdverse', `${file}: only ${adverseCount} type=adverse questions, expected at least ${gate.minAdverseQuestions}`, { actual: adverseCount, required: gate.minAdverseQuestions });
  }
  const answerRate = answeredCount / questions.length;
  if (answerRate < gate.minQuestionAnswerRate) {
    fail('researchQuestionAnswerCoverage', `${file}: only ${answeredCount}/${questions.length} questions are status=answered (${answerRate.toFixed(2)}), expected ${gate.minQuestionAnswerRate}`, { actual: answerRate, required: gate.minQuestionAnswerRate });
  }
  if (contentRequirementsCount > 0) {
    const coverageRate = targetedReqIndices.size / contentRequirementsCount;
    if (coverageRate < gate.minContentRequirementCoverage) {
      fail('contentRequirementCoverage', `${file}: only ${targetedReqIndices.size}/${contentRequirementsCount} contentRequirements have a researchQuestion target (${coverageRate.toFixed(2)}), expected ${gate.minContentRequirementCoverage}`, { actual: coverageRate, required: gate.minContentRequirementCoverage });
    }
  }
}

function slugify(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function checkClaimAnswerRefs(file, doc) {
  const questionIds = new Set((doc.localEvidence?.researchQuestions ?? []).map((q) => q?.id).filter(Boolean));
  const localClaimIds = new Set((doc.localEvidence?.claims ?? []).map((claim) => claim?.id));
  for (const claim of doc.localEvidence?.claims ?? []) {
    for (const ref of claim?.answersQuestionRefs ?? []) {
      if (!questionIds.has(ref)) {
        fail('claimAnswerRefs', `${file}: claim ${claim.id} answersQuestionRefs references unknown question ${ref}`, { claimId: claim.id, ref });
      }
    }
    for (const ref of claim?.contradictsClaimRefs ?? []) {
      if (!localClaimIds.has(ref)) {
        fail('claimContradictRefs', `${file}: claim ${claim.id} contradictsClaimRefs references unknown local claim ${ref}`, { claimId: claim.id, ref });
      }
    }
    if (claim?.type === 'conflicting' && (!Array.isArray(claim.contradictsClaimRefs) || claim.contradictsClaimRefs.length === 0)) {
      fail('claimContradictRefs', `${file}: claim ${claim.id} has type=conflicting but no contradictsClaimRefs`, { claimId: claim.id });
    }
  }
}

function checkLocalEvidence(file, doc, counts) {
  if (!doc.localEvidence) {
    fail('localEvidenceMissing', `${file}: missing localEvidence before ledger consolidation`);
    return;
  }
  const minimums = [
    ['researchQuestions', 'researchQuestions', 'localEvidence.researchQuestions[]', spec.gate.minResearchQuestions],
    ['sources', 'sources', 'localEvidence.sources[]', spec.gate.minLocalSources],
    ['claims', 'claims', 'localEvidence.claims[]', spec.gate.minLocalClaims],
  ];
  for (const [key, dimension, path, min] of minimums) {
    if (counts[key] < min) {
      fail(dimension, `${file}: ${path} has ${counts[key]}, expected at least ${min}`, { actual: counts[key], required: min });
    }
  }
  const localClaimIds = new Set((doc.localEvidence.claims ?? []).map((claim) => claim?.id));
  for (const ref of collectClaimRefs(doc)) {
    if (!localClaimIds.has(ref)) {
      fail('claimRefs', `${file}: claimRef ${ref} does not resolve to localEvidence.claims before consolidation`, { unresolvedRef: ref });
    }
  }
}

const doc = loadYamlFile(spec.file);
let counts = null;
if (doc) {
  counts = {
    sections: doc.sections?.length ?? 0,
    tables: doc.tables?.length ?? 0,
    figures: doc.figures?.length ?? 0,
    sources: doc.localEvidence?.sources?.length ?? 0,
    claims: doc.localEvidence?.claims?.length ?? 0,
    gaps: doc.localEvidence?.evidenceGaps?.length ?? 0,
    researchQuestions: doc.localEvidence?.researchQuestions?.length ?? 0,
  };

  const gate = spec.gate;
  // Tables and figures are interchangeable artifact slots: agents may swap a
  // planned figure for an additional table when the collected data does not
  // fit the planned figure type. Enforce the combined floor so a substitution
  // does not fail the gate. Per-type ceilings remain soft warnings.
  const plannedTotal = spec.plannedTables.length + spec.plannedFigures.length;
  const minArtifacts = Math.max(gate.minArtifacts, plannedTotal);
  const totalArtifacts = counts.tables + counts.figures;
  if (counts.sections < gate.minSections) {
    fail('sectionsMin', `${spec.file}: ${counts.sections} sections, expected at least ${gate.minSections}`, { actual: counts.sections, required: gate.minSections });
  }
  if (totalArtifacts < minArtifacts) {
    fail('artifactsMin', `${spec.file}: ${counts.tables} tables + ${counts.figures} figures = ${totalArtifacts} artifacts, expected at least ${minArtifacts} (plannedTables=${spec.plannedTables.length}, plannedFigures=${spec.plannedFigures.length}; figures may be substituted with tables when data shape does not fit)`, { actual: totalArtifacts, required: minArtifacts });
  }
  if (counts.sections > gate.maxSections) {
    warn('sectionsMax', `${spec.file}: ${counts.sections} sections exceeds target range maximum ${gate.maxSections}; verify the chapter is not over-fragmented or duplicative`, { actual: counts.sections, ceiling: gate.maxSections });
  }
  if (counts.tables > gate.maxTables) {
    warn('tablesMax', `${spec.file}: ${counts.tables} tables exceeds target range maximum ${gate.maxTables}; verify the chapter is not over-fragmented or duplicative`, { actual: counts.tables, ceiling: gate.maxTables });
  }
  if (counts.figures > gate.maxFigures) {
    warn('figuresMax', `${spec.file}: ${counts.figures} figures exceeds target range maximum ${gate.maxFigures}; verify the chapter is not over-fragmented or duplicative`, { actual: counts.figures, ceiling: gate.maxFigures });
  }

  checkDepthFloor(spec.file, doc, gate.depthFloor);
  checkTableFigureOverlap(spec.file, doc);

  const types = figureTypeSet(doc);
  const plannedTypes = new Set((spec.plannedFigures ?? []).flatMap((figure) => figure.acceptedTypes ?? []));
  if (counts.figures > 0 && plannedTypes.size && ![...plannedTypes].some((type) => types.has(type))) {
    warn('figureType', `${spec.file}: no planned figure type rendered (planned: ${[...plannedTypes].join(', ')}); confirm the substitution is intentional`, { rendered: [...types], planned: [...plannedTypes] });
  }

  for (const figure of doc.figures ?? []) {
    const { errors } = validateFigureShape(figure);
    for (const message of errors) {
      fail('figureShape', `${spec.file}: ${message}`, { figureId: figure?.id ?? null });
    }
  }

  checkLocalEvidence(spec.file, doc, counts);
  const plannedTablesByName = new Map((spec.plannedTables ?? []).map((item) => [slugify(item.name), item]));
  const plannedFiguresByName = new Map((spec.plannedFigures ?? []).map((item) => [slugify(item.name), item]));
  checkResearchQuestions(spec.file, doc, gate, plannedTablesByName, plannedFiguresByName, (spec.contentRequirements ?? []).length);
  checkClaimAnswerRefs(spec.file, doc);
  checkSearchQueries(spec.file, doc);
  const earlierUrls = loadEarlierChapterUrls(reportFolder, spec, ANALYSIS_ARTIFACTS);
  checkSources(spec.file, doc, gate, earlierUrls);
  checkHighConfidenceCorroboration(spec.file, doc, gate);
  checkEnumerationTables(spec.file, doc, gate, plannedTablesByName);
}

// Acknowledged warnings: agent may opt out of --strict warnings by listing
// `acknowledgedWarnings: [{ dimension, reason }]` at the top level of the
// chapter YAML. Each acknowledged dimension must have at least 30 chars of
// rationale and must match a warning dimension actually emitted by the gate.
const acks = Array.isArray(doc?.acknowledgedWarnings) ? doc.acknowledgedWarnings : [];
const ackByDim = new Map();
for (const ack of acks) {
  if (typeof ack?.dimension !== 'string' || typeof ack?.reason !== 'string' || ack.reason.trim().length < 30) continue;
  ackByDim.set(ack.dimension, ack);
}
const unackedWarningDims = [...new Set(warnings.map((w) => w.dimension))].filter((d) => !ackByDim.has(d));

const ok = failures.length === 0 && (!args.strict || unackedWarningDims.length === 0);

// Causal precedence for retry ordering (root cause first). When multiple
// dimensions fail, fix in this order; downstream dimensions often clear once
// upstream is repaired.
const RETRY_PRECEDENCE = [
  'missingArtifact', 'yamlParse', 'localEvidenceMissing',
  'researchQuestionShape', 'researchQuestionTargets', 'researchQuestionTypeMix', 'researchQuestionAdverse',
  'searchQueriesMissing',
  'sourceShape', 'sourceDomains', 'sourceTypeSpread', 'requiredSourceTypes', 'netNewSources',
  'researchQuestions', 'sources', 'claims',
  'highConfidenceCorroboration',
  'researchQuestionAnswerCoverage', 'researchQuestionClosure',
  'claimAnswerRefs', 'claimContradictRefs', 'claimRefs',
  'enumerationScope', 'enumerationRows', 'enumerationCoverageGap', 'enumerationRowCorroboration',
  'sectionsMin', 'artifactsMin', 'depthSection', 'depthSectionTotal', 'depthTableRows', 'depthFigureData',
  'contentRequirementCoverage',
];

function sortByPrecedence(dimensions) {
  const rank = new Map(RETRY_PRECEDENCE.map((d, i) => [d, i]));
  return [...dimensions].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

if (args.format === 'json') {
  const failedDimensions = [...new Set(failures.map((entry) => entry.dimension))];
  const report = {
    ok,
    artifact: spec.file,
    chapterKey: spec.key,
    reportFolder,
    counts,
    failures,
    warnings,
    failedDimensions,
    warningDimensions: [...new Set(warnings.map((entry) => entry.dimension))],
    acknowledgedWarnings: [...ackByDim.keys()],
    unackedWarningDimensions: unackedWarningDims,
    retryOrder: sortByPrecedence(failedDimensions),
  };
  console.log(JSON.stringify(report, null, 2));
} else {
  if (counts) {
    console.log(`[check:chapter] reportFolder=${reportFolder}`);
    console.log(`[check:chapter] artifact=${spec.file} strict=${args.strict ? 'yes' : 'no'}`);
    console.log(`[check:chapter] sections=${counts.sections} tables=${counts.tables} figures=${counts.figures} localSources=${counts.sources} localClaims=${counts.claims} researchQuestions=${counts.researchQuestions} gaps=${counts.gaps}`);
  }
  if (warnings.length) {
    console.warn('[check:chapter] warnings:\n' + warnings.map((entry) => `  - [${entry.dimension}] ${entry.message}`).join('\n'));
  }
  if (failures.length) {
    console.error('[check:chapter] failures:\n' + failures.map((entry) => `  - [${entry.dimension}] ${entry.message}`).join('\n'));
  }
  if (ok) console.log('[check:chapter] ✓ chapter ready for next workflow stage.');
}

process.exit(ok ? 0 : 1);
