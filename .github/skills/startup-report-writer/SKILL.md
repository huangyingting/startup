---
name: startup-report-writer
description: "Use when: assembling completed startup diligence YAML into 10-report-document.yaml and 11-report-card.yaml. Keywords: report document, report card, appendices, bibliography, structured figures."
user-invocable: false
---

# Startup Report Writer

Use this skill after `00`–`09` exist, parse, and all supportable gaps have either been researched by the relevant skill or documented as gaps.

## Outputs

Write exactly:

- `10-report-document.yaml`
- `11-report-card.yaml`

## Responsibility

Turn analytical artifacts into a professional VC due diligence report represented entirely as YAML. The website renders `10-report-document.yaml`.

Do not compress the report into a short summary. Preserve important specialist sections, tables, figures, scenario models, diligence gaps, and appendices from `02`–`09`. If a topic is unsupported, keep it visible as a gap or diligence ask rather than silently dropping it.

Do not use `web_search` to add new facts at this stage. If a report-critical fact is missing but appears supportable, route back to the relevant analysis skill so it can search, update `01-evidence-ledger.yaml`, and rewrite its artifact first.

## `10-report-document.yaml`

- Create an opening `startupIntroduction` object.
- Create numbered chapters with section blocks, callouts, tables, and structured native figures.
- Preserve `claimRefs` for every factual block, table, and figure.
- Use only schema-listed `reportMeta` keys.
- Include appendices when upstream artifacts support them: detailed financial/projection model, competitive feature deep dive, management team, investor base, source notes, unresolved diligence gaps.
- Appendix blocks may use `paragraph`, `list`, `equation`, `callout`, `table`, and `figure`. Put appendix tables/figures in document-level `tables[]` / `figures[]` and reference them via `tableRef` / `figureRef`.

## `11-report-card.yaml`

- `overallScore` is a 0–10 number, never 0–100.
- `figureCount` and `tableCount` are top-level fields and must equal `10-report-document.yaml` counts.
- `sourceStats` contains only `sourcesRetained` and `claimsReviewed`.
- When any `keyMetrics.*` is `null`, list a matching `unresolvedGaps` entry.

## Figure rules

- Use structured figure specs only: `type`, `layout`, `summary`, and typed `data` arrays.
- Enforce schema Figure rendering contracts.
- Normalize non-canonical upstream fields before writing.
- Preserve semantic figure types such as `market-sizing-lens`, `unit-economics-waterfall`, `customer-surface-map`, `architecture-stack`, `risk-transmission-map`, and `recommendation-logic`.
- Do not emit legacy diagram-source fields or diagram-language source.

## Handoff note

After writing, record a concise internal summary: output paths, recommendation, score, figure count, table count, website readiness.