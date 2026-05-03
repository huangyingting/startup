---
name: startup-card
description: "Use when: generating 102-report-card.yaml from 101-report-document.yaml and 100-evidence-ledger.yaml. Keywords: report card, score, recommendation, key metrics, website index card."
user-invocable: false
---

# Startup Card

Final card stage. This skill produces the English `102-report-card.yaml` from the report document and evidence ledger.

## Read first

- `101-report-document.yaml`
- `100-evidence-ledger.yaml`
- Completed `01`–`08` artifacts for sanity checks
- `schemaPath`

## Output

- `102-report-card.yaml`

## Do not

- Do not gather new facts.
- Do not edit `101-report-document.yaml` here.
- Do not summarize a thin or mechanically generated report into a polished card.

## Requirements

- `overallScore` is a 0–10 number, never 0–100.
- `figureCount` and `tableCount` must exactly equal current `101.figures.length` and `101.tables.length`.
- `sourceStats` contains only `sourcesRetained` and `claimsReviewed`.
- Preserve recommendation, confidence, risk rating, valuation stance, strengths, risks, and gaps from `101`.
- `keyMetrics` should map to schema-supported investor-facing cover metrics; unsupported metrics stay in the report and are summarized as gaps.
- Any `keyMetrics.*: null` needs a matching `unresolvedGaps` entry.
- Closed enums must use exactly schema-allowed tokens.

## Completion check (English)

- Sanity-check `101` against upstream tables/figures before writing.
- Stop and rerun `startup-report` if `101` dropped most upstream analysis or is only floor-compliant.
- Run card reflection: make sure the score, recommendation, top strengths, top risks, unresolved gaps, and key metrics summarize `101` faithfully instead of marketing the company or hiding uncertainty.
- If any key metric is `null`, stale, company-claimed only, or valuation-critical, surface that limitation in `unresolvedGaps[]` or the headline/risk framing.
- Output summary includes path, recommendation, score, confidence, risk rating, valuation stance, figure count, and table count.

