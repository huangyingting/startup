---
name: startup-card-zh
description: "Use when: generating 102-report-card.zh.yaml from 102-report-card.yaml. Keywords: Chinese localization, Simplified Chinese report card, translation."
user-invocable: false
---

# Startup Card ZH

Use this skill after `102-report-card.yaml` exists and validates.

## Outputs

Write exactly:

- `102-report-card.zh.yaml`

## Responsibility

Translate `102-report-card.yaml` into Simplified Chinese, preserving structure exactly. Read `.github/references/zh-translation.md` first.

## Translate

- `company.sector`, `company.stage`, `company.headquarters`, `company.shortDescription`
- `title`, `subtitle`, `headline`
- Every entry of `topStrengths[]`, `topRisks[]`, `unresolvedGaps[]`

## Preserve exactly

- All schema keys, list order, and nested object shape.
- All IDs, URLs, dates, numeric values, booleans, nulls.
- All enum values: `recommendation`, `confidence`, `riskRating`, `valuationStance`.
- `reportFiles.reportDocument`, `reportFiles.reportCard`, every `keyMetrics.*` key and value.
- Company, product, person, and investor proper names.

## Do not

- Do not call `web_search`.
- Do not invent facts or change claims.
- Do not translate enum values, metric keys, or IDs.

## Completion check before saving

1. Residual-English sweep on translated fields per `.github/references/zh-translation.md`.
2. Structural parity: counts of `topStrengths`, `topRisks`, `unresolvedGaps`, and any other array equal `102-report-card.yaml`.
3. Field parity: all numeric metrics, enum fields, and `reportFiles.*` values are byte-identical.
4. Style parity: line count is within roughly ±10% of `102-report-card.yaml`.
5. Parse: the file parses as YAML and starts with `schemaVersion: startup-diligence-report-v2`.

## Handoff note

After writing, record a concise internal summary: output path and `artifactTranslated: 102-report-card`.
