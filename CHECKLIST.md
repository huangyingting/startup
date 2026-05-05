# CHECKLIST.md

Implementation checklist derived from [IMPROVEMENT.md](IMPROVEMENT.md).
Each item is broken into concrete, verifiable sub-tasks. Work top-to-bottom
within a phase; phases are ordered by dependency and ROI.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done
Tags: **(S/M/L)** effort · **P0/P1/P2** priority

---

## Phase 0 — Foundations (do first; everything else depends on these)

### 0.1 Pin golden reports & regression suite — (S) P0  [#5.1]
- [ ] Choose 2–3 finalized reports under `reports/` to mark as golden
      (e.g. one AI lab, one SaaS, one hardware).
- [ ] Add `tests/golden.list` enumerating golden run folders.
- [ ] Add `scripts/test-golden.mjs` that runs `check-chapter` on every
      chapter file and `check-report` on each golden run; non-zero exit on
      any failure.
- [ ] Wire into `npm run validate` (root `package.json`).
- [ ] Document in `AGENTS.md` under "Testing instructions".
- **Verify:** `npm run validate` passes; intentionally loosen a validator
  and confirm the golden test fails.

### 0.2 Schema migration tooling — (M) P1  [#5.2]
- [ ] Create `.agents/skills/startup-research/migrations/` directory.
- [ ] Add `migrate.mjs` with subcommands `list`, `apply <from> <to> <folder>`.
- [ ] Encode current schema as `report-v2` (no-op migration as baseline).
- [ ] Document migration authoring in `references/yaml-rules.md`.
- **Verify:** `node migrate.mjs list` prints `report-v2`; dry-run on a
  golden report leaves files byte-identical.

### 0.3 Report-level ID space audit — (S) P0  [#2.10]
- [ ] In `check-report.mjs`, scan every prose `block.body` for `[S###]`,
      `[C###]`, `[T###]`, `[F###]` tokens and verify each resolves.
- [ ] Add a failure dimension `proseRefDangling` with a `fix` hint.
- [ ] Add a unit fixture report with a dangling `[C999]` ref to test.
- **Verify:** Fixture fails; existing golden reports still pass.

---

## Phase 1 — Schema upgrades (data-model first, then renderers/validators)

### 1.1 Claim provenance & quoting — (M) P0  [#2.1]
- [ ] Extend `claim` shape in `references/report-schema-v2.md`:
      `evidenceQuote: string | null` (≤300 chars), `pageOrSelector: string | null`.
- [ ] Update `chapter-schema.mjs` validator (length cap, type).
- [ ] Add `check-chapter.mjs` warning `claimQuoteMissing` when
      `confidence: high` lacks `evidenceQuote` (warning, not error).
- [ ] Update `assemble.mjs` to surface quote in evidence ledger.
- [ ] Add Astro renderer for hover-card (links to 4.2).
- **Verify:** A modified chapter with a quote round-trips through
  `finalize.mjs`; renderer shows the quote in tooltip.

### 1.2 Structured `metric` object — (L) P1  [#2.2]
- [ ] Define `metric: {value, unit, asOfDate, basis, sourceRefs, confidence,
      currency?}` in schema.
- [ ] Migrate `coverFacts[]` and `summary.keyMetrics` to `metric` shape.
- [ ] Add validator: `unit` non-empty, `value` numeric, `asOfDate` ISO.
- [ ] Provide a one-shot migration in `migrations/v2-to-v2.1/` that
      converts existing reports.
- [ ] Update `summary-card.astro` and cover renderer.
- **Verify:** Migrated golden reports render unchanged; new validator
  rejects free-string metrics.

### 1.3 Currency & FX normalization — (M) P1  [#2.3]
- [ ] Require `currency: ISO-4217` on every `metric` whose `unit` denotes
      money.
- [ ] Add `report-meta.yaml` field `reportingCurrency` + `fxRates: [{from,
      to, rate, asOfDate, source}]`.
- [ ] `assemble.mjs` writes derived `valueInReportingCurrency` per metric.
- [ ] Validator rejects `USD` mixed silently with `EUR` in same KPI table.
- **Verify:** A test report with mixed-currency cover facts assembles into
  one normalized currency.

### 1.4 Source COI disclosure — (S) P1  [#2.8]
- [ ] Add `source.conflictOfInterest: string | null` to schema.
- [ ] Validator: `confidence: high` claims cannot have *all* `sourceRefs`
      with non-null COI.
- [ ] New failure dimension `coiOverreliance`.
- **Verify:** Fixture with a single COI source on a high-confidence claim
  fails check; downgrading to medium passes.

### 1.5 Source independence graph — (M) P1  [#2.5]
- [ ] Add `references/publisher-parents.yaml` mapping domain → parent
      group (TechCrunch, Engadget → Yahoo; Bloomberg & Businessweek;
      Forbes contributor vs. staff; etc.).
- [ ] In `check-chapter.mjs`, when counting "distinct independent sources"
      for corroboration, collapse by parent group; emit
      `pseudoCorroboration` warning.
- [ ] Document the file format and update path in `chapters.yaml`.
- **Verify:** Two TechCrunch/Engadget sources no longer satisfy
  `minHighConfidenceCorroboration`.

### 1.6 Source `language` field & non-EN coverage — (S) P2  [#3.10]
- [ ] Add `source.language: BCP-47 string` (default `en`).
- [ ] Add chapter gate `minNonEnglishSources` (default 0; override per
      report via `report-meta.yaml.geographyHint`).
- **Verify:** A non-US report with all-English sources warns when override
  is set.

---

## Phase 2 — New diligence content (chapter expansions)

### 2.1 Bear/Base/Bull scenario table in `valuation` — (S) P0  [#1.6]
- [ ] Add planned table `Scenario & sensitivity` to chapter 8 in
      `chapters.yaml` with columns `[scenario, driver assumptions, revenue,
      valuation, multiple, probability]`, `enumeration: true`,
      `expectedMinRows: 3`.
- [ ] Add `gate` requirement in chapter 8.
- [ ] Update `report-schema-v2.md` example.
- **Verify:** Re-run an existing valuation chapter; it now fails until the
  scenario table is added.

### 2.2 Comparables & multiples table in `valuation` — (S) P0  [#1.7]
- [ ] Add planned table `Comparables & multiples` to chapter 8 with
      columns `[comp, stage, last round, post-money, ARR, EV/Rev,
      EV/Gross profit, growth, source]`.
- [ ] Add `gate.requiredSourceTypes += [analyst-market-data]` (already
      present; ensure comp rows draw from it).
- **Verify:** Chapter 8 fails without comps table; passes after adding.

### 2.3 Reference-call surrogate evidence — (S) P0  [#1.9]
- [ ] Append a required `evidenceStrategy` line on chapters 5/6/7
      enumerating Glassdoor, Blind, Reddit, podcast, conference signals.
- [ ] Add `gate.requiredSourceTypes` augmentation: chapter 6 already has
      `customer-proof`; chapter 7 add `developer-signal` or `review`.
- **Verify:** Postmortem stats show ≥1 of these source types in chapters
  5/6/7 across new runs.

### 2.4 Data-room asks artifact — (S) P0  [#1.10]
- [ ] In `assemble.mjs`, gather all `evidenceGap[]` from chapter YAMLs and
      emit `data-room-asks.yaml` (grouped by chapter, then severity).
- [ ] Add `data-room.astro` page rendering the list with copy-to-clipboard.
- [ ] Wire into report nav.
- **Verify:** Golden report builds the new file; page lists deduped asks.

### 2.5 Management & Team chapter (or expansion) — (M) P1  [#1.1]
- **Decision needed:** new chapter (renumber) vs. expand chapter 1.
  Default below assumes expansion.
- [ ] Add `contentRequirements` lines to chapter 1: founder-market fit,
      key-person matrix, board composition, equity/option pool, hiring
      velocity, attrition signals.
- [ ] Add planned tables: `Founder track record`, `Board & governance
      rights`, `Hiring velocity & attrition signals`.
- [ ] Raise chapter 1 `gate.minResearchQuestions` to 28.
- **Verify:** Chapter 1 in a new run produces the new tables.

### 2.6 Legal, IP & Cap Table chapter — (L) P1  [#1.2]
- [ ] Decide insertion point (e.g. order 7.5 → renumber risks/valuation to
      8/9). Update all consumers of chapter order (`chapters.yaml`,
      `check-workflow-config.mjs`, postmortem schema).
- [ ] Author chapter spec (mission, contentRequirements, plannedTables,
      plannedFigures, evidenceStrategy, qualityBar, gate).
- [ ] Required source types: `regulatory`, `legal`, `filing`, `official`.
- [ ] Add migration that renumbers existing reports' chapter files.
- **Verify:** Re-finalize a golden report after renumber; outputs identical
  semantics.

### 2.7 GTM / Sales motion expansion — (M) P1  [#1.3]
- [ ] Add chapter 4 contentRequirements lines: pipeline coverage, win
      rate, cycle by segment, channel mix, partner economics, PLG vs ABM,
      quota attainment.
- [ ] Add planned table `GTM motion summary`.
- **Verify:** Chapter 4 fails without GTM table; passes after.

### 2.8 ESG / Responsible AI / Safety — (M) P1  [#1.4]
- [ ] Add a *callout block requirement* on chapter 7 (risks) for ESG +
      RAI; or new chapter (decide w/ 2.6).
- [ ] Provide allowed `calloutType: esg | rai-safety` (extend enum).
- [ ] Add planned table `Model evals & safety posture` (AI companies).
- **Verify:** New AI-lab run carries ESG callout + eval table.

### 2.9 Cybersecurity & data-protection posture — (M) P1  [#1.5]
- [ ] Add chapter 5 (product-tech) planned table `Security posture &
      incident history`, columns `[control/incident, scope, status, date,
      severity, source]`.
- [ ] Required source types add `regulatory`/`technical-docs`.
- **Verify:** New run includes the table; missing it fails the gate.

### 2.10 Exit & Liquidity analysis — (M) P1  [#1.8]
- [ ] Add chapter 8 contentRequirements line: likely acquirers, IPO comps,
      secondary pricing, lock-ups.
- [ ] Add planned table `Exit paths & liquidity signals`.
- **Verify:** Chapter 8 surfaces an exit table.

---

## Phase 3 — Validators & cross-chapter checks

### 3.1 Stale-claim TTL detector — (S) P0  [#2.6]
- [ ] Add `references/topic-ttl.yaml` with default TTLs (funding 180d,
      pricing 365d, leadership 365d, valuation 180d, headcount 270d).
- [ ] In `check-report.mjs`, compute `runDate − source.date` per claim;
      warn `claimStale` for high-confidence claims past TTL.
- [ ] Acknowledgeable via `acknowledgedWarnings`.
- **Verify:** Backdated source on a high-confidence funding claim fires
  `claimStale`.

### 3.2 Cross-chapter consistency expansion — (M) P0  [#2.7]
- [ ] In `cross-chapter.mjs`, add checks:
  - [ ] `marketVsRevenueSanity`: market_size ≥ company revenue.
  - [ ] `customerCountConsistency`: chapter 1 vs chapter 6.
  - [ ] `topRiskAlignment`: every `summary.topRisks[]` matches a row in the
        chapter-7 risk register.
- [ ] Emit dimensions with one-line `fix` per check.
- **Verify:** Golden reports pass; mutated fixture fails each check.

### 3.3 Confidence calibration audit — (S) P1  [#2.4]
- [ ] In `postmortem.mjs`, sample 10% of high-confidence claims per
      chapter; recompute that ≥ `minHighConfidenceCorroboration` distinct
      *parent groups* (uses 1.5).
- [ ] Record `confidenceCalibration: {sampled, violations}` in
      `_postmortem.yaml`.
- **Verify:** Postmortem stats appear; intentional violation flagged.

### 3.4 Adverse-claim balance — (S) P1  [#2.9]
- [ ] In `check-chapter.mjs`, compute share of claims with adverse-stance
      sources; warn `adverseClaimImbalance` when < 10% (configurable).
- **Verify:** Chapter with all-confirming claims warns; risks chapter
  exempt or has higher floor.

### 3.5 Lonely-claim warning — (S) P0  [#5.5]
- [ ] Detect:
  - [ ] orphan source (no claim cites it) → warning `orphanSource`.
  - [ ] lonely claim (1 source, 1 domain, 1 type) at confidence ≥ medium →
        warning `lonelyClaim`.
- **Verify:** Fixture fires both; remediation clears them.

### 3.6 Contradictions appendix — (S) P0  [#5.6]
- [ ] In `assemble.mjs`, gather all claims with `type: conflicting` and
      build appendix `Contradictions & open disagreements`.
- [ ] Render in `full-report` and on website.
- **Verify:** A report with conflicting claims produces a non-empty
  appendix.

### 3.7 Prose style linter — (S) P2  [#5.4]
- [ ] Add `scripts/lint-prose.mjs` enforcing:
  - [ ] no marketing adjectives (`leading`, `innovative`, `best-in-class`,
        `world-class`, `cutting-edge`, `revolutionary`).
  - [ ] sentence length p95 ≤ 40 words.
- [ ] Hook into `check-chapter.mjs` as warning.
- **Verify:** Seed bad sentence flagged; allow-list mechanism works.

---

## Phase 4 — Workflow & agent ergonomics

### 4.1 Pre-flight company disambiguation — (S) P0  [#3.2]
- [ ] Add `scripts/disambiguate.mjs` that runs a web search for the
      company name and surfaces homonym risks.
- [ ] `new-report.mjs` calls it and refuses creation without
      `companyUrl` *or* `--accept-disambiguation`.
- **Verify:** Running with name `Linear` prompts for disambiguation.

### 4.2 Adverse-search prompt templates — (S) P0  [#3.8]
- [ ] Add `references/adverse-prompts.md` with per-chapter query templates.
- [ ] `load-chapter.mjs` ships them in the chapter packet under
      `chapter.adversePromptTemplates[]`.
- **Verify:** Packet JSON includes the templates for each chapter.

### 4.3 Source-type playbooks — (M) P0  [#3.9]
- [ ] Create `references/playbooks/<chapter>.md` for all 8 (or 9)
      chapters listing canonical primary sources, APIs, and search
      operators.
- [ ] `load-chapter.mjs` embeds the playbook path in packet.
- **Verify:** Each chapter packet links a non-empty playbook.

### 4.4 Wayback `Save Page Now` — (S) P0  [#3.7]
- [ ] In `fetch-url`, after a successful retain, POST to
      `https://web.archive.org/save/<url>` (best-effort, async, retry once).
- [ ] Add `source.archiveUrl: string | null` to schema.
- [ ] Validator: warning when `accessStatus: paywall|broken` lacks
      `archiveUrl`.
- **Verify:** New runs populate `archiveUrl` for retained sources.

### 4.5 Snapshot archival of fetched bodies — (M) P1  [#3.6]
- [ ] Compute SHA-256 of fetched body in `fetch-url`; add
      `source.bodySha256: string | null`.
- [ ] Optional `source.snapshotPath` pointing into `.research-cache/`
      (relative).
- [ ] Document privacy/license caveats in `fetch-url/SKILL.md`.
- **Verify:** Two runs against same URL produce same SHA.

### 4.6 Fetch-url rate-limit & retry policy — (S) P1  [#3.5]
- [ ] Document per-host concurrency, backoff, cache TTL in
      `fetch-url/SKILL.md`.
- [ ] Implement / verify in fetch-url scripts.
- **Verify:** A burst of 50 requests to one host serializes per the limit.

### 4.7 Resumable runs — (S) P1  [#3.3]
- [ ] `new-report.mjs --resume <folder>` skips folder creation if it
      exists and the chapters that already exist.
- [ ] `finalize.mjs` already idempotent; document the resume flow.
- **Verify:** Killing a run mid-chapter and resuming completes without
  `--allow-duplicate`.

### 4.8 Cost / token telemetry — (S) P1  [#3.4]
- [ ] Add `localEvidence.telemetry: {searchQueriesCount, fetchUrlCalls,
      bytesFetched, tokensIn?, tokensOut?}`.
- [ ] `postmortem.mjs` aggregates per chapter and per run.
- **Verify:** Postmortem shows non-zero counts for new runs.

### 4.9 Parallel chapter execution — (M) P1  [#3.1]
- [ ] `load-chapter.mjs --plan` emits a JSON plan grouping chapters into
      dependency waves.
- [ ] Document parallel execution pattern in SKILL.md.
- **Verify:** Plan groups chapters 1+2+3 in wave 1, 4+5+6 in wave 2, 7 in
  wave 3, 8 in wave 4.

---

## Phase 5 — Website / consumption

### 5.1 Per-claim hover citations — (M) P0  [#4.2]
- [ ] Server-side: parse `[C###]` tokens in rendered prose and replace with
      `<cite data-claim-id="C###">[C###]</cite>`.
- [ ] Client-side: hover/focus shows source title, publisher, date, quote.
- [ ] Keyboard accessible (focus-visible, ESC closes).
- **Verify:** Lighthouse a11y ≥ 95; manual keyboard navigation works.

### 5.2 Confidence + freshness pills — (S) P0  [#4.8]
- [ ] Add small badge components (color-coded; ARIA labels).
- [ ] Render on every claim hover-card and on table footer refs.
- **Verify:** Visual regression snapshot diff approved.

### 5.3 Index filter / sort — (S) P1  [#4.3]
- [ ] Add facets on `index.astro`: sector, recommendation, riskRating,
      runDate range.
- [ ] Sortable columns: overallScore, runDate, recommendation.
- **Verify:** Filtering reduces visible rows; URL state persists facets.

### 5.4 Diff between runs — (M) P1  [#4.1]
- [ ] Add route `/[run]/diff/[priorRun]`.
- [ ] Compute diff at the claim level (statement match by topic+normalized
      text), source level (URL match), and recommendation drift.
- [ ] Render added/removed/changed sections with side-by-side highlights.
- **Verify:** Diff between two runs of OpenAI shows sane added claims.

### 5.5 PDF export — (M) P0  [#4.5]
- [ ] Add `scripts/export-pdf.mjs` using Playwright headless to print
      `/[run]` to PDF.
- [ ] Add a print stylesheet in `website/src/styles/`.
- [ ] Output to `dist-pdf/<run>.pdf`; document command in README.
- **Verify:** Generated PDF has cover, exec summary, chapters, appendices,
  bibliography, page numbers.

### 5.6 Source bibliography health checks — (M) P1  [#4.6]
- [ ] Add `scripts/check-source-liveness.mjs` that HEADs every source URL
      and writes `source-health.json`.
- [ ] Schedule via GitHub Actions weekly.
- [ ] Render last-checked + status icon on bibliography page.
- **Verify:** A 404 in the fixture flips the status icon.

### 5.7 Claim-level search — (M) P1  [#4.7]
- [ ] Extend `search-index.json.ts` to include claim statements + chapter
      anchor.
- [ ] Add `/search` page with text query and result type filter.
- **Verify:** Searching `H100` returns claims from multiple reports.

### 5.8 Portfolio / watchlist mode — (M) P1  [#4.4]
- [ ] Define `website/src/content/portfolios/<slug>.yaml` schema
      (`{name, runs: [runId]}`).
- [ ] Add `/portfolios/<slug>` page rendering aggregate dashboards.
- **Verify:** Sample portfolio renders charts.

### 5.9 Postmortem analytics dashboard — (S) P1  [#5.3]
- [ ] Add `/admin/postmortem` Astro page reading `_postmortem.yaml`.
- [ ] Charts: source-type mix, adverse coverage, acknowledged warnings.
- **Verify:** Page loads with non-empty charts.

### 5.10 Methodology & disclaimer page — (S) P1  [#5.8]
- [ ] Add `/methodology` page summarizing schema gates, evidence rules,
      limits.
- [ ] Cross-link from every report footer.
- **Verify:** Link present on every rendered report.

### 5.11 Accessibility & i18n audit — (S) P1  [#4.9]
- [ ] Run axe-core on every page type.
- [ ] Ensure figure `summary` is rendered as `aria-label`.
- [ ] Verify color contrast for confidence pills.
- **Verify:** Zero critical axe violations.

---

## Phase 6 — Operations / cadence

### 6.1 Refresh cadence policy — (S) P1  [#5.7]
- [ ] Add `references/refresh-ttl.yaml` (sector → days).
- [ ] Add `scripts/list-stale-runs.mjs` printing reports past TTL with
      stale high-confidence claims.
- [ ] Schedule monthly via GitHub Actions; output to issue or markdown
      under `reports/_refresh-queue.md`.
- **Verify:** Backdated golden report appears in stale list.

---

## Cross-cutting acceptance per item

For each task above, the definition of done is:

1. Schema or script change committed with unit/fixture coverage.
2. `npm run validate` green (including new golden checks where relevant).
3. Documentation updated in `SKILL.md`, `references/*`, or website docs.
4. Where user-visible: at least one rendered example confirmed in browser
   or PDF.

## Suggested execution order (TL;DR)

1. Phase 0 (golden tests, migrations, prose-ref audit).
2. Phase 1.1 + 1.4 + 1.5 (claim quotes, COI, parent-group dedupe).
3. Phase 2.1–2.4 (valuation tables, surrogate evidence, data-room asks).
4. Phase 3.1, 3.2, 3.5, 3.6 (stale, cross-chapter, lonely, contradictions).
5. Phase 4.1–4.4 (disambiguation, adverse prompts, playbooks, wayback).
6. Phase 5.1, 5.2, 5.5 (hover cites, pills, PDF export).
7. Remaining P1 items in any order; P2 last.
