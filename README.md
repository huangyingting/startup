# Startup

Startup generates evidence-backed diligence reports for named startup companies. The default Copilot agent follows `AGENTS.md`, calls workspace skills, writes structured YAML artifacts, and an Astro static site renders the reports.

## What it does

- Researches a user-provided startup company or official URL.
- Produces evidence-backed report artifacts under `reports/`.
- Renders reports as a fast static Astro website.
- Generates required English YAML reports.
- Includes search, filters, scorecards, market sizing, financial scenarios, and risk visuals.

## Report artifact flow

Each analysis skill writes one English artifact. After all 8 analysis artifacts exist, `startup-evidence` consolidates evidence, `startup-full-report` synthesizes `91-full-report.yaml`, and `startup-summary-card` produces `92-summary-card.yaml`.

```mermaid
flowchart TD
  Start([User: research company X]) --> PreDedup{check-company-dedup.mjs<br/>--company / --website}
  PreDedup -- exit 2: duplicate --> Stop([STOP unless refresh requested])
  PreDedup -- exit 0 --> Setup[prepare-report-folder.mjs<br/>create reports/&lt;ts&gt;-&lt;slug&gt;/]
  Setup --> Snapshot

  subgraph Stage1[Stage 1 — Analysis artifacts 01-08]
    Snapshot[startup-overview<br/>writes 01.yaml]
    Snapshot --> Market

    Market[startup-market-analysis<br/>writes 02.yaml] --> Compete
    Compete[startup-competitors<br/>writes 03.yaml] --> Fin
    Fin[startup-financials<br/>writes 04.yaml] --> Prod
    Prod[startup-product-tech<br/>writes 05.yaml<br/>official-site mining → handoff note] --> Cust
    Cust[startup-customers<br/>writes 06.yaml] --> Risk
    Risk[startup-risks<br/>writes 07.yaml] --> Val
    Val[startup-valuation<br/>writes 08.yaml]
  end

  Val --> Ledger

  subgraph Stage2[Stage 2 — Consolidate]
    Ledger[startup-evidence<br/>scripts/consolidate-evidence.mjs<br/>dedupes sources/claims → S### / C###<br/>rewrites 01-08 claimRefs<br/>writes 90-evidence.yaml]
  end

  Ledger --> Report

  subgraph Stage3[Stage 3 — Report assembly]
    Report[startup-full-report<br/>writes 91-full-report.yaml<br/>chapters 1-9 with ≤1 ref per table/figure;<br/>F102 milestone timeline ≥8 events]
    Report --> Card[startup-summary-card<br/>writes 92-summary-card.yaml<br/>derives from 90 + 91]
  end

  Card --> FinalVal

  subgraph Stage4[Stage 4 — Final validation]
    FinalVal[build-reports-index.mjs<br/>+ check-reports-content.mjs<br/>+ website check-reports.mjs<br/>+ astro build]
  end

  FinalVal --> End([Done])
```

### Per-skill dynamic gap loop

Every analysis skill closes its own supportable gaps before writing. Volatile facts (funding, valuation, customer counts, releases, lawsuits) are anchored to `currentDate` and audited for freshness; if a query returns thin or stale results the skill rewrites the question from another angle before declaring a gap.

```mermaid
flowchart TD
  Plan[Inspect required tables, figures,<br/>metrics, downstream chapter needs] --> Search

  subgraph SearchLoop[Targeted research]
    Search[Multi-question search/discovery batch<br/>full-sentence queries tied to currentDate<br/>+ disconfirming/adverse queries]
    Search --> Site[Mine official site<br/>homepage / sitemap / docs / pricing /<br/>trust / status / blog / customer pages]
    Site --> Recency[Recency audit<br/>volatile facts must be ≤24mo<br/>or labeled freshness=historical]
  end

  Recency --> Decision{Evidence sufficient?}
  Decision -- yes --> Register["Register sources/claims in<br/>localEvidence.sources[] / claims[]<br/>cite local C### in artifact"]
  Decision -- thin/stale --> Rewrite[Rewrite query from another angle]
  Rewrite --> Search
  Decision -- truly unsupported --> Gap[Document in evidenceGaps<br/>with diligencePath]
  Gap --> Register

  Register --> Write[Write XX-name.yaml]
  Write --> Done([Hand off to next skill])
```

### Three-layer defence

Every artifact is constrained by skill requirements, central schema rules, and build-time lints. Failures are rejected at build and pushed back to the source artifact rather than patched in `91`.

```mermaid
flowchart LR
  A[Skill requirements<br/>.github/skills/*.md] --> B[Schema rules<br/>.github/references/<br/>report-schema-v2.md]
  B --> C[Build-time lints<br/>scripts/check-reports-content.mjs<br/>website/scripts/check-reports.mjs]
  C --> D{Pass?}
  D -- yes --> Ship([Astro build OK])
  D -- no --> Fix[Reject artifact<br/>fix at source<br/>then rerun ledger + report]
  Fix --> A
```

Lint coverage today:

- enum fields restricted to schema-defined values (`recommendation`, `confidence`, `riskRating`, `valuationStance`, `claimType`, `freshness`, `corroboration`, `sourceType`, `reputationTier`, `independence`).
- every table row has exactly `columns.length` cells.
- `matrix` / `heatmap` figures: each `row.values.length === data.columns.length` (row label lives in `row.label`, not in `columns[]`).
- each `tableRef` / `figureRef` is referenced from at most one chapter section or appendix block.
- F102 company milestone timeline must have ≥8 events covering founding, every priced round, major launches, scale milestones, partnerships, and governance/legal events.
- card `tableCount` / `figureCount` / `overallScore` match `91-full-report.yaml`.

### Required artifacts

```text
reports/<timestamp>-<slug>/
  ├─ 01-company-overview.yaml
  ├─ 02-market-analysis.yaml
  ├─ 03-competitors.yaml
  ├─ 04-financials.yaml
  ├─ 05-product-tech.yaml
  ├─ 06-customers.yaml
  ├─ 07-risks.yaml
  ├─ 08-valuation.yaml
  ├─ 90-evidence.yaml
  ├─ 91-full-report.yaml
  └─ 92-summary-card.yaml
```

## Local development

From the repo root:

```bash
npm install
npm --prefix website install
npm run validate
```

From `website/`:

```bash
npm run dev
npm run build
npm run preview
```

## Generate a report

Ask the default Copilot agent to run the Startup Research workflow with a company name and optional URL, for example:

> Research Perplexity AI — official site https://www.perplexity.ai.

The report should be written to `reports/<timestamp>-<company-slug>/` and will appear on the website after validation/build.

## Core files

- `reports/` — generated report folders and `_index.yaml` catalog.
- `AGENTS.md` — repo-wide agent operating rules; the full report workflow lives in `.github/skills/startup-research/SKILL.md`.
- `.github/skills/` — stage skills used by the workflow.
- `.github/references/report-schema-v2.md` — canonical YAML schema and rendering contract.
- `.github/references/` — shared YAML syntax and analysis rules.
- `scripts/build-reports-index.mjs` — rebuilds `reports/_index.yaml`.
- `scripts/check-company-dedup.mjs` — pre-stage duplicate-risk check for matching company names or domains.
- `scripts/consolidate-evidence.mjs` — dedupes per-artifact `localEvidence` into final `90-evidence.yaml`.
- `scripts/check-reports-content.mjs` — evidence coverage, source diversity, and content-depth checks.
- `website/src/content/reports-loader.ts` — Astro content loader for report YAML.
- `website/scripts/check-reports.mjs` — rendering-contract validator (schema heads, figure types, enums, refs).
