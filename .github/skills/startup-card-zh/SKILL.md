---
name: startup-card-zh
description: "Use when: generating 102-report-card.zh.yaml from 102-report-card.yaml. Keywords: Simplified Chinese report card, localization, translation, website index card."
user-invocable: false
---

# Startup Card ZH

Chinese report-card stage. Translate `102-report-card.yaml` into Simplified Chinese while preserving structure exactly.

## Read first

- `102-report-card.yaml`
- `.github/references/zh-translation.md`

## Output

- `102-report-card.zh.yaml`

## Translate

- `company.sector`, `company.stage`, `company.headquarters`, `company.shortDescription`.
- `title`, `subtitle`, `headline`.
- Every item in `topStrengths[]`, `topRisks[]`, and `unresolvedGaps[]`.

## Preserve exactly

- Schema keys, list order, nested object shape.
- IDs, URLs, dates, numeric values, booleans, nulls.
- Enum values: `recommendation`, `confidence`, `riskRating`, `valuationStance`.
- `reportFiles.*`, every `keyMetrics.*` key and value.
- Company, product, person, and investor proper names.

## Do not

- Do not search, add facts, or change claims.
- Do not translate enum values, metric keys, IDs, or report file paths.

## Completion check

- Residual-English sweep on translated fields.
- Structural parity with English `102`.
- Numeric metrics, enums, and `reportFiles.*` byte-identical.
- YAML parses and starts with `schemaVersion: startup-diligence-report-v2`.

## Handoff

Record output path and `artifactTranslated: 102-report-card`.
