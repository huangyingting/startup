---
name: startup-report-zh
description: "Use when: assembling 101-report-document.zh.yaml from 101-report-document.yaml and 01-08.zh.yaml siblings. Keywords: Simplified Chinese report document, localization, structural parity, section remap."
user-invocable: false
---

# Startup Report ZH

Chinese report assembly stage. Build `101-report-document.zh.yaml` by mirroring the English `101` structure and reusing translated content from `01`–`08.zh.yaml`.

## Read first

- `101-report-document.yaml`
- All `01`–`08.yaml`
- All `01`–`08.zh.yaml`
- `.github/references/zh-translation.md`

## Output

- `101-report-document.zh.yaml`

## Assembly rules

- Mirror English `101` document shape, key order, array order, IDs, enums, dates, numbers, booleans, nulls, `claimRefs`, `tableRef`, and `figureRef` exactly.
- Reuse translated chapter content, tables, figures, and callouts from `01`–`08.zh.yaml` for chapters `2`–`9`.
- Translate only report-unique content: executive summary, cover metrics, startup introduction text, appendices, disclaimer, report metadata, and other fields not present upstream.
- Preserve company, product, person, and investor proper names.
- Preserve figure `data` fields exactly from the translated source or English structure; do not add empty placeholder arrays for unused chart fields.

## Section remap

English `101` chapter `N` maps to source artifact `N-1`.

- `101` section `N.X` must look up Chinese source section `(N-1).X`.
- Example: `101` chapter `2.1` maps to `01-company-snapshot.zh.yaml` section `1.1`.
- Failing this remap leaves chapters `2` and `9` prone to English residue.

## Do not

- Do not search or add facts.
- Do not translate enum values, IDs, URLs, metric keys, or claim references.
- Do not collapse/drop/rewrite any chapter, section, table, figure, appendix, or reference from English `101`.

## Completion check

- Run `node scripts/sanitize-report-figures.mjs <reportFolder> --check`; if it fails, run without `--check`, review the diff, then rerun validation.
- Structural parity with English `101`: chapters, sections, blocks, tables, rows, columns, figures, appendices, cover metrics, founders.
- ID/reference parity: table IDs, figure IDs, claimRefs, `S###`, `C###`, `T###`, `F###` byte-identical.
- Residual-English sweep on translated fields per `zh-translation.md`.
- Source-of-truth check: chapter `2`–`9` text matches the corresponding `XX.zh.yaml` content.
- YAML parses and starts with `schemaVersion: startup-diligence-report-v2`.
