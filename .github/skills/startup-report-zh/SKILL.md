---
name: startup-report-zh
description: "Use when: generating 101-report-document.zh.yaml from 101-report-document.yaml. Keywords: Chinese localization, Simplified Chinese report document, translation."
user-invocable: false
---

# Startup Report ZH

Use this skill after English `101-report-document.yaml` exists and validates.

## Outputs

Write exactly:

- `101-report-document.zh.yaml`

## Translation scope

This is a full Simplified Chinese translation, not a partial header pass. Every user-visible text string must be translated. Numbers, IDs, URLs, enums, and structural keys must be preserved exactly.

### Translate every occurrence of these fields

Walk the entire document and translate the value of every one of these fields wherever they appear, at any nesting depth:

- `company.subtitle`
- `reportMeta.title`
- `coverMetrics[].label`, `coverMetrics[].unit` (translate units like `USD millions` → `百万美元`; keep numeric `value` strings such as `$183B` unchanged when they are recognized financial shorthand)
- `startupIntroduction.summary`, `productSummary`, `customerFocus`, `businessModel`, `stage`, `fundingStatus`, `headquarters`, `foundingLocation`
- `startupIntroduction.founders[].role`, `background`
- `chapters[].title`, `chapters[].sections[].title`
- For every block in `chapters[].sections[].blocks[]`: `title`, `body`, `calloutType` label text only when it is free text (keep enum values like `final-recommendation` as-is), and every entry of `items[]`
- Every `tables[]` entry: `title`, `columns[]`, `rows[][]` cells that are natural-language text, and `notes`
- Every `figures[]` entry: `title`, `summary`, `approximationNotes`, `data.xAxis`, `data.yAxis`, and the `label` / `detail` of every `nodes[]`, `items[]`, `layers[]`, `points[]`, `series[]`, `series[].points[]`, `columns[]`, `rows[]`, `rows[].values[]`, `edges[].label`, `layers[].modules[]`, `layers[].outputs[]`
- `appendices[].title`, and inside each appendix block the same fields as chapter blocks (`title`, `body`, `items[]`)
- `bibliography[].citation` natural-language portions only; keep publisher names, URLs, dates, and source IDs unchanged
- `disclaimer`

### Preserve exactly (never translate, reword, or reorder)

- All schema keys.
- All IDs: `S###`, `C###`, `T###`, `F###`, section numbers, chapter numbers.
- All URLs, email addresses, dates (`YYYY-MM-DD`), numeric values, booleans, nulls.
- All enum values: `recommendation`, `confidence`, `riskRating`, `valuationStance`, `tone`, `type`, `layout`, `claimType`, `freshness`, `corroboration`, `independence`, `reputationTier`, `sourceType`, block `type`, `calloutType` enum values.
- Company, product, person, and investor proper names; keep the common English form unless a standard Simplified Chinese name is unambiguous.
- Order of arrays and shape of every nested object.

### Do not

- Do not add facts, change claims, soften or strengthen the investment view, or use `web_search`.
- Do not translate enum values or IDs even when they look like English words.
- Do not leave English prose in any translatable field listed above. If the source string is empty or `null`, keep it as is.

## Completion check before saving

Before returning, scan the output and confirm:

- No `body`, `summary`, `detail`, `notes`, `approximationNotes`, `headline`, `subtitle`, or natural-language `label` field still contains a sentence written in English.
- Counts of `chapters`, `sections`, `blocks`, `tables`, `figures`, `appendices`, `bibliography`, `coverMetrics`, `founders`, and every nested array equal the English source.
- All `claimRefs`, `tableRef`, `figureRef`, and ID lists are byte-identical to the English source.
- The file parses as YAML and starts with `schemaVersion: startup-diligence-report-v2`.

## Handoff note

After writing, record a concise internal summary: output path and `artifactTranslated: 101-report-document`.