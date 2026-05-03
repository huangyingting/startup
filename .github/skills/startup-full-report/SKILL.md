---
name: startup-full-report
description: "Use when: generating 91-full-report.yaml from completed 01-08 analysis artifacts and 90-evidence.yaml. Keywords: full report, chapters, appendices, coverage, structured figures."
user-invocable: false
---

# Startup Full Report

Final report assembly stage. This skill produces the English `91-full-report.yaml` from completed analysis artifacts and the consolidated evidence file.

## Read first

- `90-evidence.yaml`
- All `01`–`08` English artifacts
- `schemaPath`

## Output

- `91-full-report.yaml`

## Do not

- Do not gather new facts or use search.
- Do not compress the report into a short summary.
- Do not silently drop upstream sections, tables, figures, scenarios, risk registers, or gaps.
- If a critical fact is missing or stale, route back to the owning analysis skill, rerun `startup-evidence`, then compose `91`.

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
- Every upstream table and figure must appear in `91` unless explicitly listed in `reportMeta.coverageNotes` with a reason.
- Every canonical claim in `90` should be referenced somewhere in `91`, except IDs explicitly noted as superseded.
- Each chapter section needs narrative (`paragraph` or `callout`) plus relevant table/figure references.
- A table/figure should have one home in the report; avoid duplicate references across chapters/appendices.
- When near-duplicate tables exist across artifacts, keep the freshest/most complete version and record dropped IDs in `coverageNotes`.
- When copying figures into `91`, include only populated/canonical `data` fields for that figure type; never add empty sibling arrays such as `items: []`, `nodes: []`, `edges: []`, `points: []`, `columns: []`, `rows: []`, `series: []`, or `layers: []`.

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

Run a synthesis reflection pass:

- Check whether the executive summary, recommendation logic, risk rating, valuation stance, and appendix gaps faithfully reflect the strongest and weakest upstream evidence.
- Check for contradictions across chapters; resolve date/scope/definition mismatches or carry unresolved conflicts into the report.
- Check whether every top risk, strength, and unresolved gap is backed by canonical claimRefs or explicitly framed as a diligence gap.
- Check whether the report over-polishes thin upstream work; if so, route back to the owning analysis skill rather than smoothing it in `91`.

Fix coverage gaps before saving. Do not proceed to `startup-summary-card` if final table/figure counts are unexpectedly low.

## Completion check (English)

- Run `node scripts/sanitize-report-figures.mjs <reportFolder> --check`; if it fails, run without `--check`, review the diff, then rerun validation.
- `91-full-report.yaml` parses and validates against canonical claim IDs.
- Output summary includes path, recommendation, table count, figure count, and website readiness.

