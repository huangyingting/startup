---
name: startup-report
description: "Use when: generating 101-report-document.yaml from completed 01-08 analysis artifacts and 100-evidence-ledger.yaml. Keywords: report document, chapters, appendices, coverage, structured figures."
user-invocable: false
---

# Startup Report

Final English report stage. Compose `101-report-document.yaml` from the consolidated evidence ledger and `01`–`08` analysis artifacts.

## Read first

- `100-evidence-ledger.yaml`
- All `01`–`08` English artifacts
- `schemaPath`

## Output

- `101-report-document.yaml`

## Do not

- Do not gather new facts or use search.
- Do not compress the report into a short summary.
- Do not silently drop upstream sections, tables, figures, scenarios, risk registers, or gaps.
- If a critical fact is missing or stale, route back to the owning analysis skill, rerun `startup-ledger`, then compose `101`.

## Required structure

- Report metadata, recommendation, confidence, risk rating, valuation stance, and disclaimer where schema supports them.
- Executive summary chapter with investment highlights, recommendation logic, key KPIs, risks, and valuation summary.
- `startupIntroduction` object.
- Chapters `2`–`9` mapped one-to-one to artifacts `01`–`08`.
- Document-level `tables[]` and `figures[]` preserving upstream IDs/data unless explicitly omitted.
- Preserve each upstream figure's `data` object as semantic chart data; do not normalize it into an all-fields template.
- Appendices only when they add value; number sequentially `A`, `B`, `C`, ... without gaps.

## Coverage rules

- Chapters `2`–`9` must have at least as many sections as their source artifacts.
- Every upstream table and figure must appear in `101` unless explicitly listed in `reportMeta.coverageNotes` with a reason.
- Every canonical claim in `100` should be referenced somewhere in `101`, except IDs explicitly noted as superseded.
- Each chapter section needs narrative (`paragraph` or `callout`) plus relevant table/figure references.
- A table/figure should have one home in the report; avoid duplicate references across chapters/appendices.
- When near-duplicate tables exist across artifacts, keep the freshest/most complete version and record dropped IDs in `coverageNotes`.
- When copying figures into `101`, include only populated/canonical `data` fields for that figure type; never add empty sibling arrays such as `items: []`, `nodes: []`, `edges: []`, `points: []`, `columns: []`, `rows: []`, `series: []`, or `layers: []`.

## Quality gates

- Reject upstream artifacts that are generic, floor-filling, repetitive, or stale.
- Preserve useful detail; do not collapse a rich competitor/customer/risk/financial table into a short summary.
- Use structured figure specs only; no legacy diagram-source fields.
- Numeric chart values must be numbers.
- Reject any figure whose `data` object contains empty placeholder arrays or a populated field disallowed by the figure type.

## Pre-save audit

Internally compute:

- Upstream vs report table counts and omitted IDs.
- Upstream vs report figure counts and omitted IDs.
- Ledger claim count vs report-referenced claim count.
- Chapter coverage for chapters `2`–`9`.

Fix coverage gaps before saving. Do not proceed to `startup-card` if final table/figure counts are unexpectedly low.

## Completion check

- Run `node scripts/sanitize-report-figures.mjs <reportFolder> --check`; if it fails, run without `--check`, review the diff, then rerun validation.
- `101-report-document.yaml` parses and validates against canonical claim IDs.
- Output summary includes path, recommendation, table count, figure count, and website readiness.
