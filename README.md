# Startup

Startup is an agent-driven research website for detailed reports on named startup companies. Specialist agents produce structured YAML artifacts, validation scripts verify them, and an Astro static site renders the reports.

## What it does

- Researches a user-provided startup company or official URL.
- Produces evidence-backed report artifacts under `reports/`.
- Renders reports as a fast static Astro website.
- Supports English and Simplified Chinese YAML reports.
- Includes search, filters, scorecards, market sizing, financial scenarios, and risk visuals.

## Report artifact flow

```text
Startup Research orchestrator
  ├─ Startup Report Evidence Analyst         → 00-report-brief.yaml, 01-evidence-ledger.yaml, 02-company-snapshot.yaml
  ├─ Startup Market and Competition Analyst  → 03-market-macro.yaml, 04-competitive-benchmarking.yaml
  ├─ Startup Financial and Product Analyst   → 05-financial-unit-economics.yaml, 06-product-technology.yaml, 07-customer-retention.yaml
  ├─ Startup Risk and Valuation Analyst      → 08-risk-regulatory.yaml, 09-investment-valuation.yaml
  ├─ Startup Report Writer                   → 10-report-document.yaml, 11-report-card.yaml
  └─ Startup Report Translator ZH            → 10-report-document.zh.yaml, 11-report-card.zh.yaml
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

Invoke the `Startup Research` agent with a named startup and optional URL, for example:

> Research Perplexity AI — official site https://www.perplexity.ai — deep report with Chinese translation.

The report should be written to `reports/<timestamp>-<company-slug>/` and will appear on the website after validation/build.

## Core files

- `reports/` — generated report folders and `_index.yaml` catalog.
- `.github/agents/research.agent.md` — main orchestrator.
- `scripts/build-reports-index.mjs` — rebuilds `reports/_index.yaml`.
- `scripts/check-company-dedup.mjs` — warns/skips duplicate company reports.
- `website/src/content/reports-loader.ts` — Astro content loader for report YAML.
- `website/scripts/check-reports.mjs` — report artifact validator.
