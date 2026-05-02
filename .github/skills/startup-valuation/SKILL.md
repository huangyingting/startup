---
name: startup-valuation
description: "Use when: generating 08-investment-valuation.yaml. Keywords: investment thesis, valuation, comparables, IPO readiness, scenarios, recommendation, web_search."
user-invocable: false
---

# Startup Valuation

Use this skill after `00`–`07` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `07-risk-regulatory.yaml`.

## Outputs

Write exactly:

- `08-investment-valuation.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing valuation, funding, last-round, public comparable, private comparable, IPO-readiness, exit, scenario, or recommendation-critical facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `08-investment-valuation.yaml.localEvidence`, then cite those local `claimRefs` in `08`.

If valuation inputs are missing, default to `research-more` or `track` rather than false precision. Do not invent valuation, revenue multiples, return scenarios, IPO timing, or final recommendation support.

## Output focus

Structure this as an investor-grade investment chapter:

- Investment thesis and anti-thesis.
- Bull/base/bear cases and scenario constraints.
- Public and private comparables where supportable.
- Valuation framework, sensitivity, expected return, and entry discipline.
- IPO/readiness, exit routes, position sizing, final recommendation, and diligence asks.

Expected table families unless unavailable with a documented gap: thesis/anti-thesis, bull/base/bear cases, IPO/readiness scorecard, public comparables, private comparables, valuation sensitivity, return scenarios, position sizing, final diligence asks.

## Figure rules

- Use `recommendation-logic` for final recommendation logic.
- Use `sensitivity` for supported valuation sensitivity.
- Use numeric chart values only when evidence supports them; otherwise show gaps as diligence asks.
- Use canonical renderer fields only.

## Handoff note

After writing, record a concise internal summary: output path, recommendation, confidence, valuation stance, figure count, table count, evidence gaps closed, evidence gaps remaining.
