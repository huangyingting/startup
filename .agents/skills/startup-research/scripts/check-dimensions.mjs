// Single source of truth for the report-v2 vocabularies, the check-chapter
// failure dimensions, and the cross-script bookkeeping that ties them
// together (FIX_HINTS, RETRY_PRECEDENCE, CASCADE_SUPPRESSORS).
//
// Three consumer roles:
//   - chapter-schema.mjs imports the field-level enum Sets to validate
//     individual sources, claims, callouts, and enumeration tables.
//   - check-chapter.mjs imports the same enum Sets plus the FIX_HINTS table
//     and the precedence/suppressor metadata to drive its retry loop.
//   - load-chapter.mjs imports the JSON-friendly bundles (`VOCABULARIES`,
//     `dimensionCatalog()`) and ships them inside the chapter packet so the
//     agent learns the vocabulary BEFORE writing, not after a failed check.
//
// Add a new enum or dimension here exactly once; every consumer reads from
// this file.

import { INLINE_CLAIM_REF_SOURCE } from '../../../../website/src/lib/claim-refs.mjs';

// ---------------------------------------------------------------------------
// Field-level vocabularies
// ---------------------------------------------------------------------------

export const SOURCE_TYPES = new Set([
  'official', 'filing', 'regulatory', 'news', 'analyst-market-data',
  'technical-docs', 'customer-proof', 'partner-proof', 'developer-signal',
  'review', 'legal', 'other',
]);
export const SOURCE_STANCES = new Set(['confirming', 'adverse', 'neutral', 'unknown']);
export const SOURCE_ACCESS_STATUSES = new Set(['ok', 'paywall', 'js-only', 'broken', 'rate-limited']);
export const SOURCE_REPUTATION_TIERS = new Set(['high', 'medium', 'low']);
export const SOURCE_INDEPENDENCE = new Set(['company', 'partner', 'customer', 'competitor', 'independent', 'unknown']);

export const CLAIM_TYPES = new Set([
  'observed', 'company-claimed', 'third-party-reported',
  'estimated', 'inferred', 'open-question', 'conflicting',
]);
export const CLAIM_CONFIDENCES = new Set(['high', 'medium', 'low']);
export const CLAIM_FRESHNESS = new Set(['current', 'recent', 'historical', 'unknown']);

export const QUESTION_TYPES = new Set([
  'enumeration', 'quantification', 'verification', 'adverse', 'freshness', 'comparison', 'mechanism',
]);
export const QUESTION_STATUSES = new Set(['answered', 'partial', 'unresolved']);

export const CALLOUT_TYPES = new Set(['strength', 'risk', 'recommendation', 'insight', 'assumption']);
export const ENUMERATION_COVERAGE = new Set(['exhaustive', 'partial', 'sample']);
export const TONE_VALUES = new Set(['positive', 'neutral', 'warning', 'negative', 'low', 'medium', 'high', 'critical', 'risk', 'opportunity', 'adverse']);
export const BLOCK_TYPES = new Set(['paragraph', 'callout', 'table', 'figure', 'list', 'equation']);

// Derived classifications (not a single field's enum, but used by checks).
// PRIMARY_TIER_TYPES qualifies a source as "primary tier" for high-confidence
// corroboration. RESTRICTED_ACCESS_STATUSES is the cascade-noise complement
// of accessStatus=ok.
export const PRIMARY_TIER_TYPES = new Set(['filing', 'regulatory', 'legal', 'official']);
export const RESTRICTED_ACCESS_STATUSES = new Set(['paywall', 'js-only', 'broken', 'rate-limited']);

// Summary-card (report-meta.yaml) enums — same pattern as chapter-level vocab,
// so they appear in the check-report packet for agent visibility.
export const CARD_RECOMMENDATIONS = new Set(['strong-buy', 'buy', 'track', 'research-more', 'avoid']);
export const CARD_CONFIDENCES = new Set(['high', 'medium', 'low']);
export const CARD_RISK_RATINGS = new Set(['low', 'medium', 'high', 'critical', 'unknown']);
export const CARD_VALUATION_STANCES = new Set(['attractive', 'fair', 'stretched', 'expensive', 'unknown']);

// ---------------------------------------------------------------------------
// ID pattern matching
// ---------------------------------------------------------------------------

// Entity ID patterns. Each ID encodes (Type, ChapterLetter, Sequence) so that
// chapters can generate IDs independently (no global renumbering needed) and
// every reference is human-traceable to its origin chapter.
//
// Format: <Type><ChapterLetter><Seq3>
//   Type:           S (Source) | C (Claim) | T (Table) | F (Figure) | Q (Question)
//   ChapterLetter:  Single uppercase letter declared in chapters.yaml `letter:` field.
//                   Reserved type letters (S, C, T, F, Q) cannot be used.
//   Seq3:           Zero-padded 3-digit sequence within the chapter (001..999).
//
// Examples: SA001 (source #1 in chapter A), CB045 (claim #45 in chapter B),
// TC008 (table #8 in chapter C), FD002 (figure #2 in chapter D),
// QE003 (question #3 in chapter E).
export const ID_PATTERN_SOURCE = /^S[A-Z]\d{3}$/;
export const ID_PATTERN_CLAIM = /^C[A-Z]\d{3}$/;
export const ID_PATTERN_FIGURE = /^F[A-Z]\d{3}$/;
export const ID_PATTERN_TABLE = /^T[A-Z]\d{3}$/;
export const ID_PATTERN_RESEARCH_QUESTION = /^Q[A-Z]\d{3}$/;

// Inline claim-ref pattern used in section bodies, list items, table cells,
// and callout text. Capture group 1 is the bare claim id without brackets.
// Source string lives in website/src/lib/claim-refs.mjs so the renderer and
// the validators share one regex; if the claim-id format changes, both sides
// update from one file.
export const INLINE_CLAIM_REF_PATTERN = new RegExp(INLINE_CLAIM_REF_SOURCE, 'g');

// Type letters that are reserved as ID prefixes; chapter letters cannot use
// these to avoid visual ambiguity in compact IDs (e.g. "CC001" would parse
// as Claim/Chapter-C/#1 — technically unambiguous but confusing).
export const RESERVED_TYPE_LETTERS = new Set(['S', 'C', 'T', 'F', 'Q']);

// Maximum sequence per chapter for any ID type (3 digits = 999).
export const ID_MAX_SEQUENCE = 999;

// Generate a new ID from a chapter letter and a 0-based index.
// Throws if the index would exceed ID_MAX_SEQUENCE or letter is invalid.
export function makeId(typeLetter, chapterLetter, index) {
  if (!/^[SCTFQ]$/.test(typeLetter)) throw new Error(`makeId: invalid type letter "${typeLetter}"`);
  if (!/^[A-Z]$/.test(chapterLetter)) throw new Error(`makeId: invalid chapter letter "${chapterLetter}"`);
  if (RESERVED_TYPE_LETTERS.has(chapterLetter)) throw new Error(`makeId: chapter letter "${chapterLetter}" collides with reserved type letter`);
  const seq = index + 1;
  if (!Number.isInteger(seq) || seq < 1 || seq > ID_MAX_SEQUENCE) {
    throw new Error(`makeId: sequence ${seq} out of range 1..${ID_MAX_SEQUENCE}`);
  }
  return `${typeLetter}${chapterLetter}${String(seq).padStart(3, '0')}`;
}

// Build a regex that matches one specific (typeLetter, chapterLetter)
// combination, e.g. /^SO\d{3}$/. Used by check-chapter to enforce that every
// id in a chapter file carries the chapter's own letter (so an id from
// another chapter cannot accidentally pass the generic format check).
export function makeIdPattern(typeLetter, chapterLetter) {
  if (!/^[SCTFQ]$/.test(typeLetter)) throw new Error(`makeIdPattern: invalid type letter "${typeLetter}"`);
  if (!/^[A-Z]$/.test(chapterLetter)) throw new Error(`makeIdPattern: invalid chapter letter "${chapterLetter}"`);
  return new RegExp(`^${typeLetter}${chapterLetter}\\d{3}$`);
}

// Extract the chapter letter from an ID. Returns null if the ID does not
// match the canonical S/C/T/F/Q + LETTER + 3-digit format.
export function chapterLetterOf(id) {
  const match = /^([SCTFQ])([A-Z])\d{3}$/.exec(String(id ?? ''));
  return match ? match[2] : null;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

// Format an enum Set/array as a pipe-separated string for error messages.
// Usage: formatEnumChoices(SOURCE_TYPES) → "filing|legal|official|..."
export function formatEnumChoices(enumSet) {
  return [...enumSet].join('|');
}

// ---------------------------------------------------------------------------
// Policy constants
// ---------------------------------------------------------------------------

// Source freshness classification thresholds (in months from anchor date).
// Baked here so ledger.mjs, load-chapter packet, and agent all see the same
// policy. These represent maximum age for classification: if a source is
// within N months of the anchor date, it counts as current/recent.
export const FRESHNESS_THRESHOLDS = {
  current: 24,   // current: ≤24 months
  recent: 60,    // recent: ≤60 months; ≥24 → historical
};

// Analysis artifact title normalization: stop words that are ignored when
// comparing table/figure titles to detect cross-artifact and cross-chapter
// duplicates. Shared by check-chapter.mjs (per-chapter duplicateAnalysis)
// and cross-chapter.mjs (report-level cross-chapter duplicates).
export const ANALYSIS_TOKEN_STOP_WORDS = new Set([
  'table', 'figure', 'fig', 'chart', 'graph', 'matrix', 'map',
  'kpi', 'kpis', 'scorecard', 'analysis', 'overview', 'summary',
]);

// Minimum token length for analysis token filtering (titles, descriptions).
// Tokens shorter than this are ignored during duplicate detection and
// similarity comparisons. Ensures consistency between check-chapter.mjs
// and cross-chapter.mjs.
export const MIN_ANALYSIS_TOKEN_LENGTH = 4;

// Evidence quality tier thresholds. Used by ledger.mjs to classify the
// overall quality of consolidated evidence based on source diversity,
// reputation distribution, and claim corroboration patterns.
export const EVIDENCE_QUALITY_TIERS = {
  high: {
    minSources: 30,
    minClaims: 50,
    minIndependentShare: 0.2,
    minHighReputationShare: 0.35,
    minMultiSourceShare: 0.2,
  },
  medium: {
    minSources: 10,
    minClaims: 20,
    minIndependentShare: 0.1,
    minHighReputationShare: 0.25,
    requireBoth: false, // true=AND, false=OR
  },
};

// Registrable domain extraction: maximum number of domain parts to keep
// when parsing URLs. For example, www.example.co.uk has 4 parts; with
// maxParts=2, returns example.co.uk (handles multi-part TLDs).
export const REGISTRABLE_DOMAIN_MAX_PARTS = 2;

// Multi-part TLDs that don't fit the typical 2-level domain pattern.
// Used by registrableDomain() in utils.mjs and normalizedDomain() in ledger.mjs
// to correctly extract the registrable domain for diverse gTLDs.
export const MULTI_PART_TLDS = new Set(['co.uk', 'co.jp', 'com.cn', 'com.hk', 'com.au', 'com.br', 'gov.uk', 'gov.cn']);

// Key-fact pattern matching: regex patterns that identify identity facts
// (founders, founding date, funding, valuation, headcount, customers) in
// claim statements. Used by cross-chapter.mjs keyFactDrift check to ensure
// these canonical facts reference company-overview claims instead of being
// duplicated in later chapters.
export const KEY_FACT_TOPICS = [
  /founded|founding date|incorporation/,
  /founder|cofounder|co-founder/,
  /headquarter|hq location|principal office/,
  /total raised|cumulative funding|capital raised/,
  /latest valuation|post-money valuation|secondary valuation/,
  /headcount|employees|fte|full[- ]?time/,
  /customer count|paid customers|paying users/,
];

// Paywall risk warning threshold. When a chapter's restricted-access source
// share (paywall/js-only/broken/rate-limited) exceeds this fraction, a warning
// fires to surface the risk of breaching the report-level 30% paywall ceiling.
// Used by check-chapter.mjs checkSources().
export const PAYWALL_RISK_WARNING_THRESHOLD = 0.25;

// Duplicate analysis title similarity threshold. When a figure's and table's
// normalized titles have Jaccard overlap >= this value, and the figure's
// claimRefs are a subset of the table's, duplicateAnalysis check fires.
// Used by check-chapter.mjs checkDuplicateAnalysis().
export const DUPLICATE_ANALYSIS_TITLE_THRESHOLD = 0.5;

// JSON-friendly bundle shipped in the load-chapter packet so the agent never
// has to grep source code to learn the vocabulary. Sorted arrays keep diffs
// stable.
export const VOCABULARIES = Object.freeze({
  sourceType: [...SOURCE_TYPES].sort(),
  sourceStance: [...SOURCE_STANCES].sort(),
  sourceAccessStatus: [...SOURCE_ACCESS_STATUSES].sort(),
  sourceReputationTier: [...SOURCE_REPUTATION_TIERS].sort(),
  sourceIndependence: [...SOURCE_INDEPENDENCE].sort(),
  claimType: [...CLAIM_TYPES].sort(),
  claimConfidence: [...CLAIM_CONFIDENCES].sort(),
  claimFreshness: [...CLAIM_FRESHNESS].sort(),
  questionType: [...QUESTION_TYPES].sort(),
  questionStatus: [...QUESTION_STATUSES].sort(),
  calloutType: [...CALLOUT_TYPES].sort(),
  enumerationCoverage: [...ENUMERATION_COVERAGE].sort(),
  tone: [...TONE_VALUES].sort(),
  blockType: [...BLOCK_TYPES].sort(),
  primaryTierSourceTypes: [...PRIMARY_TIER_TYPES].sort(),
  restrictedAccessStatuses: [...RESTRICTED_ACCESS_STATUSES].sort(),
  cardRecommendation: [...CARD_RECOMMENDATIONS].sort(),
  cardConfidence: [...CARD_CONFIDENCES].sort(),
  cardRiskRating: [...CARD_RISK_RATINGS].sort(),
  cardValuationStance: [...CARD_VALUATION_STANCES].sort(),
});

// ---------------------------------------------------------------------------
// Per-dimension fix hints
// ---------------------------------------------------------------------------
//
// Per-dimension one-line action hints. Same data the SKILL.md retry table
// expressed in prose; baking it into each failure removes the agent's need
// to cross-reference SKILL.md when triaging. Keep entries action-oriented
// and short (<= 120 chars). Add a new entry whenever you add a new
// dimension.
//
// Each entry is `string | (extra) => string`. Functions receive the full
// `extra` object passed to `fail(dim, msg, extra)` (e.g. `{ actual,
// required, id, tableId }`) so they can echo the concrete fix value back at
// the agent ("Set slug: to \"revolut\".") instead of the agent re-deriving
// it from the surrounding message.
export const FIX_HINTS = {
  missingArtifact: 'Create the chapter YAML at the expected path.',
  yamlParse: 'Fix the YAML syntax error reported in the message.',
  localEvidenceMissing: 'Add the entire localEvidence block (researchQuestions, searchQueries, sources, claims, evidenceGaps).',
  researchQuestionShape: ({ id, actual } = {}) =>
    actual !== undefined
      ? `Fix ${id ?? 'the question'}: invalid value "${actual}". Use a value from the allowed enum shown in the message.`
      : 'Fix the question object: id Q<ChapterLetter>### (e.g. QO001), >=20-char text, valid type, non-empty targets[], valid status.',
  researchQuestionTargets: ({ id } = {}) =>
    `Point ${id ?? 'the question'}.targets[] entries at a real contentRequirements/<index>, plannedTables/<slug>, or plannedFigures/<slug>.`,
  researchQuestionTypeMix: ({ actual, required } = {}) =>
    required != null ? `Add questions of types you have not used yet so distinct types reach ${required} (currently ${actual}).` : 'Add questions of types you have not used yet to reach minQuestionTypeSpread.',
  researchQuestionAdverse: ({ actual, required } = {}) =>
    required != null ? `Add ${Math.max(required - (actual ?? 0), 1)} more type:adverse question(s) (currently ${actual}, need ${required}).` : 'Add type:adverse questions until you reach minAdverseQuestions.',
  researchQuestionAnswerCoverage: ({ actual, required } = {}) =>
    required != null ? `Raise answered/total ratio to ${required} (currently ${Number(actual).toFixed(2)}) by answering more questions or removing speculative ones.` : 'Convert questions from unresolved/partial to answered by adding the missing claim and citing it via claim.answersQuestionRefs.',
  researchQuestionClosure: ({ id } = {}) =>
    `Add an evidenceGap whose relatedQuestionRefs[] includes ${id ?? 'the still-open question'}.`,
  searchQueriesMissing: 'Append the actual queries you ran into localEvidence.searchQueries[] ({query, engine, hits, retainedSourceRefs}).',
  sourceShape: ({ id } = {}) =>
    id ? `Fill the missing required field on source ${id} (see message for which one).` : 'Fill accessStatus and stance (and other required fields) on each source.',
  sourceDomains: ({ actual, required } = {}) =>
    required != null ? `Add sources from ${Math.max(required - (actual ?? 0), 1)} more registrable domain(s) (currently ${actual}, need ${required}).` : 'Add sources from new registrable domains; do not duplicate publishers.',
  sourceTypeSpread: ({ actual, required } = {}) =>
    required != null ? `Add sources with ${Math.max(required - (actual ?? 0), 1)} more sourceType value(s) you have not used yet (currently ${actual}, need ${required}).` : 'Add sources with sourceType values you have not used yet.',
  sourceStanceSpread: ({ actual, required } = {}) =>
    required != null ? `Add ${Math.max(required - (actual ?? 0), 1)} more stance:adverse source(s) (currently ${actual}, need ${required}). Mark a regulator complaint, short report, FT Alphaville-style critique, FOS/CFPB filing, or skeptical analyst note as stance: adverse — do not invent sources.` : 'Add at least one source with stance: adverse (regulator complaint, short report, skeptical analyst note, FT Alphaville-style critique, FOS/CFPB record). Mark a genuinely critical existing source as stance: adverse instead of inventing one.',
  requiredSourceTypes: ({ missing } = {}) =>
    missing ? `Pull at least one source with sourceType: ${missing}.` : 'Pull at least one source of each missing type listed in gate.requiredSourceTypes.',
  netNewSources: ({ actual, required } = {}) =>
    required != null ? `Add ${Math.max(required - (actual ?? 0), 1)} more URL(s) not seen in earlier chapters (currently ${actual}, need ${required}).` : 'Run new searches to add URLs not seen in earlier chapters; reusing the global pool will not satisfy this gate.',
  paywallRisk: 'Swap restricted (paywall|js-only|broken|rate-limited) sources for ok ones to stay under the report-level 30% ceiling.',
  researchQuestions: 'Add more researchQuestion entries until you hit the per-chapter floor.',
  sources: 'Add more sources until you hit the per-chapter floor.',
  claims: 'Add more claims until you hit the per-chapter floor.',
  highConfidenceCorroboration: ({ claimId, actual, required } = {}) =>
    required != null && actual != null
      ? `On claim ${claimId}: either downgrade confidence:high to medium, or add ${Math.max(required - actual, 1)} more sourceRef(s) including a primary-tier one (filing|regulatory|legal|official or reputationTier:high).`
      : claimId
        ? `On claim ${claimId}: either downgrade confidence:high to medium, or add a primary-tier sourceRef (filing|regulatory|legal|official or reputationTier:high).`
        : 'Either downgrade confidence:high to medium, or add a primary-tier source (filing|regulatory|legal|official or reputationTier:high).',
  claimAnswerRefs: ({ claimId, ref } = {}) =>
    claimId ? `On claim ${claimId}: remove answersQuestionRefs entry ${ref ?? ''}, or add the missing Q<ChapterLetter>### locally.` : 'Resolve dangling answersQuestionRefs entries; do not duplicate evidence.',
  claimContradictRefs: ({ claimId, ref } = {}) =>
    claimId ? `On claim ${claimId}: remove contradictsClaimRefs entry ${ref ?? ''}, or add the missing C<ChapterLetter>### locally (type:conflicting requires non-empty contradictsClaimRefs).` : 'Resolve dangling contradictsClaimRefs entries; type:conflicting requires non-empty contradictsClaimRefs.',
  claimRefs: ({ unresolvedRef } = {}) =>
    unresolvedRef ? `Resolve claimRef ${unresolvedRef}: it is not in this chapter's localEvidence.claims[]. Either remove the ref, or add a localEvidence.claims entry with that id and real sourceRefs.` : 'Resolve dangling claimRefs across sections, tables, figures, and callouts.',
  crossChapterRefLeak: ({ unresolvedRef, foundIn } = {}) =>
    unresolvedRef && foundIn
      ? `Local ${unresolvedRef} is defined in ${foundIn}, NOT in this chapter. S/C/T/F/Q ids carry the owning chapter's letter (e.g. CO045 = chapter O claim 45) and cannot be reused outside that chapter. Restate the fact as a new local claim here (with this chapter's letter), give it its own sourceRefs[], and reference that new id. Ledger consolidation will dedupe equivalent claims at the end.`
      : `Local ${unresolvedRef ?? 'C<L>###'} appears to come from another chapter. Chapter-letter ids cannot be reused across chapters — restate the underlying fact as a new local claim here with its own sourceRefs[].`,
  enumerationScope: ({ tableId, actual } = {}) =>
    actual !== undefined
      ? `On table ${tableId}: enumerationScope.coverage "${actual}" invalid; use exhaustive | partial | sample.`
      : tableId
        ? `Add enumerationScope { coverage: exhaustive|partial|sample, basis: "..." (>=20 chars) } to table ${tableId}.`
        : 'Add enumerationScope { coverage, basis(>=20 chars) } to the matching enumeration table.',
  enumerationRows: ({ tableId, actual, required } = {}) =>
    required != null ? `On table ${tableId}: add ${Math.max(required - (actual ?? 0), 1)} more rows (currently ${actual}, need ${required}) or set enumerationScope.coverage to partial/sample with rationale.` : 'Add rows to reach expectedMinRows or set coverage to partial/sample with rationale.',
  enumerationCoverageGap: ({ tableId } = {}) =>
    tableId ? `Open an evidenceGap whose topic mentions ${tableId} or whose relatedTableRefs[] includes ${tableId}.` : 'Open an evidenceGap whose topic mentions the table or whose relatedTableRefs[] cites it.',
  enumerationRowCorroboration: ({ tableId, actual, required } = {}) =>
    required != null ? `On table ${tableId}: add sources from ${Math.max(required - (actual ?? 0), 1)} more registrable domain(s) (currently ${actual}, need ${required}).` : "Add sources from additional registrable domains backing the table's claimRefs.",
  claimShape: ({ id } = {}) =>
    id ? `Fix claim ${id}: required fields (statement, type, topic, sourceRefs, confidence, freshness), valid enum values, non-empty sourceRefs unless type is open-question, and contradictsClaimRefs when type is conflicting.` : 'Fix the claim object: required fields (statement, type, topic, sourceRefs, confidence, freshness), valid enum values, non-empty sourceRefs unless type is open-question, and contradictsClaimRefs when type is conflicting.',
  calloutShape: 'Fix the callout: required title, body, claimRefs[], and optional calloutType in (strength|risk|recommendation|insight|assumption).',
  tableShape: ({ tableId } = {}) =>
    tableId ? `Fix table ${tableId}: non-empty columns, every row has the same number of cells as columns, enumerationScope { coverage, basis(>=20 chars) } when present.` : 'Fix the table: non-empty columns, every row has the same number of cells as columns, enumerationScope { coverage, basis(>=20 chars) } when present.',
  documentHead: 'Fix the chapter document head: schemaVersion=report-v2, artifact matches the chapter key, slug, runDate=YYYY-MM-DD, company.name, and chapter.number matching the chapter order.',
  slugConsistency: ({ required } = {}) =>
    required ? `Set slug: to "${required}".` : 'Set slug: to the company slug only (the report folder basename with the leading <timestamp>- stripped).',
  duplicateIds: ({ id } = {}) =>
    id ? `Renumber ${id}: ids must match T### / F### and be unique within the chapter.` : 'Renumber the duplicate or malformed table/figure id; ids must match T### / F### and be unique within the chapter.',
  artifactRefs: "Resolve the dangling figureRef/tableRef: it must point at an id that exists in this chapter's figures[] / tables[].",
  sectionsMin: ({ actual, required } = {}) =>
    required != null ? `Add ${Math.max(required - (actual ?? 0), 1)} more section(s) (currently ${actual}, need ${required}).` : 'Add the missing section(s) to reach minSections.',
  artifactsMin: ({ actual, required } = {}) =>
    required != null ? `Add ${Math.max(required - (actual ?? 0), 1)} more table or figure (currently ${actual}, need ${required}); a planned figure may be substituted with an extra table when data shape does not fit.` : 'Add the missing table or figure (or substitute a planned figure with an extra table when data shape does not fit).',
  depthSection: ({ actual, required } = {}) =>
    required != null ? `Expand the shortest section's body by ~${Math.max(required - (actual ?? 0), 1)} more words (currently ${actual}, need ${required} per section).` : 'Expand the prose of the shortest section(s) only; leave the others untouched.',
  depthSectionTotal: ({ actual, required } = {}) =>
    required != null ? `Expand prose by ~${Math.max(required - (actual ?? 0), 1)} more words across short sections (currently ${actual} total, need ${required}).` : 'Expand prose across short sections to reach minSectionWordsTotal.',
  depthTableRows: ({ actual, required } = {}) =>
    required != null ? `Add ~${Math.max(required - (actual ?? 0), 1)} more rows across existing tables (currently ${actual} total, need ${required}).` : 'Add rows to existing tables to reach minTableRowsTotal.',
  depthFigureData: ({ actual, required } = {}) =>
    required != null ? `Add ~${Math.max(required - (actual ?? 0), 1)} more data points across existing figures (currently ${actual} total, need ${required}).` : 'Add data points to existing figures to reach minFigureDataPointsTotal.',
  contentRequirementCoverage: ({ actual, required } = {}) =>
    required != null ? `Add researchQuestions whose targets[] cover the un-targeted contentRequirements (current coverage ${Number(actual).toFixed(2)}, need ${required}).` : 'Add researchQuestions whose targets[] cover the un-targeted contentRequirements.',
  figureShape: ({ figureId } = {}) =>
    figureId ? `Fix figure ${figureId} data to satisfy its type contract (e.g. dag needs edges, range needs numeric low/high, matrix needs columns and rows).` : 'Fix the figure data to satisfy its type contract (e.g. dag needs edges, range needs numeric low/high, matrix needs columns and rows).',
  duplicateAnalysis: ({ tableId, figureId, sharedRefs, figureRefs } = {}) =>
    tableId && figureId
      ? `Figure ${figureId} re-renders the same claims as table ${tableId} (${sharedRefs}/${figureRefs} of the figure's claimRefs are also on the table). Either give the figure at least one claimRef the table does not have (a distinct slice/lens), rename it to reflect that lens, or merge it into the table.`
      : 'Either give the figure at least one claimRef the table does not have (a distinct slice/lens), rename it to reflect that lens, or merge it into the table.',
  figureType: 'Render at least one of the planned figure types or document the substitution in evidenceGaps.',
  sectionsMax: 'Reduce or merge sections; the chapter looks over-fragmented.',
  tablesMax: 'Reduce or merge tables; the chapter looks over-fragmented.',
  figuresMax: 'Reduce or merge figures; the chapter looks over-fragmented.',
};

// ---------------------------------------------------------------------------
// Cascade suppressors
// ---------------------------------------------------------------------------
//
// When an upstream dimension fires, every downstream dimension in this set
// is almost always a cascading false positive. Suppressing them keeps retry
// noise down so the agent can fix the root cause first and re-run.
//   yamlParse -> document failed to parse; loadYamlFile returns null and
//   short-circuits the rest of check-chapter, so this entry is mostly
//   defensive (kept so dimensionCatalog() reflects the intent for any
//   future caller that does not short-circuit).
//   localEvidenceMissing -> nothing inside localEvidence is checkable; every
//   source/claim/researchQuestion/enumeration failure is downstream noise.
export const CASCADE_SUPPRESSORS = {
  yamlParse: new Set([
    'documentHead', 'slugConsistency',
    'researchQuestions', 'researchQuestionShape', 'researchQuestionTargets',
    'researchQuestionTypeMix', 'researchQuestionAdverse',
    'researchQuestionAnswerCoverage', 'researchQuestionClosure',
    'searchQueriesMissing',
    'sources', 'sourceShape', 'sourceDomains', 'sourceTypeSpread',
    'requiredSourceTypes', 'netNewSources', 'paywallRisk',
    'sourceStanceSpread',
    'claims', 'claimShape', 'claimAnswerRefs', 'claimContradictRefs', 'claimRefs',
    'crossChapterRefLeak',
    'highConfidenceCorroboration',
    'enumerationScope', 'enumerationRows', 'enumerationCoverageGap',
    'enumerationRowCorroboration',
    'contentRequirementCoverage',
    'tableShape', 'figureShape', 'duplicateIds', 'artifactRefs',
    'calloutShape', 'duplicateAnalysis', 'figureType',
    'sectionsMin', 'sectionsMax', 'artifactsMin',
    'tablesMax', 'figuresMax',
    'depthSection', 'depthSectionTotal', 'depthTableRows', 'depthFigureData',
  ]),
  localEvidenceMissing: new Set([
    'researchQuestions', 'researchQuestionShape', 'researchQuestionTargets',
    'researchQuestionTypeMix', 'researchQuestionAdverse',
    'researchQuestionAnswerCoverage', 'researchQuestionClosure',
    'searchQueriesMissing',
    'sources', 'sourceShape', 'sourceDomains', 'sourceTypeSpread',
    'requiredSourceTypes', 'netNewSources', 'paywallRisk',
    'sourceStanceSpread',
    'claims', 'claimShape', 'claimAnswerRefs', 'claimContradictRefs', 'claimRefs',
    'crossChapterRefLeak',
    'highConfidenceCorroboration',
    'enumerationScope', 'enumerationRows', 'enumerationCoverageGap',
    'enumerationRowCorroboration',
    'contentRequirementCoverage',
  ]),
};

// ---------------------------------------------------------------------------
// Retry precedence
// ---------------------------------------------------------------------------
//
// Causal precedence for retry ordering (root cause first). When multiple
// dimensions fail, fix in this order; downstream dimensions often clear
// once upstream is repaired.
export const RETRY_PRECEDENCE = [
  'missingArtifact', 'yamlParse', 'documentHead', 'slugConsistency', 'localEvidenceMissing',
  'researchQuestionShape', 'researchQuestionTargets', 'researchQuestionTypeMix', 'researchQuestionAdverse',
  'searchQueriesMissing',
  'sourceShape', 'sourceDomains', 'sourceTypeSpread', 'sourceStanceSpread', 'requiredSourceTypes', 'netNewSources',
  'paywallRisk',
  'researchQuestions', 'sources', 'claims',
  'claimShape',
  'highConfidenceCorroboration',
  'researchQuestionAnswerCoverage', 'researchQuestionClosure',
  'claimAnswerRefs', 'claimContradictRefs', 'crossChapterRefLeak', 'claimRefs',
  'enumerationScope', 'enumerationRows', 'enumerationCoverageGap', 'enumerationRowCorroboration',
  'tableShape', 'figureShape', 'figureType',
  'duplicateIds', 'artifactRefs', 'duplicateAnalysis',
  'calloutShape',
  'sectionsMin', 'sectionsMax', 'artifactsMin', 'tablesMax', 'figuresMax',
  'depthSection', 'depthSectionTotal', 'depthTableRows', 'depthFigureData',
  'contentRequirementCoverage',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Resolves a fix hint to a string, calling the function form with `extra`
// when present so dynamic fixes can echo concrete target values back at the
// agent. Returns undefined for unknown dimensions.
export function resolveFixHint(dimension, extra) {
  const hint = FIX_HINTS[dimension];
  if (typeof hint === 'function') {
    try { return hint(extra); }
    catch { return undefined; }
  }
  return hint;
}

// JSON-friendly dimension index shipped in the load-chapter packet. Each
// entry pairs a dimension with its precedence rank, the suppressors that
// could mask it, and a baseline fix string (function fixes are called with
// {} so the agent sees the generic form before it has concrete extras).
export function dimensionCatalog() {
  const rankByDim = new Map(RETRY_PRECEDENCE.map((dim, i) => [dim, i]));
  const suppressedByMap = new Map();
  for (const [upstream, downstream] of Object.entries(CASCADE_SUPPRESSORS)) {
    for (const dim of downstream) {
      if (!suppressedByMap.has(dim)) suppressedByMap.set(dim, []);
      suppressedByMap.get(dim).push(upstream);
    }
  }
  return Object.keys(FIX_HINTS)
    .map((dimension) => ({
      dimension,
      precedenceRank: rankByDim.get(dimension) ?? null,
      defaultFix: resolveFixHint(dimension, {}) ?? null,
      suppressedBy: suppressedByMap.get(dimension) ?? [],
    }))
    .sort((a, b) => (a.precedenceRank ?? 999) - (b.precedenceRank ?? 999));
}
