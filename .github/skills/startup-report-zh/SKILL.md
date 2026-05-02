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

## Rules

- Translate prose and visible text strings only: titles, summaries, section bodies, callouts, table headers/cells, figure `title`, `summary`, `label`, `detail`.
- Preserve schema keys, IDs, URLs, dates, numbers, booleans, nulls, enum values, source IDs, claim IDs, figure IDs, table IDs, and the shape/order of structured figure/table data.
- Keep company/product/person/investor names in common English form unless a standard Chinese name is unambiguous.
- Do not add facts, change claims, improve the investment case, or use `web_search`.
- Keep YAML parseable and complete from the document head.

## Handoff note

After writing, record a concise internal summary: output path and `artifactTranslated: 101-report-document`.