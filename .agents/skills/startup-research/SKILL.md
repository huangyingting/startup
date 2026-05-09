---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

Single entry point for generating a complete `report-v2` startup diligence report.

This skill is intentionally thin. The workflow, inputs, conditions, chapter plan, gates, schemas, vocabularies, renderer contracts, and retry hints are loaded from machine-readable contracts at runtime.

## Sources of truth

- Workflow data: `references/workflow-config.yaml` (`workflow.inputs`, `workflow.conditions`, `workflow.phases`, `agentPolicy`, gates, chapters).
- Executable schemas: `scripts/contracts/workflow-config.schema.mjs`, `scripts/contracts/report-artifacts.schema.mjs`, `scripts/contracts/runtime-context.schema.mjs`.
- Generated agent reference: `references/contracts.md`.
- Runtime projection: `scripts/load-chapter-runtime-context.mjs` output.
- Validator dimensions and fixes: `scripts/validation-catalog.mjs`, surfaced in `runtimeContext.checkDimensions` and validator JSON.

If any prose and a runtime/script output disagree, trust the runtime/script output and fix the source contract rather than copying rules into this file.

## Execution contract

- Gather the inputs declared in `runtimeContext.workflow.inputs`. `companyName` is required; `companyUrl`, `refresh`, and `refreshReason` are optional.
- Follow `runtimeContext.workflow.phases` and `runtimeContext.workflow.conditions`; do not hardcode chapter names, allowed files, policy text, enums, gates, or renderer contracts.
- Treat validation commands as gates. Run them directly and preserve full stdout/stderr and nonzero exit codes. Do not pipe gate output through truncating filters.
- Prefer `--format json` or `--format compact` when supported. Use `failures[].fix`, `objectFailures[].fixes`, `globalHints[]`, `retryOrder[]`, and `suppressedDimensions[]` before guessing.
- Do not enter finalization until every configured chapter file exists and passes `check-chapter` after the final edit.
- The invoking agent owns the final on-disk report. If work is parallelized, synchronously collect every result and verify all final artifacts before reporting success.

## Runtime bootstrap

1. Load the list/runtime contract:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list --format json`
2. Create a report folder using the inputs from `workflow.inputs`:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>]`
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - Exit `2`: a finalized duplicate already exists; stop.
   - Exit `3`: rerun the same command with `--resume`; do not create suffixed duplicate folders.
3. Use the created folder as `<reportFolder>` for every later command. `runtimeContext.run.runDate` is the canonical `runDate` value for YAML heads.

## Chapter generation

For each configured chapter in `runtimeContext.chapters[]`:

1. Load its runtime context:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order <n> --format json --include-context --report-folder <reportFolder>`
   - Omit `--include-context` for the first chapter or when drafting chapters in parallel.
2. Author the chapter YAML at `reportFolder/<runtimeContext.chapter.file>` using:
   - `runtimeContext.chapter` for mission, content requirements, planned tables/figures, quality bar, and gate.
   - `runtimeContext.workflow.agentPolicy` for research and hard rules.
   - `runtimeContext.vocabularies` for enum values.
   - `runtimeContext.rendererContracts` before writing figures.
   - `references/contracts.md` for compact artifact shapes.
3. Search/fetch under audit: review every retained URL with `fetch-url`, record actual queries in `localEvidence.searchQueries[]`, and store sources/claims/questions/gaps in `localEvidence`.
4. Run the chapter gate directly:
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
5. On failure, fix dimensions in `retryOrder[]` first. Treat root-cause dimensions and global hints before object-by-object cosmetic edits.

Parallel chapter drafting is allowed, but all chapters must be rechecked after every chapter YAML exists because net-new-source and cross-chapter-ref checks inspect other on-disk chapters.

## Finalization

Only start after all configured chapter artifacts exist and pass `check-chapter`.

1. Author `report-meta.yaml` from the `ReportMetaSchema` summarized in `references/contracts.md`. It owns the final judgment, cover facts, and company profile fields.
2. Validate report meta shape:
   `node .agents/skills/startup-research/scripts/check-report-meta.mjs <reportFolder> --format json`
3. Run finalization directly:
   `node .agents/skills/startup-research/scripts/finalize-report.mjs <reportFolder>`
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - Pass `--rebuild` only when a fresh evidence-ledger consolidation is required.

Finalization runs report-meta validation, evidence-ledger consolidation, cross-chapter consistency, report assembly, and `check-report`. It stops at the first failing step so the agent can fix the reported source artifact and rerun.

## Hard rules

- Hard rules, retry policy, allowed report files, and final response fields come from `runtimeContext.workflow.agentPolicy` and `runtimeContext.workflow.allowedReportFiles`.
- Do not hand-write generated artifacts (`evidence.yaml`, `full-report.yaml`, `summary-card.yaml`). Fix source chapters or `report-meta.yaml`, then rerun finalization.
- Keep scratch files under `.research-cache/<runId>/`, never under `reports/<runId>/`.
- Set every artifact `slug` to the company slug only: the report folder basename with the leading timestamp removed.
