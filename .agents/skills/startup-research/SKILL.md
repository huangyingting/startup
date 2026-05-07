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
- `disclosureProfile` — optional; one of `public | private-disclosed | private-undisclosed | stealth`. Set this when the company is publicly known to be stealth or to keep its financials undisclosed; passing it into `new-report.mjs --disclosure <value>` writes a `disclosure-hint.yaml` whose `canonicalEvidenceGaps[]` chapter 04 must adopt instead of rediscovering.
- `refresh` — optional boolean; when set, the workflow refreshes the existing current report for `companyName`/`companyUrl` (the previous run is auto-resolved from the company match).
- `refreshReason` — optional human reason for refreshing an existing report.

## Required setup

1. Read `./references/report-schema-v2.md`, `./references/yaml-rules.md`, and `./references/chapter-packet-v1.md` (the schema for the JSON the chapter loader emits).
2. Load chapter order:
   `node .agents/skills/startup-research/scripts/load-chapter.mjs --list --format json`
3. Create the report folder:
   `node .agents/skills/startup-research/scripts/new-report.mjs <runTimestamp> <companyName> [--website <companyUrl>] [--disclosure <disclosureProfile>]`

   Pass `--disclosure` whenever you set `disclosureProfile` in the Inputs (typically `stealth` or `private-undisclosed`). It writes `.research-cache/<runTimestamp>-<companySlug>/disclosure-hint.yaml`, which the chapter packet later surfaces as `packet.runCache.disclosureHint` so chapter 04 (financials) can adopt the canonical evidence gaps for that profile instead of rediscovering them. Also set the same value as `companyProfile.disclosureProfile` in `report-meta.yaml`.

   For an explicit full refresh of an existing report, create a new run instead of overwriting the old one:
   `node .agents/skills/startup-research/scripts/new-report.mjs <runTimestamp> <companyName> [--website <companyUrl>] --refresh [--refresh-reason <refreshReason>]`

   Refresh mode auto-resolves the previous run from the company match (newest current finalized report whose `summary-card.yaml` matches `companyName` or `companyUrl`) and writes `.research-cache/<runTimestamp>-<companySlug>/refresh-context.yaml` with the prior run summary. Use it only as background/diff context. Re-fetch every **volatile fact** (see the canonical list under *Research and evidence rules* below); do not copy stale claims without re-verifying them. Refresh skips the duplicate guard for the resolved target only; it still runs the full 8-chapter generation and the normal gates.

If folder creation exits `2`, stop: a finalized report already exists for this company/domain (the duplicate guard walks every `reports/<runId>/summary-card.yaml`). If it exits `3`, the same in-progress folder already exists; rerun the exact same command with `--resume` and continue that folder. Use `--resume` only after exit `3`; it exits `4` when there is no in-progress folder to resume. Do not create `-2` suffixed duplicate folders.

## Chapter loop

For each chapter `order` from the loader:

1. **Load the chapter packet.**
   `node .agents/skills/startup-research/scripts/load-chapter.mjs --order <n> --format json --include-context --report-folder <reportFolder>`
   `--include-context` is recommended from chapter 2 onward: with `--report-folder` set, the packet adds `contextChapters[]` (sections / tables / figures / claimRefs of every chapter **key** listed in `optionalContext`), `cumulativeContext` (running unresolved-question count and restricted-access share from earlier chapters — advisory only; it does **not** gate this chapter), and `runCache` (the `disclosure-hint.yaml` and `refresh-context.yaml` written by `new-report.mjs`, when present). The full packet shape lives in `references/chapter-packet-v1.md`; the run-cache file shapes live under *Run cache files* in `references/report-schema-v2.md`. Drop the flag only when authoring chapter 1. Pass `--no-workflow` only if you specifically need the raw chapter spec without packet enrichment.
2. **Use `packet.chapter` as the chapter brief** (`key`, `order`, `file`, `artifact`, `title`, `mission`, `optionalContext`, `contentRequirements`, `plannedTables`, `plannedFigures`, `evidenceStrategy`, `qualityBar`, `gate`). The packet root also carries `vocabularies` (canonical enums for `sourceType`, `sourceStance`, `claimType`, `questionType`, `enumerationCoverage`, `restrictedAccessStatuses`, and the rest — read `Object.keys(packet.vocabularies)` for the complete list) and `checkDimensions` (validator dimensions in retry-precedence order). Read these instead of memorising literals. When `packet.runCache.disclosureHint` is non-null, adopt its `canonicalEvidenceGaps[]` in chapter 04 (financials); when `packet.runCache.refreshContext` is non-null, treat the prior-run snapshot as background only and re-fetch every volatile fact.
3. **Plan typed research questions.** Generate at least `gate.minResearchQuestions` items into `localEvidence.researchQuestions[]`; each item follows the `researchQuestion` shape in `references/report-schema-v2.md`. Start every question with `status: unresolved` and flip to `answered` (or `partial`, when a claim addresses it with caveats) once a claim cites it via `claim.answersQuestionRefs`. Each `question` string must be at least 20 characters and include a specific anchor (company / product / year / numeric). Distribute the types across `packet.vocabularies.questionType` so that `gate.minQuestionTypeSpread` distinct types are covered, including at least `gate.minAdverseQuestions` of `type: adverse`. Cover at least `gate.minContentRequirementCoverage` (default 80%) of the chapter's `contentRequirements[]` via `targets[]`.
4. **Search and fetch under audit.** Use `web_search` (or equivalent) to find URLs, then review each kept URL with `fetch-url`:
   `node .agents/skills/fetch-url/scripts/fetch.mjs <url>`
   Default output is the readable extracted text; add `--full-text` only when Readability stripped non-article content you actually need (pricing pages, docs tables, nav). Record the actual queries you ran in `localEvidence.searchQueries[]` (`{query, engine, hits, retainedSourceRefs}`); leaving this empty when `researchQuestions` is non-empty is a gate failure.
5. **Build the evidence ledger.** Convert reviewed URLs into `localEvidence.sources[]` (see `source` in the schema for required fields). Then write `localEvidence.claims[]` (atomic facts) using the schema's `claim` shape; set `answersQuestionRefs: [Q<L>###]` to close the loop on questions.
   - **Diversity is per-chapter, not just report-wide.** Each chapter must hit `gate.minSourceDomains` distinct registrable domains, `gate.minSourceTypeSpread` distinct sourceTypes, every `gate.requiredSourceTypes[]` value, and at least `gate.minNetNewSources` URLs that did not appear in any earlier-order chapter. Don't just reuse the global pool — pull fresh sources for the current chapter's `evidenceStrategy`.
   - **High-confidence claims demand corroboration.** When you set `claim.confidence: high`, supply at least `gate.minHighConfidenceCorroboration` `sourceRefs`. At least one of those source ids must point to a *primary-tier* source — that is, a source whose `sourceType` is in `packet.vocabularies.primaryTierSourceTypes` **or** whose `reputationTier` is `high`.
6. **Write the chapter YAML** at `reportFolder/<chapter.file>` per the report schema. Populate `sections[]`, `tables[]`, `figures[]`, `callouts[]`, and `evidenceGaps[]` together — they share the same evidence ledger built in step 5.
   - **Honour planned figures, but substitute when the data is wrong-shaped.** For each `plannedFigures` entry, check the figure type's data contract (e.g. `dag` needs `edges`, `cohort` needs time-bucket retention 0–100, `range` needs comparable units across rows). If the data fits, write the figure; otherwise substitute an extra table covering the same content and document the swap in `evidenceGaps` with `type: enumeration-incomplete` or in the table's `notes`.
   - **Mark enumeration tables.** When a `plannedTable` has `enumeration: true`, the matching `tables[]` entry must include `enumerationScope: { coverage, basis: "..." }` where `coverage` is one of `packet.vocabularies.enumerationCoverage`. Non-`exhaustive` coverage requires either an `evidenceGap` whose `relatedTableRefs[]` includes the table id (preferred) or a gap whose `topic` literally contains the table id string (e.g. `TO003`). The table must also be backed by claims pointing to at least `gate.minSourcesPerEnumerationRow` distinct registrable domains.
   - **Type your evidenceGaps.** Every `evidenceGap` follows the schema's `evidenceGap` shape. Use `relatedQuestionRefs[]` to close out an unresolved/partial researchQuestion and `relatedTableRefs[]` to flag an enumeration-incomplete table.
7. **Run the chapter check** with structured output:
   `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --format json`
   Exit `0` means the chapter is ready. On nonzero exit, parse the JSON for:
   - `globalHints[]` — chapter-wide root causes (one dimension failing on ≥3 objects); fix these first.
   - `objectFailures[]` — failures grouped by table/figure/claim/question id, each with the full `dimensions[]` and `fixes[]` for that object.
   - `failures[]` — per-issue entries; each carries `dimension`, `message`, and a one-line `fix` action.
   - `failedDimensions[]` and `retryOrder[]` (root-cause sorted) for the dimensions you must clear.
   - `suppressedDimensions[]` — downstream checks skipped because an upstream failure (e.g. `localEvidenceMissing`) makes them trivially fail; they will re-evaluate after you fix the root cause.
8. **Advance** with `packet.nextChapter`; if it is `null`, move to finalization.

### Retry scope

`check-chapter` emits a `failedDimensions[]` enum with stable keys plus a `retryOrder[]` sorted by causal precedence. Always work the dimensions in `retryOrder[]` order — fixing upstream dimensions often clears downstream ones. The exact remediation for every dimension is inlined as `failure.fix` in the JSON output (and grouped per object as `objectFailures[].fixes[]`); read those instead of guessing.

Retry up to 3 times per chapter, scoping each retry strictly to the dimensions in `retryOrder[]`. The total failure count must monotonically decrease across retries; if it stalls, abort and surface the chapter as `unresolved` rather than thrashing. To accept a `--strict` warning instead of fixing it, add a top-level `acknowledgedWarnings: [{dimension, reason}]` entry in the chapter YAML where each `reason` is at least 30 characters explaining why the warning is intentional.

## Research and evidence rules

- Chapter-specific requirements come from the script-loaded chapter packet.
- Review direct URLs with `fetch-url` before retaining them as evidence; do not cite generic search-result pages.
- Prefer primary/official sources plus independent, customer, regulatory, or adverse sources; the gate enforces multi-domain, multi-sourceType, and adverse-stance coverage per chapter.
- Put reviewed sources, atomic claims, search queries, typed research questions, and typed evidence gaps in the chapter's `localEvidence`.
- Cite material sections, tables, figures, and callouts with local `claimRefs`.
- Local IDs follow `<Type><ChapterLetter><Seq3>` (e.g. `SO001`, `CO045`, `TO008`, `FO002`, `QO003` for the company-overview chapter whose `letter:` is `O`). Type is `S` (source), `C` (claim), `T` (table), `F` (figure), `Q` (researchQuestion). Each chapter generates IDs only with its own chapter letter from `chapters.yaml` — never reference an id from another chapter inside this chapter's `claimRefs[]` or prose. (`check-chapter` flags violations as `crossChapterRefLeak`.) Cross-chapter consolidation happens later in `ledger.mjs` (run by `finalize.mjs`); it dedupes equivalent claims across chapters and assigns canonical IDs in the assembled `evidence.yaml` / `full-report.yaml`. You never look up another chapter's id by hand.
- Claims must be atomic; do not bundle several facts into one claim.
- Every factual claim needs `sourceRefs`, except `claim.type: open-question`.
- Use honest labels for `claim.type`, `claim.confidence`, and `claim.freshness`. Set `claim.contradictsClaimRefs` whenever `claim.type: conflicting`.
- **Don't restate canonical key facts.** The `company-overview` chapter is the canonical home for founders, founding date, headquarters, total raised, latest valuation, headcount, and customer count (the canonical regex list lives in `KEY_FACT_TOPICS` in `scripts/check-dimensions.mjs`). When a later chapter touches one of these facts, do not add a bare-restatement claim to its own `localEvidence.claims[]` — either weave the fact into section prose without a redundant claim, or write a richer claim that adds genuinely new local context (e.g. competitive implication, customer concentration). `cross-chapter.mjs` flags `keyFactDrift` when a later chapter creates a near-duplicate (≥ 70 % token overlap) of an overview claim.
- Source `accessStatus` matters. The schema enum is `ok | paywall | js-only | broken | rate-limited`; everything except `ok` is a *restricted-access* status (also exposed as `packet.vocabularies.restrictedAccessStatuses`). A restricted-access source cannot be the sole `sourceRef` of a high-confidence claim, and the report-level gate fails when more than 30 % of all sources fall in those buckets.
- `source.stance` is the YAML field name; `packet.vocabularies.sourceStance` is the catalog key (namespaced to distinguish from `valuationStance`). Both list the same values: `confirming | adverse | neutral | unknown`.
- When loaded with `--include-context`, `packet.cumulativeContext.cumulativeUnresolvedQuestions` lists every still-open or partially-answered research question from earlier chapters and `packet.cumulativeContext.cumulativeRestrictedAccessPct` reports the running paywall/JS-only/broken share. They are advisory (this chapter's gates only judge this chapter's evidence) but useful: prefer fresh searches that close earlier unresolved questions, and avoid adding more restricted-access sources when the cumulative percentage is already approaching the 30 % report-level ceiling.
- Use `currentDate` from the report run as the freshness anchor and preserve source date precision.
- **Volatile facts** must be re-fetched every run, never copied from prior runs or earlier chapters: funding, valuation, headcount, customer count, pricing, legal/regulatory status, outages, partnerships, and product launches. This list is canonical; SKILL.md's setup section and refresh handling reference it.
- Tables should contain evidence-backed values or explicit gaps. Enumeration tables additionally need `enumerationScope` (see chapter-loop step 6).
- Cite a table's supporting claims via the table-level `claimRefs` field. Do **not** add an `evidence` (or `claim refs`) column that holds raw `C<L>###` ids; the renderer surfaces footer refs automatically. A `source` / `publisher` / `attribution` column is allowed only when the cells hold the *origin institution or document name* ("Gartner", "SEC 10-K"), never bare claim ids.
- Figures must be structured YAML objects using schema-supported fields only; do not use Mermaid, SVG, prose diagrams, JSON strings, or fabricated chart data.
- `evidenceGaps[]` documents missing public data; it does not waive the per-chapter `gate` floors. Each gap is typed (`type` + `severity`) and may close a question via `relatedQuestionRefs[]` or a table via `relatedTableRefs[]`.

## Finalization

After all analysis chapters pass:

1. Author `report-meta.yaml` in the report folder per the `report-meta` schema in `references/report-schema-v2.md`. It carries the judgment fields the analysis chapters do not encode (recommendation, confidence, risk rating, valuation stance, headline, overall score, top strengths/risks, unresolved gaps, cover metrics, startup introduction, optional appendices and disclaimer override). Any prior finalized report under `reports/<runId>/report-meta.yaml` is a worked example of the shape; pick a recent one whose `companyProfile.disclosureProfile` matches your run.
2. Run the finalization pipeline:
   `node .agents/skills/startup-research/scripts/finalize.mjs <reportFolder>`
   For a refresh run, pass the same flag and reason:
   `node .agents/skills/startup-research/scripts/finalize.mjs <reportFolder> --refresh [--refresh-reason <refreshReason>]`
   Per-report only: `ledger` (only on first run, or with `--rebuild`) → `cross-chapter` → `assemble` → `check-report`. With `--refresh` it also wraps the chain with `link-refresh`: it sets the new report `revision.status: current` with `revision.refreshOfRunId` (auto-resolved from the company match) first, then — only after the new report passes `check-report` — marks the previous report `revision.status: superseded` and reassembles/checks it. Stops at the first failing step so you can fix `report-meta.yaml` (or the offending chapter) and re-run. Pass `--rebuild` to force a fresh ledger consolidation (which reassigns canonical claim IDs). A green finalize means the report passed `check-report` and is publishable.

## Hard rules

- `slug:` in every YAML under `reports/<run>/` (each `0X-*.yaml` chapter and `report-meta.yaml`) must equal the company slug only — the report folder basename with the leading `<timestamp>-` stripped (i.e. the value `slugify(companyName)` produced by `new-report.mjs`). Example: folder `reports/20260506052900-revolut/` ⇒ `slug: revolut`. `check-chapter` enforces this per chapter; `check-report` enforces it across the assembled artifacts.
- Do not hand-write `evidence.yaml`, `full-report.yaml`, or `summary-card.yaml`; let the scripts assemble them. Edit the source chapter YAMLs or `report-meta.yaml` instead.
- Do not edit another chapter's artifact while working on the current chapter.
- Do not invent facts, metrics, customers, funding, valuation, or dates.
- Never write scratch files inside `reports/<run>/`. Put per-run notes, fetched bodies, and chapter packets under `.research-cache/<runTimestamp>-<companySlug>/` at the repo root (gitignored). The only files allowed in `reports/<run>/` are the chapter YAMLs (`01-…` … `08-…`), `report-meta.yaml`, and the assembled outputs (`evidence.yaml`, `full-report.yaml`, `summary-card.yaml`).
- Final response: report folder, generated files, source/claim counts, recommendation, confidence, risks, valuation stance, table/figure counts, finalize result, and main gaps.
