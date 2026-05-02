---
name: startup-financials
description: "Use when: generating 04-financial-unit-economics.yaml. Keywords: revenue, pricing, unit economics, CAC, LTV, margins, burn, funding, projections, web_search."
user-invocable: false
---

# Startup Financials

Run after `01`–`03` parse. Read `01-company-snapshot.yaml` for identity; read `02-market-macro.yaml` / `03-competitive-benchmarking.yaml` only when market boundaries, pricing, GTM, or competitor context affects financial interpretation. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `04-financial-unit-economics.yaml`
- `04-financial-unit-economics.zh.yaml`

## Chapter focus

- Revenue model and revenue stream table.
- Revenue mix evolution across historical and forecast periods when evidence or defensible assumptions support it.
- Revenue component economics by company-specific stream: payments/interchange, subscriptions/SaaS, float/interest, services, usage, marketplace, etc.
- For payments/card exposure: interchange economics, network/bank partner splits, transaction volume, gross-to-net revenue, regulation sensitivity where supportable.
- Pricing/packaging and monetization mechanics.
- Publicly supported traction, growth, funding, and valuation anchors.
- Unit economics: CAC, LTV, LTV/CAC, payback, margin trajectory, burn, runway, customer concentration, segment-level economics where supportable.
- Projection/scenario model only when defensible (revenue, gross profit, gross margin, OpEx, EBITDA, EBITDA margin, free cash flow, key assumptions); otherwise document the missing inputs.
- Margin expansion or compression drivers: mix shift, operating leverage, automation, pricing, infrastructure costs, partner economics, regulatory pressure.

## Expected table families

Revenue streams, revenue mix evolution, pricing/packaging, public financial anchors, partner/interchange or transaction economics when relevant, CAC/LTV/payback by segment, margin or cost-driver bridge, projection/scenario model, appendix-ready financial model, financial diligence asks.

## Source mix

Distinguish reported company metrics, company-claimed pricing/packaging, independent financial estimates, funding/valuation events, and cost-driver / margin-pressure evidence. For volatile metrics (revenue run-rate, valuation, burn, margins, customer concentration, infrastructure costs), seek corroboration from at least two credible sources or record the single-source limitation.

## Domain-specific query angles

- Official pricing is list pricing, not realized revenue or margin — corroborate company revenue, funding, and valuation claims independently.
- If private metrics are unavailable, search for adjacent public anchors (cloud commitments, partner take rates, hiring patterns, comparable disclosures) before recording `null`.
- Each `null` unit-economics field gets a specific diligence document request (audited financials, revenue by product/channel, cloud/partner contracts, cohort gross margin, CAC/payback by segment, customer concentration schedules).
- Scenario tables must state assumptions and label each input as public, estimated, or unavailable.

## Preferred figure types

- `unit-economics-waterfall` for public-data-constrained economics bridges.
- `waterfall`, `bars`, `metric-bars`, `xy` only with numeric values.
- Revenue-mix and projection figures only when numeric values are supported or clearly labeled as estimates with claim-backed assumptions.
- Preserve unknown metrics as explanatory nodes/cards rather than empty arrays.

## Handoff extras

Add `revenue quality` and `unit-economics verdict` to the standard handoff fields.
