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
- IDs use a 5-character `<Type><ChapterLetter><Seq3>` format. Type is `S` (source), `C` (claim), `T` (table), `F` (figure), `Q` (researchQuestion). ChapterLetter is the chapter's `letter:` declared in `chapters.yaml` (currently `O` overview, `M` market-analysis, `P` competitors, `I` financials, `E` product-tech, `U` customers, `R` risks, `V` valuation). Seq3 is a 3-digit sequence local to that chapter (001..999). Examples: `SO001`, `CM045`, `TI008`, `FE002`, `QR003`. Appendix ids remain single letters `A`, `B`, `C`.
- `claimRefs[]` on any object cites the canonical `C[A-Z]\d{3}` ids that back it.
- Each `T<L>###` / `F<L>###` id may be referenced by at most one block across all `chapters` and `appendices`.

## Enums

```yaml
recommendation: strong-buy | buy | track | research-more | avoid
confidence: high | medium | low
riskRating: low | medium | high | critical | unknown
valuationStance: attractive | fair | stretched | expensive | unknown
evidenceQuality: high | medium | low | unknown
calloutType: strength | risk | recommendation | insight | assumption    # shared vocabulary for chapter callouts and report callout blocks
claim.type: observed | company-claimed | third-party-reported | estimated | inferred | open-question | conflicting
freshness: current | recent | historical | unknown
sourceType: official* | filing* | regulatory* | news | analyst-market-data | technical-docs | customer-proof | partner-proof | developer-signal | review | legal* | other     # * = primary tier (matches `packet.vocabularies.primaryTierSourceTypes`); a source whose sourceType is starred OR whose `reputationTier: high` satisfies the high-confidence corroboration rule.
reputationTier: high | medium | low
independence: company | partner | customer | competitor | independent | unknown
stance: confirming | adverse | neutral | unknown
accessStatus: ok | paywall | js-only | broken | rate-limited
evidenceGap.type: missing-source | conflicting-data | private-evidence-only | enumeration-incomplete | stale | access-blocked
severity: blocking | material | minor
tone: positive | neutral | warning | negative | low | medium | high | critical | risk | opportunity | adverse
figure.layout: compact | standard | wide
block.type: paragraph | callout | table | figure | list | equation
```

## Analysis artifact schema

Applies to artifacts `01`–`08`.

```yaml
schemaVersion: report-v2
artifact: company-overview | market-analysis | competitors | financials | product-tech | customers | risks | valuation
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
    layout: compact | standard | wide
    summary: string
    data: {}
    approximationNotes: string | null
    claimRefs: [CO001]
callouts:
  - calloutType: strength | risk | recommendation | insight | assumption
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
  - dimension: string                          # Must match one of the warning dimensions check-chapter actually emits: paywallRisk | sectionsMax | tablesMax | figuresMax | figureType. Only warnings can be acknowledged; failures cannot.
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
  evidenceQuality: high | medium | low | unknown
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
  recommendation: strong-buy | buy | track | research-more | avoid
  confidence: high | medium | low
  riskRating: low | medium | high | critical | unknown
  valuationStance: attractive | fair | stretched | expensive | unknown
  keyMetrics: keyMetrics
  topStrengths: [string]
  topRisks: [string]
  unresolvedGaps: [string]
sourceStats:
  sourcesRetained: number
  claimsReviewed: number          # ≤ evidence ledger claims count.
  domainCount: number             # Distinct registrable domains across evidence.sources[].
  adverseSourceCount: number      # Count of sources with stance=adverse.
  unresolvedQuestionCount: number # Alias for openQuestionCount, kept for legacy readers.
  openQuestionCount: number       # Count of researchQuestions with status != answered across all chapters.
  documentedGapQuestionCount: number  # Open AND referenced by some evidenceGap.relatedQuestionRefs[].
  blockingQuestionCount: number   # Open AND not referenced by any evidenceGap; chapter gate forbids this, so a clean finalize emits 0.
  averageSourceAgeDays: number | null  # Mean (runDate - source.date) in days; null when no dated sources.
```

## Report meta schema

Applies to `report-meta.yaml` — the hand-authored input that `assemble.mjs` consumes to build `full-report.yaml` and `summary-card.yaml`. It carries the judgment fields the analysis chapters do not encode.

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
  recommendation: strong-buy | buy | track | research-more | avoid
  confidence: high | medium | low
  riskRating: low | medium | high | critical | unknown
  valuationStance: attractive | fair | stretched | expensive | unknown
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
  accessStatus: ok | paywall | js-only | broken | rate-limited   # Everything except `ok` is a restricted-access status (see `packet.vocabularies.restrictedAccessStatuses`).
  stance: confirming | adverse | neutral | unknown   # YAML field name is `stance`; the catalog key in packet.vocabularies is `sourceStance` (namespaced to distinguish from valuationStance).
  sourceType: sourceType                            # See the sourceType enum below; * marks the primary-tier values that satisfy the high-confidence corroboration rule.
  reputationTier: high | medium | low               # `high` also satisfies the primary-tier requirement for high-confidence claims.
  independence: company | partner | customer | competitor | independent | unknown
  topics: [string]                                 # Non-empty.
  keyQuote: string | null

claim:
  id: CO001                                        # Chapter-letter prefix matches the owning chapter (e.g. CM045 for market-analysis).
  statement: string                                # Non-empty; one atomic fact per claim.
  type: claim.type
  topic: string
  sourceRefs: [SO001]                              # May be empty only when type is `open-question`.
  confidence: high | medium | low
  freshness: current | recent | historical | unknown
  answersQuestionRefs: [QO001]                     # Optional; researchQuestion ids this claim answers.
  contradictsClaimRefs: [CO012]                    # Optional; required when type is `conflicting`.

researchQuestion:
  id: QO001                                        # Chapter-letter prefix matches the owning chapter.
  question: string                                 # Non-empty.
  type: enumeration | quantification | verification | adverse | freshness | comparison | mechanism
  targets: [string]                                # Non-empty; each target is `contentRequirements/<index>` or `plannedTables/<table-slug>` or `plannedFigures/<figure-slug>`.
  status: answered | partial | unresolved          # `answered` = a claim cites this question via `answersQuestionRefs`. `partial` = answered with caveats / incomplete data (counts toward neither answered nor unresolved — surface in evidenceGaps to explain). `unresolved` = no claim closed it (must surface in evidenceGaps via relatedQuestionRefs).

searchQuery:
  query: string                                    # Exact query string sent to the search tool.
  engine: string | null                            # e.g. `web_search`, `google`, `bing`, `sec.gov`, `duckduckgo`.
  hits: number | null                              # Optional.
  retainedSourceRefs: [SO001]                      # Local source ids retained from this query.

evidenceGap:
  type: missing-source | conflicting-data | private-evidence-only | enumeration-incomplete | stale | access-blocked
  severity: blocking | material | minor
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
    coverage: exhaustive | partial | sample
    basis: string                                # 1–2 sentences explaining how completeness was verified (or why it could not be).
  claimRefs: [CO001]

figure:
  id: FO001                                      # Chapter-letter prefix matches the owning chapter.
  title: string
  type: figureType
  layout: compact | standard | wide
  summary: string
  data: {}                                       # Structured object; never Mermaid/SVG/prose/JSON-string. See "Figure types" for required shape.
  approximationNotes: string | null              # Required when figure values are derived/estimated.
  claimRefs: [CO001]

block:
  type: paragraph | callout | table | figure | list | equation
  title: string | null
  body: string | null              # Required (non-empty) when type is paragraph or callout.
  calloutType: strength | risk | recommendation | insight | assumption | null   # Required when type is callout.
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

Read-only inputs the orchestrator writes under `.research-cache/<runId>/`. They appear in the chapter packet as `packet.runCache.disclosureHint` and `packet.runCache.refreshContext` (see `references/chapter-packet-schema-v2.md`).

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
    recommendation: recommendation | null
    riskRating: riskRating | null
    valuationStance: valuationStance | null
    keyMetrics: keyMetrics
    sourceStats: {}                          # Verbatim copy of prior summary-card.sourceStats.
  refreshInstructions: [string]              # Human-readable reminders the orchestrator wrote; agent re-reads as a checklist.
```

## depthFloor (per-chapter `gate.depthFloor`)

Defined in `chapters.yaml`'s `defaultGate`. Each field maps to a check-chapter dimension:

```yaml
depthFloor:
  minSectionBodyWords: number          # depthSection: each section's combined body+block prose must reach this floor.
  minSectionWordsTotal: number         # depthSectionTotal: sum across all sections.
  minTableRowsTotal: number            # depthTableRows: sum of rows across the chapter's tables.
  minFigureDataPointsTotal: number     # depthFigureData: sum of data-point counts across the chapter's figures.
```

## Figure types

```yaml
figureType: timeline | flow | quadrant | bar | waterfall | matrix | stack | pyramid | journey-map | funnel | cohort | range | kpi | dag | other
figure.data fields: items | nodes | edges | points | columns | rows | series | layers | xAxis | yAxis
```

Universal rules:

- `data` is a structured YAML object — never Mermaid, SVG, prose diagrams, or stringified JSON.
- Only include the data fields the type requires; never add empty placeholder arrays.
- Every figure carries `id`, `title`, `type`, `layout`, `summary`, `data`, `claimRefs`. Add `approximationNotes` when values are derived/estimated.

| Type | When to use it | Required data | Key data constraints |
|---|---|---|---|
| `timeline` | Dated events on one axis (milestones, releases, regulatory steps). | `items[]` | Each item has `date` + `label`. |
| `flow` | Linear or branching process flow (also covers logic chain, bridge, decision tree, and scenario branches). | `nodes[]` | `edges[]` optional; declared node order is significant when omitted. |
| `dag` | Directed acyclic graph: inputs → core dependency → impact, or any cause → mechanism → outcome chain (also covers risk transmission, evidence → claim links, decision option trees). | `nodes[]` and `edges[]` (required) | Edges form a DAG over node ids. |
| `quadrant` | Two-axis positioning of items (also covers competitive/market positioning maps and scatter / distribution use cases). | `points[]` | Numeric `x`, `y`. Use ordinal 0–10 scoring when source-backed numbers don't exist. |
| `bar` | Compare quantities across categories (also covers single-driver sensitivity rankings). | `items[]` or `series[]` | Numeric `value` per item / series point. |
| `funnel` | Stage-by-stage conversion drop-off. | `items[]` or `series[]` | Order = stage order. |
| `waterfall` | Bridge from start to end via deltas. | `items[]` | Numeric `value`; mark totals via `kind: total`. |
| `range` | Low/base/high estimate per item. | `items[]` | Numeric `low`/`min` and `high`/`max`; optional `mid`/`value` numeric. |
| `matrix` | Two-dim grid with cell labels (capability, evidence quality, risk heatmap, ordinal scoring). | `columns[]` + `rows[]` | `row.values.length === columns.length`; row label in `row.label`. Each cell is either a string or an object `{label, tone, detail?}` — `label` is the canonical text field (`text` accepted as alias). Cell `tone` uses the shared tone enum and drives discrete color. |
| `cohort` | Time-series retention only. | `columns[]` + `rows[]` | `columns[]` are time buckets (e.g. `month-1`, `month-3`, `year-1`); cells are retention percentages 0–100. Use `matrix` for ordinal scoring. |
| `stack` | Layered stack (tech stack, opportunity layers). | `layers[]` or `items[]` | Use `layers[]` when each layer has modules/outputs. |
| `pyramid` | Nested narrowing levels for sizing or segmentation (TAM/SAM/SOM, segment, geography). | `nodes[]` or `items[]` | One level per layer; declared order is top-to-bottom. |
| `journey-map` | Customer / user journey across surfaces. | `nodes[]` or `items[]` | Order = journey sequence. |
| `kpi` | Compact KPI card grid (also covers scorecard summaries). | `items[]` or `nodes[]` | Each entry has a `value` or `score` (use 0–10 ordinal scoring unless source-backed numbers exist). |
| `other` | Last resort. | none | Avoid; prefer a real type. |
