---
name: startup-card
description: "Use when: generating 102-report-card.yaml from 101-report-document.yaml and 100-evidence-ledger.yaml. Keywords: report card, score, recommendation, key metrics, website index card."
user-invocable: false
---

# Startup Card

Use this skill after `101-report-document.yaml` exists and validates.

## Outputs

Write exactly:

- `102-report-card.yaml`

## Responsibility

Create the website index card and summary metrics for the completed English report. Do not write `101-report-document.yaml` in this skill.

Do not use `web_search` or add new facts. Derive all values from `100-evidence-ledger.yaml`, `101-report-document.yaml`, and the completed `01`–`08` artifacts.

## Card requirements

- `overallScore` is a 0–10 number, never 0–100.
- `figureCount` and `tableCount` are top-level fields and **must equal the current `101-report-document.yaml` counts**. After editing `101` (e.g. dropping a duplicate table, adding the executive summary KPI table, or removing an empty appendix block), recompute `len(101.tables)` and `len(101.figures)` and write the new totals into `102-report-card.yaml` and `102-report-card.zh.yaml` in the same commit. The website lint fails the build if either count drifts.
- Before writing the card, sanity-check `101` against the upstream analysis artifacts. If the final report has dropped most upstream tables/figures, or if a rich late-stage company has only a handful of final tables, stop and rerun `startup-report`; do not summarize a thin report card from a thin report.
- `sourceStats` contains only `sourcesRetained` and `claimsReviewed`.
- `keyMetrics` should carry the report's investor-facing cover metrics where schema fields exist: valuation, revenue/run-rate or ARR, total raised, customer count, headcount, revenue growth, gross margin, and NRR. If a due-diligence cover metric does not map to a schema key, preserve it in the report document and summarize the gap rather than inventing a new card field.
- When any `keyMetrics.*` is `null`, list a matching `unresolvedGaps` entry.
- Preserve recommendation, confidence, risk rating, valuation stance, key strengths, key risks, and diligence gaps from the report document.
- Enum fields are closed; use exactly one allowed token. The website content schema rejects any other value and the build will fail.
  - `recommendation`: `strong-buy` | `buy` | `track` | `research-more` | `avoid`
  - `confidence`: `high` | `medium` | `low`
  - `riskRating`: `low` | `moderate` | `significant` | `critical` | `unknown`
  - `valuationStance`: `attractive` | `fair` | `stretched` | `expensive` | `unknown`

## Handoff note

After writing, record a concise internal summary: output path, recommendation, score, confidence, risk rating, valuation stance, figure count, and table count.
