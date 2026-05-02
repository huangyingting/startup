---
name: startup-market
description: "Use when: generating 02-market-macro.yaml. Keywords: market sizing, TAM, SAM, SOM, segments, buyers, geography, adoption, web_search."
user-invocable: false
---

# Startup Market

Use this skill after `01-company-snapshot.yaml` exists and parses. Read `schemaPath`, `yamlSyntaxPath`, and `01-company-snapshot.yaml`.

## Outputs

Write exactly:

- `02-market-macro.yaml`

## Dynamic evidence use

Use targeted web research and direct page reads for missing market definition, sizing, segmentation, buyer, geography, growth-driver, or adoption facts. Register retained sources/claims in `02-market-macro.yaml.localEvidence` and cite local `claimRefs` in `02`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Mine official resources, blog, solutions, industry, customer, and product pages for category definition, buyers, verticals, use cases, budget owners, and adoption narrative. Use company-authored pages for segmentation, not independent TAM/SAM/SOM proof. Corroborate sizing, growth, and penetration with analyst, government, filing, or independent sources.

Treat `currentDate` as the freshness anchor for market sizing, growth rates, adoption, regulation-driven demand, and buyer-budget claims. Use complete-sentence questions written for the specific paragraph/table/figure you need, for example: `What is the latest independently reported size and growth outlook for the enterprise generative AI software market as of <currentDate>, and which buyer budgets does it replace or expand?` Avoid keyword-only searches. Include at least one disconfirming market question about slowdown, saturation, budget pressure, or adoption constraints.

Before writing `02`, ask multiple market-specific questions covering market definition, TAM/SAM/SOM, segment sizing, buyer personas, budget sources, geography, adoption timing, penetration constraints, and market risks. If broad TAM queries are thin, rewrite for software-only spend, enterprise-only spend, workflow spend, or bottom-up adoption proxies before marking a gap.

Do not invent market sizes, growth rates, penetration, TAM/SAM/SOM, or segment shares. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade market chapter:

- Market definition and category boundaries.
- Detailed raw market evidence retained in this artifact: cited sizing lenses, segment definitions, geography/adoption notes, buyer budget evidence, contradictory estimates, and dated recency notes.
- TAM/SAM/SOM or evidence-constrained market-sizing analysis.
- Growth drivers and constraints.
- Buyer/persona segmentation and customer budget owner.
- Geography, adoption, penetration, and timing.
- Segment definitions and sizing by adjacent budget pool or workflow category when applicable, such as core software, payments, automation, procurement, AP, treasury, infrastructure, or services.
- Penetration analysis by customer size, geography, vertical, or adoption maturity when evidence supports it; otherwise document as a market diligence gap.
- Market attractiveness verdict and open diligence asks.

Expected table families unless unavailable with a documented gap: market definitions, segment definitions and sizing, TAM/SAM/SOM sizing lenses, growth drivers, buyer/customer segments, geography/penetration constraints, market evidence gaps.

## Figure rules

- Prefer `market-sizing-lens` for TAM/SAM/SOM or constrained sizing.
- For bars or metric views, use numeric `value` and formatted `displayValue`.
- Use canonical renderer fields only: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`.

## Handoff note

After writing, record a concise internal summary: output path, market attractiveness, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
