# Chapter packet schema (`chapter-packet-v1`)

Schema reference for the JSON object emitted by `load-chapter.mjs`. The agent
reads this packet to plan and write a chapter; the same packet feeds the
gate floors that `check-chapter.mjs` enforces, so values here and values the
checker reads from `chapters.yaml` / `check-dimensions.mjs` cannot drift.

## Invocation modes

```
node .agents/skills/startup-research/scripts/load-chapter.mjs <selector> [--format json|markdown] [--no-workflow] [--include-context --report-folder <path>]
```

Selectors (mutually exclusive; default is `--list`):

- `--order <n>` — chapter by 1-based order.
- `--key <key>` — chapter by `chapters.yaml.key` (e.g. `company-overview`).
- `--file <artifact.yaml>` — chapter by output filename (e.g. `01-company-overview.yaml`).
- `--list` — top-level workflow listing instead of a chapter packet.
- `--all` — every chapter packet at once (array).

Flags:

- `--format json` (default) | `markdown` — machine-readable vs. human review.
- `--no-workflow` — emit only `packet.chapter` (drops vocabularies/checkDimensions/runCache/contextChapters). Use sparingly; the chapter loop wants the enriched packet.
- `--include-context` — adds `contextChapters[]`, `cumulativeContext`, and `runCache`. Requires `--report-folder <path>`.
- `--report-folder <path>` — points at the active `reports/<runId>/` folder. When the basename is not a `<14-digit-timestamp>-<slug>` runId, `runCache` is returned with all fields null instead of crashing.

## Top-level shape

```yaml
schemaVersion: chapter-packet-v1
generatedFrom: <absolute path to chapters.yaml>
workflow:
  reportSchemaVersion: report-v2
  finalArtifacts:                    # mirror of chapters.yaml finalArtifacts; map of {evidence, fullReport, summaryCard, reportMeta}
    <key>:
      file: string                   # filename written under reports/<runId>/
      artifact: string               # value the artifact's top-level `artifact:` field must equal
  totalChapters: number              # only present for chapter-packet output
vocabularies: {}                     # see "Vocabularies"
checkDimensions: []                  # see "Check dimensions"
previousChapter: compactChapter | null
chapter: compactChapter              # see "Chapter object"
nextChapter: compactChapter | null

# Present only when --include-context --report-folder are both passed:
contextChapters: [contextChapter]    # see "Context chapter"
cumulativeContext: cumulativeContext # advisory metrics from earlier chapters
runCache: runCache                   # disclosure-hint + refresh-context, when present
```

The `--list` mode returns `schemaVersion: chapter-list-v1` instead and replaces `chapter`/`previousChapter`/`nextChapter` with `chapters: [compactChapter]`. Vocabularies and check dimensions are still included.

The `--all` mode returns an array of chapter packets in chapter order.

## Chapter object (`compactChapter`)

```yaml
key: string                          # chapters.yaml `key` (stable id, e.g. company-overview).
order: number                        # 1-based.
letter: string                       # one uppercase letter; this chapter owns IDs S<L>### / C<L>### / T<L>### / F<L>### / Q<L>###.
file: string                         # output filename under reports/<runId>/ (e.g. 01-company-overview.yaml).
artifact: string                     # equals `key`; report-v2 chapter YAML's `artifact:` field must equal this.
title: string
mission: string                      # 1–3 sentence chapter mission statement.
optionalContext: [string]            # chapters.yaml keys; their loaded artifacts appear in contextChapters[] when --include-context is set.
contentRequirements: [string]        # narrative obligations the chapter must satisfy (gate.minContentRequirementCoverage of these must be cited via researchQuestion.targets[]).
plannedTables:                       # gate.maxTables / gate.maxFigures bound the totals.
  - name: string                     # slug used in researchQuestion.targets[] (`plannedTables/<name>`).
    requirement: string              # one-line description.
    enumeration: boolean | null      # true = matching table[] must include enumerationScope and meet gate.minSourcesPerEnumerationRow per row.
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
  minContentRequirementCoverage: number  # decimal share (0–1; default 0.8) of contentRequirements[] that must be cited via researchQuestion.targets[].
  minLocalSources: number
  minLocalClaims: number
  minAdverseSources: number          # source.stance === 'adverse'.
  minSourceDomains: number           # distinct registrable domains across local sources.
  minSourceTypeSpread: number        # distinct values from packet.vocabularies.sourceType.
  requiredSourceTypes: [sourceType]  # every value here must appear at least once.
  minNetNewSources: number           # local source URLs that did not appear in any earlier-order chapter's localEvidence.sources[].
  minHighConfidenceCorroboration: number  # claim.confidence === 'high' must carry at least this many sourceRefs and ≥1 primary-tier source.
  minSourcesPerEnumerationRow: number     # for enumeration tables, distinct registrable domains backing each row.
  depthFloor:
    minSectionBodyWords: number      # words per individual section body.
    minSectionWordsTotal: number     # sum across sections[].
    minTableRowsTotal: number        # sum across tables[].rows.
    minFigureDataPointsTotal: number # sum of structural data points across figures[] (figure-type specific).
```

`packet.chapter.gate` is the canonical gate for that chapter; floors injected from workflow-config (e.g. `minAdverseSources` from `chapters.yaml.reportGate`) are already merged in by `utils.normalizeWorkflowConfig`. Read floors from this object — never from `chapters.yaml` directly.

## Vocabularies (`packet.vocabularies`)

Object with the canonical enum lists, exported from `scripts/check-dimensions.mjs`. The agent should read `Object.keys(packet.vocabularies)` for the complete list rather than hard-coding values.

```yaml
vocabularies:
  sourceType: [official, filing, regulatory, news, analyst-market-data, technical-docs, customer-proof, partner-proof, developer-signal, review, legal, other]
  primaryTierSourceTypes: [official, filing, regulatory, legal]   # subset of sourceType that satisfies the high-confidence corroboration rule (or any source with reputationTier === 'high').
  sourceStance: [confirming, adverse, neutral, unknown]            # YAML field is `stance`; vocab key is namespaced.
  sourceAccessStatus: [ok, paywall, js-only, broken, rate-limited]
  restrictedAccessStatuses: [paywall, js-only, broken, rate-limited]
  sourceReputationTier: [high, medium, low]
  sourceIndependence: [company, partner, customer, competitor, independent, unknown]
  claimType: [observed, company-claimed, third-party-reported, estimated, inferred, open-question, conflicting]
  claimConfidence: [high, medium, low]
  claimFreshness: [current, recent, historical, unknown]
  questionType: [enumeration, quantification, verification, adverse, freshness, comparison, mechanism]
  questionStatus: [answered, partial, unresolved]
  enumerationCoverage: [exhaustive, partial, sample]
  calloutType: [strength, risk, recommendation, insight, assumption]
  cardRecommendation, cardConfidence, cardRiskRating, cardValuationStance: …    # report-meta enums; surfaced for completeness.
```

## Check dimensions (`packet.checkDimensions`)

Array of every validator dimension `check-chapter` may emit, sorted by retry precedence (root causes first). Used by the agent's retry loop to know which dimension to fix first.

```yaml
checkDimensions:
  - dimension: string                # stable enum key; switch on this in the retry loop.
    precedenceRank: number           # 1-based; lower ranks are root causes (fix first).
    suppressedBy: [string]           # other dimension keys that, when failing, mark this one as `suppressedDimension` (downstream-of-broken-upstream).
```

## Context chapter (`packet.contextChapters[]`)

One entry per `chapter.optionalContext[]` key. Loaded from disk only when `--include-context --report-folder` are both set; absent files are reported with `status: missing`.

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

Advisory only; never gates the current chapter. Use it to spend research effort on closing earlier unresolved questions and to avoid pushing the report's restricted-access share above the 30 % report-level ceiling.

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

Loaded from `.research-cache/<runId>/` (written by `new-report.mjs`). Both `disclosureHint` and `refreshContext` are `null` when their underlying files do not exist. When the report folder basename is not a runId, the entire object's identity fields fall back to nulls (no crash).

```yaml
runCache:
  cacheDir: string | null            # absolute path to .research-cache/<runId>/, or null if not a runId folder.
  runId: string                      # report folder basename.
  companySlug: string | null         # slug derived from runId, or null when not a runId.
  disclosureHint:                    # see references/report-schema-v2.md "Run cache files" for the full shape.
    disclosureProfile: public | private-disclosed | private-undisclosed | stealth
    note: string
    canonicalEvidenceGaps: [string]  # adopt verbatim as evidenceGap.missingEvidence in chapter 04 (financials).
  refreshContext:                    # set when new-report.mjs --refresh wrote the prior-run snapshot.
    schemaVersion: refresh-context-v1
    mode: refresh
    newRunId: string
    refreshOfRunId: string
    refreshReason: string | null
    previousReport: { runId, path, summaryCardPath, runDate, revisionStatus, company, headline, overallScore, recommendation, riskRating, valuationStance, keyMetrics, sourceStats }
    refreshInstructions: [string]
```

## What is intentionally NOT in the packet

- The chapter's prior-run YAML body. Refresh runs use `runCache.refreshContext` for diff context only; **re-fetch every volatile fact** instead of reading old chapter YAMLs.
- Report-meta judgment fields (`recommendation`, `riskRating`, `valuationStance`, etc.). Those are authored once in `report-meta.yaml` at finalization, not per chapter.
- Cross-chapter claim ids. Each chapter generates ids only with its own `letter`; consolidation across chapters happens later in `ledger.mjs` (run by `finalize.mjs`). The agent never looks up another chapter's id by hand — `crossChapterRefLeak` would flag it.
