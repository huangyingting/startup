# Startup Diligence Report v2 Schema

The current generation schema is `startup-diligence-report-v2`. It is designed to produce a comprehensive VC due diligence report while preserving claim-level evidence traceability.

## Artifact list

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

Required Simplified Chinese files (must ship with every report):

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

Each `XX-name.zh.yaml` is the Simplified Chinese sibling of `XX-name.yaml`. The owning analysis skill (`startup-snapshot` through `startup-valuation`) writes both files in the same pass, following `.github/references/zh-translation.md`. `101-report-document.zh.yaml` is assembled by `startup-report-zh` from those siblings plus `101-report-document.yaml`. `102-report-card.zh.yaml` is translated by `startup-card-zh` from `102-report-card.yaml`. `100-evidence-ledger.yaml` has no separate Chinese sibling.

## Agent execution contract

- The default Copilot agent runs the `AGENTS.md` Startup Research workflow through `.github/skills/`; report stages are not delegated to other agents.
- Skills must write complete YAML files directly to `reportFolder`.
- `/tmp` tool-output files are diagnostic logs only, never artifacts or handoff inputs.
- The default agent must read this schema and `.github/references/yaml-syntax.md` before writing.
- Skills that create local evidence or consolidate `100-evidence-ledger.yaml` must read `.github/references/evidence-ledger.md`.
- Skills read their minimum dependency set rather than mechanically reading every prior artifact. Downstream analysis skills use `01-company-snapshot.yaml` for identity once available; domain skills read additional upstream artifacts only when needed for their own chapter logic.
- `web_search` is available throughout the workflow and may be used by analysis skills when chapter data is missing. Analysis skills write local `sources[]` / `claims[]` under their artifact's `localEvidence`; `startup-ledger` then runs `scripts/consolidate-evidence.mjs` to deduplicate sources/claims, create `100-evidence-ledger.yaml`, and rewrite final `claimRefs`.

## Artifact mapping

| File | `artifact` | Owner | Chapter |
|---|---|---|---|
| `100-evidence-ledger.yaml` | `evidence-ledger` | `startup-ledger` via `scripts/consolidate-evidence.mjs` after `01`–`08` | n/a |
| `01-company-snapshot.yaml` | `company-snapshot` | `startup-snapshot` skill | 1 — Startup Introduction & Company Snapshot |
| `02-market-macro.yaml` | `market-macro` | `startup-market` skill | 2 — Market Sizing & Macro Analysis |
| `03-competitive-benchmarking.yaml` | `competitive-benchmarking` | `startup-competition` skill | 3 — Competitive Benchmarking |
| `04-financial-unit-economics.yaml` | `financial-unit-economics` | `startup-financials` skill | 4 — Financial & Unit Economics |
| `05-product-technology.yaml` | `product-technology` | `startup-product` skill | 5 — Product & Technology |
| `06-customer-retention.yaml` | `customer-retention` | `startup-customers` skill | 6 — Customer & Retention |
| `07-risk-regulatory.yaml` | `risk-regulatory` | `startup-risks` skill | 7 — Risk & Regulatory |
| `08-investment-valuation.yaml` | `investment-valuation` | `startup-valuation` skill | 8 — Investment & Valuation |
| `101-report-document.yaml` | `report-document` | `startup-report` skill | final rendered report |
| `102-report-card.yaml` | `report-card` | `startup-card` skill | website index card |
| `101-report-document.zh.yaml` | `report-document` | `startup-report-zh` skill | Simplified Chinese report |
| `102-report-card.zh.yaml` | `report-card` | `startup-card-zh` skill | Simplified Chinese report card |

## Shared conventions

- `schemaVersion: startup-diligence-report-v2`
- Every artifact starts with `schemaVersion`, `artifact`, `slug`, `runDate`, and `company`.
- `runDate: YYYY-MM-DD`
- `slug`: stable company slug.
- `company.name`: consistent in all YAML files.
- `claimRefs`: before consolidation, IDs from the same artifact's `localEvidence.claims[]`; after consolidation, canonical claim IDs from `100-evidence-ledger.yaml`.
- Numeric KPI fields are numbers or `null`, never strings.
- Ranges belong in `displayValue`, `notes`, or `estimateBasis`.
- ID formats: sources `S001`, claims `C001`, figures `F001`, tables `T001`.
- `figureCount` and `tableCount` in `102-report-card.yaml` must match `101-report-document.yaml`.
- Use `null` for unknown optional values; do not omit required fields.

## Core enums

- Recommendation: `strong-buy`, `buy`, `track`, `research-more`, `avoid`.
- Confidence: `high`, `medium`, `low`.
- Risk rating: `low`, `moderate`, `significant`, `critical`, `unknown`.
- Valuation stance: `attractive`, `fair`, `stretched`, `expensive`, `unknown`.
- Evidence quality: `high`, `medium`, `low`, `unknown`.
- Claim type: `observed`, `company-claimed`, `third-party-reported`, `estimated`, `inferred`, `open-question`, `conflicting`.

## `100-evidence-ledger.yaml`

`100-evidence-ledger.yaml` is a final consolidated artifact. Do not incrementally append to it from analysis skills. Generate it after `01`–`08` exist by running `node scripts/consolidate-evidence.mjs <reportFolder>`, then use the canonical `S###` / `C###` IDs for `101` and `102`.

Evidence ledger quality requirements:

- Source breadth: retained sources should span multiple independent source buckets whenever available, including official/company material, startup or business news, independent third-party databases/analyst sources, customer or partner proof, regulatory/legal/filing sources, and technical/product documentation.
- Coverage semantics: `coverage.sourcesConsidered` counts unique cited/annotated `web_search` candidates plus directly fetched pages reviewed before retention. `coverage.sourcesRetained` must equal the number of retained `sources[]` entries; `coverage.claimsCreated` must equal `claims.length`. Coverage is sufficient when downstream chapter claims are supported or unsupported facts are documented in `evidenceGaps`.
- Source recency: claims about current company status, funding, valuation, customers, revenue scale, headcount, product packaging, pricing, and regulatory posture should prefer sources from the last 24 months. Older sources are acceptable for durable historical facts and should normally support claims marked `freshness: historical`.
- Source deduplication: repeated coverage of the same underlying event does not equal independent evidence. Cluster sources by event/topic/date and retain only sources that add original facts, primary quotes, independent confirmation, or materially different interpretation.
- Query iteration: the evidence process should vary search queries by company name, product names, founders, investors, competitors, customers, market category, geography, funding/valuation terms, product/security terms, regulatory/legal terms, reviews, hiring, and negative/disconfirming angles.
- Concentration control: no single publisher/domain family should exceed 34% of retained sources; at least 15% of retained sources should be `independence: independent`; at most 50% of retained sources should be uncited by any claim. Treat repeated press-release or wire-copy coverage as one event group, not independent corroboration. Document a coverage gap when independent coverage is unavailable.
- Source provenance: retained URLs must come from cited/annotated `web_search` results or directly fetched pages reviewed from a known URL, sitemap, navigation path, or cited source. Do not retain generic Bing/search-result URLs or unreviewed inferred URLs. If annotation spans are empty or malformed, do not invent `keyQuote`; use `null` and run targeted follow-up searches or direct page reads for important facts.

```yaml
schemaVersion: startup-diligence-report-v2
artifact: evidence-ledger
slug: string
runDate: YYYY-MM-DD
company:
  name: string
coverage:
  sourcesConsidered: 0 # unique web_search candidates plus directly fetched pages reviewed before retention, after canonical URL dedupe
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
    keyQuote: string|null # concise cited answer span or null if no reliable quote/snippet was returned
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

## Section artifact pattern

Artifacts `01` through `08` use this common pattern:

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
    columns: [string] # each row in `rows` must have exactly columns.length cells
    rows:
      - [string]
    notes: string|null
    claimRefs: [C001]
figures:
  - id: F201
    title: string
    type: timeline|flow|decision-map|evidence-map|quadrant|competitive-matrix|metric-bars|bars|waterfall|risk-heatmap|matrix|architecture-stack|market-sizing-lens|unit-economics-waterfall|customer-surface-map|recommendation-logic|risk-transmission-map|stack|sensitivity|xy|other
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

Section artifacts must use the same figure rendering contracts listed under `101-report-document.yaml` below. Prefer the most semantic figure type available instead of generic `flow`.

### Local evidence in `01`–`08`

Analysis artifacts may include a temporary `localEvidence` block before final consolidation. Local IDs are scoped to the artifact file and may repeat across skills. The consolidation script rewrites all public `claimRefs` to canonical ledger IDs and may remove `localEvidence` from final artifacts.

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

## `01-company-snapshot.yaml`

`01-company-snapshot.yaml` follows the section artifact pattern and must also include a startup introduction used at the beginning of the final report:

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
    value: string # display string, e.g. "$157B post-money" or "1.0M"
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
    type: timeline|flow|decision-map|evidence-map|quadrant|competitive-matrix|metric-bars|bars|waterfall|risk-heatmap|matrix|architecture-stack|market-sizing-lens|unit-economics-waterfall|customer-surface-map|recommendation-logic|risk-transmission-map|stack|sensitivity|xy|other
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
```

### Figure rendering contracts

The website renders figures automatically from `type` plus structured `data`. Agents must select the most semantic `type`; do not rely on `title` text for renderer selection. Prefer domain-specific figure types (`market-sizing-lens`, `unit-economics-waterfall`, `customer-surface-map`, `architecture-stack`, `risk-transmission-map`, `recommendation-logic`) over generic `flow`, `decision-map`, or `waterfall` when their contract fits the intended figure.

Global rules for every figure:

- Always include `id`, `title`, `type`, `layout`, `summary`, `data`, `approximationNotes`, and `claimRefs`.
- `data` must be a structured object, not Markdown, Mermaid, SVG, prose, or a JSON string.
- Use only renderer-known canonical fields listed below. Do not invent primary fields such as `children`, `steps`, `cards`, `buckets`, `groups`, `components`, `name`, or `description` unless the contract explicitly allows them as secondary compatibility fields.
- Every visible item/node/layer/point/row must include a human-readable `label` unless a more specific required label field is listed.
- Numeric chart coordinates and bar values must be numbers, not strings. Put formatted display text in `displayValue`.
- For any missing metric, keep the visual node/card and explain the gap in `detail`; do not delete the whole figure or leave empty arrays.
- Allowed tones: `positive`, `neutral`, `opportunity`, `risk`, `low`, `medium`, `high`, `critical`. Use `risk/high/critical` for downside cells and `positive/low` for favorable cells.

- `timeline`: `data.items[]` with `date|label`, `label`, `detail`, optional `tone`. A company milestone timeline must cover founding, every priced funding round in chronological order, major product/platform launches, operating-scale milestones once disclosed (first $X run-rate, first Fortune-N customer), strategic compute/partner deals, and material legal/governance/safety events. Aim for at least 8 entries and avoid gaps of more than ~18 months between consecutive events when an intermediate event is publicly known. Extend the timeline to within ~3 months of `currentDate`; record any unfilled milestone gap in `evidenceGaps`.
- `flow`: `data.nodes[]` and `data.edges[]`; use for generic causal/product/customer flows.
- `decision-map`: `data.nodes[]` and optional `data.edges[]`; use for decision trees or evaluation logic when `recommendation-logic` is not specific enough.
- `evidence-map`: `data.nodes[]` and optional `data.edges[]`; use for evidence/source-to-claim maps.
- `quadrant` / `competitive-matrix`: `data.points[]` with `label`, numeric `x`, numeric `y`, optional `tone`; include `data.xAxis` and `data.yAxis` labels when useful.
- `metric-bars` / `bars`: `data.items[]` or `data.series[0].points[]` with `label`, numeric `value`, optional `displayValue`, optional `tone`.
- `waterfall`: `data.items[]` in sequence with signed numeric `value`, optional `displayValue`, optional `tone`.
- `risk-heatmap` / `matrix`: `data.columns[]`; `data.rows[]` with `label` and `values[]`; each value may include `label` and `tone: low|medium|high|critical|risk`. The renderer treats `data.columns[]` as the X-axis label per value column and `row.label` as the Y-axis label, so **`row.values.length` must equal `data.columns.length`** (one value per column). Do not declare a column for the row name itself; do not include the row identifier as the first column.
- `architecture-stack`: `data.layers[]` with `label`, `detail`, optional `tone`, optional `modules[]`, optional `outputs[]`. Use canonical `label/modules` fields; do not emit `name/components` as the primary shape.
- `market-sizing-lens`: `data.nodes[]` or `data.items[]` ordered from broad market to served footprint; use for TAM/SAM/SOM or evidence-constrained market sizing where unsupported dollar values should not be invented. Typical labels are `TAM`, `SAM`, and `SOM`; each node has `label`, `detail`, and optional `tone`.
- `unit-economics-waterfall`: `data.nodes[]` or `data.items[]` ordered from known public anchor through missing unit-economics bridges to underwriting output; use when the report must show where public pricing/adoption evidence stops before gross margin, CAC, LTV/CAC, or payback can be calculated. First node should be the disclosed/list-price anchor; later nodes should identify unknown bridges or blockers.
- `customer-surface-map`: `data.nodes[]` or `data.items[]` ordered from customer acquisition surface through major customer segments and expansion loops; use for consumer / enterprise / developer / ecosystem surface maps. First node should be the broad entry surface; later nodes should be segment or expansion cards.
- `recommendation-logic`: `data.nodes[]` ordered from evidence/constraint to final recommendation; each node has `label`, `detail`, `tone`.
- `risk-transmission-map`: `data.nodes[]` and `data.edges[]`; nodes with no incoming edges render as risk sources, nodes with both incoming and outgoing edges render as transmission pressure, nodes with no outgoing edges render as underwriting impact.
- `stack`: `data.layers[]` or `data.items[]` with `label`, `detail`, optional `tone`.
- `sensitivity`: `data.series[0].points[]` with `label`, numeric `value`, optional `displayValue`.
- `xy`: `data.points[]` or `data.series[0].points[]` with `label`, numeric `x`, numeric `y`, optional `tone`; include axis labels when useful.
- `other`: fallback only; avoid unless no semantic renderer fits.

Canonical field examples by renderer family:

```yaml
# timeline
data:
  items:
    - date: "2026-Q1"
      label: Event label
      detail: Evidence-backed description
      tone: positive

# flow / decision-map / evidence-map / risk-transmission-map
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

# bars / metric-bars / waterfall
data:
  items:
    - label: Metric label
      value: 123.4
      displayValue: "$123.4M"
      tone: positive

# quadrant / competitive-matrix / xy
data:
  xAxis: X-axis label
  yAxis: Y-axis label
  points:
    - label: Company or item
      x: 75
      y: 60
      tone: neutral

# risk-heatmap / matrix
data:
  columns: [Likelihood, Impact]
  rows:
    - label: Risk theme
      values:
        - label: Medium likelihood
          tone: medium
        - label: High impact
          tone: high

# architecture-stack
data:
  layers:
    - label: Layer label
      detail: Layer detail
      tone: neutral
      modules:
        - Module label
      outputs:
        - Output label

# market-sizing-lens / unit-economics-waterfall / customer-surface-map / recommendation-logic / stack
data:
  items:
    - label: Card label
      detail: Card detail
      tone: neutral

# sensitivity
data:
  series:
    - label: Scenario set
      points:
        - label: Scenario label
          value: 123
          displayValue: "123x"
```

The remainder of `101-report-document.yaml` continues as:

```yaml
tables:
  - id: T101
    title: string
    columns: [string] # each row in `rows` must have exactly columns.length cells
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

Appendix guidance: use appendices to preserve underwriting detail that would clutter the main narrative but should not be lost, such as detailed financial/projection models, competitive feature deep dives, management-team notes, investor-base notes, source caveats, and unresolved diligence gaps. Appendices must still cite `claimRefs`; if a detailed model is not evidence-supported, include the requested model as a diligence gap rather than inventing values. Source citations are rendered from `100-evidence-ledger.yaml` `sources[]` directly; do not duplicate them as a `bibliography` array on `101-report-document.yaml`.

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

## Validation expectations

- All YAML parses.
- All required v2 artifacts exist for complete runs, including `01-08.zh.yaml`, `101-report-document.zh.yaml`, and `102-report-card.zh.yaml`.
- For each `XX-name.yaml` analysis artifact, `XX-name.zh.yaml` exists, parses, has the same `schemaVersion`, `artifact`, `slug`, `runDate`, IDs, and array shape as the English file. Only prose is translated; numbers, IDs, claim/source IDs, enums, claim `statement`, and source `keyQuote` are preserved.
- Each file's `artifact` value matches the artifact mapping.
- `runDate` uses `YYYY-MM-DD` and `company.name` is consistent across artifacts.
- Before consolidation, each artifact's `claimRefs` point to its own `localEvidence.claims[]`; after consolidation, all `claimRefs` point to `100-evidence-ledger.yaml` claims.
- All claim `sourceRefs` point to retained ledger sources with valid provenance: cited/annotated `web_search` result or directly fetched reviewed page.
- Source, claim, figure, and table IDs use the required formats and are unique within their ledgers.
- All figure/table references in `101-report-document.yaml` exist.
- `102-report-card.yaml.reportFiles` points to `101-report-document.yaml` and `102-report-card.yaml`.
- Figures are stored as structured YAML specs in `101-report-document.yaml` and rendered by native website components.
- Do not use legacy diagram-source fields or diagram-language strings in artifacts. Use `type`, `layout`, and typed `data` arrays instead.
- ZH artifacts must preserve the English `schemaVersion`, `artifact`, `slug`, `runDate`, enums, IDs, figure/table structure, and numeric values. Only prose is translated.
- A report folder is `complete` only when both English and Simplified Chinese required artifacts exist; the website index and loader skip incomplete folders.
- Enum fields must use exactly one allowed token from the list in `## Core enums`. Do not invent values, append qualifiers, combine multiple values with `;` or `/`, or use free-text descriptions. The website content schema rejects any other value and the build will fail. Closed enums:
  - `recommendation`: `strong-buy` | `buy` | `track` | `research-more` | `avoid`
  - `confidence`: `high` | `medium` | `low`
  - `riskRating`: `low` | `moderate` | `significant` | `critical` | `unknown`
  - `valuationStance`: `attractive` | `fair` | `stretched` | `expensive` | `unknown`
  - `claimType`: `observed` | `company-claimed` | `third-party-reported` | `estimated` | `inferred` | `open-question` | `conflicting`
  - `freshness`: `current` | `recent` | `historical` | `unknown`
  - `corroboration`: `single-source` | `multi-source` | `conflicting` | `none`
  - `sourceType`: `official` | `filing` | `regulatory` | `tier-one-news` | `trade-press` | `analyst-market-data` | `technical-docs` | `customer-proof` | `partner-proof` | `developer-signal` | `review` | `legal` | `other`
  - `reputationTier`: `high` | `medium` | `low`
  - `independence`: `company` | `partner` | `customer` | `competitor` | `independent` | `unknown`
