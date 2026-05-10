// Field whitelist for the en→zh translation pipeline.
//
// Each entry maps an artifact (chapter | full-report | report-meta | summary-card | evidence)
// to a list of "leaf paths". A leaf path is a slash-separated sequence with
// `[]` markers for arrays. The walker visits matching leaves and only those
// leaves get translated. Everything else is passed through verbatim — ids,
// refs, urls, dates, numerics, and the entire localEvidence.searchQueries[]
// audit trail stay in English.
//
// Shared with extract-translatable.mjs / apply-translation.mjs / check-translation.mjs.

// Translatable leaf strings live at these paths. Anything not listed is
// preserved as-is in the .zh.yaml mirror.
//
// Convention: `field` matches scalar at that key; `field/[]` iterates an
// array of scalars; `field/[]/sub` walks each item.sub. Multiple list
// elements (rows of a table, items of a list block) are addressed by
// numeric index when emitted as `path[i]`.
export const TRANSLATE_PATHS = Object.freeze({
  chapter: [
    'chapter/title',
    'chapter/summary',
    'sections/[]/title',
    'sections/[]/body',
    'callouts/[]/title',
    'callouts/[]/body',
    'tables/[]/title',
    'tables/[]/columns/[]',
    'tables/[]/rows/[]/[]',
    'tables/[]/notes',
    'figures/[]/title',
    'figures/[]/summary',
    'figures/[]/notes',
    'figures/[]/series/[]/label',
    'figures/[]/series/[]/items/[]/label',
    'figures/[]/series/[]/items/[]/detail',
    'figures/[]/items/[]/label',
    'figures/[]/items/[]/detail',
    'figures/[]/nodes/[]/label',
    'figures/[]/nodes/[]/detail',
    'figures/[]/edges/[]/label',
    'figures/[]/layers/[]/label',
    'figures/[]/layers/[]/items/[]/label',
    'figures/[]/layers/[]/items/[]/detail',
    'figures/[]/axisLabels/x',
    'figures/[]/axisLabels/y',
    'figures/[]/quadrantLabels/[]',
    'figures/[]/columnHeaders/[]',
    'figures/[]/rowHeaders/[]',
    'figures/[]/cells/[]/[]',
    'figures/[]/dataset/[]/label',
    'localEvidence/evidenceGaps/[]/topic',
    'localEvidence/evidenceGaps/[]/note',
    'localEvidence/researchQuestions/[]/question',
    'localEvidence/researchQuestions/[]/notes',
    // sources[]: only the prose-y fields. Publisher / title / keyQuote /
    // url / topics / id / sourceType / stance / etc. stay English.
    // (Per user: keyQuote stays English.)
  ],
  fullReport: [
    'subtitle',
    'coverageNotes',
    'coverFacts/[]/label',
    'companyProfile/summary',
    'companyProfile/productSummary',
    'companyProfile/customerFocus',
    'companyProfile/businessModel',
    'companyProfile/fundingStatus',
    'companyProfile/founders/[]/role',
    'companyProfile/founders/[]/background',
    'chapters/[]/title',
    'chapters/[]/sections/[]/title',
    'chapters/[]/sections/[]/blocks/[]/title',
    'chapters/[]/sections/[]/blocks/[]/body',
    'chapters/[]/sections/[]/blocks/[]/items/[]',
    'tables/[]/title',
    'tables/[]/columns/[]',
    'tables/[]/rows/[]/[]',
    'tables/[]/notes',
    'figures/[]/title',
    'figures/[]/summary',
    'figures/[]/notes',
    'figures/[]/series/[]/label',
    'figures/[]/series/[]/items/[]/label',
    'figures/[]/series/[]/items/[]/detail',
    'figures/[]/items/[]/label',
    'figures/[]/items/[]/detail',
    'figures/[]/nodes/[]/label',
    'figures/[]/nodes/[]/detail',
    'figures/[]/edges/[]/label',
    'figures/[]/layers/[]/label',
    'figures/[]/layers/[]/items/[]/label',
    'figures/[]/layers/[]/items/[]/detail',
    'figures/[]/axisLabels/x',
    'figures/[]/axisLabels/y',
    'figures/[]/quadrantLabels/[]',
    'figures/[]/columnHeaders/[]',
    'figures/[]/rowHeaders/[]',
    'figures/[]/cells/[]/[]',
    'figures/[]/dataset/[]/label',
    'appendices/[]/title',
    'appendices/[]/blocks/[]/title',
    'appendices/[]/blocks/[]/body',
    'appendices/[]/blocks/[]/items/[]',
    'disclaimer',
  ],
  reportMeta: [
    'subtitle',
    'coverageNotes',
    'coverFacts/[]/label',
    'companyProfile/summary',
    'companyProfile/productSummary',
    'companyProfile/customerFocus',
    'companyProfile/businessModel',
    'companyProfile/fundingStatus',
    'companyProfile/founders/[]/role',
    'companyProfile/founders/[]/background',
    'summary/headline',
    'summary/topStrengths/[]',
    'summary/topRisks/[]',
    'summary/unresolvedGaps/[]',
    'appendices/[]/title',
    'appendices/[]/blocks/[]/title',
    'appendices/[]/blocks/[]/body',
    'appendices/[]/blocks/[]/items/[]',
    'disclaimer',
  ],
  summaryCard: [
    'summary/headline',
    'summary/topStrengths/[]',
    'summary/topRisks/[]',
    'summary/unresolvedGaps/[]',
  ],
  evidence: [
    // The agreed policy keeps source quotes (keyQuote), titles, and
    // publishers in English. Only the chapter-level claims and gap notes
    // (which are author prose) get translated; sources[] is left alone.
    'claims/[]/statement',
    'evidenceGaps/[]/topic',
    'evidenceGaps/[]/note',
  ],
});

// The whitelist alone is the affirmative gate: only paths matched here are
// translated. The validator separately confirms that every English ID/ref
// was preserved verbatim in the .zh.yaml mirror, so no per-key blocklist
// is needed.

// Resolve which whitelist applies to a parsed YAML doc.
export function whitelistFor(doc) {
  const artifact = doc?.artifact;
  if (artifact === 'full-report') return TRANSLATE_PATHS.fullReport;
  if (artifact === 'report-meta') return TRANSLATE_PATHS.reportMeta;
  if (artifact === 'summary-card') return TRANSLATE_PATHS.summaryCard;
  if (artifact === 'evidence') return TRANSLATE_PATHS.evidence;
  // Chapter artifacts use their key as their `artifact` value
  // (e.g. "company-overview"), so anything that isn't one of the four
  // final-stage artifacts is a chapter.
  return TRANSLATE_PATHS.chapter;
}

// Match a path-segment list against a whitelist pattern. `path` is the
// concrete stack ("sections", 0, "body"); `pattern` is the schema
// ("sections", "[]", "body").
export function matchesPattern(path, pattern) {
  const parts = pattern.split('/');
  if (parts.length !== path.length) return false;
  for (let i = 0; i < parts.length; i += 1) {
    const want = parts[i];
    const got = path[i];
    if (want === '[]') {
      if (typeof got !== 'number') return false;
    } else if (want !== String(got)) {
      return false;
    }
  }
  return true;
}

export function isTranslatableLeaf(path, whitelist) {
  return whitelist.some((pattern) => matchesPattern(path, pattern));
}
