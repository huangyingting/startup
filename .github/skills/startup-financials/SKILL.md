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
- `04-financial-unit-economics.zh.yaml` (Simplified Chinese sibling)

## Dynamic evidence use

Use targeted web research and direct page reads for missing revenue, pricing, funding, valuation, margin, CAC, LTV, payback, burn, growth, or projection anchors. Register retained sources/claims in `04-financial-unit-economics.yaml.localEvidence` and cite local `claimRefs` in `04`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Mine official pricing, plans, marketplace listings, packaging, API docs, usage limits, funding/press releases, partner announcements, and monetized-product posts. Use them for revenue streams, pricing/packaging, funding chronology, and monetization mechanics. Official pricing is list pricing, not realized revenue or margin; corroborate company revenue, funding, and valuation claims independently when possible.

Treat `currentDate` as the freshness anchor for revenue, ARR/run-rate, pricing, funding, valuation, burn, margin, growth, and monetization claims. Use complete-sentence questions tied to the exact financial model component, for example: `What is the latest reported revenue run-rate, ARR, or annualized revenue estimate for <companyName> as of <currentDate>, and what sources corroborate or conflict with it?` Avoid keyword-only searches. Include at least one adverse query about losses, margin pressure, compute costs, customer concentration, or financing risk.

Before writing `04`, ask multiple financial questions covering revenue run-rate, ARR, mix, pricing, discounting, funding, valuation changes, margin, infrastructure cost, CAC, LTV, payback, burn, runway, concentration, and scenario anchors. If private metrics are unavailable, search for adjacent public anchors before recording `null` with a diligence ask.

If revenue, gross margin, CAC, LTV, retention, burn, payback, or customer concentration are not publicly supported, use `null` with exact diligence asks. Do not infer metrics without labeling estimates and confidence.

## Output focus

Structure this as an investor-grade financial chapter:

- Revenue model and revenue stream table.
- Detailed raw financial evidence retained in this artifact: public revenue anchors, pricing schedules, funding chronology, valuation changes, cost-driver evidence, conflicting estimates, unsupported unit-economics fields, scenario assumptions, and explicit recency notes.
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

## Simplified Chinese sibling

Immediately after writing `04-financial-unit-economics.yaml`, write `04-financial-unit-economics.zh.yaml` as its full Simplified Chinese translation, following `.github/references/zh-translation.md`. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field including `chapter.title`, `chapter.summary`, callouts, sections, table cells, figure node detail, and notes. Do not move on to the next skill until both English and Chinese files exist and pass the residual-English sweep and structural-parity checks.

## Handoff note

After writing, record a concise internal summary: output path, revenue quality, unit-economics verdict, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
