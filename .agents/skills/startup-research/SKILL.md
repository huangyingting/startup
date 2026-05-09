---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

## Sources of truth

- Workflow data: `references/workflow-config.yaml` (`workflow.inputs`, `workflow.conditions`, `workflow.phases`, `agentPolicy`, gates, chapters).
- Generated agent reference: `references/contracts.md`.
- Runtime projection: `scripts/load-chapter-runtime-context.mjs` output.
- Validator dimensions and fixes: surfaced in `runtimeContext.checkDimensions` and validator JSON.

If any prose and a runtime/script output disagree, trust the runtime/script output and fix the source contract rather than copying rules into this file.

## Execution contract

- Follow `runtimeContext.workflow.phases` and `runtimeContext.workflow.conditions`; do not hardcode chapter names, allowed files, policy text, enums, gates, or renderer contracts.
- Treat validation commands as gates. Run them directly and preserve full stdout/stderr and nonzero exit codes. Do not pipe gate output through truncating filters.
- Prefer `--format json` or `--format compact` on the `check-*` validators when machine-readable output helps. Use `failures[].fix`, `objectFailures[].fixes`, `globalHints[]`, `retryOrder[]`, and `suppressedDimensions[]` before guessing.

## Runtime bootstrap

1. Load the list/runtime contract:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list`
2. Create a report folder using the inputs from `workflow.inputs`:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>]`
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - Exit `1`: bad CLI arguments or a non-recoverable failure; read stderr (every script prefixes its messages with `[script-name]`) for the offending field, fix it, then rerun.
   - Exit `2`: a finalized duplicate already exists; stop.
   - Exit `3`: rerun the same command with `--resume`; do not create suffixed duplicate folders.
   - Exit `4`: a required target (e.g. the `--resume` folder, or `report-meta.yaml` at finalization) does not exist; create it and rerun.
3. Use the created folder as `<reportFolder>` for every later command. The runId is the folder basename, and `runtimeContext.run.runDate` (emitted by the per-chapter loader call below when `--include-context` is used) is the canonical `runDate` for chapter YAML heads — derive every head's `runDate` from it instead of the model clock.
4. Export `STARTUP_FETCH_LOG_PATH=.research-cache/<runId>/_fetch-log.jsonl` (where `<runId>` is the `<reportFolder>` basename) for every later `fetch-url` invocation in this run. `fetch-url` appends one JSON line per fetch; `check-chapter` reads the trail and emits an `unverifiedSource` **warning** for each cited URL not found in it. The warning only blocks the gate when `check-chapter` is run with `--strict` (recommended as a pre-finalization sweep); without the env var, every cited URL is silently treated as verified.

## Chapter generation

For each configured chapter in `runtimeContext.chapters[]`:

1. Load its runtime context:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order <n> --include-context --report-folder <reportFolder>`
   - The loader always emits JSON to stdout; do not pass `--format`.
   - Omit `--include-context` for the first chapter or when drafting chapters in parallel.
2. Author the chapter YAML at `reportFolder/<runtimeContext.chapter.file>` using:
   - `runtimeContext.chapter` for mission, content requirements, planned tables/figures, quality bar, and gate.
   - `runtimeContext.workflow.agentPolicy` for research and hard rules.
   - `runtimeContext.vocabularies` for enum values.
   - `runtimeContext.rendererContracts` before writing figures.
   - `references/contracts.md` for compact artifact shapes.
   - Every `S/C/T/F/Q` id you mint must carry **this chapter's** `runtimeContext.chapter.letter` (e.g. for chapter `letter: O`, ids look like `SO001`, `CO045`, `TO008`). Reusing an id from another chapter (e.g. `CO045` inside the chapter whose letter is `M`) trips the `crossChapterRefLeak` dimension; restate the underlying fact as a new local claim with this chapter's letter and its own `sourceRefs[]` instead.
3. Search → fetch → record (in this order):
   - Run searches to discover candidate sources; record each query you actually issued in `localEvidence.searchQueries[]`.
   - For each retained URL, retrieve it with the [`fetch-url`](../fetch-url/SKILL.md) skill (with `STARTUP_FETCH_LOG_PATH` set, this also writes the fetch trail that `unverifiedSource` audits against).
   - Store reviewed sources, atomic claims, typed research questions, and typed evidence gaps in `localEvidence`.
4. Run the chapter gate directly:
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
   - Add `--strict` to also fail on warnings; useful as a pre-finalization sweep once the chapter is otherwise clean. Combine with `acknowledgedWarnings` (below) for warnings that are intentional.
5. On failure, fix dimensions in `retryOrder[]` first. Treat root-cause dimensions and global hints before object-by-object cosmetic edits.
   - Honor `runtimeContext.workflow.agentPolicy.retryPolicy`: stop after `maxChapterRetries` attempts, and each retry must reduce the failure count (`requireMonotonicFailureDecrease`). If the budget is exhausted with failures still present, stop and report the chapter as blocked rather than looping.
   - When a `--strict` warning is intentional (e.g. `tableNotes` for a pure factual snapshot whose dimension's `defaultFix` explicitly tells you to acknowledge it), opt out by adding a top-level `acknowledgedWarnings: [{ dimension, reason }]` entry to the chapter YAML. `reason` must be at least 30 characters and explain why the warning is non-actionable. Never use this to silence real failures.

Parallel chapter drafting is allowed: author each chapter and run its own `check-chapter` independently, then **re-run `check-chapter` once on every chapter after the last YAML lands** — net-new-source and cross-chapter-ref checks inspect on-disk siblings, so a chapter can pass in isolation and fail once a peer is added (or vice versa).

## Finalization

Only start after all configured chapter artifacts exist and pass `check-chapter`.

1. Author `report-meta.yaml` from the `ReportMetaSchema` summarized in `references/contracts.md`. It owns the final judgment, cover facts, and company profile fields.
2. Validate report meta shape:
   `node .agents/skills/startup-research/scripts/check-report-meta.mjs <reportFolder> --format json`
   - This step validates shape and enums only. Cross-references such as `coverFacts[].claimRefs` are resolved later by `build-report` against the consolidated `evidence.yaml`; dangling refs surface there, not here.
3. Run finalization directly:
   `node .agents/skills/startup-research/scripts/finalize-report.mjs <reportFolder>`
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - **Pass `--rebuild` whenever you edited any chapter's `localEvidence` since the last successful finalize** (added/removed/renamed claims, sources, research questions, or evidence gaps). Without it, finalize reuses the existing `evidence.yaml`, so `check-cross-chapter` and `build-report` see the *old* evidence and your edits are silently ignored. Skip `--rebuild` only when you edited prose-only fields outside `localEvidence` (e.g. `chapter.summary`, `sections[].body`, `tables[].notes`). Cost: `--rebuild` re-derives `evidence.yaml`'s consolidated entries from scratch — chapter-letter ids in each chapter file are stable, but the *consolidated ledger's* `canonical` pointers may shift.

Finalization is a sequential pipeline; it stops at the first failing step and exits with that step's code. Triage by step name printed to stderr (`[finalize-report] -> <step>` then `[finalize-report] <step> failed`):

| Step | Script | Fix target on failure |
|---|---|---|
| `check-report-meta` | `check-report-meta.mjs` | `report-meta.yaml` shape/enum issues |
| `prepare-refresh` (refresh only) | `link-refresh.mjs --prepare-current` | ensure the prior `current` report exists, is finalized, and its `summary-card.yaml` carries the matching `company.name` / `company.website` |
| `build-evidence-ledger` | `build-evidence-ledger.mjs` | a chapter `localEvidence` block (the script names the chapter and offending id) |
| `check-cross-chapter` | `check-cross-chapter.mjs` | metric drift, key-fact overlap, or duplicate analysis across chapter YAMLs |
| `build-report` | `build-report.mjs` | a chapter or `report-meta.yaml` field that the assembler could not project |
| `check-report` | `check-report.mjs` | report-level gates (domain diversity, adverse-source distribution, paywall ceiling) |
| `link-refresh` (refresh only) | `link-refresh.mjs` | only fires after publishability passes; usually a stale `summary-card.yaml` on the prior run |

When `finalize-report` exits 0, summarize the run for the user using every field listed in `runtimeContext.workflow.agentPolicy.finalResponseFields`. Pull the values straight from the produced `summary-card.yaml` / `full-report.yaml` / `evidence.yaml`; do not paraphrase or omit fields.

### Refresh runs

`--refresh` rewires the revision graph in addition to producing a normal report:

1. `create-report-run.mjs --refresh` finds the most recent finalized `current` report for the same company/domain and writes `.research-cache/<runId>/refresh-context.yaml`.
2. The chapter loader projects that file as `runtimeContext.runCache.refreshContext`. Read it for prior-run summary, score, recommendation, and key metrics — but treat every `agentPolicy.volatileFacts` value as stale and re-fetch it.
3. `finalize-report.mjs --refresh` runs `link-refresh.mjs` twice: once before assembly to mark the new run `revision.status=current`, and once after `check-report` passes to flip the prior run's `revision.status` to `superseded` and reassemble its `summary-card.yaml`/`full-report.yaml` so cross-references stay consistent.
4. You do not need to author `revision` in `report-meta.yaml`. `link-refresh.mjs` (run automatically by the `prepare-refresh` and `link-refresh` finalize steps) writes `revision.status: current`, `revision.refreshOfRunId` (resolved from a company/domain match against finalized `current` reports), `revision.supersededByRunId: null`, and `revision.refreshReason` onto the new `report-meta.yaml`, plus the back-pointer `supersededByRunId` on the prior run. Set `revision.refreshOfRunId` explicitly only to disambiguate when more than one finalized `current` report matches the same company/domain.
5. Pass the **same** `--refresh-reason` string to both `create-report-run.mjs` and `finalize-report.mjs`. They write it to different files (refresh-context cache vs. `revision.refreshReason` on the new and prior `report-meta.yaml`), and a mismatch makes the audit trail inconsistent without raising an error.

## Authoritative policy

The binding rules are in `runtimeContext.workflow.agentPolicy` (`hardRules`, `researchRules`, `chapterAuthoringRules`, `retryPolicy`, `volatileFacts`, `finalResponseFields`) and `runtimeContext.workflow.allowedReportFiles`. Read them from the runtime context; do not paraphrase them in this file.
