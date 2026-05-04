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
2. Use only `packet.chapter` as the chapter brief: `file`, `artifact`, `title`, `mission`, `optionalContext`, `contentRequirements`, `plannedTables`, `plannedFigures`, `evidenceStrategy`, `qualityBar`, and `gate`.
3. **Plan typed research questions first.** Generate at least `gate.minResearchQuestions` items into `localEvidence.researchQuestions[]`. Each question is an object:
   ```yaml
   - id: RQ001
     question: "List every confirmed cofounder of <Company> and their current role."   # >= 20 chars; specific (include company / product / year / numeric anchor)
     type: enumeration | quantification | verification | adverse | freshness | comparison | mechanism
     targets: [contentRequirements/3, plannedTables/leadership-and-founder-table]      # non-empty; each target maps to a contentRequirement index or a planned table/figure slug
     status: answered | partial | unresolved                                            # initial state is `unresolved`; flip to `answered` once a claim cites the answer
   ```
   Distribute the types so that `gate.minQuestionTypeSpread` distinct types are covered, including at least `gate.minAdverseQuestions` of `type: adverse`. Cover at least `gate.minContentRequirementCoverage` (default 80%) of the chapter's `contentRequirements[]` via `targets[]`.
4. **Search and fetch under audit.** Use `web_search` (or equivalent) to find URLs, then review each kept URL with `fetch-url`:
   `node .github/skills/fetch-url/scripts/fetch.mjs <url> --text-only`
   Record the actual queries you ran in `localEvidence.searchQueries[]` (`{query, engine, hits, retainedSourceRefs}`); leaving this empty when `researchQuestions` is non-empty is a gate failure.
5. **Build evidence with full source metadata.** Convert reviewed URLs into `localEvidence.sources[]` with required fields `publisher, title, url, accessDate, sourceType, reputationTier, independence, topics, accessStatus (ok|paywall|js-only|broken|rate-limited), stance (confirming|adverse|neutral)`. Then write `localEvidence.claims[]` (atomic facts, with `sourceRefs` and optional `answersQuestionRefs: [RQ###]` to close the loop on questions). Surface every unresolved/partial question as a typed `evidenceGap` (see step 9).
   - **Diversity is per-chapter, not just report-wide.** Each chapter must hit `gate.minSourceDomains` distinct registrable domains, `gate.minSourceTypeSpread` distinct sourceTypes, every `gate.requiredSourceTypes[]` value, and at least `gate.minNetNewSources` URLs that did not appear in any earlier-order chapter. Don't just reuse the global pool — pull fresh sources for the current chapter's `evidenceStrategy`.
   - **High-confidence claims demand corroboration.** When you set `claim.confidence: high`, supply at least `gate.minHighConfidenceCorroboration` `sourceRefs` and at least one of them must be a primary tier source (`sourceType: filing | regulatory | legal | official` or `reputationTier: high`).
6. **Honour planned figures, but substitute when data is wrong-shaped.** For each entry in `plannedFigures`, check the figure type's data contract (e.g. `dag` needs `edges`, `cohort` needs time-bucket retention 0–100, `range` needs comparable units across rows). If the data fits, write the figure. If not, **substitute** for an extra table covering the same content and document the swap in `evidenceGaps` with `type: enumeration-incomplete` or in the table's `notes`.
7. **Mark enumeration tables.** When a `plannedTable` has `enumeration: true`, the matching `tables[]` entry must include `enumerationScope: { coverage: exhaustive|partial|sample, basis: "..." }`. `partial`/`sample` requires either an `evidenceGap` entry whose `topic` mentions the table or a gap entry whose `relatedTableRefs[]` includes the table id. The table must also be backed by claims pointing to at least `gate.minSourcesPerEnumerationRow` distinct registrable domains.
8. Generate the chapter YAML at `reportFolder/<chapter.file>` per the report schema.
9. **Type your evidenceGaps.** Every `evidenceGap` is `{type: missing-source|conflicting-data|private-only|enumeration-incomplete|stale|unanswered-question|access-blocked, severity: blocking|material|minor, topic, missingEvidence, whyItMatters, diligencePath}`. Optional fields `relatedQuestionRefs: [RQ###]` and `relatedTableRefs: [T###]` close the loop with research questions and enumeration tables.
10. Run the gate with structured output:
    `node .github/skills/startup-research/scripts/gate.mjs <reportFolder> <chapter.file> --format json`
    Exit `0` means the chapter is ready. On nonzero exit, parse `failedDimensions[]` and `retryOrder[]` (root-cause sorted) from the JSON to scope the retry — see "Retry scope" below.
11. Advance with `packet.nextChapter`; if it is `null`, move to finalization.

### Retry scope

The gate emits a `failedDimensions[]` enum with stable keys plus a `retryOrder[]` sorted by causal precedence. Always work the dimensions in `retryOrder[]` order — fixing upstream dimensions often clears downstream ones.

| Failed dimension | Targeted action |
|---|---|
| `localEvidenceMissing` | Add the entire `localEvidence` block. |
| `researchQuestionShape` | Fix question objects: id, ≥20-char text, valid `type`, non-empty `targets[]`, valid `status`. |
| `researchQuestionTargets` | Point each `targets[]` entry at a real `contentRequirements/<index>`, `plannedTables/<slug>`, or `plannedFigures/<slug>`. |
| `researchQuestionTypeMix` | Add questions of types you have not used yet (need `gate.minQuestionTypeSpread` distinct types). |
| `researchQuestionAdverse` | Add `type: adverse` questions; the chapter (especially `risks` / `valuation`) needs at least `gate.minAdverseQuestions`. |
| `researchQuestionAnswerCoverage` | Convert questions from `unresolved`/`partial` to `answered` by adding the missing claim and citing it via `claim.answersQuestionRefs`. |
| `researchQuestionClosure` | Add an `evidenceGap` whose `relatedQuestionRefs[]` includes the still-open question. |
| `searchQueriesMissing` | Append the actual queries you ran into `localEvidence.searchQueries[]`. |
| `sourceShape` | Fill `accessStatus` and `stance` (and other required fields) on each source. |
| `sourceDomains` / `sourceTypeSpread` | Add sources from new domains / new `sourceType` values; don't duplicate publishers. |
| `requiredSourceTypes` | Pull at least one source of each missing type listed in `gate.requiredSourceTypes`. |
| `netNewSources` | Run new searches/fetches to add URLs not seen in earlier chapters; reusing the existing pool will not satisfy this gate. |
| `highConfidenceCorroboration` | Either downgrade `confidence` from high to medium, or add a primary-tier source. |
| `claimAnswerRefs` / `claimContradictRefs` / `claimRefs` | Resolve dangling references; do not duplicate evidence. |
| `enumerationScope` | Add the `enumerationScope` block to the matching table. |
| `enumerationRows` | Add rows to reach `expectedMinRows` or set `coverage: partial`/`sample` with rationale. |
| `enumerationCoverageGap` | Open an `evidenceGap` whose `topic` mentions the table or whose `relatedTableRefs[]` cites it. |
| `enumerationRowCorroboration` | Add sources from additional domains backing the table's claims. |
| `researchQuestions` / `sources` / `claims` | Add more items to hit the per-chapter floor. |
| `sectionsMin` / `artifactsMin` | Add the missing section, table, or figure (or substitute per step 6). |
| `depthSection` / `depthSectionTotal` | Expand the prose of the shortest section(s) only; leave the others untouched. |
| `depthTableRows` / `depthFigureData` | Add rows/data points to existing tables/figures. |
| `contentRequirementCoverage` | Add researchQuestions whose `targets[]` cover the un-targeted `contentRequirements`. |
| `duplicateAnalysis` (warning) | Merge the redundant table/figure pair or sharpen one to answer a distinct question. |
| `figureType` (warning) | Either add a planned figure type or document the substitution in evidenceGaps. |

Retry up to 3 times per chapter, scoping each retry strictly to the dimensions in `retryOrder[]`. The total failure count must monotonically decrease across retries; if it stalls, abort and surface the chapter as `unresolved` rather than thrashing. To accept a `--strict` warning instead of fixing it, add a top-level `acknowledgedWarnings: [{dimension, reason}]` entry in the chapter YAML where each `reason` is at least 30 characters explaining why the warning is intentional.

## Research and evidence rules

- Chapter-specific requirements come from the script-loaded chapter packet.
- Review direct URLs with `fetch-url` before retaining them as evidence; do not cite generic search-result pages.
- Prefer primary/official sources plus independent, customer, regulatory, or adverse sources; the gate enforces multi-domain, multi-sourceType, and adverse-stance coverage per chapter.
- Put reviewed sources, atomic claims, search queries, typed research questions, and typed evidence gaps in the chapter's `localEvidence`.
- Cite material sections, tables, figures, and callouts with local `claimRefs`.
- Local `S###`, `C###`, `T###`, `F###`, `RQ###` IDs are scoped to one artifact.
- Claims must be atomic; do not bundle several facts into one claim.
- Every factual claim needs `sourceRefs`, except `claimType: open-question` with `corroboration: none`.
- Use honest labels for `claimType`, `confidence`, `freshness`, and `corroboration`. Set `claim.contradictsClaimRefs` whenever `claimType: conflicting`.
- Reuse identity facts. The `company-overview` chapter is the canonical home for founders, founding date, headquarters, total raised, latest valuation, headcount, and customer count. When a later chapter restates one of these facts, cite the same canonical claim id (post-ledger) — do not invent a parallel local claim. `cross-chapter.mjs` flags `keyFactDrift` when this is violated.
- Source `accessStatus` matters. Sources flagged `paywall`, `js-only`, `broken`, or `rate-limited` cannot be the sole `sourceRef` of a high-confidence claim, and the report-level gate fails when more than 30 % of sources fall in those buckets.
- Use `currentDate` from the report run as the freshness anchor and preserve source date precision.
- Re-check volatile facts such as funding, valuation, headcount, customers, pricing, legal issues, outages, and regulatory status.
- Tables should contain evidence-backed values or explicit gaps. Enumeration tables additionally need `enumerationScope` (see chapter-loop step 7).
- Figures must be structured YAML objects using schema-supported fields only; do not use Mermaid, SVG, prose diagrams, JSON strings, or fabricated chart data.
- `evidenceGaps[]` documents missing public data; it does not waive the per-chapter `gate` floors. Each gap is typed (`type` + `severity`) and may close a question via `relatedQuestionRefs[]` or a table via `relatedTableRefs[]`.

## Finalization

After all analysis chapters pass:

1. Build evidence:
   `node .github/skills/startup-research/scripts/ledger.mjs <reportFolder>`
2. Write `report-meta.yaml` in the report folder with the judgment fields the analysis chapters do not encode (recommendation, confidence, risk rating, valuation stance, cover metrics, startup introduction, top strengths/risks, unresolved gaps, overall score, headline, summary-card company facts). See `references/report-meta-schema.md` for the exact shape.
3. Assemble the consolidated artifacts:
   `node .github/skills/startup-research/scripts/assemble.mjs <reportFolder>`
   This deterministically stitches the analysis chapter YAMLs + `evidence.yaml` + `report-meta.yaml` into `full-report.yaml` and `summary-card.yaml`. Re-run after editing any chapter or `report-meta.yaml`.
4. Run the cross-chapter consistency check:
   `node .github/skills/startup-research/scripts/cross-chapter.mjs <reportFolder>`
   Resolve any drift it reports (mismatched valuations, founding dates, customer counts, ARR figures referenced from multiple chapters) before validating.
5. Rebuild index:
   `node .github/skills/startup-research/scripts/index.mjs --strict`
6. Validate:
   `npm run validate`

## Hard rules

- Do not hand-write `evidence.yaml`, `full-report.yaml`, or `summary-card.yaml`; let the scripts assemble them. Edit the source chapter YAMLs or `report-meta.yaml` instead.
- Do not edit another chapter's artifact while working on the current chapter.
- Do not invent facts, metrics, customers, funding, valuation, or dates.
- Use structured YAML figures only; no Mermaid/SVG/prose diagrams.
- Keep temporary files and research notes out of `reports/`.
- Final response: report folder, generated files, source/claim counts, recommendation, confidence, risks, valuation stance, table/figure counts, validation result, and main gaps.
