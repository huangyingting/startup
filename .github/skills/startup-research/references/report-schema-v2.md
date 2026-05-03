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
  id: T001
  title: string
  columns: [string]
  rows:
    - [string | number | null]
  notes: string | null
  claimRefs: [C001]

figure:
  id: F001
  title: string
  type: figureType
  layout: compact | standard | wide
  summary: string
  data: {}
  approximationNotes: string | null
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
figure.data fields: items | nodes | edges | points | columns | rows | series | layers | xAxis | yAxis
```

| Type | Required data |
|---|---|
| `timeline` | `items[]` |
| `flow` | `nodes[]` |
| `decision-map` | `nodes[]` |
| `evidence-map` | `nodes[]` |
| `scenario-tree` | `nodes[]` |
| `dependency-map` | `nodes[]` |
| `quadrant` | `points[]` |
| `positioning-map` | `points[]` |
| `scatter` | `points[]` or `series[]` |
| `bars` | `items[]` or `series[]` |
| `funnel` | `items[]` or `series[]` |
| `waterfall` | `items[]` |
| `range` | `items[]` |
| `sensitivity` | `series[]` |
| `heatmap` | `columns[]` and `rows[]` |
| `matrix` | `columns[]` and `rows[]` |
| `cohort` | `columns[]` and `rows[]` |
| `stack` | `layers[]` or `items[]` |
| `layered-lens` | `nodes[]` or `items[]` |
| `bridge` | `nodes[]` or `items[]` |
| `journey-map` | `nodes[]` or `items[]` |
| `logic-chain` | `nodes[]` |
| `causal-map` | `nodes[]` |
| `scorecard` | `items[]` or `nodes[]` |
| `other` | none |
