# Startup Diligence Report v2 Schema

Canonical schema and rendering contract for `startup-diligence-report-v2`.

The schema supports investor-grade startup diligence reports with claim-level evidence traceability and bilingual English / Simplified Chinese rendering.

## Required artifacts

English artifacts:

```text
01-company-snapshot.yaml
02-market-macro.yaml
03-competitive-benchmarking.yaml
04-financial-unit-economics.yaml
05-product-technology.yaml
06-customer-retention.yaml
07-risk-regulatory.yaml
08-investment-valuation.yaml
100-evidence-ledger.yaml
101-report-document.yaml
102-report-card.yaml
```

Required Simplified Chinese artifacts:

```text
01-company-snapshot.zh.yaml
02-market-macro.zh.yaml
03-competitive-benchmarking.zh.yaml
04-financial-unit-economics.zh.yaml
05-product-technology.zh.yaml
06-customer-retention.zh.yaml
07-risk-regulatory.zh.yaml
08-investment-valuation.zh.yaml
101-report-document.zh.yaml
102-report-card.zh.yaml
```

Notes:

- `100-evidence-ledger.yaml` has no Chinese sibling.
- Each analysis skill writes its English artifact and `.zh.yaml` sibling in one stage.
- `101-report-document.zh.yaml` is assembled by `startup-report-zh` from `101` plus `01`–`08.zh.yaml`.
- `102-report-card.zh.yaml` is translated by `startup-card-zh` from `102-report-card.yaml`.

## Execution contract

- The default agent runs the workflow through `.github/skills/`; do not delegate stages to other agents.
- Skills write complete YAML files directly under `reportFolder`.
- `/tmp` and terminal-output files are diagnostics only, never artifacts or handoff inputs.
- Agents must read this schema and `.github/references/yaml-syntax.md` before writing YAML artifacts.
- Skills that create local evidence or consolidate `100` must read `.github/references/evidence-ledger.md`.
- Skills read the minimum required dependency set. Downstream analysis skills use `01-company-snapshot.yaml` for identity; they read other upstream artifacts only when chapter logic needs them.
- Analysis skills record local evidence under `localEvidence`; `startup-ledger` runs `scripts/consolidate-evidence.mjs` to create canonical evidence and rewrite claim references.

## Artifact mapping

| File | `artifact` | Owner | Chapter |
|---|---|---|---|
| `01-company-snapshot.yaml` | `company-snapshot` | `startup-snapshot` | 1 — Startup Introduction & Company Snapshot |
| `02-market-macro.yaml` | `market-macro` | `startup-market` | 2 — Market Sizing & Macro Analysis |
| `03-competitive-benchmarking.yaml` | `competitive-benchmarking` | `startup-competition` | 3 — Competitive Benchmarking |
| `04-financial-unit-economics.yaml` | `financial-unit-economics` | `startup-financials` | 4 — Financial & Unit Economics |
| `05-product-technology.yaml` | `product-technology` | `startup-product` | 5 — Product & Technology |
| `06-customer-retention.yaml` | `customer-retention` | `startup-customers` | 6 — Customer & Retention |
| `07-risk-regulatory.yaml` | `risk-regulatory` | `startup-risks` | 7 — Risk & Regulatory |
| `08-investment-valuation.yaml` | `investment-valuation` | `startup-valuation` | 8 — Investment & Valuation |
| `100-evidence-ledger.yaml` | `evidence-ledger` | `startup-ledger` / consolidation script | n/a |
| `101-report-document.yaml` | `report-document` | `startup-report` | final rendered report |
| `101-report-document.zh.yaml` | `report-document` | `startup-report-zh` | Simplified Chinese report |
| `102-report-card.yaml` | `report-card` | `startup-card` | website index card |
| `102-report-card.zh.yaml` | `report-card` | `startup-card-zh` | Simplified Chinese index card |

## Shared conventions

- `schemaVersion: startup-diligence-report-v2`
- Every artifact starts with `schemaVersion`, `artifact`, `slug`, `runDate`, and `company`.
- `runDate` uses `YYYY-MM-DD`.
- `slug` is the stable company slug.
- `company.name` is consistent across all artifacts.
- `claimRefs` are local before consolidation and canonical after consolidation.
- Numeric KPI fields are numbers or `null`, never strings.
- Ranges belong in `displayValue`, `notes`, or `estimateBasis`.
- Use `null` for unknown optional values; do not omit required fields.
- `figureCount` and `tableCount` in `102-report-card.yaml` must match `101-report-document.yaml`.

## ID formats

- Sources: `S001`
- Claims: `C001`
- Figures: `F001`
- Tables: `T001`
- Appendices: `A`, `B`, `C`, ...

## Closed enums

Use exactly one allowed token. Do not append qualifiers, combine values with `/` or `;`, or use free text.

- `recommendation`: `strong-buy`, `buy`, `track`, `research-more`, `avoid`
- `confidence`: `high`, `medium`, `low`
- `riskRating`: `low`, `moderate`, `significant`, `critical`, `unknown`
- `valuationStance`: `attractive`, `fair`, `stretched`, `expensive`, `unknown`
- `evidenceQuality`: `high`, `medium`, `low`, `unknown`
- `claimType`: `observed`, `company-claimed`, `third-party-reported`, `estimated`, `inferred`, `open-question`, `conflicting`
- `freshness`: `current`, `recent`, `historical`, `unknown`
- `corroboration`: `single-source`, `multi-source`, `conflicting`, `none`
- `sourceType`: `official`, `filing`, `regulatory`, `tier-one-news`, `trade-press`, `analyst-market-data`, `technical-docs`, `customer-proof`, `partner-proof`, `developer-signal`, `review`, `legal`, `other`
- `reputationTier`: `high`, `medium`, `low`
- `independence`: `company`, `partner`, `customer`, `competitor`, `independent`, `unknown`

---

# Artifact schemas

## `100-evidence-ledger.yaml`

Generate only via `node scripts/consolidate-evidence.mjs <reportFolder>` after `01`–`08` exist.

Quality requirements:

- Retained sources span multiple source buckets when available.
- `coverage.sourcesRetained === sources.length`.
- `coverage.claimsCreated === claims.length`.
- Current-status claims prefer sources from the last 24 months.
- Repeated coverage of the same event is deduped.
- No single publisher/domain family should exceed 34% when alternatives exist.
- At least 15% of retained sources should be independent when possible.
- At most 50% of retained sources should be uncited by any claim.
- Retained URLs must be cited search results or directly fetched/reviewed pages.

```yaml
schemaVersion: startup-diligence-report-v2
artifact: evidence-ledger
slug: string
runDate: YYYY-MM-DD
company:
  name: string
coverage:
  sourcesConsidered: 0
  sourcesRetained: 0
  claimsCreated: 0
  sourceDiversityNotes: string|null
  deduplicationNotes: string|null
  recencyNotes: string|null
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
evidenceGaps:
  - gap: string
    impact: high|medium|low
    diligencePath: string|null
```

## Analysis artifacts `01`–`08`

Common pattern:

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
    type: timeline|flow|decision-map|evidence-map|quadrant|positioning-map|bars|waterfall|heatmap|matrix|stack|layered-lens|bridge|journey-map|logic-chain|causal-map|sensitivity|scatter|funnel|cohort|range|scorecard|scenario-tree|dependency-map|other
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

Rules:

- Each table row length must equal `columns.length`.
- Figures follow the rendering contracts below.
- Prefer semantic figure types over generic `flow`.
- Before consolidation, analysis artifacts may include `localEvidence`.
- Consolidation rewrites public `claimRefs` to canonical IDs and may remove `localEvidence`.

### Local evidence block

```yaml
localEvidence:
  coverage:
    sourcesConsidered: 0
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
  evidenceGaps:
    - gap: string
      impact: high|medium|low
      diligencePath: string|null
```

## `01-company-snapshot.yaml` addition

`01` follows the analysis artifact pattern and also includes `startupIntroduction`:

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

## `101-report-document.yaml`

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
    type: timeline|flow|decision-map|evidence-map|quadrant|positioning-map|bars|waterfall|heatmap|matrix|stack|layered-lens|bridge|journey-map|logic-chain|causal-map|sensitivity|scatter|funnel|cohort|range|scorecard|scenario-tree|dependency-map|other
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
    blocks:
      - type: paragraph|list|equation|callout|table|figure
        title: string|null
        body: string|null
        items: [string]
        tableRef: T001|null
        figureRef: F001|null
        claimRefs: [C001]
disclaimer: string
```

Appendix rules:

- Use appendices to preserve underwriting detail that would clutter chapters.
- Appendices must cite `claimRefs`.
- Do not invent unsupported detailed models; list them as diligence gaps.
- Do not duplicate source citations as a separate bibliography array; the website renders sources from `100`.

## Figure rendering contracts

The website renders figures from `type` plus structured `data`. Do not rely on `title` for renderer selection.

Global rules:

- Always include `id`, `title`, `type`, `layout`, `summary`, `data`, `approximationNotes`, and `claimRefs`.
- `data` is a structured object, not Markdown, Mermaid, SVG, prose, or JSON string.
- Use renderer-known canonical fields only: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`, plus axis labels where allowed.
- Do not invent primary fields such as `children`, `steps`, `cards`, `buckets`, `groups`, `components`, `name`, or `description`.
- Every visible item/node/layer/point/row has a human-readable `label` unless a stricter required field applies.
- Numeric chart coordinates and bar values are numbers; formatted text goes in `displayValue`.
- For missing metrics, keep a visual node/card with the gap in `detail`; do not leave required arrays empty.
- Allowed tones: `positive`, `neutral`, `opportunity`, `risk`, `low`, `medium`, `high`, `critical`.

Renderer-specific contracts:

- `timeline`: `data.items[]` with `date|label`, `label`, `detail`, optional `tone`. Company timelines should cover founding, priced rounds, product launches, operating-scale milestones, strategic deals, and material legal/governance/safety events. Aim for at least 8 entries and freshness within roughly 3 months of `currentDate` when public sources support it.
- `flow`: `data.nodes[]` and `data.edges[]` for generic causal/product/customer flows.
- `decision-map`: `data.nodes[]` and optional `data.edges[]` for decision trees or evaluation logic.
- `evidence-map`: `data.nodes[]` and optional `data.edges[]` for source-to-claim maps.
- `scenario-tree`: `data.nodes[]` and `data.edges[]` for bull/base/bear or milestone-dependent scenario paths.
- `dependency-map`: `data.nodes[]` and `data.edges[]` for critical suppliers, platforms, regulators, partners, customers, or single points of failure.
- `quadrant` / `positioning-map`: `data.points[]` with `label`, numeric `x`, numeric `y`, optional `tone`; include `data.xAxis` and `data.yAxis` when useful.
- `bars`: `data.items[]` or `data.series[0].points[]` with `label`, numeric `value`, optional `displayValue`, optional `tone`.
- `funnel`: ordered `data.items[]` or `data.series[0].points[]` with `label`, numeric `value`, optional `displayValue`, optional `tone`; use for stage conversion or sequential narrowing.
- `waterfall`: ordered `data.items[]` with signed numeric `value`, optional `displayValue`, optional `tone`.
- `range`: `data.items[]` with `label`, numeric `low` or `min`, numeric `high` or `max`, optional numeric `mid`, optional `displayValue`, optional `tone`.
- `heatmap` / `matrix`: `data.columns[]`; `data.rows[]` with `label` and `values[]`; `row.values.length === data.columns.length`. Do not include the row identifier as a first column.
- `cohort`: `data.columns[]`; `data.rows[]` with `label` and `values[]`; each value should include numeric `value` when retention/repeat rates are available and may include `label`/`displayValue`.
- `stack`: `data.layers[]` or `data.items[]` with `label`, `detail`, optional `tone`, optional `modules[]`, optional `outputs[]`.
- `layered-lens`: `data.nodes[]` or `data.items[]` from broad context to constrained footprint; do not invent unsupported values.
- `bridge`: `data.nodes[]` or `data.items[]` from an evidence-backed anchor through missing bridges to an underwriting output.
- `journey-map`: `data.nodes[]` or `data.items[]` from entry surface through segments, stages, or expansion loops.
- `logic-chain`: ordered `data.nodes[]` with `label`, `detail`, `tone`.
- `causal-map`: `data.nodes[]` and `data.edges[]`; causes, transmissions, and impacts are inferred by edge direction.
- `sensitivity`: `data.series[0].points[]` with `label`, numeric `value`, optional `displayValue`.
- `scatter`: `data.points[]` or `data.series[0].points[]` with `label`, numeric `x`, numeric `y`, optional `tone`; include axis labels when useful.
- `scorecard`: `data.items[]` or `data.nodes[]` with `label`, numeric or displayable `value`/`score`, optional `displayValue`, optional `detail`, optional `tone`.
- `other`: fallback only; avoid unless no semantic renderer fits.

Canonical examples:

```yaml
# timeline
data:
  items:
    - date: "2026-Q1"
      label: Event label
      detail: Evidence-backed description
      tone: positive

# flow / decision-map / evidence-map / causal-map / scenario-tree / dependency-map
data:
  nodes:
    - id: n1
      label: Node label
      detail: Node detail
      tone: neutral
  edges:
    - from: n1
      to: n2
      label: Optional edge label

# bars / funnel / waterfall
data:
  items:
    - label: Metric label
      value: 123.4
      displayValue: "$123.4M"
      tone: positive

# range
data:
  items:
    - label: Scenario label
      low: 120
      mid: 180
      high: 250
      displayValue: "$120M–$250M"
      tone: neutral

# quadrant / positioning-map / scatter
data:
  xAxis: X-axis label
  yAxis: Y-axis label
  points:
    - label: Company or item
      x: 75
      y: 60
      tone: neutral

# heatmap / matrix / cohort
data:
  columns: [Likelihood, Impact]
  rows:
    - label: Risk theme
      values:
        - label: Medium likelihood
          tone: medium
        - label: High impact
          tone: high

# stack
data:
  layers:
    - label: Layer label
      detail: Layer detail
      tone: neutral
      modules:
        - Module label
      outputs:
        - Output label

# card-like figure families
data:
  items:
    - label: Card label
      detail: Card detail
      tone: neutral

# scorecard
data:
  items:
    - label: Dimension label
      value: 4
      displayValue: "4 / 5"
      detail: Evidence-backed score rationale
      tone: positive

# sensitivity
data:
  series:
    - label: Scenario set
      points:
        - label: Scenario label
          value: 123
          displayValue: "123x"
```

## `102-report-card.yaml`

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
  reportDocument: 101-report-document.yaml
  reportCard: 102-report-card.yaml
```

---

# Validation expectations

A complete report run must satisfy all checks below.

## File presence and identity

- All required English and Simplified Chinese artifacts exist.
- Each file parses as YAML.
- Each file's `artifact` value matches the artifact mapping.
- `schemaVersion` is `startup-diligence-report-v2` everywhere.
- `runDate` uses `YYYY-MM-DD`.
- `company.name` is consistent across artifacts.
- `slug` is consistent across artifacts.

## Evidence and references

- Before consolidation, each analysis artifact's `claimRefs` point to its own `localEvidence.claims[]`.
- After consolidation, all `claimRefs` point to `100-evidence-ledger.yaml` claims.
- Claim `sourceRefs` point to retained ledger sources with valid provenance.
- Source and claim IDs use required formats and are unique in their ledgers.
- Every external factual claim traces to canonical evidence.

## Tables and figures

- Table row length equals column count.
- All `tableRef` / `figureRef` values in `101` exist.
- Figures are structured YAML specs rendered by native website components.
- No legacy diagram-source fields or diagram-language strings are used.
- Numeric chart values are numbers.
- Figure arrays required by the selected type are non-empty and contain labels/renderable content.

## Report card

- `102-report-card.yaml.reportFiles.reportDocument` points to `101-report-document.yaml`.
- `102-report-card.yaml.reportFiles.reportCard` points to `102-report-card.yaml`.
- `figureCount` and `tableCount` equal counts in `101-report-document.yaml`.
- Enum fields use exactly one allowed token.

## Simplified Chinese artifacts

- Each `.zh.yaml` preserves English `schemaVersion`, `artifact`, `slug`, `runDate`, IDs, enum values, numeric values, and array shape.
- Only prose is translated.
- `claim.statement` and `source.keyQuote` are preserved.
- Residual-English sweep passes for translatable fields.
- A report folder is complete only when all required English and Chinese artifacts exist.
