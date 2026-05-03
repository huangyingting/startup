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
- `claimRefs` reference local `C###` IDs before evidence consolidation and canonical `C###` IDs after consolidation.
- Inline `[C###]` markers inside a `body` / cell / item string are treated as claim refs by the renderer; use the same canonical IDs.
- Each `tableRef` / `figureRef` may appear in at most one chapter section or appendix block (renderer enforces single-home).

## Enums

```yaml
recommendation: strong-buy | buy | track | research-more | avoid
confidence: high | medium | low
riskRating: low | moderate | significant | critical | unknown
valuationStance: attractive | fair | stretched | expensive | unknown
evidenceQuality: high | medium | low | unknown
callout.type: strength | watchout | gap | verdict | methodology | assumption
claimType: observed | company-claimed | third-party-reported | estimated | inferred | open-question | conflicting
freshness: current | recent | historical | unknown
corroboration: single-source | multi-source | conflicting | none
sourceType: official | filing | regulatory | tier-one-news | trade-press | analyst-market-data | technical-docs | customer-proof | partner-proof | developer-signal | review | legal | other
reputationTier: high | medium | low
independence: company | partner | customer | competitor | independent | unknown
figure.layout: compact | standard | wide
block.type: paragraph | callout | table | figure | list | equation
block.calloutType: investment-recommendation | key-insight | opportunity | risk-alert | final-recommendation | null
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
  - type: strength | watchout | gap | verdict | methodology | assumption
    title: string
    body: string
    claimRefs: [C001]
localEvidence:
  coverage:
    sourcesConsidered: number
  sources: [source]
  claims: [claim]
  evidenceGaps: [evidenceGap]
```

## Evidence artifact schema

Applies to `90-evidence.yaml`.

```yaml
schemaVersion: report-v2
artifact: evidence
slug: string
runDate: YYYY-MM-DD
company:
  name: string
coverage:
  sourcesConsidered: number
  sourcesRetained: number
  claimsCreated: number
  evidenceQuality: high | medium | low | unknown
  sourceDiversityNotes: string | null
  deduplicationNotes: string
  recencyNotes: string
  coverageGaps: [string]
sources: [source]
claims: [claim]
evidenceGaps: [evidenceGap]
```

## Full report schema

Applies to `91-full-report.yaml`.

```yaml
schemaVersion: report-v2
artifact: full-report
slug: string
runDate: YYYY-MM-DD
company:
  name: string
reportMeta:
  title: string         # Must equal company.name; no decorations like " — Diligence Report" or run dates.
  subtitle: string | null  # Optional qualifier (e.g. "Public-evidence diligence snapshot"); put any descriptor here, not in title.
  generatedAt: ISO-8601 string
  schemaVersion: report-v2
  recommendation: strong-buy | buy | track | research-more | avoid
  confidence: high | medium | low
  riskRating: low | moderate | significant | critical | unknown
  valuationStance: attractive | fair | stretched | expensive | unknown
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
  foundedYear: number | null
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
disclaimer: string
```

## Summary card schema

Applies to `92-summary-card.yaml`.

```yaml
schemaVersion: report-v2
artifact: summary-card
slug: string
runDate: YYYY-MM-DD
company:
  name: string
title: string         # Must equal company.name; no decorations like " — Summary Card" or run dates.
subtitle: string | null  # Optional qualifier (e.g. "Public-evidence diligence snapshot"); put any descriptor here, not in title.
headline: string
recommendation: strong-buy | buy | track | research-more | avoid
confidence: high | medium | low
riskRating: low | moderate | significant | critical | unknown
valuationStance: attractive | fair | stretched | expensive | unknown
overallScore: number
sourceStats:
  sourcesRetained: number
  claimsReviewed: number
figureCount: number
tableCount: number
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
reportFiles:
  fullReport: 91-full-report.yaml
  summaryCard: 92-summary-card.yaml
```

## Reusable objects

```yaml
source:
  id: S001
  publisher: string
  title: string
  url: string
  date: YYYY-MM-DD | null
  accessDate: YYYY-MM-DD
  sourceType: sourceType
  reputationTier: high | medium | low
  independence: company | partner | customer | competitor | independent | unknown
  topics: [string]
  keyQuote: string | null

claim:
  id: C001
  statement: string
  claimType: claimType
  topic: string
  sourceRefs: [S001]
  confidence: high | medium | low
  freshness: current | recent | historical | unknown
  corroboration: single-source | multi-source | conflicting | none

evidenceGap:
  topic: string
  missingEvidence: string
  whyItMatters: string
  diligencePath: string

table:
  id: T001                                       # Sequential per chapter family (T101, T201, ...).
  title: string
  columns: [string]                              # Header labels; defines row width.
  rows:
    - [string | number | null]                   # Each row must have exactly columns.length cells.
  notes: string | null
  claimRefs: [C001]

figure:
  id: F001                                       # Sequential per chapter family (F101, F201, ...).
  title: string
  type: figureType                               # See "Figure types and data fields" for required data shape.
  layout: compact | standard | wide
  summary: string
  data: {}                                       # Structured object only; never Mermaid/SVG/prose/JSON-string.
  approximationNotes: string | null              # Required when figure values are derived/estimated.
  claimRefs: [C001]

block:
  type: paragraph | callout | table | figure | list | equation
  title: string | null
  body: string | null
  calloutType: investment-recommendation | key-insight | opportunity | risk-alert | final-recommendation | null
  tableRef: T001 | null
  figureRef: F001 | null
  items: [string]
  equation: string | null
  claimRefs: [C001]
```

## Figure types and data fields

```yaml
figureType: timeline | flow | decision-map | evidence-map | quadrant | positioning-map | bars | waterfall | heatmap | matrix | stack | layered-lens | bridge | journey-map | logic-chain | causal-map | sensitivity | scatter | funnel | cohort | range | scorecard | scenario-tree | dependency-map | other
figure.data fields: items | nodes | edges | points | columns | rows | series | layers | xAxis | yAxis  # Use only the fields the type requires; never include empty placeholder arrays for unused fields.
```

Notes that apply to every figure:

- `data` must be a structured YAML object — never Mermaid, SVG, prose diagrams, or stringified JSON.
- For matrix/heatmap/cohort: `data.columns[]` are the X-axis labels, each `data.rows[i].values[]` must have `length === columns.length`, and the row label lives in `data.rows[i].label`.
- For coordinate types (`quadrant`, `positioning-map`, `scatter`): every point needs numeric `x` and `y`.
- For numeric-value types (`bars`, `waterfall`, `funnel`): every item needs a numeric `value`.
- For relationship types (`flow`, `decision-map`, `evidence-map`, `scenario-tree`, `dependency-map`, `causal-map`): provide `edges[]` whenever a relationship exists; `dependency-map` requires edges (without them the renderer cannot stage Inputs / Core / Impact).
- `range` items need numeric `low`/`min` and `high`/`max`; optional `mid`/`value` must also be numeric when present.
- F102 — the Company Overview milestone timeline — must contain at least 8 dated `items[]`.

| Type | Required data | Notes |
|---|---|---|
| `timeline` | `items[]` | Each item should carry a date plus label/detail. |
| `flow` | `nodes[]` | Add `edges[]` to show direction. |
| `decision-map` | `nodes[]` | Add `edges[]` to show option → outcome paths. |
| `evidence-map` | `nodes[]` | Add `edges[]` for source → claim links. |
| `scenario-tree` | `nodes[]` | Add `edges[]` for branching scenarios. |
| `dependency-map` | `nodes[]` and `edges[]` | Edges are required so the renderer can stage Inputs / Core / Impact. |
| `quadrant` | `points[]` | Every point needs numeric `x` / `y`. |
| `positioning-map` | `points[]` | Numeric axes only when source-backed; otherwise use ordinal scoring. |
| `scatter` | `points[]` or `series[]` | Each point needs numeric `x` / `y`. |
| `bars` | `items[]` or `series[]` | Each item/series point needs numeric `value`. |
| `funnel` | `items[]` or `series[]` | Order matters; rows are stages. |
| `waterfall` | `items[]` | Numeric `value`; mark totals via `kind: total`. |
| `range` | `items[]` | Each item needs numeric `low`/`min` and `high`/`max`. |
| `sensitivity` | `series[]` | Each series point needs numeric `value`. |
| `heatmap` | `columns[]` and `rows[]` | `row.values.length === columns.length`. |
| `matrix` | `columns[]` and `rows[]` | Same shape rule as heatmap. |
| `cohort` | `columns[]` and `rows[]` | Time-series retention only — `columns[]` must be time buckets (e.g. `month-1`, `month-3`, `year-1`) and cells are retention percentages 0–100. For ordinal scoring across customers/segments, use `matrix` instead. |
| `stack` | `layers[]` or `items[]` | Use `layers[]` when modules/outputs differ per layer. |
| `layered-lens` | `nodes[]` or `items[]` | Each layer is one sizing/segmentation lens. |
| `bridge` | `nodes[]` or `items[]` | Renderer reuses `flow`; provide ordered nodes. |
| `journey-map` | `nodes[]` or `items[]` | Order represents the customer/journey sequence. |
| `logic-chain` | `nodes[]` | Renderer chains nodes in declared order. |
| `causal-map` | `nodes[]` | Add `edges[]` for cause → effect direction. |
| `scorecard` | `items[]` or `nodes[]` | Each entry should have a `value` or `score`. |
| `other` | none | Last-resort opaque container; prefer a real type. |
