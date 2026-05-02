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
- `currentDate`: required as the actual current date from the chat/session context in `YYYY-MM-DD`; use it as the evidence freshness anchor and the default `runDate` unless the user explicitly requests a historical report.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/schemas/startup-diligence-report-v2.md`.
- `yamlSyntaxPath`: absolute path to `.github/references/yaml-syntax.md`.

Read `schemaPath` and `yamlSyntaxPath` before writing any artifact. Use the relevant workspace skills in `.github/skills/` for each stage. Read `.github/references/evidence-ledger.md` before writing local evidence or consolidating `100-evidence-ledger.yaml`.

## v2 artifact contract

The final report folder must contain these files. `100-evidence-ledger.yaml` is generated after `01`–`08` (and their Simplified Chinese siblings) by consolidating each artifact's local evidence, not by shared incremental appends. Each `XX-name.yaml` is paired with `XX-name.zh.yaml`, written by the same skill immediately after the English file. The final report and card use `101` and `102`; their Simplified Chinese versions are produced last.

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
102-report-card.yaml
101-report-document.zh.yaml
102-report-card.zh.yaml
```

All artifacts must be written directly under `reportFolder`. `/tmp` tool-output files are diagnostic logs only: never treat them as report artifacts, handoff inputs, or sources of truth. If a stage produces only a snippet or temporary transcript, rewrite it as a complete file under `reportFolder` before moving on.

## Skill sequence

Use exactly this skill sequence for one company run. Each analysis skill writes both the English artifact and its Simplified Chinese sibling in a single pass.

1. `startup-snapshot` writes `01-company-snapshot.yaml` and `01-company-snapshot.zh.yaml`.
2. `startup-market` writes `02-market-macro.yaml` and `02-market-macro.zh.yaml`.
3. `startup-competition` writes `03-competitive-benchmarking.yaml` and `03-competitive-benchmarking.zh.yaml`.
4. `startup-financials` writes `04-financial-unit-economics.yaml` and `04-financial-unit-economics.zh.yaml`.
5. `startup-product` writes `05-product-technology.yaml` and `05-product-technology.zh.yaml`.
6. `startup-customers` writes `06-customer-retention.yaml` and `06-customer-retention.zh.yaml`.
7. `startup-risks` writes `07-risk-regulatory.yaml` and `07-risk-regulatory.zh.yaml`.
8. `startup-valuation` writes `08-investment-valuation.yaml` and `08-investment-valuation.zh.yaml`.
9. `startup-ledger` runs `node scripts/consolidate-evidence.mjs <reportFolder>` to create `100` and rewrite `01`–`08` and `01-08.zh` claim IDs.
10. `startup-report` writes `101-report-document.yaml` from artifacts `01`–`08` using canonical claim IDs.
11. `startup-report-zh` assembles `101-report-document.zh.yaml` by reusing chapters/tables/figures from `01-08.zh.yaml` and translating only the executive summary, cover metrics, and other report-only fields.
12. `startup-card` writes `102-report-card.yaml` from `100` and `101`.
13. `startup-card-zh` translates `102` into `102-report-card.zh.yaml`.

## Dependency rules

Downstream skills do not need to mechanically read every prior artifact. Each skill must read its minimum dependency set, plus any upstream artifact needed to resolve a concrete gap or maintain consistency.

- Every downstream analysis skill reads `01-company-snapshot.yaml` for company identity once `01` exists.
- Domain skills read only the upstream artifacts that define their required context. For example, competition reads market boundaries; valuation reads financial, customer, and risk evidence.
- A skill may inspect another artifact's open gaps or relevant tables/figures, but it must not edit another skill's owned artifact directly.
- If a skill finds a supportable missing fact that belongs to an earlier domain, route back to that earlier skill, update its local evidence and artifact, then continue forward.
- `startup-ledger`, `startup-report`, and `startup-card` are consolidation/finalization skills; they read the completed artifacts they explicitly depend on and do not gather new facts.
- `startup-report-zh` assembles `101-report-document.zh.yaml` from `101-report-document.yaml` plus every `01-08.zh.yaml`; `startup-card-zh` translates `102-report-card.yaml`. Both follow `.github/references/zh-translation.md` and preserve facts, IDs, numbers, enums, and schema shape.

## Validation gates

After every skill stage:

- Parse all files written so far.
- Confirm expected files for the current stage exist in `reportFolder`. Each analysis skill must produce both `XX-name.yaml` and `XX-name.zh.yaml` before the next skill starts. Before consolidation, `100-evidence-ledger.yaml` is not expected yet.
- Check `schemaVersion: startup-diligence-report-v2`.
- Check `artifact`, `slug`, `runDate`, and `company.name` consistency between each English file and its Simplified Chinese sibling.
- Before consolidation, validate each artifact's `claimRefs` against its own `localEvidence.claims[]`.
- After consolidation, validate all `claimRefs` in `01`–`102` (including `.zh.yaml` files) against `100-evidence-ledger.yaml`.
- After consolidation, validate all claim `sourceRefs` in `01` against retained ledger sources.
- Ensure `coverage.sourcesRetained === sources.length` and `coverage.claimsCreated === claims.length` when `01` is consolidated.
- Validate every figure against the schema Figure rendering contract: no empty required arrays, no non-canonical primary fields, no string-valued numeric chart values, visible cards/layers/nodes need `label` plus renderable content.
- Reject any artifact that is missing its document head or begins with continuation prose / a mid-list fragment.
- Reject thin analysis output: each `02`–`08` artifact should include multiple substantive sections plus chapter-appropriate tables/figures. If a table family is not supportable from evidence, include a clearly labeled diligence gap.
- For each `XX-name.zh.yaml`, run the residual-English sweep and structural-parity check defined in `.github/references/zh-translation.md`.

After `01-company-snapshot.yaml`, run `node scripts/check-company-dedup.mjs <reportFolder>/01-company-snapshot.yaml`. Exit code `0` means continue; exit code `2` means duplicate-risk and you must stop unless the user explicitly requested a refresh of that company; any other non-zero exit means fix the input/path problem before continuing.

## Dynamic gap loop

Each analysis skill closes its own supportable gaps before writing:

1. Before writing an artifact, inspect its required table families, figures, metrics, `evidenceGaps`, and downstream chapter needs.
2. If a missing item appears supportable, use targeted web research or direct page reads in the owning skill, add sources/claims to that artifact's `localEvidence`, then write the artifact using local `claimRefs`.
3. If targeted searches do not find usable cited evidence, document the gap explicitly in that artifact instead of inventing values.
4. If a later skill discovers a missing item belonging to an earlier domain, return to the relevant skill, append evidence if available, rewrite affected artifacts, then continue forward.
5. Proceed to `startup-ledger` only after `02`–`08` have either closed supportable gaps or explicitly documented unsupported ones.

## Research freshness and query design

Every analysis skill must optimize research for the report being written, not for generic keyword recall.

- Use `currentDate` in the research plan. For volatile facts such as funding round, valuation, revenue, ARR, headcount, customers, product releases, pricing, litigation, regulatory posture, partnerships, and leadership, search for the latest/current status as of `currentDate` before writing. Prefer sources from the last 24 months; if a durable older source is used, label the claim `freshness: historical`.
- Use complete-sentence research questions tied to the intended report paragraph, table, or figure. Avoid bare keyword strings such as `company series f valuation`; ask questions such as `What is the latest funding round and post-money valuation for OpenAI as of May 2, 2026, and did it supersede the previously reported Series F?`.
- Ask multiple chapter-specific questions before declaring a gap. Cover required sections, table families, figures, key metrics, contradictions, and diligence gaps. Vary wording across official, independent, metric-specific, customer/competitor/regulatory, and adverse-case searches.
- If results are thin or stale, rewrite the question from another angle before declaring a gap. Example rewrites: `latest valuation` → `most recent financing round and post-money valuation`; `current revenue run-rate` → `annualized revenue estimate and corroborating reports`; `customer list` → `named enterprise deployments and case studies as of <currentDate>`.
- Before finalizing each artifact, run a recency audit for report-critical facts. If a newer source supersedes an older claim, update the claim, table, figure, and downstream narrative; do not leave stale facts such as an older financing round when a newer round is public.
- Query both confirming and disconfirming angles. For each major chapter, include at least one question designed to find adverse evidence, constraints, customer complaints, lawsuits, regulatory actions, competitive weakness, or missing metrics.
- Record unsupported but important current facts as explicit `evidenceGaps` with the exact follow-up diligence path rather than burying them in prose.

## Official website and article mining

When `company.website` or `companyUrl` is available, each research skill mines the startup's official site for chapter-relevant evidence before relying on external snippets. Use homepage, sitemap, robots.txt, navigation, blog/news/resources, product, pricing, docs, changelog, customer stories, case studies, trust/security, status, partner, press, and funding pages as relevant.

- Treat official website pages as strong evidence for what the company claims, sells, packages, documents, announces, and chooses to emphasize. Mark such claims as `company-claimed` or `observed` rather than independent validation.
- Use official articles to extract product modules, buyer personas, use cases, vertical focus, customer proof, partner ecosystem, pricing/packaging, release chronology, security posture, policy statements, fundraising announcements, and management narrative.
- Use independent sources to corroborate, challenge, or contextualize official-site claims. Do not treat company-authored blogs as independent proof of market size, competitive superiority, retention, revenue, or risk mitigation.
- Preserve discovered article URLs in the owning artifact's `localEvidence.sources[]` and convert useful article facts into atomic `localEvidence.claims[]`. If an official page family is expected but missing, record an `evidenceGaps` item.
- For competitor analysis, mine competitors' official sites, docs, pricing, customer pages, and changelogs when comparing features or packaging, but label competitor-authored claims honestly and corroborate important comparisons with independent sources where possible.

## Raw artifact depth requirements

Artifacts `01`–`08` are the research record, not just a thin handoff to the final report. Preserve enough source-backed detail in the original YAML so `startup-report` can write a detailed analysis with its own investment judgment.

- Each analysis artifact must retain substantive sections, chapter-appropriate tables, structured figures, local sources, atomic local claims, evidence gaps, and notes explaining why key metrics are supported, estimated, conflicting, or unavailable.
- Do not discard researched material merely because it may not appear on the final report card. Keep useful diligence evidence in the owned artifact under sections, tables, figures, and `localEvidence` so later report-writing can synthesize from a rich record.
- Tables should include detailed comparables, timelines, pricing, product, customer, risk, and scenario rows where evidence supports them. If exact numbers are unavailable, include the qualitative row with `null` metrics and a clear diligence ask.
- Final report-writing must synthesize from this raw record and add investor judgment, but it must not create new unsupported facts. If the raw artifacts are too thin for a detailed final view, route back to the owning skill and deepen the artifact before consolidation.

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
- Every final external factual claim should trace through canonical `claimRefs` to `100-evidence-ledger.yaml` claims and retained source URLs with valid provenance: cited search result or directly reviewed page.
- Use `null` with an explanation for unsupported private metrics; do not invent values.
- Numeric KPI and chart values must be numbers, not strings.
- Figures must use structured YAML specs rendered by the website; follow the schema instead of title-based heuristics.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Report content is loaded from `../reports/` via `website/src/content/reports-loader.ts`.
- English and Simplified Chinese report artifacts are both required for complete reports.
