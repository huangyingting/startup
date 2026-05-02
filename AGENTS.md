# AGENTS.md

Repository instructions for coding agents working on the startup diligence report generator and Astro website.

## Operating principles

- Work systematically: understand the request, inspect only relevant context, plan briefly, execute, validate, summarize.
- Be clear and explicit: state what changed, why it changed, and how it was checked.
- Stay concise: use short bullets, avoid repeating unchanged context, full tool output, or long plans.
- Keep going when the next useful action is clear; ask only when blocked or when a choice materially changes the result.
- Report progress at meaningful milestones, not after every small step.
- Final replies should include the outcome, key files changed, validation status, and important follow-ups or blockers.

## Repository overview

- This repo generates startup diligence reports as structured YAML and renders them with an Astro static site.
- Reports live in `reports/<YYYYMMDDHHmmss>-<company-slug>/` and are indexed by `reports/_index.yaml`.
- The canonical report schema is `.github/schemas/startup-diligence-report-v2.md`.
- English and Simplified Chinese artifacts are both required for complete reports.

## Important paths

- `.github/skills/` — workflow skills used by the default agent.
- `.github/skills/fetch-url/` — required skill for direct URL/link/page fetches.
- `.github/references/` — shared rules: YAML syntax, evidence ledger, analysis conventions, Simplified Chinese translation.
- `.github/schemas/startup-diligence-report-v2.md` — canonical schema and rendering contract.
- `scripts/` — report preparation, index, duplicate checks, evidence consolidation, and content checks.
- `website/` — Astro renderer, content loader, UI components, and website validation.

## Setup and validation commands

- Install root dependencies: `npm install`.
- Install website dependencies: `npm --prefix website install`.
- Run full validation from repo root: `npm run validate`.
- After report, schema, loader, renderer, workflow, or script changes, run `npm run validate` before finishing unless the user explicitly asks for a narrower edit.

## URL and page fetching

- For direct URL/link/page fetches, always load and follow the `fetch-url` skill.
- Use `node scripts/fetch-url.mjs ...`; do **not** use native `web_fetch` or similarly named built-in page-fetching tools in this repository.
- Use `--text-only` for readable text intended for grep/skimming.
- Use `--out` only for diagnostic saved bodies; `/tmp` files are never report artifacts or sources of truth.
- Use search tools for discovery across many sources, then `fetch-url` for direct page review when needed.

---

# Startup Research workflow

The default agent runs one complete `startup-diligence-report-v2` workflow per company by invoking workspace skills directly. Do not delegate to a separate research agent or recursively rerun this workflow from inside itself.

The final rendered report must include cover metrics, company introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

## Invocation contract

Resolve these inputs before running skills:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof by itself.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `currentDate`: actual session date in `YYYY-MM-DD`; use as the evidence freshness anchor and default `runDate` unless the user requests a historical report.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/schemas/startup-diligence-report-v2.md`.
- `yamlSyntaxPath`: absolute path to `.github/references/yaml-syntax.md`.

Before writing artifacts:

- Read `schemaPath` and `yamlSyntaxPath`.
- Read `.github/references/evidence-ledger.md` before writing local evidence or consolidating `100-evidence-ledger.yaml`.
- For analysis stages `01`–`08`, follow `.github/references/analysis-skill-conventions.md`.

## Required artifact set

Every completed report folder must contain exactly these workflow artifacts:

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

## Skill sequence

Run skills in this order:

1. `startup-snapshot` → `01-company-snapshot.yaml`, `01-company-snapshot.zh.yaml`.
2. `startup-market` → `02-market-macro.yaml`, `02-market-macro.zh.yaml`.
3. `startup-competition` → `03-competitive-benchmarking.yaml`, `03-competitive-benchmarking.zh.yaml`.
4. `startup-financials` → `04-financial-unit-economics.yaml`, `04-financial-unit-economics.zh.yaml`.
5. `startup-product` → `05-product-technology.yaml`, `05-product-technology.zh.yaml`.
6. `startup-customers` → `06-customer-retention.yaml`, `06-customer-retention.zh.yaml`.
7. `startup-risks` → `07-risk-regulatory.yaml`, `07-risk-regulatory.zh.yaml`.
8. `startup-valuation` → `08-investment-valuation.yaml`, `08-investment-valuation.zh.yaml`.
9. `startup-ledger` → generate `100-evidence-ledger.yaml` and rewrite `01`–`08` claim IDs.
10. `startup-report` → `101-report-document.yaml` from `01`–`08` and `100`.
11. `startup-report-zh` → `101-report-document.zh.yaml` from `101` plus `01`–`08.zh.yaml`.
12. `startup-card` → `102-report-card.yaml` from `100` and `101`.
13. `startup-card-zh` → `102-report-card.zh.yaml` from `102`.

## Dependency rules

- Every downstream analysis skill reads `01-company-snapshot.yaml` after it exists.
- Domain skills read only the upstream artifacts needed for their context.
- Later skills may inspect another artifact's gaps, tables, or figures, but must not directly edit another skill's owned artifact.
- If later research uncovers a supportable fact owned by an earlier domain, return to that earlier skill, update its local evidence/artifact, then continue forward.
- Consolidation/finalization skills (`startup-ledger`, `startup-report`, `startup-card`, and Chinese variants) do not gather new facts.

## Section numbering

- Analysis artifacts number sections from their own chapter: `01` uses `1.x`, `02` uses `2.x`, ..., `08` uses `8.x`.
- In `101-report-document.yaml`, artifacts become chapters `2`–`9`; mapping is `101 chapter N ↔ artifact N-1`.
- `startup-report-zh` must reverse this mapping when sourcing section titles/content from `XX.zh.yaml`; otherwise chapters `2` and `9` can retain English titles.

## Research and evidence standards

Follow `.github/references/evidence-ledger.md` and `.github/references/analysis-skill-conventions.md` for detailed rules. Core expectations:

- Use `currentDate` for volatile facts; prefer sources from the last 24 months.
- Ask report-specific research questions, including adverse/disconfirming angles.
- Use `web_search` for discovery and `fetch-url` for direct page review of retained sources.
- Mine official pages first when `companyUrl` exists, but label official claims as `company-claimed` or `observed`.
- Corroborate valuation, financial, customer, legal, and regulatory claims independently when possible.
- Put unsupported important facts in `evidenceGaps` with a concrete diligence path.

## Artifact depth gates

Schema validity is necessary but not sufficient. For normal public or late-stage private companies, use these floors:

- `01-company-snapshot.yaml`: at least 5 substantive sections, 3 tables, 2 figures, and a milestone timeline with at least 8 entries.
- Each of `02`–`08`: at least 4 substantive sections, 4 tables, and 2 figures; `07` and `08` should usually exceed the floor.
- `100-evidence-ledger.yaml`: enough retained evidence for the final judgment; for visible companies, below roughly 50 sources or 90 claims is a red flag.
- `101-report-document.yaml`: preserve the union of upstream tables/figures unless `reportMeta.coverageNotes` explicitly names omissions and reasons.

Reject thin work even if YAML parses:

- generic prose, placeholder translation, unsupported synthesis;
- repeated generic section titles or three-node figures;
- count-filler tables or string-valued chart numbers.

Before `startup-ledger`, inspect counts for sources, claims, tables, figures, sections, and gaps. If a stage misses the floor and the company is not genuinely obscure, return to that stage first.

Before `startup-card`, compare `101` table/figure counts against the union of `01`–`08`; unexpectedly low counts mean `startup-report` dropped analysis and must be rerun.

## Validation gates

After each stage, parse files and verify expected outputs, identity fields, claim refs, figure contracts, and Chinese parity. Use the schema and references for exact checks.

After `01-company-snapshot.yaml`, run:

```text
node scripts/check-company-dedup.mjs <reportFolder>/01-company-snapshot.yaml
```

- Exit `0`: continue.
- Exit `2`: duplicate risk; stop unless the user explicitly requested a refresh.
- Any other non-zero exit: fix the input/path issue before continuing.

Final validation after `102-report-card.zh.yaml`:

- Rebuild `reports/_index.yaml` with `node scripts/build-reports-index.mjs --strict`.
- Run `npm run validate`.
- Remove failed, duplicate, or incomplete partial report folders before commit.

## Evidence and YAML conventions

- Keep reports YAML-first; no prose-only deliverables.
- Trace factual claims through canonical `claimRefs` to `100-evidence-ledger.yaml`.
- Use `null` plus explanation for unsupported private metrics; never invent values.
- Preserve published canonical `S###` / `C###` IDs where possible.
- Figures must use structured YAML specs supported by the website renderer.

## Updating an existing report

When fixing omissions, thin sections, or newly supportable data:

1. Update the owning analysis artifact (`01`–`08`) and its `.zh.yaml` sibling.
2. Add or revise local evidence in that artifact.
3. Rerun `startup-ledger` to reconsolidate `100` and claim IDs.
4. Rerun affected downstream artifacts.
5. If recommendation, confidence, risk rating, or valuation stance changes, rerun `startup-report`, `startup-card`, and their Chinese siblings.
6. Run `npm run validate`.

Do not commit or leave a partially updated report folder.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Reports are loaded from `../reports/` via `website/src/content/reports-loader.ts`.
- English and Simplified Chinese report artifacts are both required for complete rendering.

## Final response for report runs

Summarize only:

- Report folder.
- Generated YAML files, English and Simplified Chinese.
- Source count and claim count.
- Recommendation, confidence, risk rating, valuation stance.
- Structured figure count and table count.
- Validation status.
- Main diligence gaps.
