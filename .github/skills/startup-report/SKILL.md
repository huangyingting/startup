---
name: startup-report
description: "Use when: generating 101-report-document.yaml from completed 01-08 analysis artifacts and 100-evidence-ledger.yaml. Keywords: report document, chapters, appendices, bibliography, structured figures."
user-invocable: false
---

# Startup Report

Use this skill after `100-evidence-ledger.yaml` exists and validates against `01`–`08` canonical `claimRefs`.

## Outputs

Write exactly:

- `101-report-document.yaml`

## Responsibility

Turn analytical artifacts into a professional VC due diligence report represented entirely as YAML. The website renders `101-report-document.yaml`.

Do not compress the report into a short summary. Preserve important analysis sections, tables, figures, scenario models, diligence gaps, and appendices from `01`–`08`. If a topic is unsupported, keep it visible as a gap or diligence ask rather than silently dropping it.

Do not use `web_search` to add new facts at this stage. If a report-critical fact is missing but appears supportable, route back to the relevant analysis skill, then rerun `startup-ledger` before writing `101`.

## Document requirements

- Create an opening `startupIntroduction` object.
- Create numbered chapters with section blocks, callouts, tables, and structured native figures.
- Preserve canonical `claimRefs` from `100-evidence-ledger.yaml` for every factual block, table, and figure.
- Use only schema-listed `reportMeta` keys.
- Include appendices when upstream artifacts support them: detailed financial/projection model, competitive feature deep dive, management team, investor base, source notes, unresolved diligence gaps.
- Appendix blocks may use `paragraph`, `list`, `equation`, `callout`, `table`, and `figure`. Put appendix tables/figures in document-level `tables[]` / `figures[]` and reference them via `tableRef` / `figureRef`.

## Figure rules

- Use structured figure specs only: `type`, `layout`, `summary`, and typed `data` arrays.
- Enforce schema Figure rendering contracts.
- Normalize non-canonical upstream fields before writing.
- Preserve semantic figure types such as `market-sizing-lens`, `unit-economics-waterfall`, `customer-surface-map`, `architecture-stack`, `risk-transmission-map`, and `recommendation-logic`.
- Do not emit legacy diagram-source fields or diagram-language source.

## Handoff note

After writing, record a concise internal summary: output path, recommendation, figure count, table count, and website readiness.