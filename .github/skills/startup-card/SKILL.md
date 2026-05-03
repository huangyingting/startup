---
name: startup-card
description: "Use when: generating 102-report-card.yaml and 102-report-card.zh.yaml from 101-report-document.yaml and 100-evidence-ledger.yaml. Keywords: report card, score, recommendation, key metrics, website index card, Simplified Chinese translation."
user-invocable: false
---

# Startup Card

Final card stage. This skill produces both the English `102-report-card.yaml` and the Simplified Chinese `102-report-card.zh.yaml` in a single pass: build the English card, then translate it into Simplified Chinese while preserving structure exactly.

## Read first

- `101-report-document.yaml`
- `101-report-document.zh.yaml`
- `100-evidence-ledger.yaml`
- Completed `01`–`08` artifacts for sanity checks
- `schemaPath`
- `.github/references/zh-translation.md`

## Output

- `102-report-card.yaml`
- `102-report-card.zh.yaml`

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
- Output summary includes path, recommendation, score, confidence, risk rating, valuation stance, figure count, and table count.

## Simplified Chinese translation

After `102-report-card.yaml` is complete, translate it into `102-report-card.zh.yaml` while preserving structure exactly.

### Translate

- `company.sector`, `company.stage`, `company.headquarters`, `company.shortDescription`.
- `title`, `subtitle`, `headline`.
- Every item in `topStrengths[]`, `topRisks[]`, and `unresolvedGaps[]`.

### Preserve exactly

- Schema keys, list order, nested object shape.
- IDs, URLs, dates, numeric values, booleans, nulls.
- Enum values: `recommendation`, `confidence`, `riskRating`, `valuationStance`.
- `reportFiles.*`, every `keyMetrics.*` key and value.
- Company, product, person, and investor proper names.

### Do not (Chinese stage)

- Do not search, add facts, or change claims.
- Do not translate enum values, metric keys, IDs, or report file paths.

### Completion check (Chinese)

- Residual-English sweep on translated fields.
- Structural parity with English `102`.
- Numeric metrics, enums, and `reportFiles.*` byte-identical.
- YAML parses and starts with `schemaVersion: startup-diligence-report-v2`.

### Handoff

Record output paths and `artifactsTranslated: [102-report-card]`.
