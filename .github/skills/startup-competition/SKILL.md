---
name: startup-competition
description: "Use when: generating 03-competitive-benchmarking.yaml and 03-competitive-benchmarking.zh.yaml. Keywords: competitors, substitutes, feature matrix, pricing, packaging, moat, positioning."
user-invocable: false
---

# Startup Competition

Third analysis stage. Benchmark the startup against direct, incumbent, adjacent, and substitute competitors.

## Read first

- `01-company-snapshot.yaml`
- `02-market-macro.yaml`
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `03-competitive-benchmarking.yaml`
- `03-competitive-benchmarking.zh.yaml`

## Focus

- Competitive landscape and category map.
- Direct startups, legacy incumbents, adjacent platforms, open-source/workflow substitutes, and potential acquirers.
- Competitor profiles: scale, funding/market cap, target segment, differentiation, strategic trajectory.
- Feature, pricing, packaging, GTM, customer/review signals, switching costs, defensibility, and moat durability.
- Competitive risks and diligence asks.

## Evidence targets

- Competitor official docs, product, pricing, customer, changelog, and security pages for claimed capabilities.
- Independent benchmarks, reviews, customer proof, market reports, funding coverage, and adverse evidence for validation.
- Never treat vendor-authored comparisons as independent proof.

## Section evidence acquisition

Use `web_search` to identify competitors and adverse signals; use `fetch-url` to verify official pages and retained independent evidence.

- Landscape: direct competitors, incumbents, adjacent platforms, open-source substitutes, acquirers.
- Profiles: funding, valuation/market cap, revenue/customer scale, target segment, strategic moves.
- Feature matrix: docs, changelogs, API references, product pages, benchmark pages.
- Pricing/packaging: plan names, token/seat pricing, enterprise packaging, discounts.
- Moat/risk: reviews, benchmark shifts, commoditization, switching, open-source and pricing pressure.
- Positioning figure: source-backed axes and point placement.

## Required tables and figures

- Competitor profile table.
- Feature matrix.
- Pricing/packaging comparison.
- GTM or customer/review signal table.
- Moat/switching-cost or competitive risk register.
- Preferred figure: `quadrant` or `competitive-matrix` with numeric axes and labeled points.

## Completion check

- Query by competitor class; do not build the matrix from one generic comparison source.
- Include adverse evidence on displacement, commoditization, open-source pressure, switching, or pricing compression.
- Handoff includes positioning and key competitors.
