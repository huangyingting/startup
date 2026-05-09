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
- Prefer `--format json` or `--format compact` on the `check-*` validators when machine-readable output helps. Use `issues[].fix`, `objectFailures[].fixes`, `globalHints[].fix`, `retryOrder[]`, and `suppressedDimensions[]` before guessing. The latter four are conditional keys — they only appear when non-empty (see [`references/contracts.md`](references/contracts.md) → *Validation result envelope*).

## Runtime bootstrap

1. Get the configured chapter list:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list`
   Output is the per-chapter delta only (chapter briefs, gates, neighbours); the static frame already lives in [`references/rules.md`](references/rules.md).
2. Create a report folder:
   `node .agents/skills/startup-research/scripts/create-report-run.mjs <companyName> [--website <companyUrl>]`
   - For refresh: add `--refresh [--refresh-reason <refreshReason>]`.
   - Exit `1`: bad CLI arguments or a non-recoverable failure; read stderr (every script prefixes its messages with `[script-name]`) for the offending field, fix it, then rerun.
   - Exit `2`: a finalized duplicate already exists; stop.
   - Exit `3`: rerun the same command with `--resume`; do not create suffixed duplicate folders.
   - Exit `4`: a required target does not exist. From `create-report-run.mjs --resume`, the in-progress folder you tried to resume is missing — rerun **without** `--resume` to create a fresh one. From `finalize-report.mjs`, `report-meta.yaml` is missing — author it under the report folder and rerun.
3. Use the created folder as `<reportFolder>` for every later command. The runId is the folder basename, and `runtimeContext.run.runDate` (emitted by the per-chapter loader call below whenever `--report-folder` is supplied) is the canonical `runDate` for chapter YAML heads — derive every head's `runDate` from it instead of the model clock.
4. Make sure `STARTUP_FETCH_LOG_PATH` is exported before any later `fetch-url` invocation in this run.
   - First check whether it is already set (`printenv STARTUP_FETCH_LOG_PATH` or `[ -n "$STARTUP_FETCH_LOG_PATH" ]`); if it has a value (CI exports a workflow-wide trail at `.research-cache/_fetch-log.jsonl`), keep that value — `check-chapter` only needs every cited URL to appear in the trail at least once.
   - Otherwise export `STARTUP_FETCH_LOG_PATH=.research-cache/<runId>/_fetch-log.jsonl` so the trail is co-located with the run (where `<runId>` is the `<reportFolder>` basename). `create-report-run.mjs` prints this exact line on stderr right after creating the folder; copy it into your shell. `fetch-url` creates the parent directory on first write and appends one JSON line per fetch; `check-chapter` reads the trail and emits an `unverifiedSource` **warning** for each cited URL not found in it. The warning only blocks the gate when `check-chapter` is run with `--strict` (recommended as a pre-finalization sweep). When the env var is unset and no trail file exists at any candidate path, `check-chapter` instead emits a single `fetchTrailMissing` warning so the disabled-audit case is visible rather than silent.

## Chapter generation

For each chapter from the `--list` roster:

1. Load its per-chapter delta:
   `node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order <n> --include-context --report-folder <reportFolder>`
   - The loader always emits JSON to stdout; do not pass `--format`.
   - Omit `--include-context` when drafting chapters in parallel (it would project a stale rollup of unfinished sibling chapters). On the first chapter the flag is harmless — the rollup is just empty — so keep it for consistency unless you are also drafting later chapters concurrently.
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
   - For refresh: add `--refresh`. `--refresh-reason` is optional on this side — if omitted, `finalize-report` reuses the value cached in `.research-cache/<runId>/refresh-context.yaml` by `create-report-run.mjs` (it prints `[finalize-report] using cached --refresh-reason…` so the chosen value is auditable). Pass `--refresh-reason` again only when you intentionally want to override the cached value, in which case it must match the cache.
   - **`--rebuild` is no longer required after chapter edits.** `finalize-report` auto-rebuilds the ledger whenever a chapter file's mtime is newer than `evidence.yaml` (it logs `[finalize-report] auto-rebuild:…`). Pass `--rebuild` only when you want to force a fresh consolidation regardless of mtimes. Cost note: rebuilding may shift the *consolidated ledger's* `canonical` claim id pointers — chapter-letter ids in each chapter file stay stable, but `report-meta.yaml` `coverFacts[].claimRefs` may need re-resolution if `build-report` reports a dangling ref.

Finalization is a sequential pipeline; it stops at the first failing step and exits with that step's code. Triage by step name printed to stderr (`[finalize-report] -> <step>` then `[finalize-report] <step> failed`):

| Step | Script | Fix target on failure |
|---|---|---|
| `check-chapter:<key>:strict` | `check-chapter.mjs --strict` | the named chapter (rerun the same command directly to iterate); if missing files were reported, author every configured chapter first |
| `check-report-meta` | `check-report-meta.mjs` | `report-meta.yaml` shape/enum issues |
| `prepare-refresh` (refresh only) | `link-refresh.mjs --prepare-current` | ensure the prior `current` report exists, is finalized, and its `summary-card.yaml` carries the matching `company.name` / `company.website` |
| `build-evidence-ledger` | `build-evidence-ledger.mjs` | a chapter `localEvidence` block (the script names the chapter and offending id) |
| `check-cross-chapter` | `check-cross-chapter.mjs` | metric drift, key-fact overlap, or duplicate analysis across chapter YAMLs |
| `build-report` | `build-report.mjs` | a chapter or `report-meta.yaml` field that the assembler could not project |
| `check-report` | `check-report.mjs` | report-level gates (domain diversity, adverse-source distribution, paywall ceiling) |
| `link-refresh` (refresh only) | `link-refresh.mjs` | only fires after publishability passes; usually a stale `summary-card.yaml` on the prior run |

`finalize-report` also fails early (before any subprocess) when:
- `--refresh` is set, `--refresh-reason` is also passed on the CLI, and the value does not match the one cached in `.research-cache/<runId>/refresh-context.yaml`. Omit `--refresh-reason` on `finalize-report` to reuse the cached value (recommended).

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

1. `create-report-run.mjs --refresh` finds the most recent finalized `current` report for the same company/domain and writes `.research-cache/<runId>/refresh-context.yaml`.
2. The chapter loader projects that file as `runtimeContext.runCache.refreshContext`. Read it for prior-run summary, score, recommendation, and key metrics — but treat every value listed in [`rules.md`](references/rules.md) → *Agent policy (binding)* → `volatileFacts` as stale and re-fetch it.
3. `finalize-report.mjs --refresh` runs `link-refresh.mjs` twice: once before assembly to mark the new run `revision.status=current`, and once after `check-report` passes to flip the prior run's `revision.status` to `superseded` and reassemble its `summary-card.yaml`/`full-report.yaml` so cross-references stay consistent.
4. You do not need to author `revision` in `report-meta.yaml`. `link-refresh.mjs` (run automatically by the `prepare-refresh` and `link-refresh` finalize steps) writes `revision.status: current`, `revision.refreshOfRunId` (resolved from a company/domain match against finalized `current` reports), `revision.supersededByRunId: null`, and `revision.refreshReason` onto the new `report-meta.yaml`, plus the back-pointer `supersededByRunId` on the prior run. Set `revision.refreshOfRunId` explicitly only to disambiguate when more than one finalized `current` report matches the same company/domain.
5. Pass `--refresh-reason` to `create-report-run.mjs`. `finalize-report.mjs` reuses the cached value automatically; only re-pass it on `finalize-report` when you intentionally want to override the cache, in which case both values must match. `create-report-run` writes the reason to `.research-cache/<runId>/refresh-context.yaml`; `link-refresh.mjs` copies it onto `revision.refreshReason` of the new and prior `report-meta.yaml`.
