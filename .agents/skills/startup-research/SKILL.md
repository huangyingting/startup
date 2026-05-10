---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

This file is the workflow narrative: what to run, in what order, with which flags. Two generated companions carry the static reference material; load both into context **in full at session start** (≈45 KB combined — small enough to keep resident, large enough that round-tripping during chapter authoring is wasteful), **`rules.md` first** (it defines the agent policy, ID system, and dimension vocabulary that `contracts.md` then cross-references):

- [`references/rules.md`](references/rules.md) — binding agent policy, gates, ID system, validator dimensions, and figure renderer contracts.
- [`references/contracts.md`](references/contracts.md) — field shapes for the chapter analysis YAML and `report-meta.yaml` (with allowed enum values inline at each field).

If any prose in this file disagrees with a runtime/script output, **trust the runtime/script output** — that rule binds you, the runtime agent, every time. (Maintainer note, not for runtime: when fixing such a disagreement, edit the source contract — script behavior, schema under `scripts/contracts/`, or `validation-catalog.mjs` — and let the generated `references/*.md` re-render. Do not patch the prose into this SKILL.md.)

## Execution contract

- Treat validation commands as gates. Run them directly and preserve full stdout/stderr and nonzero exit codes. Do not pipe gate output through truncating filters.
- Prefer `--format json` or `--format compact` on the `check-*` validators **and** the `build-evidence-ledger` / `build-report` assemblers when machine-readable output helps. The repair-hint surfaces escalate from finest- to coarsest-grained — read in this order before guessing:
  - **`issues[].fix`** — per-issue fix string (one per individual failure entry).
  - **`objectFailures[].fixes`** — per-object aggregate (multiple failures on the same id/object collapsed into one fix list; check-chapter only).
  - **`globalHints[].fix`** — chapter-wide root cause (when a single dimension fails N objects, prefer the global fix over N per-issue ones).
  - **`retryOrder[]`** — dimensions ordered root-cause-first; fix in this order.
  - **`suppressedDimensions[]`** — dimensions whose own failures were hidden because a prerequisite dimension failed; they will re-emit after the prerequisite is fixed.
  - The latter four are conditional keys — they only appear when non-empty (see [`references/contracts.md`](references/contracts.md) → *Validation result envelope*).

## Runtime bootstrap

1. Get the configured chapter list:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list`
   Output is the ordered chapter index — each entry is the full chapter brief (`key`, `order`, `letter`, `file`, `mission`, `contentRequirements`, `plannedTables`, `plannedFigures`, `evidenceStrategy`, `qualityBar`, `gate`). The static frame (agent policy, ID system, dimension vocabulary) lives in [`references/rules.md`](references/rules.md). Per-chapter `previousChapter` / `nextChapter` neighbours and `runtimeContext.run.runDate` are emitted later by the per-chapter loader call (chapter generation step 1), not by `--list`.
2. Create a report folder:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>]`
   - The script writes the **report folder path to stdout** (everything else — hints, refresh-context notices, env-snippet path — goes to stderr). Capture it into `REPORT_FOLDER` so subsequent commands have a stable handle, and **check `$?` immediately** — a command-substitution capture swallows the exit code, so an unchecked failure leaves `REPORT_FOLDER` empty and the next steps will operate on garbage paths (`basename "" → .`):
     ```sh
     REPORT_FOLDER=$(node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>])
     status=$?
     if [ "$status" -ne 0 ]; then
       # Branch on $status per the exit-code table below; do NOT proceed to step 3/4.
       exit "$status"
     fi
     ```
   - **Quote multi-word company names** in the shell (e.g. `"Form Energy"`, `"Commonwealth Fusion Systems"`); otherwise the second word is parsed as an unknown flag and the script exits 1.
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - Exit `1`: bad CLI arguments or a non-recoverable failure; read stderr (every script prefixes its messages with `[script-name]`) for the offending field, fix it, then rerun. **Refresh-specific exit-1 cases**: (a) `--refresh requested, but no matching finalized report exists for this company/domain` — the company has never been finalized; drop `--refresh` and rerun as a fresh run; (b) `--refresh requested, but every matching report is already superseded` — the prior chain is broken (the most recent finalized report is not `current`); resolve the chain manually (typically by setting one prior run's `revision.status` back to `current` after auditing) before retrying refresh.
   - Exit `2`: a finalized duplicate already exists; stop.
   - Exit `3`: rerun the same command with `--resume`; do not create suffixed duplicate folders.
   - Exit `4`: the in-progress folder you tried to `--resume` is missing — rerun **without** `--resume` to create a fresh one.
3. Use `$REPORT_FOLDER` (the path captured above, e.g. `reports/20260509143000-acme`) as `<reportFolder>` for every later command. The runId is the folder basename (`<runId>=20260509143000-acme`). When you reach **chapter generation step 2** (authoring chapter YAML heads), use `runtimeContext.run.runDate` from the per-chapter loader (it is emitted whenever `--report-folder` is supplied, including on the first chapter and during parallel drafting) as the canonical `runDate` for every head — never format a date from the model clock. `runDate` is auto-derived UTC `YYYY-MM-DD` from the runId timestamp prefix (set by `create-report-run.mjs` at folder-creation time). The binding rules for using `runDate` as the clock/freshness anchor live in [`rules.md`](references/rules.md) → *Agent policy (binding)* → `researchRules`.
4. Export `STARTUP_FETCH_LOG_PATH` before any `fetch-url` invocation. The default approach:

   ```sh
   RUN_ID=$(basename "$REPORT_FOLDER")
   source ".research-cache/${RUN_ID}/env.sh"
   ```

   - **Default**: source the snippet `create-report-run.mjs` wrote — it sets `STARTUP_FETCH_LOG_PATH=.research-cache/<runId>/_fetch-log.jsonl`.
   - **CI exception**: if `STARTUP_FETCH_LOG_PATH` is already exported (e.g. a workflow-wide trail at `.research-cache/_fetch-log.jsonl`), do **NOT** source the snippet — keep the existing value. `check-chapter` only needs each cited URL to appear in the trail at least once.
   - **What `check-chapter` enforces against the trail**: `fetch-url` appends one JSON line per fetch; `check-chapter` emits an `unverifiedSource` **warning** for each cited URL absent from the trail (promoted to a failure under `--strict`). When the env var is unset and no trail file exists at any candidate path, `check-chapter` instead emits a single `fetchTrailMissing` warning so the disabled-audit case is visible rather than silent.

## Chapter generation

**Default drafting mode: parallel.** Spawn every chapter concurrently — wall-clock is N× faster, the per-chapter spec already keeps chapters loosely coupled, and step 7 below (convergence rerun) collapses any cross-chapter divergences (`netNewSources`, `crossChapterRefLeak`, `duplicateAnalysis`) before finalize. Fall back to **sequential** drafting (each chapter starts only after the prior chapter's YAML has landed on disk) only when (a) the agent runtime is single-threaded or token-rate-limited and cannot spawn concurrent workers, or (b) the report has unusually tight chapter coupling that would otherwise force multiple convergence-rerun cycles. Sequential trades wall-clock for cheaper convergence: each later chapter sees prior siblings' rollups via `--include-context` and can avoid duplicate-analysis / ref-leak failures up front, so step 7 is unnecessary.

For each chapter from the `--list` roster:

1. Load its per-chapter delta:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order <n> --report-folder <reportFolder> [--include-context]`
   - The loader always emits JSON to stdout; do not pass `--format`.
   - `--order <n>` is the canonical selector; `--key <chapter-key>` and `--file <chapter.file>` are equivalent and useful in retry loops where the failing chapter's key or file path is what you have on hand. Pick one per invocation (parallel workers may use different selectors across invocations).
   - **`--include-context` rule by drafting mode**:
     - **Parallel (default)**: omit `--include-context` on every chapter — any sibling rollup it would project is stale relative to the in-flight peers, and step 7's convergence rerun handles cross-chapter divergence for you.
     - **Sequential (fallback)**: omit `--include-context` on the first chapter (`--order 1` — the rollup would be empty anyway); pass it on every later chapter so the loader projects `contextChapters` and `cumulativeContext` from the already-written siblings.
2. Author the chapter YAML at `reportFolder/<runtimeContext.chapter.file>` using:
   - `runtimeContext.chapter` for mission, content requirements, planned tables/figures, quality bar, and gate.
   - [`references/rules.md`](references/rules.md) for agent policy, gates, the **ID system** (mint every `S/C/T/F/Q` id with this chapter's `runtimeContext.chapter.letter`), validator dimensions, and renderer contracts.
   - [`references/contracts.md`](references/contracts.md) for the chapter YAML field shapes and inline allowed enum values.
3. Plan queries → search → fetch → record (in this order; in practice run this **before or interleaved with** step 2's authoring — step 2 gives you the *spec* to write against, step 3 produces the *data* you fill `localEvidence` with):
   - Before issuing web searches, plan source-discovery queries from `runtimeContext.run.runDate`; derive any year/month tokens from that single clock anchor. The binding rules for volatile facts and date tokens live in [`rules.md`](references/rules.md) → *Agent policy (binding)* → `researchRules` and `volatileFactQueryTokens`. Use the host agent's approved web/search capability (or an approved search API/tool provided by the runtime) to discover candidate sources. If no source-discovery capability is available in the current environment, stop before populating `localEvidence` (sources/claims/evidence gaps) and ask the user for a **source pack** — either a list of authoritative URLs the agent can then run through `fetch-url`, or pre-saved HTML/PDF/text files staged inside the workspace — rather than inventing sources.
   - Run searches to discover candidate sources; record each query you actually issued in `localEvidence.searchQueries[]` as provenance/audit, not as the search execution mechanism.
   - For each retained URL, retrieve it with the [`fetch-url`](../fetch-url/SKILL.md) skill (with `STARTUP_FETCH_LOG_PATH` set, this also writes the fetch trail that `unverifiedSource` audits against).
   - Store reviewed sources, atomic claims, typed research questions, and typed evidence gaps in `localEvidence`.
4. Run the chapter gate (normal pass):
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
5. On failure, fix dimensions in `retryOrder[]` first. Treat root-cause dimensions and global hints before object-by-object cosmetic edits.
   - **`retryOrder[]` absent / empty?** It is omitted from the envelope whenever `failedDimensions` is empty — i.e. when there is nothing to retry. If `ok: false` but `retryOrder` is absent, you are in `--strict` mode with only unacked warnings remaining (see step 6); fall back to the dimensions listed in `summary.unackedWarningDimensions[]`.
   - Honor the `retryPolicy` in [`rules.md`](references/rules.md) → *Agent policy (binding)*: at most **3** retries (`maxChapterRetries: 3`) on top of the initial run — i.e. up to 4 `check-chapter` invocations total per chapter — and each retry must reduce the **failure count** (`requireMonotonicFailureDecrease: true`). "Failure count" here = the number of items currently making `ok: false`: in normal mode that is `issueCount` (size of `issues[]`, post-suppression); under `--strict` it additionally includes `summary.unackedWarningDimensions.length`. The agent enforces this — no script blocks a non-monotonic retry, but exhausting the budget without a strict decrease is the same blocker condition as below.
   - **Monotonic-decrease violation triggers the blocker immediately** (do not consume the rest of the budget). If retry N's failure count is `>=` retry N−1's, your fix strategy is not converging; further retries on the same approach waste budget. Surface the blocker, summarize what you tried in retries 1…N, and stop.
   - If the budget is exhausted with failures still present, **stop drafting this chapter and surface a user-facing blocker message** naming (a) the chapter file, (b) the surviving failure dimensions from the last `check-chapter` JSON, and (c) per-chapter retry-budget exhaustion. Do not proceed to step 6 for this chapter, do not author `report-meta.yaml`, and do not run `finalize-report` — the run is incomplete until the user resolves the blocker (e.g. by providing additional sources or relaxing scope).
6. Once the normal pass is clean, run a **strict pre-finalization sweep**:
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --strict --format json`
   - `--strict` promotes warnings (e.g. `unverifiedSource`, `tableNotes`) to failures.
   - When a warning is genuinely non-actionable (e.g. `tableNotes` for a pure factual snapshot whose dimension's `defaultFix` explicitly tells you to acknowledge it), opt out by adding a top-level `acknowledgedWarnings: [{ dimension, reason }]` entry to the chapter YAML — see the schema in [`contracts.md`](references/contracts.md). `reason` must be at least 30 characters; only the warning-class dimensions listed in [`rules.md`](references/rules.md) → *Validator dimensions* → *`acknowledgedWarnings` opt-out* are eligible. Never use this to silence real failures — `finalize-report` reruns this strict sweep automatically and will refuse to publish if any chapter still fails it.
   - **Retry budget is shared with step 5.** The `maxChapterRetries: 3` budget from `retryPolicy` covers **all** `check-chapter` invocations against this chapter — normal pass (step 4), step-5 retries, the strict sweep here, and any post-`acknowledgedWarnings` re-runs combined. Once the per-chapter budget is exhausted, surface the same user-facing blocker message defined in step 5 and stop. `requireMonotonicFailureDecrease: true` applies across the combined sequence too: each invocation must reduce the failure count from the prior invocation, regardless of which pass type.
7. **Convergence rerun (parallel mode only — skip in sequential mode).** After every parallel chapter has landed on disk, rerun step 4 (normal pass) and step 6 (strict sweep) once on every chapter. `finalize-report` will run the strict sweep itself but won't fix root causes for you, so do this pass before authoring `report-meta.yaml`.
   - **Why required**: `netNewSources` / `crossChapterRefLeak` / `duplicateAnalysis` dimensions inspect on-disk siblings. A chapter can pass in isolation and fail once a peer lands (or vice versa). The convergence rerun re-evaluates everything against the final on-disk sibling set.
   - **Convergence rerun gets a fresh retry budget.** `maxChapterRetries: 3` resets for the convergence cycle, so a chapter that consumed its mid-flight budget on non-transient fixes still has 3 retries available against any failures the convergence rerun surfaces. Mid-flight and convergence budgets do not stack.
   - **Mid-flight handling of transient failures during step 4** (before convergence): treat `netNewSources` / `crossChapterRefLeak` failures as transient — they reflect siblings that haven't landed yet. Do not burn `maxChapterRetries` rewriting them mid-flight.
     - **Failure set is *only* transient dimensions**: treat the chapter as "drafted, pending convergence". Skip step 5 (no retry needed) and skip step 6 (the strict sweep would just re-emit the same transient noise) for this chapter; move on to other parallel work and re-validate via this convergence rerun.
     - **Failure set mixes transient and non-transient dimensions**: fix only the non-transient ones within the retry budget (transient ones do **not** count toward `maxChapterRetries`); once the non-transient failures clear, proceed to step 6. The convergence rerun re-evaluates everything against the final on-disk sibling set.

> **Note: the fetch-url trail is shared across the run.** Every chapter writes into the same `STARTUP_FETCH_LOG_PATH` file (one JSON line per call, append-only); `check-chapter` only requires that each cited URL appear in the trail at least once. Parallel `fetch-url` calls do not need coordination; they only need to share the env var so `unverifiedSource` stays clean.

## Finalization

Only start after all configured chapter artifacts exist and pass `check-chapter --strict` — step 6 in sequential mode, or step 7's convergence rerun in parallel mode.

1. Author `report-meta.yaml` from the `ReportMetaSchema` summarized in [`references/contracts.md`](references/contracts.md). It owns the final judgment, cover facts, and company profile fields.
2. Validate report meta shape:
   `node .agents/skills/startup-research/scripts/check-report-meta.mjs <reportFolder> --format json`
   - This step validates shape and enums only. Cross-references such as `coverFacts[].claimRefs` are resolved later by `build-report` against the consolidated `evidence.yaml`; dangling refs surface there, not here.
3. Run finalization directly:
   `node .agents/skills/startup-research/scripts/finalize-report.mjs <reportFolder>`
   - For refresh: add `--refresh`. `--refresh-reason` is optional on this side — if omitted, `finalize-report` reuses the value cached in `.research-cache/<runId>/refresh-context.yaml` by `create-report-run.mjs` (it prints `[finalize-report] using cached --refresh-reason…` so the chosen value is auditable). You may re-pass `--refresh-reason` here as audit redundancy, but the value **must match the cache exactly** — `finalize-report` exits 1 on mismatch (it does **not** rewrite the cached value). **Cache-empty edge case**: when `create-report-run.mjs` was called *without* `--refresh-reason`, the cache holds an empty value, and the strict-equality check then rejects any non-empty `--refresh-reason` you try to add at finalize time (cache=`''` !== provided=`"..."` → exit 1). To record a reason after the fact, edit `.research-cache/<runId>/refresh-context.yaml` directly **before** rerunning `finalize-report`.
   - **`--rebuild` is no longer required after chapter edits.** `finalize-report` auto-rebuilds the ledger whenever a chapter file's mtime is newer than `evidence.yaml` (it logs `[finalize-report] auto-rebuild:…`). Pass `--rebuild` only when you want to force a fresh consolidation regardless of mtimes. Cost note: rebuilding may shift the *consolidated ledger's* `canonical` claim id pointers — chapter-letter ids in each chapter file stay stable, but `report-meta.yaml` `coverFacts[].claimRefs` may need re-resolution if `build-report` reports a dangling ref.
   - **`finalize-report` Exit `4`** (pre-flight): the report folder does not exist, **or** `report-meta.yaml` is missing inside it. The first case usually means the wrong path was passed; the second means you ran finalize before authoring `report-meta.yaml` — author it under the report folder and rerun.

Finalization is a sequential pipeline; it stops at the first failing step and exits with that step's code. Triage by step name printed to stderr (`[finalize-report] -> <step>` then `[finalize-report] <step> failed`):

| Step | Script | Fix target on failure |
|---|---|---|
| `check-chapter:<key>:strict` | `check-chapter.mjs --strict` | the named chapter (rerun the same command directly to iterate). A `missing chapter file(s) before strict sweep` stderr line means `finalize-report` was invoked before all configured chapters were drafted — return to *Chapter generation* and author every chapter listed in `--list` before retrying finalize. |
| `check-report-meta` | `check-report-meta.mjs` | `report-meta.yaml` shape/enum issues |
| `prepare-refresh` (refresh only) | `link-refresh.mjs --prepare-current` | ensure the prior `current` report exists, is finalized, and its `summary-card.yaml` matches the new report on **either** `company.name` (normalized) **or** `company.website` (normalized registrable domain) — the match is OR, not AND |
| `build-evidence-ledger` | `build-evidence-ledger.mjs` | a chapter `localEvidence` block (the script names the chapter and offending id) |
| `check-cross-chapter` | `check-cross-chapter.mjs` | metric drift, key-fact overlap, or duplicate analysis across chapter YAMLs; after editing chapters, rerun `finalize-report` (it auto-rebuilds the ledger when chapter mtimes are newer and re-runs the strict sweep) |
| `build-report` | `build-report.mjs` | a chapter or `report-meta.yaml` field that the assembler could not project |
| `check-report` | `check-report.mjs` | report-level gates (domain diversity, adverse-source distribution, paywall ceiling) |
| `link-refresh` (refresh only) | `link-refresh.mjs` | only fires after publishability passes; the script re-runs `build-report.mjs` against the *prior* run's chapter YAMLs to reassemble its `summary-card.yaml` / `full-report.yaml`, so this step fails when the prior chapters no longer satisfy the current schema/gates (e.g. after a schema change to a dimension the prior run didn't satisfy). Triage by running `check-chapter --strict` against the prior folder and fixing what it surfaces; the typical case is a stale `summary-card.yaml` that just needs a clean reassembly. |

`finalize-report` also fails early (before any subprocess) when:
- `--refresh` is set, `--refresh-reason` is also passed on the CLI, and the value does not match the one cached in `.research-cache/<runId>/refresh-context.yaml`. The script does **not** rewrite the cache from the CLI value — omit `--refresh-reason` on `finalize-report` to reuse the cache (recommended), or pass the same string verbatim for audit redundancy.

> **Tip:** When `finalize-report` aborts, the failing inner step's output is whatever format that step uses by default — `check-chapter:<key>:strict` is invoked with `--format compact`, every other check/build step runs with the default `--format text`. Both are human-readable but lack structured `issues[].fix`, `objectFailures[]`, `globalHints[]`, `retryOrder[]`, etc. Rerun the failing step directly with `--format json` to get those structured fields, then re-run `finalize-report` to drive the pipeline forward — it **always restarts at the top of the pipeline** (there is no resume-from-failing-step), so every earlier check/build re-executes too. The only smart skip is `build-evidence-ledger`: finalize compares chapter mtimes against `evidence.yaml` and only rebuilds when a chapter is newer (or `--rebuild` is passed). Step coverage:
>
> - `check-chapter:<key>:strict` → `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --strict --format json`
> - `check-report-meta` → `node .agents/skills/startup-research/scripts/check-report-meta.mjs <reportFolder> --format json`
> - `build-evidence-ledger` → `node .agents/skills/startup-research/scripts/build-evidence-ledger.mjs <reportFolder> --format json`
> - `check-cross-chapter` → `node .agents/skills/startup-research/scripts/check-cross-chapter.mjs <reportFolder> --format json`
> - `build-report` → `node .agents/skills/startup-research/scripts/build-report.mjs <reportFolder> --format json`
> - `check-report` → `node .agents/skills/startup-research/scripts/check-report.mjs <reportFolder> --format json`
> - `prepare-refresh` / `link-refresh` (refresh only) → `link-refresh.mjs` does **not** support `--format`; triage from the `[refresh] ...` stderr lines (which name the offending file/field) and rerun `finalize-report.mjs --refresh` after the fix. Do NOT hand-edit `revision:` to work around it — `link-refresh` owns `revision.status`, `revision.supersededByRunId`, and `revision.refreshReason` on both runs. The **only** field you may pre-author is `revision.refreshOfRunId`, and only for the disambiguation case described in *Refresh runs* §4 below.

When `finalize-report` exits 0, summarize the run for the user using every field listed in [`rules.md`](references/rules.md) → *Agent policy (binding)* → `finalResponseFields`. Pull the values straight from the produced files; do not paraphrase or omit fields:

| Field | Source file → path |
|---|---|
| report folder | the `<reportFolder>` you ran finalize on |
| generated files | filenames under `<reportFolder>/` (chapter YAMLs, `report-meta.yaml`, `evidence.yaml`, `full-report.yaml`, `summary-card.yaml`) |
| source count | `evidence.yaml` → length of `sources[]` |
| claim count | `evidence.yaml` → length of `claims[]` |
| recommendation | `summary-card.yaml` → `summary.recommendation` |
| confidence | `summary-card.yaml` → `summary.confidence` |
| risks | `summary-card.yaml` → `summary.topRisks[]` |
| valuation stance | `summary-card.yaml` → `summary.valuationStance` |
| table count | `full-report.yaml` → `tables.length` |
| figure count | `full-report.yaml` → `figures.length` |
| finalize result | the exit-0 line printed by `finalize-report` |
| main gaps | `summary-card.yaml` → `summary.unresolvedGaps[]` |

### Refresh runs

`--refresh` rewires the revision graph in addition to producing a normal report:

1. `create-report-run.mjs --refresh` finds the most recent finalized `current` report for the same company and writes `.research-cache/<runId>/refresh-context.yaml`. **Company match is OR-semantics**: a prior report counts as the same company when its existing `summary-card.yaml` matches the *new* invocation's `<companyName>` / `--website` arguments on either normalized name **or** normalized registrable domain — either alone is sufficient. (At finalize time, `link-refresh.mjs` re-checks the same OR rule between the prior `summary-card.yaml` and the new `report-meta.yaml` `company.*` fields you authored.)
2. The chapter loader projects that file as `runtimeContext.runCache.refreshContext`. Read it for prior-run summary, score, recommendation, and key metrics — but treat every value listed in [`rules.md`](references/rules.md) → *Agent policy (binding)* → `volatileFacts` as stale and re-fetch it.
   - **How to detect refresh mode at runtime**: the loader always emits `runtimeContext.runCache` when `--report-folder` is supplied; it is `{ refreshContext: null }` for a fresh run and `{ refreshContext: {…} }` when `create-report-run.mjs --refresh` cached a prior summary. Use `runtimeContext.runCache?.refreshContext != null` as the boolean signal — do not infer refresh from the run folder name or argv.
3. `finalize-report.mjs --refresh` runs `link-refresh.mjs` in two distinct phases:
   - **Pre-assembly (`prepare-refresh` step, `link-refresh.mjs --prepare-current`)** — only writes the *new* run's `revision.status: current`, `revision.refreshOfRunId`, `revision.supersededByRunId: null`, and `revision.refreshReason` onto its `report-meta.yaml`. Runs after `check-report-meta` passes and before `build-evidence-ledger`. The prior run is untouched at this point.
   - **Post-publishability (`link-refresh` step, default mode)** — only fires after `check-report` passes. Flips the prior run's `revision.status` to `superseded`, sets its `supersededByRunId` back-pointer to the new runId, and reassembles its `summary-card.yaml` / `full-report.yaml` so cross-references stay consistent.
4. **Revision authoring rule (default vs. disambiguation override)**:
   - **Default (canonical)**: omit the `revision` block from `report-meta.yaml` entirely. The two `link-refresh` phases above own every revision field (`status`, `refreshOfRunId`, `supersededByRunId`, `refreshReason`) on both the new and prior runs.
   - **Disambiguation override**: when more than one finalized `current` report matches the new report under the OR rule above (e.g. a renamed company with the same domain, or two reports sharing one of the two keys), set **only** `revision.refreshOfRunId` to the intended prior runId. Leave `status`, `supersededByRunId`, and `refreshReason` to `link-refresh` — do not author them yourself.
5. The `refreshReason` is recorded on the new and prior `revision.refreshReason` fields when present, but it is optional. To record one, pass `--refresh-reason <text>` on `create-report-run.mjs` (canonical authoring site) — `create-report-run` writes it to `.research-cache/<runId>/refresh-context.yaml`, and `link-refresh.mjs` copies it onto `revision.refreshReason` of both `report-meta.yaml` files during the two refresh phases. Do not re-pass it on `finalize-report.mjs` unless you want audit redundancy; the value must then match the cache exactly (mismatch = exit 1, no rewrite). To **add** a reason to a run that was created without one, edit `.research-cache/<runId>/refresh-context.yaml` directly before running `finalize-report` — `finalize-report` will not promote a CLI value into an empty cache slot.
