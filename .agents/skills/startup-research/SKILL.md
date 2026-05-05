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
   `node .agents/skills/startup-research/scripts/load-chapter.mjs --list --format json`
3. Create the report folder:
   `node .agents/skills/startup-research/scripts/new-report.mjs <runTimestamp> <companyName> [--website <companyUrl>]`

If folder creation exits `2`, stop unless this is an intentional refresh; then rerun with `--allow-duplicate`.

## Chapter loop

For each chapter `order` from the loader:

1. Load the chapter packet:
   `node .agents/skills/startup-research/scripts/load-chapter.mjs --order <n> --format json`
   Workflow context (`previousChapter` / `nextChapter`) ships by default; pass `--no-workflow` only if you need the raw chapter spec. Append `--include-context --report-folder <path>` to inline the sections, tables, figures, and consolidated claimRefs of every file listed in `optionalContext` so the chapter brief carries reusable ground truth from earlier chapters.
2. Use only `packet.chapter` as the chapter brief: `key`, `order`, `file`, `artifact`, `title`, `mission`, `optionalContext`, `contentRequirements`, `plannedTables`, `plannedFigures`, `evidenceStrategy`, `qualityBar`, and `gate`.
3. **Plan typed research questions first.** Generate at least `gate.minResearchQuestions` items into `localEvidence.researchQuestions[]`; each item follows the `researchQuestion` shape in `references/report-schema-v2.md`. Start every question with `status: unresolved` and flip to `answered` only when a claim cites it via `claim.answersQuestionRefs`. Each `question` string must be at least 20 characters and include a specific anchor (company / product / year / numeric). Distribute the types so that `gate.minQuestionTypeSpread` distinct types are covered, including at least `gate.minAdverseQuestions` of `type: adverse`. Cover at least `gate.minContentRequirementCoverage` (default 80%) of the chapter's `contentRequirements[]` via `targets[]`.
4. **Search and fetch under audit.** Use `web_search` (or equivalent) to find URLs, then review each kept URL with `fetch-url`:
   `node .agents/skills/fetch-url/scripts/fetch.mjs <url> --text-only`
   Record the actual queries you ran in `localEvidence.searchQueries[]` (`{query, engine, hits, retainedSourceRefs}`); leaving this empty when `researchQuestions` is non-empty is a gate failure.
5. **Build evidence with full source metadata.** Convert reviewed URLs into `localEvidence.sources[]` (see `source` in the schema for required fields). Then write `localEvidence.claims[]` (atomic facts) using the schema's `claim` shape; set `answersQuestionRefs: [RQ###]` to close the loop on questions. Surface every unresolved/partial question as a typed `evidenceGap` (see step 9).
   - **Diversity is per-chapter, not just report-wide.** Each chapter must hit `gate.minSourceDomains` distinct registrable domains, `gate.minSourceTypeSpread` distinct sourceTypes, every `gate.requiredSourceTypes[]` value, and at least `gate.minNetNewSources` URLs that did not appear in any earlier-order chapter. Don't just reuse the global pool — pull fresh sources for the current chapter's `evidenceStrategy`.
   - **High-confidence claims demand corroboration.** When you set `claim.confidence: high`, supply at least `gate.minHighConfidenceCorroboration` `sourceRefs` and at least one of them must be a primary tier source (`sourceType: filing | regulatory | legal | official` or `reputationTier: high`).
6. **Honour planned figures, but substitute when data is wrong-shaped.** For each entry in `plannedFigures`, check the figure type's data contract (e.g. `dag` needs `edges`, `cohort` needs time-bucket retention 0–100, `range` needs comparable units across rows). If the data fits, write the figure. If not, **substitute** for an extra table covering the same content and document the swap in `evidenceGaps` with `type: enumeration-incomplete` or in the table's `notes`.
7. **Mark enumeration tables.** When a `plannedTable` has `enumeration: true`, the matching `tables[]` entry must include `enumerationScope: { coverage: exhaustive|partial|sample, basis: "..." }`. `partial`/`sample` requires either an `evidenceGap` entry whose `topic` mentions the table or a gap entry whose `relatedTableRefs[]` includes the table id. The table must also be backed by claims pointing to at least `gate.minSourcesPerEnumerationRow` distinct registrable domains.
8. Generate the chapter YAML at `reportFolder/<chapter.file>` per the report schema.
9. **Type your evidenceGaps.** Every `evidenceGap` follows the schema's `evidenceGap` shape. Use `relatedQuestionRefs[]` to close out an unresolved/partial researchQuestion and `relatedTableRefs[]` to flag an enumeration-incomplete table.
10. Run the chapter check with structured output:
    `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
    Exit `0` means the chapter is ready. On nonzero exit, parse the JSON for:
    - `globalHints[]` — chapter-wide root causes (one dimension failing on ≥3 objects); fix these first.
    - `objectFailures[]` — failures grouped by table/figure/claim/question id, each with the full `dimensions[]` and `fixes[]` for that object.
    - `failures[]` — per-issue entries; each carries `dimension`, `message`, and a one-line `fix` action.
    - `failedDimensions[]` and `retryOrder[]` (root-cause sorted) for the dimensions you must clear.
    - `suppressedDimensions[]` — downstream checks skipped because an upstream failure (e.g. `localEvidenceMissing`) makes them trivially fail; they will re-evaluate after you fix the root cause.
    See "Retry scope" below for the canonical dimension → action table (the same hints are inlined as `failure.fix`).
11. Advance with `packet.nextChapter`; if it is `null`, move to finalization.

### Retry scope

`check-chapter` emits a `failedDimensions[]` enum with stable keys plus a `retryOrder[]` sorted by causal precedence. Always work the dimensions in `retryOrder[]` order — fixing upstream dimensions often clears downstream ones. The table below mirrors that precedence.

| Failed dimension | Targeted action |
|---|---|
| `missingArtifact` | Create the chapter YAML at the expected path. |
| `yamlParse` | Fix the YAML syntax error reported in the message. |
| `documentHead` | Fix the chapter document head: `schemaVersion: report-v2`, `artifact` matches the chapter key, `slug`, `runDate: YYYY-MM-DD`, `company.name`, and `chapter.number` matches the chapter order. |
| `localEvidenceMissing` | Add the entire `localEvidence` block. |
| `researchQuestionShape` | Fix question objects: id `RQ###`, ≥20-char text, valid `type`, non-empty `targets[]`, valid `status`. |
| `researchQuestionTargets` | Point each `targets[]` entry at a real `contentRequirements/<index>`, `plannedTables/<slug>`, or `plannedFigures/<slug>`. |
| `researchQuestionTypeMix` | Add questions of types you have not used yet (need `gate.minQuestionTypeSpread` distinct types). |
| `researchQuestionAdverse` | Add `type: adverse` questions; the chapter (especially `risks` / `valuation`) needs at least `gate.minAdverseQuestions`. |
| `searchQueriesMissing` | Append the actual queries you ran into `localEvidence.searchQueries[]`. |
| `sourceShape` | Fix the source object: required fields (`publisher`, `title`, `accessDate`, `url`, `sourceType`, `reputationTier`, `independence`, `topics`, `accessStatus`, `stance`), valid enum values, `accessDate` / `date` in `YYYY-MM-DD` format, non-empty `topics`. |
| `sourceDomains` / `sourceTypeSpread` | Add sources from new domains / new `sourceType` values; don't duplicate publishers. |
| `requiredSourceTypes` | Pull at least one source of each missing type listed in `gate.requiredSourceTypes`. |
| `netNewSources` | Run new searches/fetches to add URLs not seen in earlier chapters; reusing the existing pool will not satisfy this gate. |
| `paywallRisk` (warning) | Swap restricted-access (`paywall`/`js-only`/`broken`/`rate-limited`) sources for `accessStatus: ok` ones to stay under the report-level 30 % ceiling. |
| `researchQuestions` / `sources` / `claims` | Add more items to hit the per-chapter floor. |
| `claimShape` | Fix the claim object: required fields (`statement`, `type`, `topic`, `sourceRefs`, `confidence`, `freshness`), valid enum values, non-empty `sourceRefs` unless `type: open-question`, `contradictsClaimRefs` when `type: conflicting`. |
| `highConfidenceCorroboration` | Either downgrade `confidence` from `high` to `medium`, or add a primary-tier source. |
| `researchQuestionAnswerCoverage` | Convert questions from `unresolved`/`partial` to `answered` by adding the missing claim and citing it via `claim.answersQuestionRefs`. |
| `researchQuestionClosure` | Add an `evidenceGap` whose `relatedQuestionRefs[]` includes the still-open question. |
| `claimAnswerRefs` | Resolve dangling `claim.answersQuestionRefs[]` entries (referenced `RQ###` does not exist in this chapter). |
| `claimContradictRefs` | Resolve dangling `claim.contradictsClaimRefs[]` entries; `type: conflicting` requires non-empty `contradictsClaimRefs`. |
| `claimRefs` | Resolve dangling `[C###]` references in sections / tables / figures / callouts. |
| `enumerationScope` | Add the `enumerationScope { coverage, basis(>=20 chars) }` block to the matching enumeration table. |
| `enumerationRows` | Add rows to reach `expectedMinRows` or set `coverage: partial` / `sample` with rationale. |
| `enumerationCoverageGap` | Open an `evidenceGap` whose `topic` mentions the table or whose `relatedTableRefs[]` cites it. |
| `enumerationRowCorroboration` | Add sources from additional registrable domains backing the table's `claimRefs`. |
| `tableShape` | Fix the table: non-empty `columns`, every row has the same number of cells as `columns`, `enumerationScope { coverage, basis(>=20 chars) }` shape when present. |
| `figureShape` | Fix the figure's `data` to satisfy its full contract: type/layout enum, required `data.*` fields per type, item/layer/row labels, matrix row width = columns count, numeric values for `bar` / `waterfall` / `funnel`, numeric `low`/`high` for `range`, 0–100 cells for `cohort`, numeric `x`/`y` for `quadrant`. |
| `duplicateIds` | Renumber duplicate or malformed table/figure ids; ids must match `T###` / `F###` and be unique within the chapter. |
| `artifactRefs` | Resolve the dangling `figureRef` / `tableRef`: it must point at an id that exists in this chapter's `figures[]` / `tables[]`. |
| `analysisCallout` | Fix the callout: required `title`, `body`, `claimRefs[]`, and (optional) `calloutType` in `strength|risk|recommendation|insight|assumption`. |
| `sectionsMin` / `artifactsMin` | Add the missing section, table, or figure (or substitute per step 6). |
| `depthSection` / `depthSectionTotal` | Expand the prose of the shortest section(s) only; leave the others untouched. |
| `depthTableRows` / `depthFigureData` | Add rows / data points to existing tables / figures. |
| `contentRequirementCoverage` | Add researchQuestions whose `targets[]` cover the un-targeted `contentRequirements`. |
| `duplicateAnalysis` (warning) | Merge the redundant table/figure pair, or sharpen one to answer a distinct question. |
| `figureType` (warning) | Either render a planned figure type, or document the substitution in `evidenceGaps`. |

Retry up to 3 times per chapter, scoping each retry strictly to the dimensions in `retryOrder[]`. The total failure count must monotonically decrease across retries; if it stalls, abort and surface the chapter as `unresolved` rather than thrashing. To accept a `--strict` warning instead of fixing it, add a top-level `acknowledgedWarnings: [{dimension, reason}]` entry in the chapter YAML where each `reason` is at least 30 characters explaining why the warning is intentional.

## Research and evidence rules

- Chapter-specific requirements come from the script-loaded chapter packet.
- Review direct URLs with `fetch-url` before retaining them as evidence; do not cite generic search-result pages.
- Prefer primary/official sources plus independent, customer, regulatory, or adverse sources; the gate enforces multi-domain, multi-sourceType, and adverse-stance coverage per chapter.
- Put reviewed sources, atomic claims, search queries, typed research questions, and typed evidence gaps in the chapter's `localEvidence`.
- Cite material sections, tables, figures, and callouts with local `claimRefs`.
- Local `S###`, `C###`, `T###`, `F###`, `RQ###` IDs are scoped to one artifact.
- Claims must be atomic; do not bundle several facts into one claim.
- Every factual claim needs `sourceRefs`, except `claim.type: open-question`.
- Use honest labels for `claim.type`, `claim.confidence`, and `claim.freshness`. Set `claim.contradictsClaimRefs` whenever `claim.type: conflicting`.
- Reuse identity facts. The `company-overview` chapter is the canonical home for founders, founding date, headquarters, total raised, latest valuation, headcount, and customer count. When a later chapter restates one of these facts, cite the same canonical claim id (post-ledger) — do not invent a parallel local claim. `cross-chapter.mjs` flags `keyFactDrift` when this is violated.
- Source `accessStatus` matters. Sources flagged `paywall`, `js-only`, `broken`, or `rate-limited` cannot be the sole `sourceRef` of a high-confidence claim, and the report-level gate fails when more than 30 % of sources fall in those buckets.
- Use `currentDate` from the report run as the freshness anchor and preserve source date precision.
- Re-check volatile facts such as funding, valuation, headcount, customers, pricing, legal issues, outages, and regulatory status.
- Tables should contain evidence-backed values or explicit gaps. Enumeration tables additionally need `enumerationScope` (see chapter-loop step 7).
- Cite a table's supporting claims via the table-level `claimRefs` field. Do **not** add an `evidence` (or `claim refs`) column that holds raw `C###` ids; the renderer surfaces footer refs automatically. A `source` / `publisher` / `attribution` column is allowed only when the cells hold the *origin institution or document name* ("Gartner", "SEC 10-K"), never bare claim ids.
- Figures must be structured YAML objects using schema-supported fields only; do not use Mermaid, SVG, prose diagrams, JSON strings, or fabricated chart data.
- `evidenceGaps[]` documents missing public data; it does not waive the per-chapter `gate` floors. Each gap is typed (`type` + `severity`) and may close a question via `relatedQuestionRefs[]` or a table via `relatedTableRefs[]`.

## Finalization

After all analysis chapters pass:

1. Author `report-meta.yaml` in the report folder per the `report-meta` schema in `references/report-schema-v2.md`. It carries the judgment fields the analysis chapters do not encode (recommendation, confidence, risk rating, valuation stance, headline, overall score, top strengths/risks, unresolved gaps, cover metrics, startup introduction, optional appendices and disclaimer override).
2. Run the finalization pipeline:
   `node .agents/skills/startup-research/scripts/finalize.mjs <reportFolder>`
   Two phases. Phase 1 (per-report): `ledger` (only on first run, or with `--rebuild`) → `cross-chapter` → `assemble` → `check-report`. Phase 2 (commit, only if Phase 1 succeeds): `postmortem` → `build-index`. Stops at the first failing step so you can fix `report-meta.yaml` (or the offending chapter) and re-run; global state (`_postmortem.yaml`, `_index.yaml`) is only touched after the per-report gate passes. Pass `--skip-index` to skip the global index refresh; pass `--rebuild` to force a fresh ledger consolidation (which reassigns canonical claim IDs). A green finalize means the report passed `check-report` and is publishable; no further validation step is required.

## Hard rules

- Do not hand-write `evidence.yaml`, `full-report.yaml`, or `summary-card.yaml`; let the scripts assemble them. Edit the source chapter YAMLs or `report-meta.yaml` instead.
- Do not edit another chapter's artifact while working on the current chapter.
- Do not invent facts, metrics, customers, funding, valuation, or dates.
- Use structured YAML figures only; no Mermaid/SVG/prose diagrams.
- Never write scratch files inside `reports/<run>/`. Put per-run notes, fetched bodies, and chapter packets under `.research-cache/<runTimestamp>-<companySlug>/` at the repo root (gitignored). The only files allowed in `reports/<run>/` are the chapter YAMLs (`01-…` … `08-…`), `report-meta.yaml`, and the assembled outputs (`evidence.yaml`, `full-report.yaml`, `summary-card.yaml`).
- Final response: report folder, generated files, source/claim counts, recommendation, confidence, risks, valuation stance, table/figure counts, finalize result, and main gaps.
