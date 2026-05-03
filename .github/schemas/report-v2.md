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
01-company-overview.yaml
02-market-analysis.yaml
03-competitors.yaml
04-financials.yaml
05-product-tech.yaml
06-customers.yaml
07-risks.yaml
08-valuation.yaml
90-evidence.yaml
91-full-report.yaml
92-summary-card.yaml
```

## Execution contract

- The default agent runs the workflow through `.github/skills/`; do not delegate stages to other agents.
- Skills write complete YAML files directly under `reportFolder`.
- `/tmp` and terminal-output files are diagnostics only, never artifacts or handoff inputs.
- Agents must read this schema and `.github/references/yaml-rules.md` before writing YAML artifacts.
- Skills that create local evidence must follow `.github/references/analysis-rules.md`.
- Skills read the minimum required dependency set. Downstream analysis skills use `01-company-overview.yaml` for identity; they read other upstream artifacts only when chapter logic needs them.
- Analysis skills record local evidence under `localEvidence`; `startup-evidence` runs `scripts/consolidate-evidence.mjs` to create canonical evidence and rewrite claim references.

## Artifact mapping

| File | `artifact` | Owner | Chapter |
|---|---|---|---|
| `01-company-overview.yaml` | `company-overview` | `startup-overview` | 1 — Startup Introduction & Company Overview |
| `02-market-analysis.yaml` | `market-analysis` | `startup-market-analysis` | 2 — Market Sizing & Market Analysis |
| `03-competitors.yaml` | `competitors` | `startup-competitors` | 3 — Competitors |
| `04-financials.yaml` | `financials` | `startup-financials` | 4 — Financials |
| `05-product-tech.yaml` | `product-tech` | `startup-product-tech` | 5 — Product & Technology |
| `06-customers.yaml` | `customers` | `startup-customers` | 6 — Customers |
| `07-risks.yaml` | `risks` | `startup-risks` | 7 — Risks |
| `08-valuation.yaml` | `valuation` | `startup-valuation` | 8 — Valuation |
| `90-evidence.yaml` | `evidence` | `startup-evidence` / consolidation script | n/a |
| `91-full-report.yaml` | `full-report` | `startup-full-report` | final rendered report |
| `92-summary-card.yaml` | `summary-card` | `startup-summary-card` | website index card |

## Shared conventions

- `schemaVersion: report-v2`
- Every artifact starts with `schemaVersion`, `artifact`, `slug`, `runDate`, and `company`.
- `runDate` uses `YYYY-MM-DD`.
- `slug` is the stable company slug.
- `company.name` is the only required company header field and is consistent across all artifacts.
- Company profile details such as website, sector, stage, founding year, headquarters, and description belong in the relevant analysis/report content when useful; they are not required artifact header fields.
- `claimRefs` are local before consolidation and canonical after consolidation.
- Numeric KPI fields are numbers or `null`, never strings.
- Ranges belong in `displayValue`, `notes`, or `estimateBasis`.
- Use `null` for unknown optional values; do not omit required fields.
- `figureCount` and `tableCount` in `92-summary-card.yaml` must match `91-full-report.yaml`.

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

## `90-evidence.yaml`

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
artifact: evidence
slug: string
runDate: YYYY-MM-DD
company:
  name: string
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
artifact: company-overview|market-analysis|competitors|financials|product-tech|customers|risks|valuation
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

## `91-full-report.yaml`

```yaml
schemaVersion: report-v2
artifact: full-report
slug: string
runDate: YYYY-MM-DD
company:
  name: string
reportMeta:
  title: string
  subtitle: string
  generatedAt: ISO-8601 string
  schemaVersion: report-v2
  recommendation: strong-buy|buy|track|research-more|avoid
  confidence: high|medium|low
  riskRating: low|moderate|significant|critical|unknown
  valuationStance: attractive|fair|stretched|expensive|unknown
  coverageNotes: string|null
coverMetrics:
  - label: string
    value: string
    numericValue: number|null
    unit: string|null
    claimRefs: [C001]
startupIntroduction:
  summary: string
  foundedDate: YYYY-MM-DD|null
  foundedYear: number|null
  founders:
    - name: string
      role: string|null
      background: string|null
      claimRefs: [C001]
  foundingLocation: string|null
  headquarters: string|null
  productSummary: string
  customerFocus: string|null
  businessModel: string|null
  stage: string|null
  fundingStatus: string|null
  claimRefs: [C001]
chapters:
  - number: number
    title: string
    sections:
      - number: string
        title: string|null
        blocks:
          - type: paragraph|callout|table|figure|list|equation
            title: string|null
            body: string|null
            calloutType: investment-recommendation|key-insight|opportunity|risk-alert|final-recommendation|null
            tableRef: T001|null
            figureRef: F001|null
            items: [string]
            equation: string|null
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
      - type: paragraph|callout|table|figure|list|equation
        title: string|null
        body: string|null
        calloutType: investment-recommendation|key-insight|opportunity|risk-alert|final-recommendation|null
        tableRef: T001|null
        figureRef: F001|null
        items: [string]
        equation: string|null
        claimRefs: [C001]
bibliography:
  sourceRefs: [S001]
disclaimer: string
```

## `92-summary-card.yaml`

```yaml
schemaVersion: report-v2
artifact: summary-card
slug: string
runDate: YYYY-MM-DD
company:
  name: string
title: string
subtitle: string
headline: string
recommendation: strong-buy|buy|track|research-more|avoid
confidence: high|medium|low
riskRating: low|moderate|significant|critical|unknown
valuationStance: attractive|fair|stretched|expensive|unknown
overallScore: number
sourceStats:
  sourcesRetained: number
  claimsReviewed: number
figureCount: number
tableCount: number
keyMetrics:
  valuationUsdM: number|null
  revenueRunRateUsdM: number|null
  arrUsdM: number|null
  revenueGrowthYoYPct: number|null
  grossMarginPct: number|null
  nrrPct: number|null
  totalRaisedUsdM: number|null
  customerCount: number|null
  headcount: number|null
topStrengths: [string]
topRisks: [string]
unresolvedGaps: [string]
reportFiles:
  fullReport: 91-full-report.yaml
  summaryCard: 92-summary-card.yaml
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
- After consolidation, all `claimRefs` point to `90-evidence.yaml` claims.
- `91-full-report.yaml` preserves upstream table/figure IDs unless omissions are listed in `reportMeta.coverageNotes`.
- `92-summary-card.yaml` counts match `91-full-report.yaml`.
- Website rendering and validator checks pass with `npm run validate`.