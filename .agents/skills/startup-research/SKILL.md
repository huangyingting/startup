---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

This file is the workflow narrative: what to run, in what order, with which flags. Two generated companions carry the static reference material; load both at session start, **`rules.md` first** (it defines the agent policy, ID system, and dimension vocabulary that `contracts.md` then cross-references):

- [`references/rules.md`](references/rules.md) — binding agent policy, gates, ID system, validator dimensions, and figure renderer contracts.
- [`references/contracts.md`](references/contracts.md) — field shapes for the chapter analysis YAML and `report-meta.yaml` (with allowed enum values inline at each field).

If any prose in this file disagrees with a runtime/script output, trust the runtime/script output and fix the source contract rather than copying rules into this file.

## Execution contract

- Treat validation commands as gates. Run them directly and preserve full stdout/stderr and nonzero exit codes. Do not pipe gate output through truncating filters.
- Prefer `--format json` or `--format compact` on the `check-*` validators **and** the `build-evidence-ledger` / `build-report` assemblers when machine-readable output helps. Use `issues[].fix`, `objectFailures[].fixes`, `globalHints[].fix`, `retryOrder[]`, and `suppressedDimensions[]` before guessing. The latter four are conditional keys — they only appear when non-empty (see [`references/contracts.md`](references/contracts.md) → *Validation result envelope*).

## Runtime bootstrap

1. Get the configured chapter list:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list`
   Output is the ordered chapter index — each entry is the full chapter brief (`key`, `order`, `letter`, `file`, `mission`, `contentRequirements`, `plannedTables`, `plannedFigures`, `evidenceStrategy`, `qualityBar`, `gate`). The static frame (agent policy, ID system, dimension vocabulary) lives in [`references/rules.md`](references/rules.md). Per-chapter `previousChapter` / `nextChapter` neighbours and `runtimeContext.run.runDate` are emitted later by the per-chapter loader call (chapter generation step 1), not by `--list`.
2. Create a report folder:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>]`
   - The script writes the **report folder path to stdout** (everything else — hints, refresh-context notices, env-snippet path — goes to stderr). Capture it into `REPORT_FOLDER` so subsequent commands have a stable handle:
     ```sh
     REPORT_FOLDER=$(node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>])
     ```
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - Exit `1`: bad CLI arguments or a non-recoverable failure; read stderr (every script prefixes its messages with `[script-name]`) for the offending field, fix it, then rerun.
   - Exit `2`: a finalized duplicate already exists; stop.
   - Exit `3`: rerun the same command with `--resume`; do not create suffixed duplicate folders.
   - Exit `4`: the in-progress folder you tried to `--resume` is missing — rerun **without** `--resume` to create a fresh one.
3. Use `$REPORT_FOLDER` (the path captured above, e.g. `reports/20260509143000-acme`) as `<reportFolder>` for every later command. The runId is the folder basename (`<runId>=20260509143000-acme`). When you reach **chapter generation step 2** (authoring chapter YAML heads), use `runtimeContext.run.runDate` from the per-chapter loader (it is emitted whenever `--report-folder` is supplied, including on the first chapter and during parallel drafting) as the canonical `runDate` for every head — never format a date from the model clock.
4. Export `STARTUP_FETCH_LOG_PATH` before any `fetch-url` invocation. The default approach:

   ```sh
   RUN_ID=$(basename "$REPORT_FOLDER")
   source ".research-cache/${RUN_ID}/env.sh"
   ```

   - **Default**: source the snippet `create-report-run.mjs` wrote — it sets `STARTUP_FETCH_LOG_PATH=.research-cache/<runId>/_fetch-log.jsonl`.
   - **CI exception**: if `STARTUP_FETCH_LOG_PATH` is already exported (e.g. a workflow-wide trail at `.research-cache/_fetch-log.jsonl`), do **NOT** source the snippet — keep the existing value. `check-chapter` only needs each cited URL to appear in the trail at least once.
   - **What `check-chapter` enforces against the trail**: `fetch-url` appends one JSON line per fetch; `check-chapter` emits an `unverifiedSource` **warning** for each cited URL absent from the trail (promoted to a failure under `--strict`). When the env var is unset and no trail file exists at any candidate path, `check-chapter` instead emits a single `fetchTrailMissing` warning so the disabled-audit case is visible rather than silent.

## Chapter generation

For each chapter from the `--list` roster:

1. Load its per-chapter delta:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order <n> --include-context --report-folder <reportFolder>`
   - The loader always emits JSON to stdout; do not pass `--format`.
   - `--order <n>` is the canonical selector; `--key <chapter-key>` and `--file <chapter.file>` are equivalent and useful in retry loops where the failing chapter's key or file path is what you have on hand. Pick one per invocation (parallel workers may use different selectors across invocations).
   - **`--include-context` rule (binary by drafting mode)**:
     - **Sequential drafting** (each chapter starts only after the prior chapter's YAML has landed on disk): pass `--include-context` so the loader projects `contextChapters` and `cumulativeContext` from the already-written siblings.
     - **Parallel drafting** (multiple chapters in flight at once): omit `--include-context` for **every** parallel chapter — including the first one — because any sibling rollup it projects would be stale relative to the in-flight peers. After all parallel chapters land, rerun **step 4 (normal pass) and step 6 (strict sweep) below** on every chapter — see the *Parallel chapter drafting* callout further down for why this convergence rerun is mandatory.
2. Author the chapter YAML at `reportFolder/<runtimeContext.chapter.file>` using:
   - `runtimeContext.chapter` for mission, content requirements, planned tables/figures, quality bar, and gate.
   - [`references/rules.md`](references/rules.md) for agent policy, gates, the **ID system** (mint every `S/C/T/F/Q` id with this chapter's `runtimeContext.chapter.letter`), validator dimensions, and renderer contracts.
   - [`references/contracts.md`](references/contracts.md) for the chapter YAML field shapes and inline allowed enum values.
3. Search → fetch → record (in this order):
   - Use the host agent's approved web/search capability (or an approved search API/tool provided by the runtime) to discover candidate sources. If no source-discovery capability is available in the current environment, stop before authoring YAML and ask the user for a source pack or enabled search tool rather than inventing sources.
   - Run searches to discover candidate sources; record each query you actually issued in `localEvidence.searchQueries[]`.
   - For each retained URL, retrieve it with the [`fetch-url`](../fetch-url/SKILL.md) skill (with `STARTUP_FETCH_LOG_PATH` set, this also writes the fetch trail that `unverifiedSource` audits against).
   - Store reviewed sources, atomic claims, typed research questions, and typed evidence gaps in `localEvidence`.
4. Run the chapter gate (normal pass):
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
5. On failure, fix dimensions in `retryOrder[]` first. Treat root-cause dimensions and global hints before object-by-object cosmetic edits.
   - Honor the `retryPolicy` in [`rules.md`](references/rules.md) → *Agent policy (binding)*: at most **3** retries (`maxChapterRetries: 3`) on top of the initial run — i.e. up to 4 `check-chapter` invocations total per chapter — and each retry must reduce the failure count (`requireMonotonicFailureDecrease: true`). If the budget is exhausted with failures still present, stop and report the chapter as blocked rather than looping.
6. Once the normal pass is clean, run a **strict pre-finalization sweep**:
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --strict --format json`
   - `--strict` promotes warnings (e.g. `unverifiedSource`, `tableNotes`) to failures.
   - When a warning is genuinely non-actionable (e.g. `tableNotes` for a pure factual snapshot whose dimension's `defaultFix` explicitly tells you to acknowledge it), opt out by adding a top-level `acknowledgedWarnings: [{ dimension, reason }]` entry to the chapter YAML — see the schema in [`contracts.md`](references/contracts.md). `reason` must be at least 30 characters; only the warning-class dimensions listed in [`rules.md`](references/rules.md) → *Validator dimensions* → *`acknowledgedWarnings` opt-out* are eligible. Never use this to silence real failures — `finalize-report` reruns this strict sweep automatically and will refuse to publish if any chapter still fails it.

Parallel chapter drafting is allowed, but parallel chapters must converge before finalize. Three facts to remember:

- **Net-new sources and cross-chapter ref leaks inspect on-disk siblings.** A chapter can pass in isolation and fail once a peer is added (or vice versa). After the last YAML lands, re-run the normal pass (step 4) and the strict sweep (step 6) once on every chapter; `finalize-report` will run the strict sweep itself but won't fix root causes for you.
- **Treat `netNewSources` / `crossChapterRefLeak` failures during parallel drafting as transient.** They reflect siblings that haven't landed yet; do not burn `maxChapterRetries` budget rewriting them mid-flight — wait for the post-convergence rerun above. Only failures that survive the convergence rerun count toward the retry budget.
- **The fetch-url trail is shared across the run.** Every chapter writes into the same `STARTUP_FETCH_LOG_PATH` file (one JSON line per call, append-only); `check-chapter` only requires that each cited URL appear in the trail at least once. Parallel `fetch-url` calls do not need coordination; they only need to share the env var so `unverifiedSource` stays clean.

## Finalization

Only start after all configured chapter artifacts exist and pass `check-chapter --strict` (step 6 above).

1. Author `report-meta.yaml` from the `ReportMetaSchema` summarized in [`references/contracts.md`](references/contracts.md). It owns the final judgment, cover facts, and company profile fields.
2. Validate report meta shape:
   `node .agents/skills/startup-research/scripts/check-report-meta.mjs <reportFolder> --format json`
   - This step validates shape and enums only. Cross-references such as `coverFacts[].claimRefs` are resolved later by `build-report` against the consolidated `evidence.yaml`; dangling refs surface there, not here.
3. Run finalization directly:
   `node .agents/skills/startup-research/scripts/finalize-report.mjs <reportFolder>`
   - For refresh: add `--refresh`. `--refresh-reason` is optional on this side — if omitted, `finalize-report` reuses the value cached in `.research-cache/<runId>/refresh-context.yaml` by `create-report-run.mjs` (it prints `[finalize-report] using cached --refresh-reason…` so the chosen value is auditable). You may re-pass `--refresh-reason` here as audit redundancy, but the value **must match the cache exactly** — `finalize-report` exits 1 on mismatch (it does **not** rewrite the cached value).
   - **`--rebuild` is no longer required after chapter edits.** `finalize-report` auto-rebuilds the ledger whenever a chapter file's mtime is newer than `evidence.yaml` (it logs `[finalize-report] auto-rebuild:…`). Pass `--rebuild` only when you want to force a fresh consolidation regardless of mtimes. Cost note: rebuilding may shift the *consolidated ledger's* `canonical` claim id pointers — chapter-letter ids in each chapter file stay stable, but `report-meta.yaml` `coverFacts[].claimRefs` may need re-resolution if `build-report` reports a dangling ref.
   - **`finalize-report` Exit `4`** (pre-flight): the report folder does not exist, **or** `report-meta.yaml` is missing inside it. The first case usually means the wrong path was passed; the second means you ran finalize before authoring `report-meta.yaml` — author it under the report folder and rerun.

Finalization is a sequential pipeline; it stops at the first failing step and exits with that step's code. Triage by step name printed to stderr (`[finalize-report] -> <step>` then `[finalize-report] <step> failed`):

| Step | Script | Fix target on failure |
|---|---|---|
| `check-chapter:<key>:strict` | `check-chapter.mjs --strict` | the named chapter (rerun the same command directly to iterate); if missing files were reported, author every configured chapter first |
| `check-report-meta` | `check-report-meta.mjs` | `report-meta.yaml` shape/enum issues |
| `prepare-refresh` (refresh only) | `link-refresh.mjs --prepare-current` | ensure the prior `current` report exists, is finalized, and its `summary-card.yaml` matches the new report on **either** `company.name` (normalized) **or** `company.website` (normalized registrable domain) — the match is OR, not AND |
| `build-evidence-ledger` | `build-evidence-ledger.mjs` | a chapter `localEvidence` block (the script names the chapter and offending id) |
| `check-cross-chapter` | `check-cross-chapter.mjs` | metric drift, key-fact overlap, or duplicate analysis across chapter YAMLs; after editing chapters, rerun `finalize-report` (it auto-rebuilds the ledger when chapter mtimes are newer and re-runs the strict sweep) |
| `build-report` | `build-report.mjs` | a chapter or `report-meta.yaml` field that the assembler could not project |
| `check-report` | `check-report.mjs` | report-level gates (domain diversity, adverse-source distribution, paywall ceiling) |
| `link-refresh` (refresh only) | `link-refresh.mjs` | only fires after publishability passes; usually a stale `summary-card.yaml` on the prior run |

`finalize-report` also fails early (before any subprocess) when:
- `--refresh` is set, `--refresh-reason` is also passed on the CLI, and the value does not match the one cached in `.research-cache/<runId>/refresh-context.yaml`. The script does **not** rewrite the cache from the CLI value — omit `--refresh-reason` on `finalize-report` to reuse the cache (recommended), or pass the same string verbatim for audit redundancy.

> **Tip:** When `finalize-report` aborts, the failing inner step's output is whatever format that step uses by default — `check-chapter:<key>:strict` is invoked with `--format compact`, every other check/build step runs with the default `--format text`. Both are human-readable but lack structured `issues[].fix`, `objectFailures[]`, `globalHints[]`, `retryOrder[]`, etc. Rerun the failing step directly with `--format json` to get those structured fields, then re-run `finalize-report` so the remaining steps execute. Step coverage:
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

1. `create-report-run.mjs --refresh` finds the most recent finalized `current` report for the same company and writes `.research-cache/<runId>/refresh-context.yaml`. **Company match is OR-semantics**: a prior report counts as the same company when its `summary-card.yaml` matches the new report on either normalized `company.name` **or** normalized `company.website` (registrable domain) — either alone is sufficient.
2. The chapter loader projects that file as `runtimeContext.runCache.refreshContext`. Read it for prior-run summary, score, recommendation, and key metrics — but treat every value listed in [`rules.md`](references/rules.md) → *Agent policy (binding)* → `volatileFacts` as stale and re-fetch it.
3. `finalize-report.mjs --refresh` runs `link-refresh.mjs` in two distinct phases:
   - **Pre-assembly (`prepare-refresh` step, `link-refresh.mjs --prepare-current`)** — only writes the *new* run's `revision.status: current`, `revision.refreshOfRunId`, `revision.supersededByRunId: null`, and `revision.refreshReason` onto its `report-meta.yaml`. Runs after `check-report-meta` passes and before `build-evidence-ledger`. The prior run is untouched at this point.
   - **Post-publishability (`link-refresh` step, default mode)** — only fires after `check-report` passes. Flips the prior run's `revision.status` to `superseded`, sets its `supersededByRunId` back-pointer to the new runId, and reassembles its `summary-card.yaml` / `full-report.yaml` so cross-references stay consistent.
4. **Revision authoring rule (default vs. disambiguation override)**:
   - **Default (canonical)**: omit the `revision` block from `report-meta.yaml` entirely. The two `link-refresh` phases above own every revision field (`status`, `refreshOfRunId`, `supersededByRunId`, `refreshReason`) on both the new and prior runs.
   - **Disambiguation override**: when more than one finalized `current` report matches the new report under the OR rule above (e.g. a renamed company with the same domain, or two reports sharing one of the two keys), set **only** `revision.refreshOfRunId` to the intended prior runId. Leave `status`, `supersededByRunId`, and `refreshReason` to `link-refresh` — do not author them yourself.
5. The `refreshReason` is recorded on the new and prior `revision.refreshReason` fields when present, but it is optional. To record one, pass `--refresh-reason <text>` on `create-report-run.mjs` (canonical authoring site) — `create-report-run` writes it to `.research-cache/<runId>/refresh-context.yaml`, and `link-refresh.mjs` copies it onto `revision.refreshReason` of both `report-meta.yaml` files during the two refresh phases. Do not re-pass it on `finalize-report.mjs` unless you want audit redundancy; the value must then match the cache exactly (mismatch = exit 1, no rewrite).
