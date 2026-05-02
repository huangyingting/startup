---
name: startup-report
description: "Use when: generating 101-report-document.yaml from completed 01-08 analysis artifacts and 100-evidence-ledger.yaml. Keywords: report document, chapters, appendices, structured figures."
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

Before writing `101`, audit `01`–`08` for freshness and depth. If a volatile claim is stale relative to `currentDate`—financing, valuation, product release, customer metric, pricing, lawsuit status, or regulatory posture—route back to the owning skill, refresh the raw artifact, rerun `startup-ledger`, then write `101`. If an upstream artifact is too thin for a detailed investment view, deepen it first.

## Document requirements

- Include professional report metadata where supported by schema: title, prepared-by/generated-using fields if available, recommendation, confidence, risk rating, valuation stance, and disclaimer.
- Build an executive summary chapter with investment highlights, recommendation summary, target return/hold period when supported, key KPI table, thesis overview, key risks, and valuation summary.
- Include cover metrics derived from upstream artifacts: valuation, funding, revenue/run-rate, transaction/payment volume, customer count, headcount, and company-specific KPIs where supported.
- Include a structured graphical abstract / investment thesis overview figure when upstream artifacts support it; use a native structured figure such as `flow`, `decision-map`, or `recommendation-logic`, not Mermaid.
- Create an opening `startupIntroduction` object.
- Create numbered chapters with section blocks, callouts, tables, and structured native figures.
- Preserve canonical `claimRefs` from `100-evidence-ledger.yaml` for every factual block, table, and figure.
- Use only schema-listed `reportMeta` keys.
- Include appendices when upstream artifacts support them: detailed financial/projection model, competitive feature deep dive, management team, investor base, source notes, unresolved diligence gaps, and disclaimer. Number appendices sequentially `A`, `B`, `C`, ... in the order they appear; never skip a letter (e.g. if the only appendix is "Final diligence asks", its `id` is `A`, not `B`).
- Each appendix block must add new value relative to the chapters that already render. Do not reference a `tableRef` or `figureRef` that is already shown in a chapter section unless the appendix groups it with other tables/figures into a new analytical view (e.g. a financial appendix combining T401, T402, T405 into one place). Avoid putting the same `tableRef` in two appendix blocks.
- Do not reference the same `tableRef` or `figureRef` from more than one chapter section (e.g. do not repeat a risk register in both the executive summary and the risk chapter; the executive summary should cite findings in narrative or callouts, not duplicate the underlying table). Each table/figure should have exactly one home in the report.
- When two analysis artifacts produce near-duplicate tables on the same topic (e.g. a financing chronology in `01-company-snapshot.yaml` AND `04-financial-unit-economics.yaml` AND `08-investment-valuation.yaml`), keep only the most complete version in `101-report-document.yaml` (typically the one with the most columns or freshest evidence) and drop the others from `101.tables[]` plus the chapter blocks that referenced them. Record the dropped IDs in `reportMeta.coverageNotes`.
- Appendix blocks may use `paragraph`, `list`, `equation`, `callout`, `table`, and `figure`. Put appendix tables/figures in document-level `tables[]` / `figures[]` and reference them via `tableRef` / `figureRef`.

## Coverage requirements (default include, never silently drop)

The final report must consume the analysis record, not summarize it away. Apply these defaults; document any exception explicitly.

- Chapter mapping: chapters `2`–`9` of `101` map one-to-one to artifacts `01`–`08`. Each chapter must contain at least as many `sections[]` as the source artifact's `sections[]`, with matching titles (translated/refined for narrative flow is fine; collapsing two source sections into one is not, unless the source section is empty).
- Tables: every `tables[].id` from `01`–`08` (e.g. `T101`, `T202`, `T706`) must appear in `101.tables[]` with the same `id`, columns, rows, and `notes` preserved. If a table is too detailed for narrative flow, reference it from an appendix block via `tableRef` rather than dropping it.
- Figures: every `figures[].id` from `01`–`08` must appear in `101.figures[]` with the same `id` and `data` preserved. If a figure does not fit a chapter section, reference it from an appendix block via `figureRef`.
- Claims: every canonical claim ID in `100-evidence-ledger.yaml` should be referenced by at least one `claimRefs` somewhere in `101` (chapter block, table, figure, or appendix). Unreferenced claims indicate analysis content was dropped.
- Sections: each chapter section must include at least one `paragraph` or `callout` block plus, where the source artifact has them, the corresponding `table` and/or `figure` block. Do not produce chapter sections that only point to a table without narrative.
- Executive summary (chapter `1`) is in addition to chapters `2`–`9`, not a replacement; it summarizes, the per-domain chapters preserve depth.
- If an analysis table or figure is genuinely unfit for the final report (e.g. duplicates another artifact's table), record the omission and reason in `reportMeta.coverageNotes` (string) and reference the omitted IDs there; never drop silently. Do not create an `appendix` titled `Coverage notes` when nothing is actually omitted — empty meta-notes pollute the appendix.

## Pre-save coverage check

Before saving `101`, compute and verify:

1. `sectionCountPerChapter[chapter N for N in 2..9] >= len(artifact[N-1].sections)`. Note the off-by-one: `101` chapter `N` corresponds to analysis artifact `XX = N-1` (chapter 2 ↔ `01-company-snapshot.yaml`, chapter 9 ↔ `08-investment-valuation.yaml`). When you renumber the source artifact's sections from `(N-1).X` to `N.X` for inclusion in `101`, keep an explicit mapping comment so `startup-report-zh` can reverse the remap when assembling `101-report-document.zh.yaml`.
2. `set(101.tables[*].id) >= union(artifact[01..08].tables[*].id)` minus IDs explicitly listed in `reportMeta.coverageNotes`.
3. `set(101.figures[*].id) >= union(artifact[01..08].figures[*].id)` minus IDs explicitly listed in `reportMeta.coverageNotes`.
4. `set(claimRefs collected from 101) >= set(100-evidence-ledger.yaml.claims[*].id)` minus IDs explicitly noted as superseded.
5. Appendix-ready depth retained: financing chronology, financial models, feature matrices, management/investor tables, customer proof, risk registers, valuation scenarios, and stop-loss triggers from `01`–`08` are present either in their chapter or in an appendix.

If any check fails, fix the report (add the missing section, table, figure, or claim reference) before saving rather than relaxing the threshold.

## Synthesis vs preservation

`101` adds investor judgment on top of the raw record; it does not replace it.

- Synthesize: write narrative paragraphs, executive summary, recommendation logic, and connect facts across chapters.
- Preserve: keep every supported table row, figure node, scenario assumption, and risk register entry from `01`–`08`. Do not collapse a 7-row competitor table into a 3-row summary.
- Refine: clarify wording, fix duplication across artifacts, and reorder for readability. Refining is not the same as dropping.

## Figure rules

- Use structured figure specs only: `type`, `layout`, `summary`, and typed `data` arrays.
- Enforce schema Figure rendering contracts.
- Normalize non-canonical upstream fields before writing.
- Preserve semantic figure types such as `market-sizing-lens`, `unit-economics-waterfall`, `customer-surface-map`, `architecture-stack`, `risk-transmission-map`, and `recommendation-logic`.
- Do not emit legacy diagram-source fields or diagram-language source.

## Handoff note

After writing, record a concise internal summary: output path, recommendation, figure count, table count, and website readiness.