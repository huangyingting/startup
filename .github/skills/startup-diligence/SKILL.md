---
name: startup-diligence
description: "Use when: producing a startup research report, company research report, startup diligence report, investment diligence report, or full end-to-end research on a named company. Trigger phrases include: research X company, research company X, analyze X startup, generate a report for X, startup research, company diligence, investment research, due diligence, full diligence workflow, startup-diligence-report-v2."
user-invocable: true
---

# Startup Diligence (workflow orchestrator)

This is the single entry point for generating a complete `startup-diligence-report-v2` report. It does not produce content itself; it sequences chapter skills and integration skills, enforces synchronization points, and runs the final validation gates.

The final rendered report must include cover metrics, company introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

## Invocation contract

Resolve these inputs before running any chapter skill:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof by itself.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `currentDate`: actual session date in `YYYY-MM-DD`; use as the evidence freshness anchor, search-query recency anchor, and default `runDate` unless the user requests a historical report.
- `duplicateCheck`: run `node scripts/check-company-dedup.mjs --company <companyName> [--website <companyUrl>]` before creating or writing the report folder. Exit `2` means duplicate risk; stop unless the user explicitly requested a refresh/update of an existing company.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/schemas/startup-diligence-report-v2.md`.
- `yamlSyntaxPath`: absolute path to `.github/references/yaml-syntax.md`.
- Prompt-derived run requirements: infer any audience, investment lens, required topics, metrics, competitors/comparables, figures, source constraints, or diligence questions from the user's prompt. These requirements are run-local and section-owned; satisfy them in the relevant artifacts or record an evidence gap.

Before writing artifacts:

- Read `schemaPath` and `yamlSyntaxPath`.
- Read `.github/references/evidence-ledger.md` before writing local evidence or consolidating `100-evidence-ledger.yaml`.
- Read `.github/references/zh-translation.md` before writing any `.zh.yaml` artifact; Chinese siblings must translate user-visible prose, not merely mirror English content.
- For analysis stages `01`–`08`, follow `.github/references/analysis-skill-conventions.md`.
- For each analysis stage, follow that stage's `startup-*` skill as the chapter generation contract: required chapter content, required tables, required figures, evidence acquisition, and domain-adaptive additions live in the owning skill.

## Required artifact set

Every completed report folder must contain all workflow artifacts declared by `scripts/report-manifest.mjs`. For the current v2 baseline:

```text
01-company-snapshot.yaml
01-company-snapshot.zh.yaml
02-market-macro.yaml
02-market-macro.zh.yaml
03-competitive-benchmarking.yaml
03-competitive-benchmarking.zh.yaml
04-financial-unit-economics.yaml
04-financial-unit-economics.zh.yaml
05-product-technology.yaml
05-product-technology.zh.yaml
06-customer-retention.yaml
06-customer-retention.zh.yaml
07-risk-regulatory.yaml
07-risk-regulatory.zh.yaml
08-investment-valuation.yaml
08-investment-valuation.zh.yaml
100-evidence-ledger.yaml
101-report-document.yaml
101-report-document.zh.yaml
102-report-card.yaml
102-report-card.zh.yaml
```

Rules:

- Write all artifacts directly under `reportFolder`.
- Each `01`–`08` English artifact must be paired with its `.zh.yaml` sibling before moving to the next stage.
- Never hand-write `100-evidence-ledger.yaml`; generate it with `node scripts/consolidate-evidence.mjs <reportFolder>`.
- Temporary files, terminal transcripts, and `/tmp` outputs are diagnostics only, not report artifacts or evidence sources.
- If a tool produces only a snippet or partial transcript, rewrite it as a complete YAML artifact under `reportFolder` before continuing.
- Research packs and cached page snapshots are diagnostics/handoffs only; they are not part of the required final artifact set.

## Skill sequence

Run skills in the order declared by `scripts/report-manifest.mjs`. The current v2 baseline is:

1. `startup-snapshot` → `01-company-snapshot.yaml` + `.zh.yaml`.
2. `startup-market` → `02-market-macro.yaml` + `.zh.yaml`.
3. `startup-competition` → `03-competitive-benchmarking.yaml` + `.zh.yaml`.
4. `startup-financials` → `04-financial-unit-economics.yaml` + `.zh.yaml`.
5. `startup-product` → `05-product-technology.yaml` + `.zh.yaml`.
6. `startup-customers` → `06-customer-retention.yaml` + `.zh.yaml`.
7. `startup-risks` → `07-risk-regulatory.yaml` + `.zh.yaml`.
8. `startup-valuation` → `08-investment-valuation.yaml` + `.zh.yaml`.
9. `startup-ledger` → `100-evidence-ledger.yaml` and rewrite `01`–`08` claim IDs.
10. `startup-report` → `101-report-document.yaml` and `101-report-document.zh.yaml` (English assembly + Simplified Chinese assembly inside the same skill).
11. `startup-card` → `102-report-card.yaml` and `102-report-card.zh.yaml` (English card + Simplified Chinese translation inside the same skill).

The orchestrator does not delegate to a separate research agent and does not recursively rerun this workflow from inside itself.

## Dependency rules

- Every downstream analysis skill reads `01-company-snapshot.yaml` after it exists.
- Domain skills read only the upstream artifacts needed for their context.
- Later skills may inspect another artifact's gaps, tables, or figures, but must not directly edit another skill's owned artifact.
- If later research uncovers a supportable fact owned by an earlier domain, return to that earlier skill, update its local evidence/artifact, then continue forward.
- Consolidation/finalization skills (`startup-ledger`, `startup-report`, `startup-card`) do not gather new facts.

## Concurrency model

Default safe mode is serialized artifact writing. Use parallelism only where the work is read-only and cannot race on shared YAML files.

Allowed after the pre-stage duplicate check passes and `01-company-snapshot.yaml` exists:

- Parallel source discovery, direct URL review, official-surface fetching, cached text snapshots, and chapter research notes for `02`–`08`.
- Parallel preparation of diagnostic research packs, provided each pack is written to a unique path and no final artifact is modified.

Not allowed without a dedicated orchestrator and locking/merge protocol:

- Parallel writes to `01`–`08` YAML artifacts or their `.zh.yaml` siblings.
- Parallel edits to `100-evidence-ledger.yaml`, `101-report-document.yaml`, `101-report-document.zh.yaml`, `102-report-card.yaml`, `102-report-card.zh.yaml`, or `reports/_index.yaml`.
- Running `startup-ledger` while any analysis artifact is still being edited.

Synchronization points:

1. Pre-stage duplicate check before report folder creation or stage 1 writing.
2. `01-company-snapshot.yaml` identity gate after the snapshot artifact exists.
3. Pre-ledger readiness audit after all `01`–`08` English/Chinese pairs exist.
4. `startup-ledger` consolidation.
5. `startup-report` assembly (English + Simplified Chinese in one stage).
6. `startup-card` generation (English + Simplified Chinese in one stage).
7. Final index rebuild and `npm run validate`.

## Section-owned prompt requirements and research packs

- Treat external prose-style due-diligence reports as depth/quality exemplars, not output format. Convert cover metrics, Mermaid-style diagrams, tables, appendices, bibliography, and citations into schema-native YAML artifacts, structured figures, `100` sources/claims, and `claimRefs`.
- Do not centralize one-off prompt requirements or industry templates in repo-level files. The workflow must support any startup category, not just software/Internet companies.
- If the user provides audience, investment lens, required metrics, required competitors/comparables, required figures, source constraints, or chapter-specific diligence questions, infer them from the prompt and route each requirement to the owning chapter skill.
- Each `startup-*` chapter skill owns its chapter content contract. The skill must define universal chapter requirements, required tables, required structured figures, evidence collection strategy, and domain-adaptive additions.
- Domain-adaptive additions are inferred from the company domain, business model, value-chain position, buyer/user/payment structure, revenue mechanism, regulatory exposure, physical/scientific/data/financial dependencies, and operating model. Do not hard-code the report around a small set of sectors.
- For normal report runs, pursue investor-grade research depth in every chapter: collect the useful official, independent, adverse, and freshness evidence that can change the chapter's sections, tables, figures, claims, or gaps. Stop adding sources only when new credible sources become duplicative or non-material.
- Create or maintain diagnostic per-chapter research packs after `01` and before artifact writing for visible companies, complex domains, or prompt-critical topics.
- For simple or obscure companies, a concise handoff note can replace a persisted pack only if it lists research questions, reviewed source classes, unresolved gaps, selected domain-adaptive additions, and why more sources were not material.
- Persisted packs should list reviewed URLs, source type, independence, candidate claims, key quotes, freshness, conflicts, adverse findings, open gaps, and why additional sources were or were not material.
- Cached fetched pages are for extraction speed only; cite the reviewed original URL in `localEvidence.sources[]`, not the cache path.
- Every prompt-critical request must be either satisfied in the owning artifact or recorded as an explicit `evidenceGaps[]` item with a diligence path.

## Section numbering

- Analysis artifacts number sections from their own chapter: `01` uses `1.x`, `02` uses `2.x`, ..., `08` uses `8.x`.
- In `101-report-document.yaml`, artifacts become chapters `2`–`9`; mapping is `101 chapter N ↔ artifact N-1`.
- The Simplified Chinese assembly inside `startup-report` must reverse this mapping when sourcing section titles/content from `XX.zh.yaml`; otherwise chapters `2` and `9` can retain English titles.

## Research and evidence standards

Follow `.github/references/evidence-ledger.md` and `.github/references/analysis-skill-conventions.md` for detailed rules. Core expectations:

- Use `currentDate` for volatile facts; prefer sources from the last 24 months.
- When generating search queries for volatile or current-status claims, include recency terms derived from `currentDate` (for example the current year, recent/updated language, or date-bounded operators when available) so stale sources do not dominate discovery.
- Ask report-specific research questions, including adverse/disconfirming angles.
- Use available search/discovery tools for both source discovery and cited Q&A against precise diligence questions; keep Q&A conclusions as hypotheses until supported by cited URLs or directly reviewed pages. Use `fetch-url` for direct page review of retained sources.
- Mine official pages first when `companyUrl` exists, but label official claims as `company-claimed` or `observed`.
- Corroborate valuation, financial, customer, legal, and regulatory claims independently when possible.
- Put unsupported important facts in `evidenceGaps` with a concrete diligence path.

## Artifact depth gates

Schema validity is necessary but not sufficient. `scripts/report-manifest.mjs` is the machine source for depth floors; for normal public or late-stage private companies, the prose baseline is:

- `01-company-snapshot.yaml`: at least 5 substantive sections, 3 tables, 2 figures, and a milestone timeline with at least 8 entries.
- Each of `02`–`08`: at least 4 substantive sections, 4 tables, and 2 figures; `07` and `08` should usually exceed the floor.
- `100-evidence-ledger.yaml`: enough retained evidence for the final judgment; for visible companies, below roughly 50 sources or 90 claims is a red flag.
- `101-report-document.yaml`: preserve the union of upstream tables/figures unless `reportMeta.coverageNotes` explicitly names omissions and reasons.

Reject thin work even if YAML parses:

- generic prose, placeholder translation, unsupported synthesis;
- repeated generic section titles or three-node figures;
- count-filler tables or string-valued chart numbers.

Do not stop because a chapter has reached the minimum floor. If credible evidence supports more rows, sections, figures, source diversity, or domain-specific treatment, expand the owning artifact before moving forward.

Before accepting any `01`–`08` chapter, confirm the owning skill performed domain reflection: inferred the relevant domain archetype(s), added supportable domain-specific content beyond `contract.yaml`, and recorded evidence gaps where public evidence is insufficient.

Before `startup-ledger`, inspect counts for sources, claims, tables, figures, sections, and gaps. If a stage misses the floor and the company is not genuinely obscure, return to that stage first.

Run the readiness audit before `startup-ledger` when a report folder has draft `01`–`08` artifacts:

```text
node scripts/audit-report-readiness.mjs <reportFolder> --pre-ledger
```

Fix failures before consolidation. Warnings are acceptable only when the report explicitly documents why evidence is unavailable.

Before `startup-card`, compare `101` table/figure counts against the union of `01`–`08`; unexpectedly low counts mean `startup-report` dropped analysis and must be rerun.

## Validation gates

After each stage, parse files and verify expected outputs, identity fields, claim refs, figure contracts, and Chinese parity. Use the schema and references for exact checks.

Before creating or writing a new report folder, run:

```text
node scripts/check-company-dedup.mjs --company <companyName> [--website <companyUrl>]
```

- Exit `0`: continue.
- Exit `2`: duplicate risk; stop unless the user explicitly requested a refresh.
- Any other non-zero exit: fix the input/path issue before continuing.

The legacy snapshot-file mode remains available only for manual cross-checks after `01-company-snapshot.yaml` exists:

```text
node scripts/check-company-dedup.mjs <reportFolder>/01-company-snapshot.yaml
```

Final validation after `102-report-card.zh.yaml`:

- Rebuild `reports/_index.yaml` with `node scripts/build-reports-index.mjs --strict`.
- Run `npm run validate`.
- Remove failed, duplicate, or incomplete partial report folders before commit.

## Evidence and YAML conventions

- Keep reports YAML-first; no prose-only deliverables.
- Trace factual claims through canonical `claimRefs` to `100-evidence-ledger.yaml`.
- Use `null` plus explanation for unsupported private metrics; never invent values.
- Canonical `S###` / `C###` IDs are reassigned by each `consolidate-evidence` run; never cache or hand-edit them outside the artifacts that script rewrites, and re-run `startup-report` and `startup-card` after any reconsolidation.
- Figures must use structured YAML specs supported by the website renderer.

## Updating an existing report

When fixing omissions, thin sections, or newly supportable data:

1. Update the owning analysis artifact (`01`–`08`) and its `.zh.yaml` sibling.
2. Add or revise local evidence in that artifact.
3. Rerun `startup-ledger` to reconsolidate `100` and claim IDs.
4. Rerun affected downstream artifacts.
5. If recommendation, confidence, risk rating, or valuation stance changes, rerun `startup-report` and `startup-card` (each handles English + Simplified Chinese in the same stage).
6. Run `npm run validate`.

Do not commit or leave a partially updated report folder.

## Final response for report runs

Summarize only:

- Report folder.
- Generated YAML files, English and Simplified Chinese.
- Source count and claim count.
- Recommendation, confidence, risk rating, valuation stance.
- Structured figure count and table count.
- Validation status.
- Main diligence gaps.
