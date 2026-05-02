---
name: startup-market
description: "Use when: generating 02-market-macro.yaml. Keywords: market sizing, TAM, SAM, SOM, segments, buyers, geography, adoption, web_search."
user-invocable: false
---

# Startup Market

Run after `01-company-snapshot.yaml` parses. Read it for company identity. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `02-market-macro.yaml`
- `02-market-macro.zh.yaml`

## Chapter focus

- Market definition and category boundaries.
- TAM/SAM/SOM or evidence-constrained sizing across multiple lenses (each row identifies its boundary, date, geography, included/excluded spend, confidence, and why it matters to the startup).
- Segment definitions and sizing by adjacent budget pool or workflow category (core software, payments, automation, procurement, AP, treasury, infrastructure, services, etc.) when applicable.
- Growth drivers and constraints.
- Buyer/persona segmentation and customer budget owner.
- Geography, adoption, penetration, and timing — by customer size, vertical, or adoption maturity when supportable.
- Market attractiveness verdict and open diligence asks.

## Expected table families

Market definitions, segment definitions and sizing, TAM/SAM/SOM sizing lenses, growth drivers, buyer/customer segments, geography/penetration constraints, market evidence gaps.

## Source mix

Analyst or market-data sources, government/regulatory or industry sources where relevant, buyer-budget evidence, adoption/penetration evidence, company segmentation claims, and at least one disconfirming source on adoption slowdown, ROI uncertainty, regulation, or budget pressure. Do not build the chapter from a single broad TAM estimate.

## Domain-specific query angles

- If broad TAM queries are thin, rewrite for software-only spend, enterprise-only spend, workflow-specific spend, or bottom-up adoption proxies before declaring a gap.
- Include at least one disconfirming question about market slowdown, saturation, budget pressure, or adoption constraints.
- If SAM/SOM cannot be isolated, preserve the failed sizing path and the diligence ask; do not replace it with a generic "large market" paragraph.

## Preferred figure types

- `market-sizing-lens` for TAM/SAM/SOM or constrained sizing.
- `bars` / `metric-bars` only with numeric `value` plus formatted `displayValue`.

## Handoff extras

Add `market attractiveness` to the standard handoff fields.
