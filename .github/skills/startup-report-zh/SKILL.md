---
name: startup-report-zh
description: "Use when: translating 10-report-document.yaml and 11-report-card.yaml into Simplified Chinese localized YAML. Keywords: Chinese localization, translation, zh report."
user-invocable: false
---

# Startup Report Simplified Chinese Translation

Use this skill after English `10-report-document.yaml` and `11-report-card.yaml` exist and validate.

## Outputs

Write exactly:

- `10-report-document.zh.yaml`
- `11-report-card.zh.yaml`

## Rules

- Translate prose and visible text strings only: titles, summaries, section bodies, callouts, table headers/cells, figure `title`, `summary`, `label`, `detail`.
- Preserve schema keys, IDs, URLs, dates, numbers, booleans, nulls, enum values, source IDs, claim IDs, figure IDs, table IDs, and the shape/order of structured figure/table data.
- Keep company/product/person/investor names in common English form unless a standard Chinese name is unambiguous.
- Do not add facts, change claims, improve the investment case, or use `web_search`.
- Keep YAML parseable and complete from the document head.

## Handoff note

After writing, record a concise internal summary: paths and `artifactsTranslated: 2`.