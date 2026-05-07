# Report schema v2

Schema reference for `report-v2` YAML artifacts.

## Common fields

Every artifact starts with:

```yaml
schemaVersion: report-v2
artifact: string
slug: string
runDate: YYYY-MM-DD
company:
  name: string
```

Conventions:

- Unknown optional values use `null`.
- Numeric fields are numbers or `null`, not formatted strings.
- IDs use a 5-character `<Type><ChapterLetter><Seq3>` format. Type is `S` (source), `C` (claim), `T` (table), `F` (figure), `Q` (researchQuestion). ChapterLetter is declared by `workflow-config.yaml`; the report schema owns the ID shape, not the current chapter-letter assignment. Seq3 is a 3-digit sequence local to that chapter (001..999). Examples: `SO001`, `CM045`, `TI008`, `FE002`, `QR003`. Appendix ids remain single letters `A`, `B`, `C`.
- `claimRefs[]` on any object cites the canonical `C[A-Z]\d{3}` ids that back it.
- Each `T<L>###` / `F<L>###` id may be referenced by at most one block across all `chapters` and `appendices`.

## Vocabulary fields

The report schema names the artifact fields that use controlled vocabularies. The executable source of truth for vocabulary values is `scripts/validation-catalog.mjs`, surfaced to agents as `runtimeContext.vocabularies`. Figure types, layouts, and data-field contracts are owned by `website/src/lib/figures.mjs`, surfaced as `runtimeContext.rendererContracts`.

```yaml
recommendation: cardRecommendation
confidence: cardConfidence | claimConfidence
riskRating: cardRiskRating
valuationStance: cardValuationStance
evidenceQuality: evidenceQuality
calloutType: calloutType
claim.type: claimType
freshness: claimFreshness
sourceType: sourceType
reputationTier: sourceReputationTier
independence: sourceIndependence
stance: sourceStance
accessStatus: sourceAccessStatus
evidenceGap.type: evidenceGapType
severity: severity
tone: tone
figure.type: figureType
figure.layout: figureLayout
block.type: blockType
```

## Analysis artifact schema

Applies to artifacts `01`–`08`.

```yaml
schemaVersion: report-v2
artifact: string                     # The normalized workflow chapter key for this analysis artifact.
slug: string
runDate: YYYY-MM-DD
company:
  name: string
chapter:
  number: number
  title: string
  summary: string
sections:
  - id: string
    title: string
    body: string
    claimRefs: [CO001]
tables:
  - id: TO001
    title: string
    columns: [string]
    rows:
      - [string | number | null]
    notes: string | null
    claimRefs: [CO001]
figures:
  - id: FO001
    title: string
    type: figureType
    layout: figureLayout
    summary: string
    data: {}
    approximationNotes: string | null
    claimRefs: [CO001]
callouts:
  - calloutType: calloutType
    title: string
    body: string
    claimRefs: [CO001]
localEvidence:
  searchQueries: [searchQuery]                 # Required; may be empty only when researchQuestions is also empty.
  researchQuestions: [researchQuestion]
  sources: [source]
  claims: [claim]
  evidenceGaps: [evidenceGap]
acknowledgedWarnings:                          # Optional; opt out of `--strict` chapter warnings without fixing them.
  - dimension: string                          # Must match a warning dimension check-chapter actually emits. Only warnings can be acknowledged; failures cannot.
    reason: string                             # ≥ 30 chars explaining why the warning is intentional.
```

## Evidence artifact schema

Applies to `evidence.yaml`.

```yaml
schemaVersion: report-v2
artifact: evidence
slug: string
runDate: YYYY-MM-DD
company:
  name: string
coverage:
  evidenceQuality: evidenceQuality
  sourceDiversityNotes: string | null
  deduplicationNotes: string
  recencyNotes: string
  coverageGaps: [string]
coverageMatrix:
  totalDistinctDomains: number
  byChapter:                                 # keyed by chapter file (e.g. 01-company-overview.yaml)
    <file>:
      sources: number
      claims: number
      researchQuestions: number
      adverseQuestions: number
      unresolvedQuestions: number
      distinctDomains: number
  byType: { <sourceType>: number }
  byStance: { <stance>: number }
  byAccessStatus: { <accessStatus>: number }
  byClaimType: { <claim.type>: number }
sources: [source]
claims: [claim]
evidenceGaps: [evidenceGap]
```

## Full report schema

Applies to `full-report.yaml`.

```yaml
schemaVersion: report-v2
artifact: full-report
slug: string
runDate: YYYY-MM-DD
company:
  name: string
revision: revision | null          # Optional; missing means current/no refresh links.
subtitle: string | null            # Optional descriptor; the canonical display title is `company.name`.
coverageNotes: string | null
coverFacts: [coverFact]
companyProfile: companyProfile
chapters:
  - number: number
    title: string
    sections:
      - number: string
        title: string | null
        blocks: [block]
tables: [table]
figures: [figure]
appendices: [appendix]
bibliography:
  sourceRefs: [SO001]
disclaimer: string                  # Non-empty.
```

## Summary card schema

Applies to `summary-card.yaml`. Holds the headline judgment (`summary.recommendation`, `summary.confidence`, `summary.riskRating`, `summary.valuationStance`) so they are not duplicated on `full-report.yaml`.

```yaml
schemaVersion: report-v2
artifact: summary-card
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string | null
  sector: string | null
  stage: string | null
  headquarters: string | null
  shortDescription: string | null
revision: revision | null          # Optional; missing means current/no refresh links.
summary:
  headline: string
  overallScore: number              # 0–10 ordinal score, one decimal place (e.g. 7.4).
  recommendation: cardRecommendation
  confidence: cardConfidence
  riskRating: cardRiskRating
  valuationStance: cardValuationStance
  keyMetrics: keyMetrics
  topStrengths: [string]
  topRisks: [string]
  unresolvedGaps: [string]
sourceStats:
  sourcesRetained: number
  claimsReviewed: number          # ≤ evidence ledger claims count.
  domainCount: number             # Distinct registrable domains across evidence.sources[].
  adverseSourceCount: number      # Count of sources with stance=adverse.
  openQuestionCount: number       # Count of researchQuestions with status != answered across all chapters.
  documentedGapQuestionCount: number  # Open AND referenced by some evidenceGap.relatedQuestionRefs[].
  blockingQuestionCount: number   # Open AND not referenced by any evidenceGap; chapter gate forbids this, so a clean finalize emits 0.
  averageSourceAgeDays: number | null  # Mean (runDate - source.date) in days; null when no dated sources.
```

## Report meta schema

Applies to `report-meta.yaml` — the hand-authored input that `assemble-report.mjs` consumes to build `full-report.yaml` and `summary-card.yaml`. It carries the judgment fields the analysis chapters do not encode.

```yaml
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string | null
  sector: string | null
  stage: string | null
  headquarters: string | null
  shortDescription: string | null
revision: revision | null          # Optional source of truth for refresh/version links; assemble emits it into full-report and summary-card.
subtitle: string | null
coverageNotes: string | null
coverFacts: [coverFact] | null
companyProfile: companyProfile
summary:
  headline: string
  overallScore: number              # 0–10, one decimal.
  recommendation: cardRecommendation
  confidence: cardConfidence
  riskRating: cardRiskRating
  valuationStance: cardValuationStance
  keyMetrics: keyMetrics
  topStrengths: [string]
  topRisks: [string]
  unresolvedGaps: [string]
appendices: [appendix] | null
disclaimer: string | null           # Overrides default when set.
```

## Reusable objects

```yaml
revision:
  status: current | superseded
  refreshOfRunId: string | null       # Current refreshed reports point to the prior run id; first reports use null.
  supersededByRunId: string | null    # Superseded reports point to the newer run id; current reports use null.
  refreshReason: string | null        # Human-entered reason for the refresh, when known.

source:
  id: SO001                                        # Chapter-letter prefix matches the owning chapter (e.g. SM001 for market-analysis).
  publisher: string
  title: string
  url: string
  date: YYYY-MM-DD | null                          # null only when no publish/document date exists.
  accessDate: YYYY-MM-DD                           # Required; never null.
  accessStatus: sourceAccessStatus                  # Restricted-access subset is in `runtimeContext.vocabularies.restrictedAccessStatuses`.
  stance: sourceStance                              # YAML field name is `stance`; catalog key is namespaced to distinguish from valuationStance.
  sourceType: sourceType
  reputationTier: sourceReputationTier
  independence: sourceIndependence
  topics: [string]                                 # Non-empty.
  keyQuote: string | null

claim:
  id: CO001                                        # Chapter-letter prefix matches the owning chapter (e.g. CM045 for market-analysis).
  statement: string                                # Non-empty; one atomic fact per claim.
  type: claim.type
  topic: string
  sourceRefs: [SO001]                              # May be empty only when type is `open-question`.
  confidence: claimConfidence
  freshness: claimFreshness
  answersQuestionRefs: [QO001]                     # Optional; researchQuestion ids this claim answers.
  contradictsClaimRefs: [CO012]                    # Optional; required when type is `conflicting`.

researchQuestion:
  id: QO001                                        # Chapter-letter prefix matches the owning chapter.
  question: string                                 # Non-empty.
  type: questionType
  targets: [string]                                # Non-empty; each target is `contentRequirements/<index>` or `plannedTables/<table-slug>` or `plannedFigures/<figure-slug>`.
  status: questionStatus                           # `answered` = a claim cites this question via `answersQuestionRefs`; partial/unresolved statuses should be documented through evidence gaps when material.

searchQuery:
  query: string                                    # Exact query string sent to the search tool.
  engine: string | null                            # e.g. `web_search`, `google`, `bing`, `sec.gov`, `duckduckgo`.
  hits: number | null                              # Optional.
  retainedSourceRefs: [SO001]                      # Local source ids retained from this query.

evidenceGap:
  type: evidenceGapType
  severity: severity
  topic: string
  missingEvidence: string
  whyItMatters: string
  diligencePath: string
  relatedQuestionRefs: [QO001]                   # Optional; cite when this gap closes an unresolved/partial researchQuestion.
  relatedTableRefs: [TO001]                      # Optional.

table:
  id: TO001                                      # Chapter-letter prefix matches the owning chapter.
  title: string
  columns: [string]                              # Header labels; defines row width.
  rows:
    - [string | number | null]                   # Each row must have exactly columns.length cells.
  notes: string | null
  enumerationScope:                              # Optional; populate when the table is an enumeration.
    coverage: enumerationCoverage
    basis: string                                # 1–2 sentences explaining how completeness was verified (or why it could not be).
  claimRefs: [CO001]

figure:
  id: FO001                                      # Chapter-letter prefix matches the owning chapter.
  title: string
  type: figureType
  layout: figureLayout
  summary: string
  data: {}                                       # Structured object matching `runtimeContext.rendererContracts`; never Mermaid/SVG/prose/JSON-string.
  approximationNotes: string | null              # Required when figure values are derived/estimated.
  claimRefs: [CO001]

block:
  type: blockType
  title: string | null
  body: string | null              # Required (non-empty) when type is paragraph or callout.
  calloutType: calloutType | null   # Required when type is callout.
  tableRef: TO001 | null           # Required when type is table; chapter-letter prefix matches the owning chapter.
  figureRef: FO001 | null          # Required when type is figure; chapter-letter prefix matches the owning chapter.
  items: [string]                  # Required (non-empty) when type is list.
  equation: string | null          # Required (non-empty) when type is equation.
  claimRefs: [CO001]

coverFact:
  label: string
  value: number | string | null     # Numeric when sortable/chartable; string for textual values like "Series A".
  unit: string | null               # e.g. `USD M`, `%`, `employees`. Omit for textual values.
  claimRefs: [CO001]

companyProfile:
  summary: string                  # Non-empty.
  foundedDate: YYYY-MM-DD | null
  founders:
    - name: string
      role: string | null
      background: string | null
      claimRefs: [CO001]
  foundingLocation: string | null
  headquarters: string | null
  productSummary: string           # Non-empty.
  customerFocus: string | null
  businessModel: string | null
  stage: string | null
  fundingStatus: string | null
  disclosureProfile: public | private-disclosed | private-undisclosed | stealth | null
  # Optional. Pre-revenue stealth labs and undisclosed-financials private companies
  # rarely have public ARR/revenue/headcount; record the profile so chapter 04
  # (financials) can pre-populate canonical evidenceGaps for those metrics rather
  # than rediscovering they are unavailable. Default null = unspecified.
  claimRefs: [CO001]

keyMetrics:
  valuationUsdM: number | null
  revenueRunRateUsdM: number | null
  arrUsdM: number | null
  revenueGrowthYoYPct: number | null
  grossMarginPct: number | null
  nrrPct: number | null
  totalRaisedUsdM: number | null
  customerCount: number | null
  headcount: number | null

appendix:
  id: A | B | C | ...
  title: string
  blocks: [block]
```

## Run cache files

Read-only inputs the orchestrator writes under `.research-cache/<runId>/`. They appear in the chapter runtime context as `runtimeContext.runCache.disclosureHint` and `runtimeContext.runCache.refreshContext` (see `references/chapter-runtime-context-schema-v2.md`).

```yaml
disclosure-hint.yaml:                        # Optional. Carries the operator-supplied disclosure hint.
  disclosureProfile: public | private-disclosed | private-undisclosed | stealth
  note: string                               # Operator note pointing at companyProfile.disclosureProfile + chapter-04 adoption.
  canonicalEvidenceGaps: [string]            # Plain-string gap descriptions; chapter 04 (financials) adopts each as the `missingEvidence` field of a typed evidenceGap.

refresh-context.yaml:                        # Optional. Carries the prior run's summary-card snapshot for refresh runs.
  schemaVersion: refresh-context-v1
  mode: refresh
  newRunId: string                           # `<14-digit-timestamp>-<companySlug>` of the new run.
  refreshOfRunId: string                     # Run id of the report being refreshed.
  refreshReason: string | null
  previousReport:
    runId: string
    path: string                             # `reports/<runId>` (relative to repo root).
    summaryCardPath: string
    runDate: YYYY-MM-DD | null
    revisionStatus: current | superseded
    company: { name, website }
    headline: string | null
    overallScore: number | null
    recommendation: cardRecommendation | null
    riskRating: cardRiskRating | null
    valuationStance: cardValuationStance | null
    keyMetrics: keyMetrics
    sourceStats: {}                          # Verbatim copy of prior summary-card.sourceStats.
  refreshInstructions: [string]              # Human-readable reminders the orchestrator wrote; agent re-reads as a checklist.
```

## Workflow and figure contracts

Per-chapter gate fields such as `depthFloor` belong to `workflow-config-schema-v1.md` and are surfaced at runtime as `runtimeContext.chapter.gate`.

Figure renderer contracts belong to `website/src/lib/figures.mjs` and are surfaced at runtime as `runtimeContext.rendererContracts`. This report schema owns only the artifact fields (`figure.type`, `figure.layout`, `figure.data`, etc.), not the renderer's per-type data requirements.
