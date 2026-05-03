---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

Single entry point for generating a complete `report-v2` startup diligence report.

Keep the workflow simple: load the ordered chapter config, generate each chapter, run its gate, iterate only failed parts, then build the final artifacts.

## Inputs

- `companyName` — required.
- `companyUrl` — optional identity anchor.
- `runTimestamp` — UTC `YYYYMMDDHHmmss`.
- `currentDate` — actual session date; use it for freshness and `runDate`.
- User requirements — route to the relevant chapter; do not create new repo templates from one request.

## Required setup

1. Read `./references/report-schema-v2.md` and `./references/yaml-rules.md`.
2. Load chapter order:
   `node .github/skills/startup-research/scripts/chapter.mjs --list --format json`
3. Create the report folder:
   `node .github/skills/startup-research/scripts/new.mjs <runTimestamp> <companyName> [--website <companyUrl>]`

If folder creation exits `2`, stop unless this is an intentional refresh; then rerun with `--allow-duplicate`.

## Chapter loop

For each chapter `order` from the loader:

1. Load the chapter packet:
   `node .github/skills/startup-research/scripts/chapter.mjs --order <n> --format json --include-workflow`
   Optionally append `--include-context` to inline the sections, tables, figures, and consolidated claimRefs of every file listed in `optionalContext` so the chapter brief carries reusable ground truth from earlier chapters.
2. Use only `packet.chapter` as the chapter brief: `file`, `artifact`, `title`, `mission`, `optionalContext`, `contentRequirements`, `requiredTables`, `requiredFigures`, `evidenceStrategy`, `qualityBar`, and `gate`.
3. Generate at least `packet.chapter.gate.minResearchQuestions` targeted search questions from the packet's content and output requirements; plan to retain at least `gate.minLocalSources` reviewed sources and `gate.minLocalClaims` atomic claims. Use `currentDate` in searches for volatile facts so results can reflect the latest funding, valuation, customers, pricing, legal, regulatory, outage, or product status.
4. Use `web_search` or available search tools to discover relevant facts and URLs, then review retained direct URLs with `fetch-url`:
   `node .github/skills/fetch-url/scripts/fetch.mjs <url> --text-only`
5. Convert reviewed evidence into `localEvidence.researchQuestions[]` (the search/diligence questions you ran), `localEvidence.sources[]`, `localEvidence.claims[]`, and `localEvidence.evidenceGaps[]`.
6. For each entry in `requiredFigures`, check whether the data you actually collected satisfies the figure type's data contract (e.g. `dag` needs `edges`, `cohort` needs time-bucket retention percentages 0–100, `range` needs comparable units across rows). If it does, write the figure into the chapter YAML; if it does not, **substitute** the figure for an extra table covering the same content and note the substitution in that table's `notes` or in the chapter's `evidenceGaps`. Tables and figures share one combined artifact slot in the gate, so a substitution does not fail the gate.
7. Generate the chapter YAML at `reportFolder/<chapter.file>` according to the packet's output requirements and the report schema.
8. Run the packet gate with structured output:
   `node .github/skills/startup-research/scripts/gate.mjs <reportFolder> <chapter.file> --format json`
   Exit `0` means the chapter is ready. On nonzero exit, parse `failedDimensions[]` from the JSON to scope the retry — see "Retry scope" below.
9. Advance with `packet.nextChapter`; if it is `null`, move to finalization.

### Retry scope

The gate emits a `failedDimensions[]` enum with stable keys. Map them to the right retry action; do not redo the whole chapter when only one dimension fails.

| Failed dimension | Targeted action |
|---|---|
| `researchQuestions` | Add new diligence questions; do not regenerate sections. |
| `sources` | Run additional searches and `fetch-url` calls to grow `localEvidence.sources`. |
| `claims` | Extract more atomic claims from already-reviewed sources before broadening search. |
| `claimRefs` | Resolve dangling refs by adding the missing claim or correcting the citation; do not duplicate evidence. |
| `sectionsMin` / `artifactsMin` | Add the missing section, table, or figure (or substitute per step 6). |
| `depthSection` / `depthSectionTotal` | Expand the prose of the shortest section(s) only; leave the others untouched. |
| `depthTableRows` / `depthFigureData` | Add rows/data points to existing tables/figures. |
| `duplicateAnalysis` (warning) | Merge the redundant table/figure pair or sharpen one to answer a distinct question. |
| `figureType` (warning) | Either add a planned figure type or document the substitution in evidenceGaps. |

Retry up to `packet.workflow.researchLoop.maxGateIterations`. Advance only when the gate exits `0`.

## Research and evidence rules

- Chapter-specific requirements come from the script-loaded chapter packet.
- Review direct URLs before retaining them as evidence; do not cite generic search-result pages.
- Prefer primary/official sources plus independent, customer, regulatory, or adverse sources when available.
- Put reviewed sources, atomic claims, and evidence gaps in the chapter's `localEvidence`.
- Cite material sections, tables, figures, and callouts with local `claimRefs`.
- Local `S###` and `C###` IDs are scoped to one artifact.
- Claims must be atomic; do not bundle several facts into one claim.
- Every factual claim needs `sourceRefs`, except `claimType: open-question` with `corroboration: none`.
- Use honest labels for `claimType`, `confidence`, `freshness`, and `corroboration`.
- Missing, stale, contradictory, private, or unsupported important facts become `evidenceGaps[]`. `evidenceGaps[]` documents missing public data; it does not waive the `minResearchQuestions` / `minLocalSources` / `minLocalClaims` thresholds in `gate`.
- Use `currentDate` from the report run as the freshness anchor and preserve source date precision.
- Re-check volatile facts such as funding, valuation, headcount, customers, pricing, legal issues, outages, and regulatory status.
- Tables should contain evidence-backed values or explicit gaps.
- Figures must be structured YAML objects using schema-supported fields only; do not use Mermaid, SVG, prose diagrams, JSON strings, or fabricated chart data.

## Finalization

After all analysis chapters pass:

1. Build evidence:
   `node .github/skills/startup-research/scripts/ledger.mjs <reportFolder>`
2. Write `report-meta.yaml` in the report folder with the judgment fields the analysis chapters do not encode (recommendation, confidence, risk rating, valuation stance, cover metrics, startup introduction, top strengths/risks, unresolved gaps, overall score, headline, summary-card company facts). See `references/report-meta-schema.md` for the exact shape.
3. Assemble the consolidated artifacts:
   `node .github/skills/startup-research/scripts/assemble.mjs <reportFolder>`
   This deterministically stitches `01-08`-chapter YAMLs + `90-evidence.yaml` + `report-meta.yaml` into `91-full-report.yaml` and `92-summary-card.yaml`. Re-run after editing any chapter or `report-meta.yaml`.
4. Run the cross-chapter consistency check:
   `node .github/skills/startup-research/scripts/cross-chapter.mjs <reportFolder>`
   Resolve any drift it reports (mismatched valuations, founding dates, customer counts, ARR figures referenced from multiple chapters) before validating.
5. Rebuild index:
   `node .github/skills/startup-research/scripts/index.mjs --strict`
6. Validate:
   `npm run validate`

## Hard rules

- Do not hand-write `90-evidence.yaml`, `91-full-report.yaml`, or `92-summary-card.yaml`; let the scripts assemble them. Edit the source chapter YAMLs or `report-meta.yaml` instead.
- Do not edit another chapter's artifact while working on the current chapter.
- Do not invent facts, metrics, customers, funding, valuation, or dates.
- Use structured YAML figures only; no Mermaid/SVG/prose diagrams.
- Keep temporary files and research notes out of `reports/`.
- Final response: report folder, generated files, source/claim counts, recommendation, confidence, risks, valuation stance, table/figure counts, validation result, and main gaps.
