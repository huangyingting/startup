---
name: startup-valuation
description: "Use when: generating 08-investment-valuation.yaml. Keywords: investment thesis, valuation, comparables, IPO readiness, scenarios, recommendation, web_search."
user-invocable: false
---

# Startup Valuation

Run after `01` and the valuation-critical analysis artifacts parse. Read `01-company-snapshot.yaml`, `04-financial-unit-economics.yaml`, `06-customer-retention.yaml`, and `07-risk-regulatory.yaml`. Read `02-market-macro.yaml`, `03-competitive-benchmarking.yaml`, or `05-product-technology.yaml` only when market size, moat, or product differentiation materially affects valuation. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `08-investment-valuation.yaml`
- `08-investment-valuation.zh.yaml`

## Chapter focus

- Investment thesis and anti-thesis.
- Recommendation summary with confidence, risk rating, valuation stance, target return where supportable, suggested hold period, exit route, and position-sizing guidance.
- Bull/base/bear cases with explicit assumptions, scenario valuation ranges, upside/downside logic, and scenario constraints.
- Public and private comparables where supportable.
- Valuation framework, sensitivity, expected return, entry discipline, current price/valuation acceptability, preferred entry conditions.
- IPO/readiness scorecard, governance/readiness signals, CFO/board/control maturity where relevant, exit routes, final recommendation, diligence asks.
- DCF-style analysis only when defensible inputs exist; otherwise show as a diligence gap rather than inventing terminal values, WACC, or margins.
- Stop-loss / thesis-break triggers tied to measurable operating, regulatory, customer, financial, or management events.

## Expected table families

Recommendation summary, thesis/anti-thesis, bull/base/bear cases, IPO/readiness scorecard, public comparables, private comparables, DCF or discounted scenario inputs when supportable, valuation sensitivity, return scenarios, position sizing, stop-loss/thesis-break triggers, final diligence asks.

## Source mix

Cover both thesis and anti-thesis: latest primary/secondary valuation coverage, financing structure or investor syndicate, public comparable multiples, relevant private-company comparables, revenue or growth anchors, IPO/governance readiness, liquidity constraints, adverse overvaluation/downside evidence.

## Domain-specific query angles

- Treat official valuation/momentum claims as company-claimed; corroborate valuation, investor demand, secondary pricing, comparables, and exit context independently before using them in recommendation logic.
- Include at least one adverse query about overvaluation, down-round risk, governance, liquidity constraints, or comparable multiple compression.
- Do not issue `buy` unless cited evidence or explicit gaps support both thesis and anti-thesis. If valuation inputs are missing, default to `research-more` or `track` rather than false precision.
- Scenario cases must include explicit assumptions, entry-price discipline, downside triggers, comparables or sensitivity logic, and the private documents required to move from `track`/`research-more` to `buy`. Label expected return unavailable when ungated.

## Enum fields

`recommendation`, `confidence`, `riskRating`, and `valuationStance` are closed enums defined in `schemaPath`; the website content schema rejects any other value. Use exactly one allowed token; do not combine values with `;` or `/` or free-text qualifiers. If underwriting nuance does not fit one token (e.g. "expensive at confirmed mark, unattractive at rumored mark"), pick the best-fit enum and place the nuance in body text, callouts, or scenario tables.

## Preferred figure types

- `recommendation-logic` for final recommendation logic.
- `sensitivity` for supported valuation sensitivity.
- Numeric chart values only when evidence supports them; otherwise show gaps as diligence asks.

## Handoff extras

Add `recommendation`, `confidence`, and `valuation stance` to the standard handoff fields.
