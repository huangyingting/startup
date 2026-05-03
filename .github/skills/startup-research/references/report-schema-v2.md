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
  researchQuestions: [string]                  # Search / diligence questions raised before evidence collection; gate --pre-ledger requires ≥ minResearchQuestions.
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
disclaimer: string                  # Required; non-empty.
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
overallScore: number              # 0–10 ordinal score, one decimal place (e.g. 7.4); validator rejects values outside this range.
sourceStats:
  sourcesRetained: number
  claimsReviewed: number          # Must not exceed evidence ledger claims count.
figureCount: number               # Must equal the number of figures in 91-full-report.yaml.
tableCount: number                # Must equal the number of tables in 91-full-report.yaml.
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
  fullReport: 91-full-report.yaml   # Literal value; do not rename.
  summaryCard: 92-summary-card.yaml # Literal value; do not rename.
```

## Reusable objects

```yaml
source:
  id: S001
  publisher: string
  title: string
  url: string
  date: YYYY-MM-DD | null                          # null only when no publish/document date exists.
  accessDate: YYYY-MM-DD                           # Required; never null — the date the source was reviewed.
  sourceType: sourceType
  reputationTier: high | medium | low
  independence: company | partner | customer | competitor | independent | unknown
  topics: [string]                                 # Non-empty; at least one topic.
  keyQuote: string | null

claim:
  id: C001
  statement: string                                # Non-empty; one atomic fact per claim.
  claimType: claimType
  topic: string
  sourceRefs: [S001]                               # May be empty only when claimType is open-question and corroboration is none.
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
  body: string | null              # Required (non-empty) when type is paragraph or callout.
  calloutType: investment-recommendation | key-insight | opportunity | risk-alert | final-recommendation | null
  tableRef: T001 | null            # Required when type is table.
  figureRef: F001 | null           # Required when type is figure.
  items: [string]                  # Required (non-empty) when type is list.
  equation: string | null          # Required (non-empty) when type is equation.
  claimRefs: [C001]
```

## Figure types

```yaml
figureType: timeline | flow | decision-map | evidence-map | quadrant | positioning-map | bars | waterfall | heatmap | matrix | stack | layered-lens | bridge | journey-map | logic-chain | causal-map | sensitivity | scatter | funnel | cohort | range | scorecard | scenario-tree | dependency-map | other
figure.data fields: items | nodes | edges | points | columns | rows | series | layers | xAxis | yAxis
```

Universal rules:

- `data` is a structured YAML object — never Mermaid, SVG, prose diagrams, or stringified JSON.
- Only include the data fields the type requires; never add empty placeholder arrays.
- Every figure carries `id`, `title`, `type`, `layout`, `summary`, `data`, `claimRefs`. Add `approximationNotes` when values are derived/estimated.

| Type | When to use it | Required data | Key constraints |
|---|---|---|---|
| `timeline` | Dated events on one axis (milestones, releases, regulatory steps). | `items[]` | Each item has `date` + `label`. |
| `flow` | Linear or branching process flow. | `nodes[]` | Add `edges[]` to show direction; otherwise nodes render in declared order. |
| `decision-map` | Decision → option → outcome tree. | `nodes[]` (+ `edges[]` recommended) | Edges show option → outcome paths. |
| `evidence-map` | Source → claim relationships. | `nodes[]` (+ `edges[]` recommended) | Edges link sources to claims. |
| `scenario-tree` | Branching scenarios from one root. | `nodes[]` (+ `edges[]` recommended) | Edges define scenario branches. |
| `dependency-map` | Inputs → core dependency → impact. | `nodes[]` and `edges[]` (required) | Renderer stages by topological depth; without edges it collapses to one column. |
| `causal-map` | Cause → mechanism → outcome chains. | `nodes[]` and `edges[]` (required) | Renderer stages by topological depth; without edges it collapses to one column. |
| `quadrant` | Two-axis positioning of items. | `points[]` | Numeric `x`, `y`. |
| `positioning-map` | Competitive / market positioning. | `points[]` | Numeric `x`, `y`. Use ordinal 0–10 scoring when source-backed numbers don't exist. |
| `scatter` | Distribution of items across two metrics. | `points[]` or `series[]` | Numeric `x`, `y` per point. |
| `bars` | Compare quantities across categories. | `items[]` or `series[]` | Numeric `value` per item / series point. |
| `funnel` | Stage-by-stage conversion drop-off. | `items[]` or `series[]` | Order = stage order. |
| `waterfall` | Bridge from start to end via deltas. | `items[]` | Numeric `value`; mark totals via `kind: total`. |
| `range` | Low/base/high estimate per item. | `items[]` | Numeric `low`/`min` and `high`/`max`; optional `mid`/`value` numeric. |
| `sensitivity` | One driver shifting one outcome. | `series[]` | Numeric `value` per series point. |
| `heatmap` | Two-dim categorical grid colored by intensity. | `columns[]` + `rows[]` | `row.values.length === columns.length`; row label in `row.label`. |
| `matrix` | Two-dim grid with cell labels (capability, evidence quality, ordinal scoring). | `columns[]` + `rows[]` | Same row/column shape as heatmap. |
| `cohort` | Time-series retention only. | `columns[]` + `rows[]` | `columns[]` are time buckets (e.g. `month-1`, `month-3`, `year-1`); cells are retention percentages 0–100. Use `matrix` for ordinal scoring. |
| `stack` | Layered stack (tech stack, opportunity layers). | `layers[]` or `items[]` | Use `layers[]` when each layer has modules/outputs. |
| `layered-lens` | Sizing or segmentation viewed at multiple lenses. | `nodes[]` or `items[]` | One lens per layer (TAM/SAM/SOM, segment, geography). |
| `bridge` | Two-end connection through intermediate steps. | `nodes[]` or `items[]` | Provide ordered nodes; renderer reuses `flow`. |
| `journey-map` | Customer / user journey across surfaces. | `nodes[]` or `items[]` | Order = journey sequence. |
| `logic-chain` | Inference chain (premise → premise → conclusion). | `nodes[]` | Renderer chains nodes in declared order. |
| `scorecard` | Compact KPI / score grid. | `items[]` or `nodes[]` | Each entry has a `value` or `score` (use 0–10 ordinal scoring unless source-backed numbers exist). |
| `other` | Last resort. | none | Avoid; prefer a real type. |
