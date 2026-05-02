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

## Rules

- Translate prose and visible text strings only: title, subtitle, headline, strengths, risks, gaps, metric labels, and other user-facing text.
- Preserve schema keys, IDs, URLs, dates, numbers, booleans, nulls, enum values, source IDs, claim IDs, metric keys, and list order.
- Keep company/product/person/investor names in common English form unless a standard Chinese name is unambiguous.
- Do not add facts, change claims, improve the investment case, or use `web_search`.
- Keep YAML parseable and complete from the document head.

## Handoff note

After writing, record a concise internal summary: output path and `artifactTranslated: 102-report-card`.