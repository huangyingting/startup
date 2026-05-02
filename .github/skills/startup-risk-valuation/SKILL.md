---
name: startup-risk-valuation
description: "Use when: generating 08-risk-regulatory.yaml and 09-investment-valuation.yaml. Keywords: regulatory risk, legal risk, valuation, comparables, IPO readiness, recommendation, web_search."
user-invocable: false
---

# Startup Risk and Valuation

Use this skill after `00`–`07` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `07-customer-retention.yaml`.

## Outputs

Write exactly:

- `08-risk-regulatory.yaml`
- `09-investment-valuation.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing regulatory, legal, security, valuation, comparables, IPO-readiness, or recommendation-critical facts. Parse response packets per the evidence-ledger rules, append new cited sources/claims to `01-evidence-ledger.yaml`, then cite those `claimRefs` in `08`/`09`.

If valuation inputs are missing, default to `research-more` or `track` rather than false precision. Do not invent valuation, revenue multiples, legal outcomes, regulatory posture, or return scenarios.

## Output focus

Structure as investor-grade diligence chapters:

- Risk overview, regulatory/legal risk, credit/operational/security risk, competitive risk, mitigation summary.
- `risk-heatmap` or `matrix` figure, plus `risk-transmission-map` when useful.
- Investment thesis, bull/base/bear cases, IPO/readiness scorecard, public/private comparables, valuation framework, return scenarios, final recommendation, position-sizing logic.
- Stop-loss triggers / kill criteria and explicit diligence asks required before upgrading the recommendation.

Expected table families unless unavailable with a documented gap: risk register, regulatory/legal risk, operational/security risk, mitigation framework, bull/base/bear cases, IPO/readiness scorecard, public comparables, private comparables, valuation sensitivity, return scenarios, kill criteria.

## Figure rules

- Use `risk-heatmap` / `matrix` with `data.columns[]` and `data.rows[].values[]`.
- Use `risk-transmission-map` with `data.nodes[]` and `data.edges[]`.
- Use `recommendation-logic` for final recommendation logic.
- Use canonical renderer fields only; do not invent primary fields.

## Handoff note

After writing, record a concise internal summary: output paths, recommendation, risk rating, valuation stance, figure count, table count, evidence gaps closed, evidence gaps remaining.