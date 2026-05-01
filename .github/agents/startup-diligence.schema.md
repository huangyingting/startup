# Startup Diligence Report v2 Schema

The current generation schema is `startup-diligence-report-v2`. It is designed to produce a comprehensive VC due diligence report while preserving claim-level evidence traceability.

## Artifact list

```text
00-report-brief.yaml
01-evidence-ledger.yaml
02-company-snapshot.yaml
03-market-macro.yaml
04-competitive-benchmarking.yaml
05-financial-unit-economics.yaml
06-product-technology.yaml
07-customer-retention.yaml
08-risk-regulatory.yaml
09-investment-valuation.yaml
10-report-document.yaml
11-report-card.yaml
```

Optional Chinese files:

```text
10-report-document.zh.yaml
11-report-card.zh.yaml
```

## Agent execution contract

- Specialists must write complete YAML files directly to `reportFolder`.
- `/tmp` tool-output files are diagnostic logs only, never artifacts or handoff inputs.
- Specialists must read this schema and `yaml-syntax.md` before writing.
- Only `Startup Report Evidence Analyst` may use web research tools; downstream agents use `01-evidence-ledger.yaml` and `claimRefs`.

## Artifact mapping

| File | `artifact` | Owner | Chapter |
|---|---|---|---|
| `00-report-brief.yaml` | `report-brief` | Evidence Analyst | n/a |
| `01-evidence-ledger.yaml` | `evidence-ledger` | Evidence Analyst | n/a |
| `02-company-snapshot.yaml` | `company-snapshot` | Evidence Analyst | 1 — Startup Introduction & Company Snapshot |
| `03-market-macro.yaml` | `market-macro` | Market and Competition Analyst | 2 — Market Sizing & Macro Analysis |
| `04-competitive-benchmarking.yaml` | `competitive-benchmarking` | Market and Competition Analyst | 3 — Competitive Benchmarking |
| `05-financial-unit-economics.yaml` | `financial-unit-economics` | Financial and Product Analyst | 4 — Financial & Unit Economics |
| `06-product-technology.yaml` | `product-technology` | Financial and Product Analyst | 5 — Product & Technology |
| `07-customer-retention.yaml` | `customer-retention` | Financial and Product Analyst | 6 — Customer & Retention |
| `08-risk-regulatory.yaml` | `risk-regulatory` | Risk and Valuation Analyst | 7 — Risk & Regulatory |
| `09-investment-valuation.yaml` | `investment-valuation` | Risk and Valuation Analyst | 8 — Investment & Valuation |
| `10-report-document.yaml` | `report-document` | Report Writer | final rendered report |
| `11-report-card.yaml` | `report-card` | Report Writer | website index card |

## Shared conventions

- `schemaVersion: startup-diligence-report-v2`
- Every artifact starts with `schemaVersion`, `artifact`, `slug`, `runDate`, and `company`.
- `runDate: YYYY-MM-DD`
- `slug`: stable company slug.
- `company.name`: consistent in all YAML files.
- `claimRefs`: array of claim IDs from `01-evidence-ledger.yaml`.
- Numeric KPI fields are numbers or `null`, never strings.
- Ranges belong in `displayValue`, `notes`, or `estimateBasis`.
- ID formats: sources `S001`, claims `C001`, figures `F001`, tables `T001`.
- `figureCount` and `tableCount` in `11-report-card.yaml` must match `10-report-document.yaml`.
- Use `null` for unknown optional values; do not omit required fields.

## Core enums

- Recommendation: `strong-buy`, `buy`, `track`, `research-more`, `avoid`.
- Confidence: `high`, `medium`, `low`.
- Risk rating: `low`, `moderate`, `significant`, `critical`, `unknown`.
- Valuation stance: `attractive`, `fair`, `stretched`, `expensive`, `unknown`.
- Evidence quality: `high`, `medium`, `low`, `unknown`.
- Claim type: `observed`, `company-claimed`, `third-party-reported`, `estimated`, `inferred`, `open-question`, `conflicting`.

## `01-evidence-ledger.yaml`

```yaml
schemaVersion: startup-diligence-report-v2
artifact: evidence-ledger
slug: string
runDate: YYYY-MM-DD
company:
  name: string
coverage:
  depth: standard|deep
  sourceTarget: 30
  sourcesFetched: 0
  sourcesRetained: 0
  claimsCreated: 0
  coverageGaps: [string]
sources:
  - id: S001
    publisher: string
    title: string
    author: string|null
    date: YYYY-MM-DD|null
    accessDate: YYYY-MM-DD
    url: string
    sourceType: official|filing|regulatory|tier-one-news|trade-press|analyst-market-data|technical-docs|customer-proof|partner-proof|developer-signal|review|legal|other
    reputationTier: high|medium|low
    independence: company|partner|customer|competitor|independent|unknown
    fetchVerified: true
    keyQuote: string|null
    topics: [identity|team|market|customer|product|technology|traction|gtm|competition|financials|funding|risk|valuation|other]
claims:
  - id: C001
    statement: string
    claimType: observed|company-claimed|third-party-reported|estimated|inferred|open-question|conflicting
    topic: identity|team|market|customer|product|technology|traction|gtm|competition|financials|funding|risk|valuation|other
    sourceRefs: [S001]
    confidence: high|medium|low
    freshness: current|recent|historical|unknown
    corroboration: single-source|multi-source|conflicting|none
    notes: string|null
bibliography:
  - sourceRef: S001
    citation: string
evidenceGaps:
  - gap: string
    impact: high|medium|low
    diligencePath: string|null
```

## Section artifact pattern

Artifacts `02` through `09` use this common pattern:

```yaml
schemaVersion: startup-diligence-report-v2
artifact: market-macro
slug: string
runDate: YYYY-MM-DD
company:
  name: string
chapter:
  number: 2
  title: Market Sizing & Macro Analysis
  summary: string
callouts:
  - type: investment-recommendation|key-insight|opportunity|risk-alert|final-recommendation
    title: string
    body: string
    claimRefs: [C001]
tables:
  - id: T201
    title: string
    columns: [string]
    rows:
      - [string]
    notes: string|null
    claimRefs: [C001]
figures:
  - id: F201
    title: string
    type: timeline|flow|decision-map|evidence-map|quadrant|competitive-matrix|metric-bars|bars|waterfall|risk-heatmap|matrix|architecture-stack|stack|sensitivity|xy|other
    layout: compact|standard|wide
    summary: string|null
    data:
      items: []
      nodes: []
      edges: []
      points: []
      columns: []
      rows: []
      series: []
      layers: []
    approximationNotes: string|null
    claimRefs: [C001]
sections:
  - number: "2.1"
    title: string
    body: string
    claimRefs: [C001]
```

## `02-company-snapshot.yaml`

`02-company-snapshot.yaml` follows the section artifact pattern and must also include a startup introduction used at the beginning of the final report:

```yaml
startupIntroduction:
  summary: string
  foundedDate: YYYY-MM-DD|null
  foundedYear: 0|null
  founders:
    - name: string
      role: string|null
      background: string|null
      claimRefs: [C001]
  foundingLocation: string|null
  headquarters: string|null
  website: string|null
  productSummary: string
  customerFocus: string|null
  businessModel: string|null
  stage: string|null
  fundingStatus: string|null
  claimRefs: [C001]
```

## `10-report-document.yaml`

```yaml
schemaVersion: startup-diligence-report-v2
artifact: report-document
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string|null
  subtitle: string|null
reportMeta:
  title: string
  classification: string|null
  preparedBy: string|null
  contact: string|null
  generatedUsing: string|null
  recommendation: strong-buy|buy|track|research-more|avoid
  confidence: high|medium|low
  riskRating: low|moderate|significant|critical|unknown
  valuationStance: attractive|fair|stretched|expensive|unknown
coverMetrics:
  - label: string
    value: string
    numericValue: 0|null
    unit: string|null
    claimRefs: [C001]
startupIntroduction:
  summary: string
  foundedDate: YYYY-MM-DD|null
  foundedYear: 0|null
  founders:
    - name: string
      role: string|null
      background: string|null
      claimRefs: [C001]
  foundingLocation: string|null
  headquarters: string|null
  website: string|null
  productSummary: string
  customerFocus: string|null
  businessModel: string|null
  stage: string|null
  fundingStatus: string|null
  claimRefs: [C001]
chapters:
  - number: 1
    title: Executive Summary
    sections:
      - number: "1.1"
        title: Investment Highlights
        blocks:
          - type: paragraph|callout|table|figure|list|equation
            title: string|null
            body: string|null
            calloutType: investment-recommendation|key-insight|opportunity|risk-alert|final-recommendation|null
            tableRef: T101|null
            figureRef: F101|null
            items: [string]
            equation: string|null
            claimRefs: [C001]
figures:
  - id: F101
    title: string
    type: timeline|flow|decision-map|evidence-map|quadrant|competitive-matrix|metric-bars|bars|waterfall|risk-heatmap|matrix|architecture-stack|stack|sensitivity|xy|other
    layout: compact|standard|wide
    summary: string|null
    data:
      items: []
      nodes: []
      edges: []
      points: []
      columns: []
      rows: []
      series: []
      layers: []
    approximationNotes: string|null
    claimRefs: [C001]
tables:
  - id: T101
    title: string
    columns: [string]
    rows:
      - [string]
    notes: string|null
    claimRefs: [C001]
appendices:
  - id: A
    title: string
    blocks: []
bibliography:
  - sourceRef: S001
    citation: string
disclaimer: string
```

## `11-report-card.yaml`

```yaml
schemaVersion: startup-diligence-report-v2
artifact: report-card
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string|null
  sector: string|null
  stage: string|null
  foundedYear: 0|null
  headquarters: string|null
  shortDescription: string|null
title: string
subtitle: string|null
headline: string
recommendation: strong-buy|buy|track|research-more|avoid
confidence: high|medium|low
riskRating: low|moderate|significant|critical|unknown
valuationStance: attractive|fair|stretched|expensive|unknown
overallScore: 1.0
sourceStats:
  sourcesRetained: 0
  claimsReviewed: 0
figureCount: 0
tableCount: 0
keyMetrics:
  valuationUsdM: 0|null
  revenueRunRateUsdM: 0|null
  arrUsdM: 0|null
  revenueGrowthYoYPct: 0|null
  grossMarginPct: 0|null
  nrrPct: 0|null
  totalRaisedUsdM: 0|null
  customerCount: 0|null
  headcount: 0|null
topStrengths: [string]
topRisks: [string]
unresolvedGaps: [string]
reportFiles:
  reportDocument: 10-report-document.yaml
  reportCard: 11-report-card.yaml
```

## Validation expectations

- All YAML parses.
- All required v2 artifacts exist for complete runs.
- Each file's `artifact` value matches the artifact mapping.
- `runDate` uses `YYYY-MM-DD` and `company.name` is consistent across artifacts.
- All `claimRefs` point to `01-evidence-ledger.yaml` claims.
- All claim `sourceRefs` point to fetched sources.
- Source, claim, figure, and table IDs use the required formats and are unique within their ledgers.
- All figure/table references in `10-report-document.yaml` exist.
- `11-report-card.yaml.reportFiles` points to `10-report-document.yaml` and `11-report-card.yaml`.
- Figures are stored as structured YAML specs in `10-report-document.yaml` and rendered by native website components.
- Do not use legacy diagram-source fields or diagram-language strings in artifacts. Use `type`, `layout`, and typed `data` arrays instead.
