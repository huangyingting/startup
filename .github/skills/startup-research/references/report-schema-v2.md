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
- IDs use `S001`, `C001`, `T001`, `F001`, and appendix IDs `A`, `B`, `C`.
- `claimRefs[]` on any object cites the canonical `C###` ids that back it.
- Each `T###` / `F###` id may be referenced by at most one block across all `chapters` and `appendices`.

## Enums

```yaml
recommendation: strong-buy | buy | track | research-more | avoid
confidence: high | medium | low
riskRating: low | moderate | significant | critical | unknown
valuationStance: attractive | fair | stretched | expensive | unknown
evidenceQuality: high | medium | low | unknown
calloutType: strength | risk | recommendation | insight | assumption    # shared vocabulary for chapter callouts and report callout blocks
claimType: observed | company-claimed | third-party-reported | estimated | inferred | open-question | conflicting
freshness: current | recent | historical | unknown
sourceType: official | filing | regulatory | tier-one-news | trade-press | analyst-market-data | technical-docs | customer-proof | partner-proof | developer-signal | review | legal | other
reputationTier: high | medium | low
independence: company | partner | customer | competitor | independent | unknown
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
    claimRefs: [C001]
tables:
  - id: T001
    title: string
    columns: [string]
    rows:
      - [string | number | null]
    notes: string | null
    claimRefs: [C001]
figures:
  - id: F001
    title: string
    type: figureType
    layout: compact | standard | wide
    summary: string
    data: {}
    approximationNotes: string | null
    claimRefs: [C001]
callouts:
  - calloutType: strength | risk | recommendation | insight | assumption
    title: string
    body: string
    claimRefs: [C001]
localEvidence:
  searchQueries: [searchQuery]                 # Required; may be empty only when researchQuestions is also empty.
  researchQuestions: [researchQuestion]
  sources: [source]
  claims: [claim]
  evidenceGaps: [evidenceGap]
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
  byStance: { confirming: number, adverse: number, neutral: number, unknown: number }
  byAccessStatus: { <accessStatus>: number }
  byClaimType: { <claimType>: number }
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
subtitle: string | null            # Optional descriptor; the canonical display title is `company.name`.
coverageNotes: string | null
coverMetrics:
  - label: string
    value: string
    numericValue: number | null
    unit: string | null
    claimRefs: [C001]
startupIntroduction:
  summary: string
  foundedDate: YYYY-MM-DD | null
  founders:
    - name: string
      role: string | null
      background: string | null
      claimRefs: [C001]
  foundingLocation: string | null
  headquarters: string | null
  productSummary: string
  customerFocus: string | null
  businessModel: string | null
  stage: string | null
  fundingStatus: string | null
  claimRefs: [C001]
chapters:
  - number: number
    title: string
    sections:
      - number: string
        title: string | null
        blocks: [block]
tables: [table]
figures: [figure]
appendices:
  - id: A
    title: string
    blocks: [block]
bibliography:
  sourceRefs: [S001]
disclaimer: string                  # Non-empty.
```

## Summary card schema

Applies to `summary-card.yaml`. Holds the headline judgment fields (`recommendation`, `confidence`, `riskRating`, `valuationStance`) so they are not duplicated on `full-report.yaml`.

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
headline: string
recommendation: strong-buy | buy | track | research-more | avoid
confidence: high | medium | low
riskRating: low | moderate | significant | critical | unknown
valuationStance: attractive | fair | stretched | expensive | unknown
overallScore: number              # 0–10 ordinal score, one decimal place (e.g. 7.4).
sourceStats:
  sourcesRetained: number
  claimsReviewed: number          # ≤ evidence ledger claims count.
  domainCount: number             # Distinct registrable domains across evidence.sources[].
  adverseSourceCount: number      # Count of sources with stance=adverse.
  unresolvedQuestionCount: number # Count of researchQuestions with status != answered across all chapters.
  averageSourceAgeDays: number | null  # Mean (runDate - source.date) in days; null when no dated sources.
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
topStrengths: [string]
topRisks: [string]
unresolvedGaps: [string]
```

## Reusable objects

```yaml
source:
  id: S001
  publisher: string
  title: string
  url: string
  date: YYYY-MM-DD | null                          # null only when no publish/document date exists.
  accessDate: YYYY-MM-DD                           # Required; never null.
  accessStatus: ok | paywall | js-only | broken | rate-limited
  stance: confirming | adverse | neutral
  sourceType: sourceType
  reputationTier: high | medium | low
  independence: company | partner | customer | competitor | independent | unknown
  topics: [string]                                 # Non-empty.
  keyQuote: string | null

claim:
  id: C001
  statement: string                                # Non-empty; one atomic fact per claim.
  claimType: claimType
  topic: string
  sourceRefs: [S001]                               # May be empty only when claimType is open-question.
  confidence: high | medium | low
  freshness: current | recent | historical | unknown
  answersQuestionRefs: [RQ001]                     # Optional; researchQuestion ids this claim answers.
  contradictsClaimRefs: [C012]                     # Optional; required when claimType is `conflicting`.

researchQuestion:
  id: RQ001
  question: string                                 # Non-empty.
  type: enumeration | quantification | verification | adverse | freshness | comparison | mechanism
  targets: [string]                                # Non-empty; each target is `contentRequirements/<index>` or `plannedTables/<table-slug>` or `plannedFigures/<figure-slug>`.
  status: answered | partial | unresolved

searchQuery:
  query: string                                    # Exact query string sent to the search tool.
  engine: string | null                            # e.g. `web_search`, `google`, `bing`, `sec.gov`, `duckduckgo`.
  hits: number | null                              # Optional.
  retainedSourceRefs: [S001]                       # Local source ids retained from this query.

evidenceGap:
  type: missing-source | conflicting-data | private-only | enumeration-incomplete | stale | unanswered-question | access-blocked
  severity: blocking | material | minor
  topic: string
  missingEvidence: string
  whyItMatters: string
  diligencePath: string
  relatedQuestionRefs: [RQ001]                   # Optional.
  relatedTableRefs: [T001]                       # Optional.

table:
  id: T001                                       # Sequential per chapter family (T101, T201, ...).
  title: string
  columns: [string]                              # Header labels; defines row width.
  rows:
    - [string | number | null]                   # Each row must have exactly columns.length cells.
  notes: string | null
  enumerationScope:                              # Optional; populate when the table is an enumeration.
    coverage: exhaustive | partial | sample
    basis: string                                # 1–2 sentences explaining how completeness was verified (or why it could not be).
  claimRefs: [C001]

figure:
  id: F001                                       # Sequential per chapter family (F101, F201, ...).
  title: string
  type: figureType
  layout: compact | standard | wide
  summary: string
  data: {}                                       # Structured object; never Mermaid/SVG/prose/JSON-string. See "Figure types" for required shape.
  approximationNotes: string | null              # Required when figure values are derived/estimated.
  claimRefs: [C001]

block:
  type: paragraph | callout | table | figure | list | equation
  title: string | null
  body: string | null              # Required (non-empty) when type is paragraph or callout.
  calloutType: strength | risk | recommendation | insight | assumption | null   # Required when type is callout.
  tableRef: T001 | null            # Required when type is table.
  figureRef: F001 | null           # Required when type is figure.
  items: [string]                  # Required (non-empty) when type is list.
  equation: string | null          # Required (non-empty) when type is equation.
  claimRefs: [C001]
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
| `matrix` | Two-dim grid with cell labels (capability, evidence quality, risk heatmap, ordinal scoring). | `columns[]` + `rows[]` | `row.values.length === columns.length`; row label in `row.label`. Cell `tone` drives discrete color. |
| `cohort` | Time-series retention only. | `columns[]` + `rows[]` | `columns[]` are time buckets (e.g. `month-1`, `month-3`, `year-1`); cells are retention percentages 0–100. Use `matrix` for ordinal scoring. |
| `stack` | Layered stack (tech stack, opportunity layers). | `layers[]` or `items[]` | Use `layers[]` when each layer has modules/outputs. |
| `pyramid` | Nested narrowing levels for sizing or segmentation (TAM/SAM/SOM, segment, geography). | `nodes[]` or `items[]` | One level per layer; declared order is top-to-bottom. |
| `journey-map` | Customer / user journey across surfaces. | `nodes[]` or `items[]` | Order = journey sequence. |
| `kpi` | Compact KPI card grid (also covers scorecard summaries). | `items[]` or `nodes[]` | Each entry has a `value` or `score` (use 0–10 ordinal scoring unless source-backed numbers exist). |
| `other` | Last resort. | none | Avoid; prefer a real type. |
