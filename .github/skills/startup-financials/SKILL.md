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
- Pricing/packaging and monetization mechanics.
- Publicly supported traction, growth, funding, and valuation anchors.
- Unit economics, CAC, LTV, LTV/CAC, payback, margin trajectory, and burn where supportable.
- Projection/scenario model only when defensible; otherwise document the missing inputs.

Expected table families unless unavailable with a documented gap: revenue streams, pricing/packaging, public financial anchors, CAC/LTV/payback, margin or cost-driver bridge, projection/scenario model, financial diligence asks.

## Figure rules

- Use `unit-economics-waterfall` for public-data-constrained economics bridges.
- Use `waterfall`, `bars`, or `metric-bars` only with numeric values.
- Preserve unknown metrics as explanatory nodes/cards rather than empty arrays.

## Handoff note

After writing, record a concise internal summary: output path, revenue quality, unit-economics verdict, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
