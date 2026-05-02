---
name: startup-report-zh
description: "Use when: assembling 101-report-document.zh.yaml from 01-08.zh.yaml siblings and 101-report-document.yaml. Keywords: Chinese localization, Simplified Chinese report document, assembly."
user-invocable: false
---

# Startup Report ZH

Use this skill after `101-report-document.yaml` exists and validates, and after every `01-08.zh.yaml` Simplified Chinese sibling exists.

## Outputs

Write exactly:

- `101-report-document.zh.yaml`

## Responsibility

Assemble the Simplified Chinese report by reusing already-translated content from `01–08.zh.yaml`. Translate only the small set of fields that exist in `101-report-document.yaml` but not in any `01–08` artifact (executive summary, cover metrics, appendices, disclaimer, report-level metadata).

This is primarily a structural copy job. The `startup-report` skill produced `101-report-document.yaml` by composing analysis artifacts; this skill produces `101-report-document.zh.yaml` by composing the same English structure with the corresponding Chinese strings drawn from each `XX.zh.yaml`.

Read `.github/references/zh-translation.md` before writing.

## Assembly procedure

1. Load `101-report-document.yaml`, every `01–08.yaml`, and every `01–08.zh.yaml`.
2. For each chapter `2–9` of `101-report-document.zh.yaml`, mirror the chapter structure of `101-report-document.yaml`.
   - For each section block whose source is a chapter section in an analysis artifact, copy the title and body from the matching `XX.zh.yaml` section by section number.
   - For each `table` block, the table itself is referenced by `tableRef`; copy the corresponding entry from the union of `01–08.zh.yaml` `tables[]` into the document-level `tables[]`.
   - For each `figure` block, copy the corresponding entry from the union of `01–08.zh.yaml` `figures[]` into the document-level `figures[]`.
   - For each `callout` block, copy the corresponding callout from the matching `XX.zh.yaml` `callouts[]`.
3. For chapter `1` (Executive Summary) and any other content unique to `101-report-document.yaml` (cover metrics, startup introduction text, executive callouts, executive `list[]` items, appendices, disclaimer, `reportMeta.title`, `reportMeta.coverageNotes`, `company.subtitle`), translate directly from the English `101-report-document.yaml` into Simplified Chinese, following `.github/references/zh-translation.md`.
4. Preserve every figure, table, and claim ID and every `claimRefs` array exactly as written in `101-report-document.yaml`.
5. Keep the document key order, array order, and YAML serialization style identical to `101-report-document.yaml`.

## Translate (only these fields are net new at this stage)

- `company.subtitle`
- `reportMeta.title`
- `coverMetrics[].label`, `coverMetrics[].unit`
- `startupIntroduction.summary`, `productSummary`, `customerFocus`, `businessModel`, `stage`, `fundingStatus`, `headquarters`, `foundingLocation`, `founders[].role`, `founders[].background`
- Chapter `1` (Executive Summary) `chapters[0].title`, `sections[].title`, every block `title`, `body`, and `items[]` entry
- Any new appendix block authored in `101-report-document.yaml` that does not appear in an analysis artifact
- `disclaimer`

## Reuse (do not re-translate)

- Chapters `2–9`: section titles, section bodies, callout titles/bodies, table titles/columns/rows/notes, figure titles/summaries/data labels and details, and approximation notes already present in `01–08.zh.yaml`.
- The website renders source citations directly from `100-evidence-ledger.yaml` `sources[]`; `101-report-document.yaml` does not carry a `bibliography` array, so there is nothing to copy here.

## Preserve exactly

- All schema keys, ID formats, enums, URLs, dates, numeric values, booleans, and nulls.
- Order of arrays and shape of every nested object, byte-identical to `101-report-document.yaml`.
- Company, product, person, and investor proper names.

## Do not

- Do not call `web_search`.
- Do not invent facts, soften or strengthen claims, or rewrite analysis.
- Do not produce content that disagrees with `101-report-document.yaml` on numbers, IDs, claim references, or recommendation enums.
- Do not collapse, drop, or rewrite any chapter, section, table, figure, or appendix that exists in `101-report-document.yaml`.

## Completion check before saving

1. Structural parity: counts of `chapters`, `sections`, `blocks`, `tables`, `tables[].rows`, `tables[].columns`, `figures`, `figures[].data` arrays, `appendices`, `appendices[].blocks`, `coverMetrics`, and `founders` equal `101-report-document.yaml`.
2. ID/reference parity: `set(101.zh.tables[*].id) == set(101.tables[*].id)`; `set(101.zh.figures[*].id) == set(101.figures[*].id)`; every `claimRefs`, `tableRef`, `figureRef`, `S###`, `C###`, `T###`, `F###` value is byte-identical to the English source.
3. Residual-English sweep on translated fields (chapter 1 plus the `Translate` list above), per `.github/references/zh-translation.md`.
4. Source-of-truth check: for each chapter `2–9` block, confirm the corresponding section/table/figure/callout text matches the matching `XX.zh.yaml` content. If a Chinese sibling is missing or stale, stop and rerun the relevant analysis skill before writing `101-report-document.zh.yaml`.
5. Style parity: line count is within roughly ±10% of `101-report-document.yaml`.
6. Parse: the file parses as YAML and starts with `schemaVersion: startup-diligence-report-v2`.

## Handoff note

After writing, record a concise internal summary: output path, chapters/sections/tables/figures assembled, sources of translated text (which `XX.zh.yaml` provided which content), and `artifactTranslated: 101-report-document`.
