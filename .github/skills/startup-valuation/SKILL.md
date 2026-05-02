---
name: startup-valuation
description: "Use when: generating 08-investment-valuation.yaml. Keywords: investment thesis, valuation, comparables, IPO readiness, scenarios, recommendation, web_search."
user-invocable: false
---

# Startup Valuation

Use this skill after `01` and the valuation-critical analysis artifacts exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, `04-financial-unit-economics.yaml`, `06-customer-retention.yaml`, and `07-risk-regulatory.yaml`. Read `02-market-macro.yaml`, `03-competitive-benchmarking.yaml`, or `05-product-technology.yaml` only when market size, moat, or product differentiation materially affects valuation.

## Outputs

Write exactly:

- `08-investment-valuation.yaml`

## Dynamic evidence use

Use `web_search` for missing valuation, funding, last-round, public-comparable, private-comparable, IPO-readiness, exit, scenario, or recommendation-critical facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `08-investment-valuation.yaml.localEvidence`, then cite those local `claimRefs` in `08`. Emit the `web_search` run-log line defined in `.github/references/evidence-ledger.md` after every call.

If valuation inputs are missing, default to `research-more` or `track` rather than false precision. Do not invent valuation, revenue multiples, return scenarios, IPO timing, or final recommendation support.

## Output focus

Structure this as an investor-grade investment chapter:

- Investment thesis and anti-thesis.
- Recommendation summary with confidence, risk rating, valuation stance, target return where supportable, suggested hold period, exit route, and position-sizing guidance.
- Bull/base/bear cases with explicit assumptions, scenario valuation ranges, upside/downside logic, and scenario constraints.
- Public and private comparables where supportable.
- Valuation framework, sensitivity, expected return, entry discipline, current price/valuation acceptability, and preferred entry conditions.
- IPO/readiness scorecard, governance/readiness signals, CFO/board/control maturity where relevant, exit routes, final recommendation, and diligence asks.
- DCF-style analysis only when defensible inputs exist; otherwise show as a diligence gap rather than inventing terminal values, WACC, or margins.
- Stop-loss or thesis-break triggers tied to measurable operating, regulatory, customer, financial, or management events.

Expected table families unless unavailable with a documented gap: recommendation summary, thesis/anti-thesis, bull/base/bear cases, IPO/readiness scorecard, public comparables, private comparables, DCF or discounted scenario inputs when supportable, valuation sensitivity, return scenarios, position sizing, stop-loss/thesis-break triggers, final diligence asks.

## Figure rules

- Use `recommendation-logic` for final recommendation logic.
- Use `sensitivity` for supported valuation sensitivity.
- Use numeric chart values only when evidence supports them; otherwise show gaps as diligence asks.
- Use canonical renderer fields only.

## Handoff note

After writing, record a concise internal summary: output path, recommendation, confidence, valuation stance, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
