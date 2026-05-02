---
name: startup-financials
description: "Use when: generating 04-financial-unit-economics.yaml and 04-financial-unit-economics.zh.yaml. Keywords: revenue, pricing, unit economics, CAC, LTV, margins, burn, funding, projections."
user-invocable: false
---

# Startup Financials

Fourth analysis stage. Assess revenue quality, pricing, unit economics, funding, and scenario support.

## Read first

- `01-company-snapshot.yaml`
- `02-market-macro.yaml` and `03-competitive-benchmarking.yaml` when market, pricing, GTM, or competitor context affects interpretation.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `04-financial-unit-economics.yaml`
- `04-financial-unit-economics.zh.yaml`

## Focus

- Revenue streams and revenue mix evolution.
- Pricing/packaging, monetization mechanics, and partner economics.
- Public traction, growth, funding, valuation, burn, runway, and margin anchors.
- Unit economics: CAC, LTV, payback, gross margin, customer concentration, segment economics.
- Scenario/projection model only when defensible; otherwise record missing inputs.
- Margin expansion/compression drivers.

## Evidence targets

- Distinguish reported metrics, company-claimed pricing, independent estimates, funding/valuation events, and cost-driver evidence.
- Seek at least two credible sources for volatile revenue, valuation, burn, margin, customer concentration, infrastructure cost, or partner economics claims; otherwise state the single-source limitation.

## Section evidence acquisition

Use `web_search` to find public metrics, estimates, and conflicts; use `fetch-url` to review source pages before retaining numbers.

- Revenue/mix: run-rate, ARR, product/channel revenue, transaction volume, revenue-recognition concerns.
- Pricing/monetization: list pricing, token/seat/usage pricing, packaging, partner/channel fees.
- Funding/valuation: latest rounds, investor syndicate, secondary marks, rumored/preemptive rounds.
- Unit economics: CAC, LTV, gross margin, cloud cost, partner take rates, NRR, payback, burn, runway, concentration.
- Cost drivers: infrastructure commitments, cloud pricing, serving cost, automation leverage, pricing/regulatory pressure.
- Scenarios: source every numeric assumption; unsupported inputs become `null` plus diligence asks.

## Required tables and figures

- Revenue streams.
- Pricing/packaging.
- Public financial anchors.
- Partner/interchange/transaction economics when relevant.
- CAC/LTV/payback or explicit gap table.
- Margin/cost-driver bridge or scenario model.
- Preferred figures: `unit-economics-waterfall`, `waterfall`, `bars`, `metric-bars`, or `xy` with numeric values only.

## Completion check

- Official pricing is list pricing, not realized revenue or margin.
- Every `null` unit-economics field needs a specific diligence request.
- Scenario inputs must be labeled public, estimated, or unavailable.
- Handoff includes revenue quality and unit-economics verdict.
