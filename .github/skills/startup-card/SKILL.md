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
- `figureCount` and `tableCount` are top-level fields and must equal `101-report-document.yaml` counts.
- `sourceStats` contains only `sourcesRetained` and `claimsReviewed`.
- `keyMetrics` should carry the report's investor-facing cover metrics where schema fields exist: valuation, revenue/run-rate or ARR, total raised, customer count, headcount, revenue growth, gross margin, and NRR. If a due-diligence cover metric does not map to a schema key, preserve it in the report document and summarize the gap rather than inventing a new card field.
- When any `keyMetrics.*` is `null`, list a matching `unresolvedGaps` entry.
- Preserve recommendation, confidence, risk rating, valuation stance, key strengths, key risks, and diligence gaps from the report document.

## Handoff note

After writing, record a concise internal summary: output path, recommendation, score, confidence, risk rating, valuation stance, figure count, and table count.