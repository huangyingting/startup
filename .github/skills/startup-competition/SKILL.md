---
name: startup-competition
description: "Use when: generating 03-competitive-benchmarking.yaml. Keywords: competitors, substitutes, feature matrix, pricing, packaging, moat, positioning, web_search."
user-invocable: false
---

# Startup Competition

Run after `01`–`02` parse. Read `01-company-snapshot.yaml` for identity and `02-market-macro.yaml` for category boundaries. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `03-competitive-benchmarking.yaml`
- `03-competitive-benchmarking.zh.yaml`

## Chapter focus

- Competitive landscape and category map.
- Distinguish direct modern competitors, legacy incumbents, adjacent platform players, and potential strategic acquirers.
- Competitor profiles with valuation/market cap, funding, revenue scale, customer scale, target segment, differentiator, and strategic trajectory when evidence supports them.
- Feature, product, pricing, packaging, and GTM comparisons.
- Differentiation, switching costs, defensibility, and moat durability — product velocity, data/network effects, pricing advantage, integration ecosystem, distribution channel, compliance advantage where applicable.
- Competitive risks and diligence asks.

## Expected table families

Competitor profiles, feature matrix, pricing/packaging comparison, GTM comparison, customer/review signal comparison, moat/switching-cost assessment, competitive risk register, appendix-ready feature deep dive.

## Source mix

Cover each competitor class independently — direct startups, incumbent platforms, adjacent/cloud or open-source substitutes, workflow specialists. Use competitor official docs/pricing/product pages for what competitors claim; use independent benchmarks, customer proof, reviews, market reports, or funding coverage for validation. Mine competitor official surfaces too, but never treat vendor-authored comparisons as independent proof.

## Domain-specific query angles

- Vary queries by competitor class and table — do not build the matrix from one generic comparison source.
- Include at least one adverse query on competitive displacement, commoditization, open-source pressure, customer switching, or pricing compression.
- Preserve contradictory signals (benchmark leadership vs. pricing compression, customer wins vs. churn, etc.).

## Preferred figure types

- `quadrant` or `competitive-matrix` for positioning, with `data.points[]` carrying `label`, numeric `x`, numeric `y`, optional `tone`, and axis labels.

## Handoff extras

Add `positioning` and `key competitors` to the standard handoff fields.
