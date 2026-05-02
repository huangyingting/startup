---
name: startup-valuation
description: "Use when: generating 08-investment-valuation.yaml and 08-investment-valuation.zh.yaml. Keywords: investment thesis, valuation, comparables, IPO readiness, scenarios, recommendation."
user-invocable: false
---

# Startup Valuation

Eighth analysis stage. Produce the investment recommendation, valuation stance, scenarios, and exit/readiness view.

## Read first

- `01-company-snapshot.yaml`
- `04-financial-unit-economics.yaml`
- `06-customer-retention.yaml`
- `07-risk-regulatory.yaml`
- `02-market-macro.yaml`, `03-competitive-benchmarking.yaml`, or `05-product-technology.yaml` when market, moat, or product differentiation materially affects valuation.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `08-investment-valuation.yaml`
- `08-investment-valuation.zh.yaml`

## Focus

- Thesis and anti-thesis.
- Recommendation, confidence, risk rating, valuation stance, target return, hold period, exit route, and position sizing where supportable.
- Bull/base/bear cases with explicit assumptions, ranges, upside/downside logic, and constraints.
- Public/private comparables, sensitivity, entry discipline, current valuation acceptability, and preferred entry conditions.
- IPO/readiness scorecard, governance/readiness signals, exit routes, final diligence asks.
- DCF-style analysis only when defensible inputs exist; otherwise make it a gap.
- Stop-loss / thesis-break triggers tied to measurable operating, regulatory, customer, financial, or management events.

## Evidence targets

- Latest valuation coverage, financing structure, investor syndicate, public comparable multiples, private comparables, revenue/growth anchors, IPO/governance readiness, liquidity constraints, and adverse overvaluation/downside evidence.

## Section evidence acquisition

Use `web_search` to test thesis, anti-thesis, comps, and downside; use `fetch-url` on sources behind each recommendation-critical claim.

- Thesis/anti-thesis: market, product, customer, financial, risk, and competitive proof.
- Recommendation: latest valuation, revenue scale, growth, risk events, investor demand, adverse evidence.
- Scenarios: drivers, multiples, downside triggers, legal/regulatory exposure, sensitivities.
- Comparables: public/private comps, revenue multiples, margins, growth, IPO/exit analogs.
- IPO/readiness: CFO/board maturity, controls, governance, litigation/regulation, liquidity.
- Stop-loss/diligence asks: overvaluation, down-round risk, multiple compression, concentration, legal outcomes.

## Required tables and figures

- Recommendation summary.
- Thesis / anti-thesis.
- Bull/base/bear cases.
- IPO/readiness scorecard.
- Public and/or private comparables.
- Sensitivity, return scenario, position sizing, stop-loss, or final diligence ask table.
- Preferred figures: `recommendation-logic` and `sensitivity`.

## Enum discipline

`recommendation`, `confidence`, `riskRating`, and `valuationStance` are closed schema enums. Use exactly one allowed token; place nuance in prose, callouts, or scenario tables.

## Completion check

- Include adverse searches on overvaluation, down-round risk, governance, liquidity, or multiple compression.
- Do not issue `buy` unless thesis and anti-thesis are both evidence-supported.
- If valuation inputs are missing, prefer `research-more` or `track` over false precision.
- Handoff includes recommendation, confidence, and valuation stance.
