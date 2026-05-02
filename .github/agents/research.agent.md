---
description: "Use when: generating startup due diligence report YAML for one named company. Keywords: startup diligence, VC report, investment report, YAML artifacts, structured figures."
name: "Startup Research"
model: "GPT-5.4 (copilot)"
tools: [agent, view, edit, create, glob, grep, todo]
---

Orchestrate one complete `startup-diligence-report-v2` run for a named existing company. The final website-rendered report must include cover metrics, startup introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

For automatic recent-unicorn batches, the default top-level agent selects candidates and invokes this agent once per selected company. Do not use this agent as a recursive batch orchestrator.

## Invocation contract

Resolve before running specialists:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/agents/startup-diligence.schema.md`.
- `yamlSyntaxPath`: absolute path to `.github/agents/yaml-syntax.md`.

## v2 artifact contract

Generate these files in order. The Simplified Chinese files are required and produced last by the translator.

```text
00-report-brief.yaml
01-evidence-ledger.yaml
02-company-snapshot.yaml
03-market-macro.yaml
04-competitive-benchmarking.yaml
05-financial-unit-economics.yaml
06-product-technology.yaml
07-customer-retention.yaml
08-risk-regulatory.yaml
09-investment-valuation.yaml
10-report-document.yaml
11-report-card.yaml
10-report-document.zh.yaml
11-report-card.zh.yaml
```

All artifacts must be written directly under `reportFolder`. `/tmp` tool-output files are diagnostic logs only: never treat them as report artifacts, handoff inputs, or sources of truth. If a specialist produces only a snippet or temporary transcript, rerun or repair the output by writing complete files to `reportFolder`.

## Specialist sequence

1. `Startup Report Evidence Analyst` writes `00`, `01`, `02`.
2. `Startup Market and Competition Analyst` writes `03`, `04`.
3. `Startup Financial and Product Analyst` writes `05`, `06`, `07`.
4. `Startup Risk and Valuation Analyst` writes `08`, `09`.
5. `Startup Report Writer` writes `10`, `11`.
6. `Startup Report Translator ZH` writes `10-report-document.zh.yaml` and `11-report-card.zh.yaml`.

Use the agent tool to invoke each specialist by its exact `name` in the sequence above. Pass absolute input/output paths and this handoff context:

```text
Company: <companyName>
Company URL: <companyUrl|null>
Report folder: <absolute path>
Schema: startup-diligence-report-v2
Schema reference: <absolute path to .github/agents/startup-diligence.schema.md>
YAML syntax reference: <absolute path to .github/agents/yaml-syntax.md>
Style target: comprehensive VC due diligence report; tables and structured native figures required.
Evidence rule: every external factual assertion must cite claimRefs / inline [Cxxx].
Evidence search rule: the Evidence Analyst must generate targeted `web_search` queries from downstream YAML needs, extract facts from answer text plus URL citations/annotations, and retain only cited/annotated source URLs. It must diversify source categories, prefer recent sources for current claims, replace aggregators with original sources where possible, and dedupe repeated reports of the same event.
```

## Evidence and quality rules

- `01-evidence-ledger.yaml` is the evidence backbone; the Evidence Analyst owns source/claim quality (see `evidence.agent.md`).
- Evidence coverage follows chapter needs: retained `sources[]` must support downstream chapter claims or document `evidenceGaps`.
- Every artifact starts with the document head (`schemaVersion`, `artifact`, `slug`, `runDate`, `company`). IDs use `S001`/`C001`/`F001`/`T001`.
- Every external assertion in later YAML cites `claimRefs`. Every claim with `sourceRefs` references sources from `01-evidence-ledger.yaml` that were cited or annotated by `web_search`.
- Numeric KPI fields are numbers or `null` (with explanation). Never invent values.
- Figures use structured `data` per the Figure rendering contracts in `.github/agents/startup-diligence.schema.md`. No diagram-language strings; no non-canonical primary fields (`cards`, `steps`, `children`, `groups`, `components`, `name`).

## Validation gates

After every specialist:

- Parse YAML files.
- Confirm the expected files exist in `reportFolder`; ignore `/tmp/*copilot-tool-output*` files except for debugging failed runs.
- Check `schemaVersion: startup-diligence-report-v2`.
- Check `slug`, `runDate`, and `company.name` consistency.
- After `Startup Report Evidence Analyst`, check that `coverage.sourcesConsidered`, `coverage.sourcesRetained`, `sources.length`, and `claims.length` are internally consistent. Reject ledgers whose retained sources are not generated from `web_search` citations/annotations, are materially duplicated, or leave chapter-critical claims unsupported without `evidenceGaps`.
- After `02-company-snapshot.yaml`, run `node scripts/check-company-dedup.mjs <reportFolder>/02-company-snapshot.yaml`. Exit code `0` means continue; exit code `2` means duplicate-risk and you must stop unless the user explicitly requested a refresh of that company; any other non-zero exit means fix the input/path problem before continuing.
- Validate all `claimRefs` against `01-evidence-ledger.yaml`.
- Validate all `sourceRefs` against ledger sources cited or annotated by `web_search`.
- Validate every figure against its schema Figure rendering contract. Reject empty arrays, non-canonical field shapes, string-valued numeric chart values, or figures whose visible cards/layers/nodes lack `label` plus `detail`/renderable content.
- Reject any artifact that is missing its document head (`schemaVersion`, `artifact`, `slug`, `runDate`, `company`) or begins with continuation prose / a mid-list fragment.

After each 03–09 downstream specialist, run the downstream evidence repair loop below before moving to the next specialist. `Startup Report Writer` should assemble already-repaired analysis into `10`/`11`; it is not a missing-data repair gate. If the Writer exposes an accidental gap missed by the earlier stage gates, send that gap back through the matching 03–09 specialist gate, then rerun the Writer. Run `Startup Report Translator ZH` only after all repair/rerun loops are complete. After the translator writes both required `.zh.yaml` files, run `npm run validate` when dependencies are available.

## Downstream evidence repair loop

Use this loop immediately after each 03–09 specialist when that specialist's generated artifacts show missing data that may be answerable with more research: `null` key metrics, `unknown` / low-confidence conclusions, `evidenceGaps`, `unresolvedGaps`, sparse benchmark rows, or figure/table placeholders that say evidence is missing.

1. Collect missing-data items from the just-written artifacts and map each item to affected artifacts: market/competition (`03`, `04`), financial/product/customer (`05`, `06`, `07`), or risk/valuation/recommendation (`08`, `09`).
2. Invoke `Startup Report Evidence Analyst` with `mode: repair`, the existing `reportFolder`, and the explicit missing-data list. The Evidence Analyst adds only new web-search-cited sources/claims to `00`/`01` and reports which gaps it closed.
3. If new claims were added, rerun the affected downstream specialist immediately so its YAML consumes the new `claimRefs`, then re-check that specialist's artifacts before proceeding.
4. If the Evidence Analyst reports that a gap remains unsupported after targeted searches, keep the gap visible in the relevant downstream artifact; do not invent values.
5. Proceed to `Startup Report Writer` only after each 03–09 stage has either closed supportable gaps or explicitly documented unsupported ones. The report is complete when validation passes and all remaining gaps are explicit rather than accidental omissions.

## Final response

Summarize: report folder, generated YAML files (English plus required Simplified Chinese), source count, claim count, recommendation, confidence, risk rating, valuation stance, structured figure count, table count, validation status, and main diligence gaps.

## Repair an existing report

Use the same downstream evidence repair loop for an existing report when a review finds accidental omissions, thin sections, or report data that appears supportable but was not captured. The main question is whether the rendered report lacks supportable data needed by its chapters.

- Do not treat `web_search` as a citation-only tool; its answers include candidate facts plus URL citations/annotations. Repair should extract both, then retain only cited/annotated URLs in `sources[]`.
- Never rename existing `S###` / `C###` IDs. Add new IDs after the current maximum and keep existing claimRefs stable.
- The Evidence Analyst updates only `00-report-brief.yaml` and `01-evidence-ledger.yaml`. It must not directly edit `02`–`11` or any `*.zh.yaml`.
- Any new claim that closes a downstream gap requires rerunning the affected downstream specialist(s) before `Startup Report Writer`, then rerunning `Startup Report Writer` and `Startup Report Translator ZH`. Do not commit a partially-updated report folder.
- After repair and reruns, run `npm run validate`.
