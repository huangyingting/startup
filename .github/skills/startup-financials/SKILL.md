---
name: startup-financials
description: "Use when: generating 04-financial-unit-economics.yaml. Keywords: revenue, pricing, unit economics, CAC, LTV, margins, burn, funding, projections, web_search."
user-invocable: false
---

# Startup Financials

Use this skill after `01`–`03` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, and relevant context from `02-market-macro.yaml` / `03-competitive-benchmarking.yaml` only when market boundaries, pricing, GTM, or competitor context affects financial interpretation.

## Outputs

Write exactly:

- `04-financial-unit-economics.yaml`

## Dynamic evidence use

You may use `web_search` directly to perform research for missing revenue, pricing, funding, valuation, margin, CAC, LTV, payback, burn, growth, or projection-anchor facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `04-financial-unit-economics.yaml.localEvidence`, then cite those local `claimRefs` in `04`.

Immediately after each `web_search` call, emit a visible run-log line, not YAML, using this shape: `[web_search debug] skill=startup-financials call=<n> query="<query>" citedUrls=<count> retainedSources=<count> outcome="<used|gap>"`. This debug line is only for the chat/workflow transcript and must not be written into report artifacts.

If revenue, gross margin, CAC, LTV, retention, burn, payback, or customer concentration are not publicly supported, use `null` with exact diligence asks. Do not infer metrics without labeling estimates and confidence.

## Output focus

Structure this as an investor-grade financial chapter:

- Revenue model and revenue stream table.
- Revenue mix evolution across historical and forecast periods when evidence or defensible assumptions support it.
- Revenue component economics, including payments/interchange, subscriptions/SaaS, float/interest, services, usage, marketplace, or other company-specific streams.
- If the company has payments/card exposure, analyze interchange economics, network/bank partner splits, transaction volume, gross-to-net revenue, and regulation sensitivity where supportable.
- Pricing/packaging and monetization mechanics.
- Publicly supported traction, growth, funding, and valuation anchors.
- Unit economics, CAC, LTV, LTV/CAC, payback, margin trajectory, burn, runway, customer concentration, and segment-level economics where supportable.
- Projection/scenario model only when defensible; include revenue, gross profit, gross margin, operating expenses, EBITDA, EBITDA margin, free cash flow, and key assumptions where supportable; otherwise document the missing inputs.
- Margin expansion or compression drivers, including mix shift, operating leverage, automation, pricing, infrastructure costs, partner economics, or regulatory pressure.

Expected table families unless unavailable with a documented gap: revenue streams, revenue mix evolution, pricing/packaging, public financial anchors, partner/interchange or transaction economics when relevant, CAC/LTV/payback by segment, margin or cost-driver bridge, projection/scenario model, detailed appendix-ready financial model, financial diligence asks.

## Figure rules

- Use `unit-economics-waterfall` for public-data-constrained economics bridges.
- Use `waterfall`, `bars`, `metric-bars`, or `xy` only with numeric values.
- Use revenue-mix and projection figures only when numeric values are supported or clearly labeled as estimates with claim-backed assumptions.
- Preserve unknown metrics as explanatory nodes/cards rather than empty arrays.

## Handoff note

After writing, record a concise internal summary: output path, revenue quality, unit-economics verdict, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
