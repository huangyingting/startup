---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

Single entry point for generating a complete `report-v2` startup diligence report.

Keep the workflow simple: load the ordered chapter config, generate each chapter, run its gate, iterate only failed parts, then build the final artifacts.

## Inputs

- `companyName` — required.
- `companyUrl` — optional identity anchor.
- `runTimestamp` — UTC `YYYYMMDDHHmmss`.
- `currentDate` — actual session date; use it for freshness and `runDate`.
- `disclosureProfile` — optional; one of `public | private-disclosed | private-undisclosed | stealth`. Set this when the company is publicly known to be stealth or to keep its financials undisclosed; passing it into `create-report-run.mjs --disclosure <value>` writes a `disclosure-hint.yaml` whose `canonicalEvidenceGaps[]` chapter 04 must adopt instead of rediscovering.
- `refresh` — optional boolean; when set, the workflow refreshes the existing current report for `companyName`/`companyUrl` (the previous run is auto-resolved from the company match).
- `refreshReason` — optional human reason for refreshing an existing report.

## Required setup

1. Read `./references/report-schema-v2.md`, `./references/workflow-config-schema-v1.md`, `./references/yaml-rules.md`, and `./references/chapter-runtime-context-schema-v2.md` (the runtime projection emitted by the chapter loader).
2. Load the workflow runtime context:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list --format json`

   Treat the loader output as the runtime contract. In particular:
   - `workflow.agentPolicy` carries skill-facing policy: volatile facts, retry policy, research rules, chapter authoring rules, hard rules, and final response fields.
   - `workflow.allowedReportFiles` carries the permitted chapter, hand-authored, and generated files under `reports/<runId>/`.
   - `vocabularies`, `checkDimensions`, and `rendererContracts` carry the canonical enums, retry dimensions/default fixes, and figure contracts.

3. Create the report folder:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <runTimestamp> <companyName> [--website <companyUrl>] [--disclosure <disclosureProfile>]`

   Pass `--disclosure` whenever you set `disclosureProfile` in the Inputs. It writes `.research-cache/<runTimestamp>-<companySlug>/disclosure-hint.yaml`, which chapter runtime contexts surface as `runtimeContext.runCache.disclosureHint`; chapter 04 should adopt those canonical evidence gaps. Also set the same value as `companyProfile.disclosureProfile` in `report-meta.yaml`.

   For an explicit full refresh of an existing report, create a new run instead of overwriting the old one:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <runTimestamp> <companyName> [--website <companyUrl>] --refresh [--refresh-reason <refreshReason>]`

   Refresh mode writes `.research-cache/<runTimestamp>-<companySlug>/refresh-context.yaml` with the prior run summary. Use it only as background/diff context. Re-fetch every item in `workflow.agentPolicy.volatileFacts`; do not copy stale volatile claims without re-verifying them. Refresh still runs the full chapter loop and normal gates.

If folder creation exits `2`, stop: a finalized report already exists for this company/domain (the duplicate guard walks every `reports/<runId>/summary-card.yaml`). If it exits `3`, the same in-progress folder already exists; rerun the exact same command with `--resume` and continue that folder. Use `--resume` only after exit `3`; it exits `4` when there is no in-progress folder to resume. Do not create `-2` suffixed duplicate folders.

## Chapter loop

For each chapter `order` from the loader:

1. **Load the chapter runtime context.**
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order <n> --format json --include-context --report-folder <reportFolder>`
   Drop `--include-context` for chapter 1 (no earlier chapters yet); keep it from chapter 2 onward to surface `contextChapters[]`, `cumulativeContext`, and `runCache`. The flag is advisory and never changes gates.
2. **Author from the runtime context.** Use `runtimeContext.chapter` as the brief and `runtimeContext.chapter.gate` as the binding gate. Author against `runtimeContext.workflow.agentPolicy` (researchRules, chapterAuthoringRules, hardRules, volatileFacts), `runtimeContext.vocabularies`, `runtimeContext.rendererContracts`, and `runtimeContext.checkDimensions` rather than memorising literals from this file. Detailed YAML shapes remain in `references/report-schema-v2.md`.
3. **Plan typed research questions.** Generate at least `gate.minResearchQuestions` items in `localEvidence.researchQuestions[]`, cover the required question type mix and content targets from `runtimeContext.chapter`, and close questions through `claim.answersQuestionRefs` or typed evidence gaps.
4. **Search and fetch under audit.** Use web search to find URLs, then review each kept URL with `fetch-url`:
   `node .agents/skills/fetch-url/scripts/fetch.mjs <url>`
   Default output is readable extracted text; add `--full-text` only when needed. Record the actual queries in `localEvidence.searchQueries[]`; leaving this empty when research questions exist is a gate failure.
5. **Build local evidence.** Convert reviewed URLs into `localEvidence.sources[]`, then write atomic `localEvidence.claims[]`. Meet the diversity, net-new-source, required-source-type, adverse-source, and high-confidence corroboration floors from `runtimeContext.chapter.gate`.
6. **Write the chapter YAML** at `reportFolder/<chapter.file>` per the report schema. Populate `sections[]`, `tables[]`, `figures[]`, `callouts[]`, and `evidenceGaps[]` from the same local evidence ledger. Honor planned tables/figures where the evidence fits; when it does not, document the table/figure substitution or unresolved gap in typed `evidenceGaps[]`.
7. **Run the chapter check** with structured output:
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
   Exit `0` means the chapter is ready. On nonzero exit, parse the JSON for:
   - `globalHints[]` — chapter-wide root causes (one dimension failing on ≥3 objects); fix these first.
   - `objectFailures[]` — failures grouped by table/figure/claim/question id, each with the full `dimensions[]` and `fixes[]` for that object.
   - `failures[]` — per-issue entries; each carries `dimension`, `message`, and a one-line `fix` action.
   - `failedDimensions[]` and `retryOrder[]` (root-cause sorted) for the dimensions you must clear.
   - `suppressedDimensions[]` — downstream checks skipped because an upstream failure (e.g. `localEvidenceMissing`) makes them trivially fail; they will re-evaluate after you fix the root cause.
8. **Advance** with `runtimeContext.nextChapter`; if it is `null`, move to finalization.

### Retry scope

`check-chapter` emits stable dimensions and fixes in JSON. Work `retryOrder[]` first, use `failure.fix` / `objectFailures[].fixes[]`, and respect `runtimeContext.workflow.agentPolicy.retryPolicy` for retry count and progress requirements. To accept a `--strict` warning instead of fixing it, add `acknowledgedWarnings[]` with the warning dimension and a reason of at least 30 characters.

### Parallel authoring

The 8 analysis chapters can be drafted in parallel: each chapter owns its ID namespace via `runtimeContext.chapter.letter`, and the evidence ledger dedupes by canonical URL at finalize. Caveats: `--include-context` only sees chapters already on disk (skip it when fanning out), and `gate.minNetNewSources` plus `crossChapterRefLeak` cross-read sibling chapters — run all 8 `check-chapter` passes after every chapter YAML exists, and expect retries when those gates flag URL overlap. `finalize-report` itself stays single-threaded.

## Finalization

After all analysis chapters pass:

1. Author `report-meta.yaml` in the report folder per the `report-meta` schema in `references/report-schema-v2.md`. It carries the judgment fields the analysis chapters do not encode. Any prior finalized report with a matching disclosure profile can be used as a shape example, but volatile facts still need fresh evidence.
2. Run the finalization pipeline:
   `node .agents/skills/startup-research/scripts/finalize-report.mjs <reportFolder>`
   For a refresh run, pass the same flag and reason:
   `node .agents/skills/startup-research/scripts/finalize-report.mjs <reportFolder> --refresh [--refresh-reason <refreshReason>]`
   Finalization runs `build-evidence-ledger`, `check-cross-chapter-consistency`, `assemble-report`, and `check-report`; refresh also links the old and new report revisions. Stops at the first failing step so you can fix `report-meta.yaml` or the offending chapter and re-run. Pass `--rebuild` only when you need fresh evidence-ledger consolidation.

## Hard rules

Hard rules, allowed report-folder files, and required final-response fields all come from the runtime context (`runtimeContext.workflow.agentPolicy.hardRules`, `runtimeContext.workflow.allowedReportFiles`, `runtimeContext.workflow.agentPolicy.finalResponseFields`).
