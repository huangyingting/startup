---
name: startup-card-zh
description: "Use when: generating 102-report-card.zh.yaml from 102-report-card.yaml. Keywords: Chinese localization, Simplified Chinese report card, translation."
user-invocable: false
---

# Startup Card ZH

Use this skill after English `102-report-card.yaml` exists and validates.

## Outputs

Write exactly:

- `102-report-card.zh.yaml`

## Translation scope

This is a full Simplified Chinese translation. Every user-visible text string must be translated; numbers, IDs, URLs, enums, and structural keys must be preserved exactly.

### Translate every occurrence of these fields

- `company.sector`, `company.stage`, `company.headquarters`, `company.shortDescription`
- `title`, `subtitle`, `headline`
- Every entry of `topStrengths[]`, `topRisks[]`, `unresolvedGaps[]`
- `keyMetrics` unit/label text if present as free text (do not change numeric values)
- Any other free-text user-facing field defined by the schema

### Preserve exactly (never translate or reorder)

- All schema keys, list order, and nested object shape.
- All IDs, URLs, dates, numbers, booleans, nulls.
- All enum values: `recommendation`, `confidence`, `riskRating`, `valuationStance`, and any other enum.
- `reportFiles.reportDocument`, `reportFiles.reportCard`, and all metric keys under `keyMetrics`.
- Company, product, person, and investor proper names; keep the common English form unless a standard Simplified Chinese name is unambiguous.

### Do not

- Do not add facts, change claims, soften or strengthen the investment view, or use `web_search`.
- Do not translate enum values, metric keys, or IDs even when they look like English words.
- Do not leave English prose in any translatable field listed above. If the source string is empty or `null`, keep it as is.

## Completion check before saving

Before returning, scan the output and confirm:

- No `headline`, `subtitle`, `shortDescription`, `topStrengths[]`, `topRisks[]`, or `unresolvedGaps[]` entry still contains an English sentence.
- Counts of `topStrengths`, `topRisks`, `unresolvedGaps`, and any other array equal the English source.
- All numeric metrics and enum fields are byte-identical to the English source.
- The file parses as YAML and starts with `schemaVersion: startup-diligence-report-v2`.

## Handoff note

After writing, record a concise internal summary: output path and `artifactTranslated: 102-report-card`.