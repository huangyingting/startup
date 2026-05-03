# Report v2 schema

Canonical schema and rendering contract for `report-v2`.

The schema supports investor-grade English startup diligence reports with claim-level evidence traceability.

Machine-readable workflow and rendering registries live in:

- `scripts/report-manifest.mjs` — artifact list, analysis chapter order, owner skills, depth floors, and preferred figure types.
- `scripts/evidence-registry.mjs` — evidence enum values and extensible topic vocabulary used by ledger/source/claim validation.
- `scripts/figure-registry.mjs` — supported figure types, allowed figure data fields, required populated fields, and renderer-facing data contracts.

When this Markdown contract and a machine-readable registry disagree, update the registry first, then update this document and the relevant skill instructions.

## Required artifacts

Required artifacts:

```text
01-company-snapshot.yaml
02-market-macro.yaml
03-competitive-benchmarking.yaml
04-financial-unit-economics.yaml
05-product-technology.yaml
06-customer-retention.yaml
07-risk-regulatory.yaml
08-investment-valuation.yaml
90-evidence-ledger.yaml
91-report-document.yaml
92-report-card.yaml
```

## Execution contract

- The default agent runs the workflow through `.github/skills/`; do not delegate stages to other agents.
- Skills write complete YAML files directly under `reportFolder`.
- `/tmp` and terminal-output files are diagnostics only, never artifacts or handoff inputs.
- Agents must read this schema and `.github/references/yaml-rules.md` before writing YAML artifacts.
- Skills that create local evidence must follow `.github/references/analysis-rules.md`.
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
| `90-evidence-ledger.yaml` | `evidence-ledger` | `startup-ledger` / consolidation script | n/a |
| `91-report-document.yaml` | `report-document` | `startup-report` | final rendered report |
| `92-report-card.yaml` | `report-card` | `startup-card` | website index card |

## Shared conventions

- `schemaVersion: report-v2`
- Every artifact starts with `schemaVersion`, `artifact`, `slug`, `runDate`, and `company`.
- `runDate` uses `YYYY-MM-DD`.
- `slug` is the stable company slug.
- `company.name` is consistent across all artifacts.
- `claimRefs` are local before consolidation and canonical after consolidation.
- Numeric KPI fields are numbers or `null`, never strings.
- Ranges belong in `displayValue`, `notes`, or `estimateBasis`.
- Use `null` for unknown optional values; do not omit required fields.
- `figureCount` and `tableCount` in `92-report-card.yaml` must match `91-report-document.yaml`.

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
- `topic` / source `topics[]`: use the machine-readable vocabulary in `scripts/evidence-registry.mjs`; add domain-specific values there before using them in artifacts.

---

# Artifact schemas

## `90-evidence-ledger.yaml`

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
schemaVersion: report-v2
artifact: evidence-ledger
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string|null
  sector: string|null
  stage: string|null
  foundedYear: number|null
  headquarters: string|null
  shortDescription: string
coverage:
  sourcesConsidered: number
  sourcesRetained: number
  claimsCreated: number
  evidenceQuality: high|medium|low|unknown
  deduplicationNotes: string
  recencyNotes: string
sources:
  - id: S001
    publisher: string
    title: string
    url: string
    date: YYYY-MM-DD|null
    accessDate: YYYY-MM-DD
    sourceType: official|filing|regulatory|tier-one-news|trade-press|analyst-market-data|technical-docs|customer-proof|partner-proof|developer-signal|review|legal|other
    reputationTier: high|medium|low
    independence: company|partner|customer|competitor|independent|unknown
    topics: [identity]
    keyQuote: string|null
claims:
  - id: C001
    statement: string
    claimType: observed|company-claimed|third-party-reported|estimated|inferred|open-question|conflicting
    topic: identity
    sourceRefs: [S001]
    confidence: high|medium|low
    freshness: current|recent|historical|unknown
    corroboration: single-source|multi-source|conflicting|none
evidenceGaps:
  - topic: string
    missingEvidence: string
    whyItMatters: string
    diligencePath: string
```

## Analysis artifacts `01`–`08`

Before consolidation, analysis artifacts may include `localEvidence`.

```yaml
schemaVersion: report-v2
artifact: company-snapshot|market-macro|competitive-benchmarking|financial-unit-economics|product-technology|customer-retention|risk-regulatory|investment-valuation
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string|null
  sector: string|null
  stage: string|null
  foundedYear: number|null
  headquarters: string|null
  shortDescription: string
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
      - [string|number|null]
    notes: string|null
    claimRefs: [C001]
figures:
  - id: F001
    title: string
    type: timeline|flow|decision-map|evidence-map|quadrant|positioning-map|bars|waterfall|heatmap|matrix|stack|layered-lens|bridge|journey-map|logic-chain|causal-map|sensitivity|scatter|funnel|cohort|range|scorecard|scenario-tree|dependency-map|other
    layout: compact|standard|wide
    summary: string
    data:
      items: []
      nodes: []
      edges: []
      points: []
      columns: []
      rows: []
      series: []
      layers: []
      xAxis: string|null
      yAxis: string|null
    approximationNotes: string|null
    claimRefs: [C001]
callouts:
  - type: strength|watchout|gap|verdict|methodology|assumption
    title: string
    body: string
    claimRefs: [C001]
localEvidence:
  coverage:
    sourcesConsidered: number
  sources:
    - id: S001
      publisher: string
      title: string
      url: string
      date: YYYY-MM-DD|null
      accessDate: YYYY-MM-DD
      sourceType: official|filing|regulatory|tier-one-news|trade-press|analyst-market-data|technical-docs|customer-proof|partner-proof|developer-signal|review|legal|other
      reputationTier: high|medium|low
      independence: company|partner|customer|competitor|independent|unknown
      topics: [identity]
      keyQuote: string|null
  claims:
    - id: C001
      statement: string
      claimType: observed|company-claimed|third-party-reported|estimated|inferred|open-question|conflicting
      topic: identity
      sourceRefs: [S001]
      confidence: high|medium|low
      freshness: current|recent|historical|unknown
      corroboration: single-source|multi-source|conflicting|none
  evidenceGaps:
    - topic: string
      missingEvidence: string
      whyItMatters: string
      diligencePath: string
```

Notes:

- Before consolidation, analysis artifacts may include `localEvidence`.
- Consolidation rewrites public `claimRefs` to canonical IDs and may remove `localEvidence`.
- Do not include empty figure data arrays that are not used by the figure type.
- See `scripts/figure-registry.mjs` for figure data contracts.

## `91-report-document.yaml`

```yaml
schemaVersion: report-v2
artifact: report-document
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string|null
  sector: string|null
  stage: string|null
  foundedYear: number|null
  headquarters: string|null
  shortDescription: string
reportMeta:
  title: string
  subtitle: string
  generatedAt: ISO-8601 string
  schemaVersion: report-v2
  coverageNotes: string|null
executiveSummary:
  recommendation: strong-buy|buy|track|research-more|avoid
  confidence: high|medium|low
  riskRating: low|moderate|significant|critical|unknown
  valuationStance: attractive|fair|stretched|expensive|unknown
  thesis: string
  keyPoints: [string]
  keyMetrics:
    - label: string
      value: number|null
      unit: string|null
      displayValue: string|null
      estimateBasis: string|null
      claimRefs: [C001]
chapters:
  - number: number
    title: string
    summary: string
    blocks:
      - type: paragraph|tableRef|figureRef|callout|bulletList|metricGrid
        title: string|null
        body: string|null
        refId: string|null
        items: [string]
        metrics:
          - label: string
            value: number|null
            unit: string|null
            displayValue: string|null
            estimateBasis: string|null
            claimRefs: [C001]
        claimRefs: [C001]
tables:
  - id: T001
    title: string
    columns: [string]
    rows:
      - [string|number|null]
    notes: string|null
    claimRefs: [C001]
figures:
  - id: F001
    title: string
    type: timeline|flow|decision-map|evidence-map|quadrant|positioning-map|bars|waterfall|heatmap|matrix|stack|layered-lens|bridge|journey-map|logic-chain|causal-map|sensitivity|scatter|funnel|cohort|range|scorecard|scenario-tree|dependency-map|other
    layout: compact|standard|wide
    summary: string
    data: {}
    approximationNotes: string|null
    claimRefs: [C001]
appendices:
  - id: A
    title: string
    blocks:
      - type: paragraph|tableRef|figureRef|callout|bulletList|metricGrid
        title: string|null
        body: string|null
        refId: string|null
        items: [string]
        claimRefs: [C001]
bibliography:
  sourceRefs: [S001]
disclaimer: string
```

## `92-report-card.yaml`

```yaml
schemaVersion: report-v2
artifact: report-card
slug: string
runDate: YYYY-MM-DD
company:
  name: string
  website: string|null
  sector: string|null
  stage: string|null
  foundedYear: number|null
  headquarters: string|null
  shortDescription: string
title: string
subtitle: string
headline: string
recommendation: strong-buy|buy|track|research-more|avoid
confidence: high|medium|low
riskRating: low|moderate|significant|critical|unknown
valuationStance: attractive|fair|stretched|expensive|unknown
overallScore: number
sourceStats:
  sources: number
  claims: number
  evidenceQuality: high|medium|low|unknown
figureCount: number
tableCount: number
keyMetrics:
  - label: string
    value: number|null
    unit: string|null
    displayValue: string|null
    estimateBasis: string|null
topStrengths: [string]
topRisks: [string]
unresolvedGaps: [string]
reportFiles:
  reportDocument: 91-report-document.yaml
  reportCard: 92-report-card.yaml
```

## Figure contract

- Each figure must include `id`, `title`, `type`, `layout`, `summary`, `data`, `approximationNotes`, and `claimRefs`.
- Use only supported figure `type` values from `scripts/figure-registry.mjs`.
- Use only supported `data` fields: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`, `xAxis`, `yAxis`.
- Do not include empty placeholder arrays for unused data fields.

Renderer data contracts:

| Type | Required populated data | Notes |
|---|---|---|
| `timeline` | `items[]` | item: `date`, `label`, `detail`, optional `tone` |
| `flow` | `nodes[]` or `edges[]` | node/edge labels and descriptions |
| `decision-map` | `nodes[]` | decision nodes, tradeoffs, asks |
| `evidence-map` | `nodes[]` | evidence nodes with source strength |
| `scenario-tree` | `nodes[]` or `edges[]` | scenario branches and likelihood |
| `dependency-map` | `nodes[]` or `edges[]` | dependency nodes and edges |
| `quadrant` | `points[]` | Four-zone threshold matrix for high/low interpretation; `label`, numeric `x`, numeric `y`, optional `tone`; optional `xAxis`, `yAxis` |
| `positioning-map` | `points[]` | Competitive map; `label`, numeric `x`, numeric `y`, optional `tone`; optional `xAxis`, `yAxis` |
| `scatter` | `points[]` or `series[]` | numeric `x`, `y` |
| `bars` | `items[]` or `series[]` | numeric `value` |
| `funnel` | `items[]` or `series[]` | numeric `value` |
| `waterfall` | `items[]` | item: `label`, numeric `value` |
| `range` | `items[]` | numeric low/high bounds |
| `sensitivity` | `series[]` | numeric points |
| `heatmap` | `columns[]`, `rows[]` | row: `label`, `values[]`; `values.length === columns.length` |
| `matrix` | `columns[]`, `rows[]` | row: `label`, `values[]`; `values.length === columns.length` |
| `cohort` | `columns[]`, `rows[]` | row: `label`, `values[]`; `values.length === columns.length` |
| `stack` | `layers[]` or `items[]` | layered components |
| `layered-lens` | `nodes[]` or `items[]` | lens layers or constrained TAM/SAM/SOM |
| `bridge` | `nodes[]` or `items[]` | bridge components |
| `journey-map` | `nodes[]` or `items[]` | journey stages |
| `logic-chain` | `nodes[]` | reasoning chain |
| `causal-map` | `nodes[]` or `edges[]` | causal nodes/edges |
| `scorecard` | `items[]` or `nodes[]` | scored dimensions |
| `other` | none | Avoid unless renderer intentionally handles generic data |

## Validation expectations

- `schemaVersion` is `report-v2` everywhere.
- Required artifact filenames match `scripts/report-manifest.mjs`.
- Before consolidation, each analysis artifact's `claimRefs` point to its own `localEvidence.claims[]`.
- After consolidation, all `claimRefs` point to `90-evidence-ledger.yaml` claims.
- `91-report-document.yaml` preserves upstream table/figure IDs unless omissions are listed in `reportMeta.coverageNotes`.
- `92-report-card.yaml` counts match `91-report-document.yaml`.
- Website rendering and validator checks pass with `npm run validate`.