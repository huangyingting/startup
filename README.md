# Startup

Startup generates evidence-backed diligence reports for named startup companies. The default Copilot agent follows `AGENTS.md`, calls workspace skills, writes structured YAML artifacts, and an Astro static site renders the reports.

## What it does

- Researches a user-provided startup company or official URL.
- Produces evidence-backed report artifacts under `reports/`.
- Renders reports as a fast static Astro website.
- Generates required English YAML reports.
- Includes search, filters, scorecards, market sizing, financial scenarios, and risk visuals.

## Report artifact flow

`startup-research` is the single workflow skill. It reads `.github/skills/startup-research/references/chapters.yaml`, runs each configured analysis chapter through the shared research/evidence/gate loop, then serially builds `90-evidence.yaml`, `91-full-report.yaml`, and `92-summary-card.yaml`.

```mermaid
flowchart TD
  Start([User: research company X]) --> Setup{new.mjs<br/>dedupe + create reports/&lt;ts&gt;-&lt;slug&gt;/}
  Setup -- exit 2: duplicate --> Stop([STOP unless refresh requested])
  Setup -- created --> Snapshot

  subgraph Stage1[Stage 1 — Configured analysis artifacts 01-08]
    Snapshot[startup-research + chapters.yaml<br/>writes 01.yaml]
    Snapshot --> Market

    Market[configured market-analysis<br/>writes 02.yaml] --> Compete
    Compete[configured competitors<br/>writes 03.yaml] --> Fin
    Fin[configured financials<br/>writes 04.yaml] --> Prod
    Prod[configured product-tech<br/>writes 05.yaml<br/>official-site mining → handoff note] --> Cust
    Cust[configured customers<br/>writes 06.yaml] --> Risk
    Risk[configured risks<br/>writes 07.yaml] --> Val
    Val[configured valuation<br/>writes 08.yaml]
  end

  Val --> Ledger

  subgraph Stage2[Stage 2 — Consolidate]
    Ledger[startup-research<br/>startup-research/scripts/ledger.mjs<br/>dedupes sources/claims → S### / C###<br/>rewrites 01-08 claimRefs<br/>writes 90-evidence.yaml]
  end

  Ledger --> Report

  subgraph Stage3[Stage 3 — Report assembly]
    Report[startup-research full-report assembly<br/>writes 91-full-report.yaml<br/>chapters 1-9 with ≤1 ref per table/figure;<br/>F102 milestone timeline ≥8 events]
    Report --> Card[startup-research summary-card assembly<br/>writes 92-summary-card.yaml<br/>derives from 90 + 91]
  end

  Card --> FinalVal

  subgraph Stage4[Stage 4 — Final validation]
    FinalVal[index.mjs<br/>+ website check-reports.mjs<br/>+ astro build]
  end

  FinalVal --> End([Done])
```

### Per-chapter dynamic gap loop

Every configured analysis chapter closes its own supportable gaps before writing. Volatile facts (funding, valuation, customer counts, releases, lawsuits) are anchored to `currentDate` and audited for freshness; if a query returns thin or stale results the workflow rewrites the question from another angle before declaring a gap.

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

Every artifact is constrained by chapter config, central schema rules, and build-time lints. Failures are rejected at build and pushed back to the source artifact rather than patched in `91`.

```mermaid
flowchart LR
  A[Chapter config<br/>startup-research/references/chapters.yaml] --> B[Schema rules<br/>startup-research/references/<br/>report-schema-v2.md]
  B --> C[Chapter readiness check<br/>startup-research/scripts/gate.mjs<br/>+ website/scripts/check-reports.mjs]
  C --> D{Pass?}
  D -- yes --> Ship([Astro build OK])
  D -- no --> Fix[Reject artifact<br/>fix at source<br/>then rerun ledger + report]
  Fix --> A
```

Lint coverage today:

- render-critical structure is checked at build time; business vocabulary such as recommendations, risk ratings, callout labels, and evidence labels is governed by `.github/skills/startup-research/references/report-schema-v2.md` plus chapter review rather than build-time enum checks.
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
- `.github/skills/startup-research/` — the single startup report workflow skill.
- `.github/skills/startup-research/references/chapters.yaml` — canonical chapter and artifact configuration.
- `.github/skills/startup-research/references/report-schema-v2.md` — canonical YAML schema and rendering contract.
- `.github/skills/startup-research/references/` — private YAML syntax, chapter config, and schema references for the workflow skill.
- `.github/skills/startup-research/scripts/index.mjs` — rebuilds `reports/_index.yaml`.
- `.github/skills/startup-research/scripts/new.mjs` — duplicate-risk check plus report folder creation.
- `.github/skills/startup-research/scripts/ledger.mjs` — dedupes per-artifact `localEvidence` into final `90-evidence.yaml`.
- `.github/skills/startup-research/scripts/gate.mjs` — chapter-scoped evidence, depth, table, and figure readiness check for `01`–`08` artifacts.
- `website/src/content/reports-loader.ts` — Astro content loader for report YAML.
- `website/scripts/check-reports.mjs` — rendering-contract validator (schema heads, figure contracts, refs, and card/report consistency).
