# AGENTS.md

This file gives coding agents the repository context and the **Startup Research workflow**. The default agent runs the workflow directly through skills; there is no separate research agent.

## Project overview

- This repo generates startup diligence reports as structured YAML and renders them with an Astro static website.
- Reports live in `reports/<YYYYMMDDHHmmss>-<company-slug>/` and are indexed by `reports/_index.yaml`.
- The report schema is `startup-diligence-report-v2`; see `.github/schemas/startup-diligence-report-v2.md` for exact contracts.

## Important paths

- `.github/skills/` — stage skills the default agent invokes for the Startup Research workflow.
- `.github/references/` — shared YAML and evidence-ledger rules.
- `.github/schemas/startup-diligence-report-v2.md` — canonical schema and rendering contract.
- `scripts/` — report folder, index, duplicate, and content checks.
- `website/` — Astro site and rendering-contract validation.

## Setup and validation

- Install root dependencies with `npm install`.
- Install website dependencies with `npm --prefix website install`.
- Run full validation from the repo root with `npm run validate`.
- After report, schema, loader, renderer, workflow, or script changes, run `npm run validate` before finishing.

---

# Startup Research workflow

The default agent runs one complete `startup-diligence-report-v2` workflow per company by calling workspace skills directly. Internal report stages are skills, not delegated agents. The rendered report must include cover metrics, startup introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

For automatic recent-unicorn batches, the default agent selects candidates and runs one workflow per selected company. Do not invoke a separate research agent or recursively re-run this workflow from within itself.

## Invocation contract

Resolve before running skills:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/schemas/startup-diligence-report-v2.md`.
- `yamlSyntaxPath`: absolute path to `.github/references/yaml-syntax.md`.

Read `schemaPath` and `yamlSyntaxPath` before writing any artifact. Use the relevant workspace skills in `.github/skills/` for each stage. Read `.github/references/evidence-ledger.md` before writing local evidence or consolidating `100-evidence-ledger.yaml`.

## v2 artifact contract

The final report folder must contain these files. `100-evidence-ledger.yaml` is generated after `01`–`08` by consolidating each artifact's local evidence, not by shared incremental appends. The final report and card use `101` and `102`; Simplified Chinese files use the same numbers and are produced last.

```text
01-company-snapshot.yaml
02-market-macro.yaml
03-competitive-benchmarking.yaml
04-financial-unit-economics.yaml
05-product-technology.yaml
06-customer-retention.yaml
07-risk-regulatory.yaml
08-investment-valuation.yaml
100-evidence-ledger.yaml
101-report-document.yaml
102-report-card.yaml
101-report-document.zh.yaml
102-report-card.zh.yaml
```

All artifacts must be written directly under `reportFolder`. `/tmp` tool-output files are diagnostic logs only: never treat them as report artifacts, handoff inputs, or sources of truth. If a stage produces only a snippet or temporary transcript, rewrite it as a complete file under `reportFolder` before moving on.

## Skill sequence

Use exactly this skill sequence for one company run:

1. `startup-snapshot` writes `01` with local identity/snapshot sources and claims.
2. `startup-market` writes `02` with local market sources and claims.
3. `startup-competition` writes `03` with local competition sources and claims.
4. `startup-financials` writes `04` with local financial sources and claims.
5. `startup-product` writes `05` with local product/technology sources and claims.
6. `startup-customers` writes `06` with local customer/retention sources and claims.
7. `startup-risks` writes `07` with local risk/regulatory sources and claims.
8. `startup-valuation` writes `08` with local investment/valuation sources and claims.
9. `startup-ledger` runs `node scripts/consolidate-evidence.mjs <reportFolder>` to create `100` and rewrite `01`–`08` claim IDs.
10. `startup-report` writes `101` from artifacts `01`–`08` using canonical claim IDs.
11. `startup-card` writes `102` from `100` and `101`.
12. `startup-report-zh` translates `101` into `101-report-document.zh.yaml`.
13. `startup-card-zh` translates `102` into `102-report-card.zh.yaml`.

Do not invoke separate agents for `01`–`102`. The default agent performs all reads, searches, edits, validation, and final reporting.

## Dependency rules

Downstream skills do not need to mechanically read every prior artifact. Each skill must read its minimum dependency set, plus any upstream artifact needed to resolve a concrete gap or maintain consistency.

- Every downstream analysis skill reads `01-company-snapshot.yaml` for company identity once `01` exists.
- Domain skills read only the upstream artifacts that define their required context. For example, competition reads market boundaries; valuation reads financial, customer, and risk evidence.
- A skill may inspect another artifact's open gaps or relevant tables/figures, but it must not edit another skill's owned artifact directly.
- If a skill finds a supportable missing fact that belongs to an earlier domain, route back to that earlier skill, update its local evidence and artifact, then continue forward.
- `startup-ledger`, `startup-report`, and `startup-card` are consolidation/finalization skills; they read the completed artifacts they explicitly depend on and do not gather new facts.
- `startup-report-zh` and `startup-card-zh` read only their English source artifact and preserve facts, IDs, numbers, and schema shape.

## Validation gates

After every skill stage:

- Parse all files written so far.
- Confirm expected files for the current stage exist in `reportFolder`. Before consolidation, `100-evidence-ledger.yaml` is not expected yet.
- Check `schemaVersion: startup-diligence-report-v2`.
- Check `artifact`, `slug`, `runDate`, and `company.name` consistency.
- Before consolidation, validate each artifact's `claimRefs` against its own `localEvidence.claims[]`.
- After consolidation, validate all `claimRefs` in `01`–`102` against `100-evidence-ledger.yaml`.
- After consolidation, validate all claim `sourceRefs` in `01` against retained ledger sources.
- Ensure `coverage.sourcesRetained === sources.length` and `coverage.claimsCreated === claims.length` when `01` is consolidated.
- Validate every figure against the schema Figure rendering contract: no empty required arrays, no non-canonical primary fields, no string-valued numeric chart values, visible cards/layers/nodes need `label` plus renderable content.
- Reject any artifact that is missing its document head or begins with continuation prose / a mid-list fragment.
- Reject thin analysis output: each `02`–`08` artifact should include multiple substantive sections plus chapter-appropriate tables/figures. If a table family is not supportable from evidence, include a clearly labeled diligence gap.

After `01-company-snapshot.yaml`, run `node scripts/check-company-dedup.mjs <reportFolder>/01-company-snapshot.yaml`. Exit code `0` means continue; exit code `2` means duplicate-risk and you must stop unless the user explicitly requested a refresh of that company; any other non-zero exit means fix the input/path problem before continuing.

## Dynamic gap loop

Each analysis skill closes its own supportable gaps before writing:

1. Before writing an artifact, inspect its required table families, figures, metrics, `evidenceGaps`, and downstream chapter needs.
2. If a missing item appears supportable, run targeted `web_search` inside that skill, add cited sources/claims to that artifact's `localEvidence`, then write the artifact using local `claimRefs`.
3. If targeted searches do not find usable cited evidence, document the gap explicitly in that artifact instead of inventing values.
4. If a later skill discovers a missing item belonging to an earlier domain, return to the relevant skill, append evidence if available, rewrite affected artifacts, then continue forward.
5. Proceed to `startup-ledger` only after `02`–`08` have either closed supportable gaps or explicitly documented unsupported ones.

## Final validation

After `startup-card-zh` writes the final required `.zh.yaml` file:

- Rebuild `reports/_index.yaml` with `node scripts/build-reports-index.mjs --strict`.
- Run `npm run validate`.
- Remove failed, duplicate, or incomplete partial report folders before commit.

## Final response

Summarize: report folder, generated YAML files (English plus required Simplified Chinese), source count, claim count, recommendation, confidence, risk rating, valuation stance, structured figure count, table count, validation status, and main diligence gaps.

## Update an existing report

When a review finds accidental omissions, thin sections, or supportable data that was not captured, run the dynamic gap loop above on the existing report folder.

- For already-published reports, preserve existing canonical `S###` / `C###` IDs in `100-evidence-ledger.yaml` whenever possible. Add new canonical IDs after the current maximum and keep existing final `claimRefs` stable.
- When research scope or planned chapter needs change, update the relevant owned analysis artifact (`01`–`08`) and its `localEvidence`; rerun `startup-ledger` to reconsolidate `100` and rewrite final `claimRefs` as needed.
- If new claims materially change recommendation/confidence/riskRating/valuationStance, rerun downstream affected skills, then rerun `startup-ledger`, `startup-report`, `startup-card`, `startup-report-zh`, and `startup-card-zh`.
- Do not commit a partially-updated report folder.
- After updates and reruns, run `npm run validate`.

---

## Evidence and YAML conventions

- Keep reports YAML-first; do not add prose-only report deliverables.
- Every final external factual claim should trace through canonical `claimRefs` to `100-evidence-ledger.yaml` claims and retained source URLs from `web_search` citations/annotations.
- Use `null` with an explanation for unsupported private metrics; do not invent values.
- Numeric KPI and chart values must be numbers, not strings.
- Figures must use structured YAML specs rendered by the website; follow the schema instead of title-based heuristics.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Report content is loaded from `../reports/` via `website/src/content/reports-loader.ts`.
- English and Simplified Chinese report artifacts are both required for complete reports.
