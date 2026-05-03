---
name: startup-report
description: "Use when: generating 101-report-document.yaml and 101-report-document.zh.yaml from completed 01-08 analysis artifacts and 100-evidence-ledger.yaml. Keywords: report document, chapters, appendices, coverage, structured figures, Simplified Chinese assembly."
user-invocable: false
---

# Startup Report

Final report assembly stage. This skill produces both the English `101-report-document.yaml` and the Simplified Chinese `101-report-document.zh.yaml` in a single pass: assemble English first, then mirror it into Simplified Chinese while reusing translated chapter content from the `01`–`08.zh.yaml` siblings.

## Read first

- `100-evidence-ledger.yaml`
- All `01`–`08` English artifacts
- All `01`–`08.zh.yaml` siblings
- `schemaPath`
- `.github/references/zh-translation.md`

## Output

- `101-report-document.yaml`
- `101-report-document.zh.yaml`

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

Run a synthesis reflection pass:

- Check whether the executive summary, recommendation logic, risk rating, valuation stance, and appendix gaps faithfully reflect the strongest and weakest upstream evidence.
- Check for contradictions across chapters; resolve date/scope/definition mismatches or carry unresolved conflicts into the report.
- Check whether every top risk, strength, and unresolved gap is backed by canonical claimRefs or explicitly framed as a diligence gap.
- Check whether the report over-polishes thin upstream work; if so, route back to the owning analysis skill rather than smoothing it in `101`.

Fix coverage gaps before saving. Do not proceed to `startup-card` if final table/figure counts are unexpectedly low.

## Completion check (English)

- Run `node scripts/sanitize-report-figures.mjs <reportFolder> --check`; if it fails, run without `--check`, review the diff, then rerun validation.
- `101-report-document.yaml` parses and validates against canonical claim IDs.
- Output summary includes path, recommendation, table count, figure count, and website readiness.

## Simplified Chinese assembly

After `101-report-document.yaml` passes its completion check, build `101-report-document.zh.yaml` by mirroring the English document and reusing translated content from `01`–`08.zh.yaml`.

### Assembly rules

- Mirror English `101` document shape, key order, array order, IDs, enums, dates, numbers, booleans, nulls, `claimRefs`, `tableRef`, and `figureRef` exactly.
- Reuse translated chapter content, tables, figures, and callouts from `01`–`08.zh.yaml` for chapters `2`–`9`.
- Translate only report-unique content: executive summary, cover metrics, startup introduction text, appendices, disclaimer, report metadata, and other fields not present upstream.
- Preserve company, product, person, and investor proper names.
- Preserve figure `data` fields exactly from the translated source or English structure; do not add empty placeholder arrays for unused chart fields.

### Section remap

English `101` chapter `N` maps to source artifact `N-1`.

- `101` section `N.X` must look up Chinese source section `(N-1).X`.
- Example: `101` chapter `2.1` maps to `01-company-snapshot.zh.yaml` section `1.1`.
- Failing this remap leaves chapters `2` and `9` prone to English residue.

### Do not (Chinese stage)

- Do not search or add facts.
- Do not translate enum values, IDs, URLs, metric keys, or claim references.
- Do not collapse, drop, or rewrite any chapter, section, table, figure, appendix, or reference from English `101`.

### Completion check (Chinese)

- Run `node scripts/sanitize-report-figures.mjs <reportFolder> --check`; if it fails, run without `--check`, review the diff, then rerun validation.
- Structural parity with English `101`: chapters, sections, blocks, tables, rows, columns, figures, appendices, cover metrics, founders.
- ID/reference parity: table IDs, figure IDs, claimRefs, `S###`, `C###`, `T###`, `F###` byte-identical.
- Residual-English sweep on translated fields per `zh-translation.md`.
- Source-of-truth check: chapter `2`–`9` text matches the corresponding `XX.zh.yaml` content.
- YAML parses and starts with `schemaVersion: startup-diligence-report-v2`.
