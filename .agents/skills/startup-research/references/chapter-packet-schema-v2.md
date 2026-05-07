# Chapter packet schema (`chapter-packet-v2`)

Schema reference for the JSON object emitted by `load-chapter.mjs`. The packet
feeds chapter generation and the gate floors that `check-chapter.mjs`
enforces, so values here and values the checker reads from `chapters.yaml` /
`check-dimensions.mjs` cannot drift.

## Top-level shape

```yaml
schemaVersion: chapter-packet-v2
generatedFrom: <absolute path to chapters.yaml>
workflow:
  reportSchemaVersion: report-v2
  finalArtifacts:                    # mirror of utils.FINAL_ARTIFACTS; map of {evidence, fullReport, summaryCard}. report-meta.yaml is intentionally absent: it is hand-authored input to assemble.mjs, not an assembled output.
    <key>:
      file: string                   # filename written under reports/<runId>/
      artifact: string               # value the artifact's top-level `artifact:` field must equal
  totalChapters: number              # only present for chapter-packet output
vocabularies: {}                     # see "Vocabularies"
checkDimensions: []                  # see "Check dimensions"
previousChapter: compactChapter | null
chapter: compactChapter              # see "Chapter object"
nextChapter: compactChapter | null

# Optional context block. Present only when the packet was emitted with
# context enabled; absent otherwise.
contextChapters: [contextChapter]    # see "Context chapter"
cumulativeContext: cumulativeContext # advisory metrics from earlier chapters
runCache: runCache                   # disclosure-hint + refresh-context, when present
```

The `schemaVersion` field discriminates three shapes the same loader emits:

- `chapter-packet-v2` — single-chapter packet (top-level shape above).
- `chapter-list-v2` — replaces `chapter` / `previousChapter` / `nextChapter` with `chapters: [compactChapter]`. Vocabularies and check dimensions are still included.
- An array of `chapter-packet-v2` objects when every chapter is requested at once.

## Chapter object (`compactChapter`)

```yaml
key: string                          # chapters.yaml `key` (stable id, e.g. company-overview).
order: number                        # 1-based.
letter: string                       # one uppercase letter; this chapter owns IDs S<L>### / C<L>### / T<L>### / F<L>### / Q<L>###.
file: string                         # output filename under reports/<runId>/ (e.g. 01-company-overview.yaml).
artifact: string                     # equals `key`; report-v2 chapter YAML's `artifact:` field must equal this.
title: string
mission: string                      # 1–3 sentence chapter mission statement.
optionalContext: [string]            # chapters.yaml keys; loaded artifacts appear in contextChapters[] when that block is present.
contentRequirements: [string]        # narrative obligations the chapter must satisfy (gate.minContentRequirementCoverage of these must be cited via researchQuestion.targets[]).
plannedTables:                       # gate.maxTables / gate.maxFigures bound the totals.
  - name: string                     # slug used in researchQuestion.targets[] (`plannedTables/<name>`).
    requirement: string              # one-line description.
    enumeration: boolean | null      # true = enumeration table (matching table[] requires enumerationScope and per-row source corroboration; see check-chapter for the rule).
    expectedMinRows: number | null   # only meaningful when enumeration is true.
plannedFigures:
  - name: string                     # slug used in researchQuestion.targets[] (`plannedFigures/<name>`).
    requirement: string
    acceptedTypes: [figureType]      # any of these is allowed; substitution to a table is permitted when the data is wrong-shaped (document the swap in evidenceGaps).
evidenceStrategy: [string]           # research moves the agent should make for this chapter.
qualityBar: [string]                 # chapter-specific narrative quality requirements beyond the numeric gate.
gate:                                # all floors and ceilings the chapter must clear; check-chapter reads the same object.
  minSections: number
  maxSections: number
  minArtifacts: number               # tables[] + figures[]
  maxTables: number
  maxFigures: number
  minResearchQuestions: number
  minQuestionTypeSpread: number      # distinct values from packet.vocabularies.questionType.
  minAdverseQuestions: number        # of researchQuestions whose type is `adverse`.
  minQuestionAnswerRate: number      # decimal share (0–1) of researchQuestions whose status is `answered`.
  minContentRequirementCoverage: number  # decimal share (0–1; default 0.8) of contentRequirements[] that must be cited via researchQuestion.targets[].
  minLocalSources: number
  minLocalClaims: number
  minAdverseSources: number          # source.stance === 'adverse'.
  minSourceDomains: number           # distinct registrable domains across local sources.
  minSourceTypeSpread: number        # distinct values from packet.vocabularies.sourceType.
  requiredSourceTypes: [sourceType]  # values that must each appear at least once in localSources.
  minNetNewSources: number           # local source URLs that did not appear in any earlier-order chapter's localEvidence.sources[].
  minHighConfidenceCorroboration: number  # floor for distinct sourceRefs on each high-confidence claim (corroboration rule, see check-chapter).
  minSourcesPerEnumerationRow: number     # for enumeration tables, distinct registrable domains backing each row.
  depthFloor:
    minSectionBodyWords: number      # words per individual section body.
    minSectionWordsTotal: number     # sum across sections[].
    minTableRowsTotal: number        # sum across tables[].rows.
    minFigureDataPointsTotal: number # sum of structural data points across figures[] (figure-type specific).
```

`packet.chapter.gate` is the canonical per-chapter gate, already merged with workflow-config-injected floors (e.g. `minAdverseSources` derived from `chapters.yaml.adverseDistribution`). `check-chapter` reads the same object.

## Vocabularies (`packet.vocabularies`)

Object with the canonical enum lists, exported from `scripts/check-dimensions.mjs` (the source of truth for both keys and values).

```yaml
vocabularies:
  sourceType: […]                  # canonical source-type enum.
  primaryTierSourceTypes: […]      # subset of sourceType used by the high-confidence corroboration rule (sources with reputationTier === 'high' also satisfy it).
  sourceStance: […]                # YAML field name is `stance`; vocab key is namespaced.
  sourceAccessStatus: […]
  restrictedAccessStatuses: […]    # subset of sourceAccessStatus that counts toward the restricted-access cap.
  sourceReputationTier: […]
  sourceIndependence: […]
  claimType: […]
  claimConfidence: […]
  claimFreshness: […]
  questionType: […]
  questionStatus: […]
  enumerationCoverage: […]
  calloutType: […]
  tone: […]                     # figure/data tone vocabulary used by renderer and validators.
  blockType: […]                # full-report / appendix block.type enum.
  cardRecommendation, cardConfidence, cardRiskRating, cardValuationStance: […]   # report-meta enums; surfaced for completeness.
```

## Check dimensions (`packet.checkDimensions`)

Array of every validator dimension `check-chapter` may emit, sorted by retry precedence (root causes first).

```yaml
checkDimensions:
  - dimension: string                # stable enum key; switch on this in the retry loop.
    precedenceRank: number           # 1-based; lower ranks are root causes (fix first).
    suppressedBy: [string]           # other dimension keys that, when failing, mark this one as `suppressedDimension` (downstream-of-broken-upstream).
```

## Context chapter (`packet.contextChapters[]`)

Optional. When the context block is present, one entry per `chapter.optionalContext[]` key; absent files are reported with `status: missing`.

```yaml
contextChapters:
  - key: string
    file: string
    status: loaded | missing | parseError | unknownKey
    error: string | null             # populated only when status === 'parseError'.
    artifact: string | null          # echo of the loaded chapter's `artifact:` field.
    title: string | null
    summary: string | null
    sections:                        # truncated; ids and claimRefs only — read full chapter from disk if you need bodies.
      - id: string
        title: string
        claimRefs: [string]
    tables:
      - id: string
        title: string
        claimRefs: [string]
    figures:
      - id: string
        title: string
        type: string
        claimRefs: [string]
```

## Cumulative context (`packet.cumulativeContext`)

Advisory only; never gates the current chapter. Aggregated from earlier chapters' `localEvidence`.

```yaml
cumulativeContext:
  note: string                                # always 'Advisory metrics aggregated from earlier chapters; does not gate this chapter.'
  cumulativeUnresolvedQuestions: number       # researchQuestions across earlier chapters whose status !== 'answered'.
  cumulativeRestrictedAccessPct: number       # decimal in [0,1]; share of earlier-chapter sources whose accessStatus is in restrictedAccessStatuses.
  earlierChapters:
    - file: string
      status: loaded | missing
      unanswered: number | null
      sources: number | null
      restricted: number | null
```

## Run cache (`packet.runCache`)

Loaded from `.research-cache/<runId>/`. When the report folder basename is not a runId, the identity fields fall back to nulls (no crash). For the `disclosureHint` and `refreshContext` shapes, see *Run cache files* in `references/report-schema-v2.md`.

```yaml
runCache:
  cacheDir: string | null            # absolute path to .research-cache/<runId>/, or null if the report folder basename is not a runId.
  runId: string                      # report folder basename.
  companySlug: string | null         # slug derived from runId, or null when not a runId.
  disclosureHint: object | null      # null when disclosure-hint.yaml is absent.
  refreshContext: object | null      # null unless this run was started with --refresh.
```

## What is intentionally NOT in the packet

- The chapter's prior-run YAML body. Refresh runs surface only the prior run's summary-card snapshot via `runCache.refreshContext`; full chapter YAMLs are not loaded.
- Report-meta judgment fields (`recommendation`, `riskRating`, `valuationStance`, etc.). Those live in `report-meta.yaml` (see `references/report-schema-v2.md`).
- Cross-chapter claim ids. Each chapter generates ids only with its own `letter`; consolidation across chapters happens later in `ledger.mjs`.
