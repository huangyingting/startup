---
name: startup-research
description: "Use when: producing a startup research report, company research report, startup diligence report, investment diligence report, or full end-to-end research on a named company. Trigger phrases include: research X company, research company X, analyze X startup, generate a report for X, startup research, company diligence, investment research, due diligence, full diligence workflow, report-v2."
user-invocable: true
---

# Startup Research (workflow orchestrator)

This is the single entry point for generating a complete `report-v2` report. It does not produce content itself; it orchestrates chapter skills and integration skills, enforces synchronization points, and runs the final validation gates.

The final rendered report must include cover metrics, company introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

## Invocation contract

Resolve these run inputs before setup:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof by itself.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `currentDate`: actual session date in `YYYY-MM-DD`; use as the evidence freshness anchor, search-query recency anchor, and default `runDate` unless the user requests a historical report.
- Prompt-derived run requirements: infer any audience, investment lens, required topics, metrics, competitors/comparables, figures, source constraints, or diligence questions from the user's prompt. These requirements are run-local and section-owned; satisfy them in the relevant artifacts or record an evidence gap.

Before running any chapter skill:

- Run `node scripts/check-company-dedup.mjs --company <companyName> [--website <companyUrl>]` before creating or writing the report folder. Exit `0` means continue; exit `2` means duplicate risk and you must stop unless the user explicitly requested a refresh/update of an existing company; any other non-zero exit means fix the input/path issue before continuing.
- Create the report folder with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and use the printed absolute path as `reportFolder` for all artifacts.

Before writing artifacts:

- Read `.github/references/report-schema-v2.md` and `.github/references/yaml-rules.md`.
- For analysis stages `01`–`08`, follow `.github/references/analysis-rules.md`.
- For each analysis stage, follow that stage's `startup-*` skill as the chapter requirements source: required chapter content, required tables, required figures, evidence acquisition, and domain-adaptive additions live in the owning skill.

## Required artifact set

Every completed report folder must contain these artifacts. This workflow skill is the source of truth for the required set and artifact numbering/order.

```text
01-company-overview.yaml
02-market-analysis.yaml
03-competitors.yaml
04-financials.yaml
05-product-tech.yaml
06-customers.yaml
07-risks.yaml
08-valuation.yaml
90-evidence.yaml
91-full-report.yaml
92-summary-card.yaml
```

Rules:

- Write all artifacts directly under `reportFolder`.
- Never hand-write `90-evidence.yaml`; generate it with `node scripts/consolidate-evidence.mjs <reportFolder>`.
- Temporary files, terminal transcripts, and `/tmp` outputs are diagnostics only, not report artifacts or evidence sources.
- If a tool produces only a snippet or partial transcript, rewrite it as a complete YAML artifact under `reportFolder` before continuing.
- Research packs and cached page snapshots are diagnostics/handoffs only; they are not part of the required final artifact set.

## Artifact mapping and execution order

The report uses this artifact/skill mapping:

1. `startup-overview` → `01-company-overview.yaml`.
2. `startup-market-analysis` → `02-market-analysis.yaml`.
3. `startup-competitors` → `03-competitors.yaml`.
4. `startup-financials` → `04-financials.yaml`.
5. `startup-product-tech` → `05-product-tech.yaml`.
6. `startup-customers` → `06-customers.yaml`.
7. `startup-risks` → `07-risks.yaml`.
8. `startup-valuation` → `08-valuation.yaml`.
9. `startup-evidence` → `90-evidence.yaml` and rewrite `01`–`08` claim IDs.
10. `startup-full-report` → `91-full-report.yaml`.
11. `startup-summary-card` → `92-summary-card.yaml`.

The orchestrator does not delegate to a separate research agent and does not recursively rerun this workflow from inside itself.

Execution order: after setup and identity resolution, `01`–`08` analysis skills may run in parallel because each writes a distinct owned artifact. Run `startup-evidence`, `startup-full-report`, and `startup-summary-card` only after all `01`–`08` artifacts are complete.

## Dependency rules

- Use the resolved company identity, report-folder slug, and `runDate` as the shared identity anchor across artifacts.
- Chapter skills (`startup-*`) may use already available peer artifacts when helpful for their chapter logic.
- Peer `01`–`08` artifacts are optional coordination context during parallel analysis, not hard prerequisites; reconcile cross-chapter inconsistencies before `startup-evidence`.
- A chapter or finalization skill may inspect another artifact's gaps, tables, or figures, but must not directly edit another skill's owned artifact.
- If reconciliation or finalization uncovers a supportable fact owned by another chapter, return to the owning skill, update its local evidence/artifact, then rerun consolidation if `90-evidence.yaml` already exists and continue.
- Consolidation/finalization skills (`startup-evidence`, `startup-full-report`, `startup-summary-card`) do not gather new facts.

## Concurrency model

Default safe mode is parallel analysis with serialized finalization. Use parallelism only when each worker writes a distinct owned file and cannot race on shared YAML files.

Allowed after the pre-stage duplicate check passes and shared identity is resolved:

- Parallel writes to distinct `01`–`08` analysis YAML artifacts, provided each chapter skill writes only its owned artifact.
- Parallel source discovery, direct URL review, official-surface fetching, cached text snapshots, and chapter research notes.
- Parallel preparation of diagnostic research packs, provided each pack is written to a unique path and no final artifact is modified.

Always serialized:

- Parallel edits to `90-evidence.yaml`, `91-full-report.yaml`, `92-summary-card.yaml`, or `reports/_index.yaml`.
- Running `startup-evidence` while any analysis artifact is still being edited.

For automated or multi-agent runs, lock the specific artifact being written. Distinct `01`–`08` artifact locks may coexist; use exclusive locks for `90-evidence.yaml`, `91-full-report.yaml`, `92-summary-card.yaml`, and `reports/_index.yaml`. If a needed lock already exists, wait or stop; never merge concurrent writes by hand.

Synchronization points:

1. Pre-stage duplicate check before report folder creation or analysis artifact writing.
2. Identity consistency gate before each artifact write: document headers must preserve the resolved `company.name`, `slug`, and `runDate`.
3. Pre-ledger readiness audit after all `01`–`08` analysis artifacts exist.
4. `startup-evidence` consolidation.
5. `startup-full-report` assembly.
6. `startup-summary-card` generation.
7. Final index rebuild and `npm run validate`.

## Prompt routing and diagnostic packs

- Treat external prose-style due-diligence reports as input requirements or quality examples, not output format; convert useful content into schema-native YAML artifacts, structured figures, evidence claims, and `claimRefs`.
- Route prompt-derived audiences, investment lenses, required metrics, competitors/comparables, figures, source constraints, and diligence questions to the owning `startup-*` chapter skill.
- Do not centralize one-off prompt requirements or industry templates in repo-level files. Chapter content, evidence strategy, and domain-adaptive additions belong to the owning chapter skill and `.github/references/analysis-rules.md`.

## Section numbering

- Analysis artifacts number sections from their own chapter: `01` uses `1.x`, `02` uses `2.x`, ..., `08` uses `8.x`.
- In `91-full-report.yaml`, artifacts become chapters `2`–`9`; mapping is `report chapter N ↔ artifact N-1`.

## Cross-artifact readiness gates

Schema validity is necessary but not sufficient. Each owning chapter skill defines its own `01`–`08` completion and minimum-depth gates; this workflow only coordinates cross-artifact readiness and finalization gates.

Before `startup-evidence`, inspect sources, claims, tables, figures, sections, and gaps across all `01`–`08` artifacts. If the readiness audit fails or final review finds placeholders, unsupported synthesis, count-filler tables, or malformed figures, return to the owning chapter skill rather than fixing another skill's artifact in place.

Finalization gates:

- `90-evidence.yaml`: enough retained evidence for the final judgment; for visible companies, below roughly 50 sources or 90 claims is a red flag.
- `91-full-report.yaml`: preserve the union of upstream tables/figures unless `reportMeta.coverageNotes` explicitly names omissions and reasons.
- `92-summary-card.yaml`: summary counts and recommendation fields must reflect the current `91-full-report.yaml` and `90-evidence.yaml`.

Run the readiness audit before `startup-evidence` when a report folder has draft `01`–`08` artifacts:

```text
node scripts/audit-report-readiness.mjs <reportFolder> --pre-ledger
```

Fix failures before consolidation. Warnings are acceptable only when the report explicitly documents why evidence is unavailable.

Before `startup-summary-card`, compare `91` table/figure counts against the union of `01`–`08`; unexpectedly low counts mean `startup-full-report` dropped analysis and must be rerun.

## Validation gates

After each artifact write, parse the file and verify expected outputs, identity fields, claim refs, and figure contracts. Use the schema and references for exact checks.

Final validation after `92-summary-card.yaml`:

- Rebuild `reports/_index.yaml` with `node scripts/build-reports-index.mjs --strict`.
- Run `npm run validate`.
- Remove failed, duplicate, or incomplete partial report folders before commit.

## Evidence consolidation convention

- Canonical `S###` / `C###` IDs are reassigned by each `consolidate-evidence` run; never cache or hand-edit them outside the artifacts that script rewrites, and re-run `startup-full-report` and `startup-summary-card` after any reconsolidation.

## Updating an existing report

When fixing omissions, thin sections, or newly supportable data:

1. Update the owning analysis artifact (`01`–`08`).
2. Add or revise local evidence in that artifact.
3. Rerun `startup-evidence` to reconsolidate `90` and claim IDs.
4. Rerun affected analysis or downstream integration artifacts.
5. If recommendation, confidence, risk rating, or valuation stance changes, rerun `startup-full-report` and `startup-summary-card`.
6. Run `npm run validate`.

Do not commit or leave a partially updated report folder.

## Final response for report runs

Summarize only:

- Report folder.
- Generated YAML files.
- Source count and claim count.
- Recommendation, confidence, risk rating, valuation stance.
- Structured figure count and table count.
- Validation status.
- Main diligence gaps.
