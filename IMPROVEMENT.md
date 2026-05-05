# IMPROVEMENT.md

Suggestions for evolving the `startup-research` skill and surrounding repo.
Grouped by theme, with rationale rooted in standard VC/PE diligence practice
(commercial, financial, technical, legal, operational, ESG, IC memo) and gaps
observed in the current `report-v2` pipeline.

Each item is tagged:

- **Effort:** S / M / L
- **Type:** `skill` (workflow / schema / scripts), `report` (chapter content),
  `website` (rendering), `infra` (repo / CI / tooling)
- **Priority:** P0 (high leverage) / P1 / P2

---

## 1. Diligence content gaps vs. industry practice

The eight existing chapters cover the core IC narrative well, but several
buckets that institutional diligence memos always include are missing or only
partially covered.

### 1.1 Add a dedicated **Management & Team** chapter (or expand chapter 1)
- **Why:** VC diligence weights founder/team risk as heavily as market and
  product. Today, leadership lives as one table inside `company-overview` and
  is not rated or stress-tested.
- **What to add:** founder-market fit scoring, prior-venture outcomes,
  reference-call surrogate signals (LinkedIn tenure, alumni networks, public
  talks, GitHub/Scholar footprint), key-person risk matrix, board composition
  and observer rights, equity split / option pool health, hiring velocity,
  Glassdoor / levels.fyi attrition signals, DEI snapshot.
- **Effort:** M · **Type:** skill+report · **Priority:** P1

### 1.2 Add a dedicated **Legal, IP & Cap Table** chapter
- **Why:** Currently split across `risks` (litigation), `company-overview`
  (funding), and `financials` (capital adequacy). PE/VC LPs expect a
  consolidated legal section: entity structure, jurisdiction, governance
  rights, preferences/liquidation waterfall, IP ownership chain, open-source
  license exposure, employment/IP assignment, export controls, sanctions, OFAC.
- **What to add:** patent/trademark enumeration table, OSS license audit
  (SPDX), litigation register with PACER / CourtListener IDs, cap table
  reconstruction with preference stack, 409A vs. last preferred price.
- **Effort:** L · **Type:** skill · **Priority:** P1

### 1.3 Add **Go-to-Market / Sales motion** depth to chapter 4 or split it out
- **Why:** "GTM motion" is one bullet under `financials.contentRequirements`.
  Real diligence memos analyze pipeline coverage, win rate, sales cycle by
  segment, channel mix, partner economics, ABM vs. PLG funnel, and quota
  attainment.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 1.4 Add **ESG / Responsible AI / Safety** chapter or callout block
- **Why:** Required by most institutional LPs (UN PRI signatories) and
  increasingly by corporate buyers. For AI companies, model safety, RAI
  governance, eval results (HELM, MLCommons, NIST AI RMF), and red-team
  posture are diligence items, not optional.
- **What to add:** Scope-1/2/3 emissions where reportable, supply-chain
  labor, hardware sourcing (conflict minerals), AI safety policies, model
  cards, bias/eval coverage, copyright training-data posture.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 1.5 Add **Cybersecurity & Data-protection posture**
- **Why:** Buyers and acquirers run a cyber DD workstream (SOC2, ISO 27001,
  HIPAA, PCI, FedRAMP, breach history, BitSight/SecurityScorecard ratings,
  CVE exposure of public assets, bug bounty maturity). Today it lives only
  as one row in `product-tech` "trust/quality/compliance".
- **What to add:** breach/incident timeline, certification scope vs. claim,
  pentest cadence, vulnerability disclosure policy, third-party risk.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 1.6 Add an explicit **Scenario & Sensitivity** block to `valuation`
- **Why:** Schema asks for "scenarios" in prose but does not enforce a
  Bear/Base/Bull table with the *driver deltas* (e.g., NRR, CAC payback,
  pricing) feeding each case. IC memos always carry this.
- **What to add:** required `scenarioTable` figure type with rows
  `[scenario, driver assumptions, revenue, valuation, multiple, probability]`.
- **Effort:** S · **Type:** skill+website · **Priority:** P0

### 1.7 Add **Comparables & Multiples** required artifact in `valuation`
- **Why:** A new schema `comparablesTable` with columns
  `[comp, stage, last round, post-money, ARR, EV/Rev, EV/Gross profit,
   growth, source]` would make the valuation stance auditable instead of
  narrative-only.
- **Effort:** S · **Type:** skill+website · **Priority:** P0

### 1.8 Add **Exit & Liquidity analysis**
- **Why:** Standard in PE/VC IC memos: likely acquirers, IPO comparables,
  secondary market activity (Forge / EquityZen pricing), tender offer
  history, lock-up status. Maps to recommendation/confidence credibility.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 1.9 **Reference-call surrogate** section
- **Why:** Real diligence does 5–15 calls (customers, ex-employees,
  competitors). The agent cannot. But it can systematize *public surrogates*:
  Glassdoor verbatims, Blind threads, Reddit r/<company>, Twitter customer
  complaints, podcast/conference quotes by named users. Promote this to a
  required `evidenceStrategy` line on chapters 5/6/7.
- **Effort:** S · **Type:** skill · **Priority:** P0

### 1.10 **Diligence checklist / data-room request list**
- **Why:** A standard IC artifact is the "what we'd ask in the data room"
  list — converting `evidenceGaps[]` into actionable asks for the company.
  Today gaps exist but are not consolidated into a buyer-facing ask list.
- **What to add:** assemble script emits `data-room-asks.yaml` (and a
  rendered page) grouping all `evidenceGap.diligencePath` by chapter and
  severity, deduped.
- **Effort:** S · **Type:** skill+website · **Priority:** P0

---

## 2. Schema & validator improvements

### 2.1 First-class **claim provenance & quoting**
- Add `claim.evidenceQuote: string | null` (verbatim ≤300 chars from the
  source) and `claim.pageOrSelector: string | null` (page #, CSS selector,
  PDF page). Today claims point to `S###` but the quote is lost. Auditors
  cannot validate without re-fetching.
- **Effort:** M · **Type:** skill · **Priority:** P0

### 2.2 **Numeric facts** as structured objects, not free strings
- Add a `metric` object: `{value, unit, asOfDate, basis, sourceRefs,
  confidence}`. Use it in `coverFacts`, `keyMetrics`, snapshot KPI tables.
  Enables unit-checking, cross-chapter consistency, and time-series charts.
- **Effort:** L · **Type:** skill+website · **Priority:** P1

### 2.3 **Currency & FX normalization**
- Require `currency: ISO-4217` on every monetary value; ledger consolidates
  to one report-level reporting currency with the FX rate and date used.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 2.4 **Confidence calibration audit**
- Add a postmortem check: for every `confidence: high` claim, sample N and
  recompute whether `sourceRefs` actually meet the corroboration rule
  *and* whether sources are independent (no two from the same parent
  publisher). Today only count is enforced.
- **Effort:** S · **Type:** skill · **Priority:** P1

### 2.5 **Source independence graph**
- Today `independence` is a per-source enum. Build a parent-publisher map
  (e.g., TechCrunch + Engadget = Yahoo Inc.) and detect when "two
  independent sources" share a corporate parent. Flag as
  `pseudoCorroboration` warning.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 2.6 **Stale-claim detector**
- Compute `runDate − source.date` per claim and warn when high-confidence
  volatile-topic claims (funding, valuation, headcount, leadership,
  pricing) are older than a topic-specific TTL (e.g., funding 180d,
  pricing 365d, leadership 365d).
- **Effort:** S · **Type:** skill · **Priority:** P0

### 2.7 **Cross-chapter consistency** beyond `keyFactDrift`
- Today `cross-chapter.mjs` checks identity facts. Extend to:
  - Market size cited in `market-analysis` ≥ revenue cited in `financials`.
  - Customer count cited in `customers` consistent with `company-overview`.
  - Risk severities cited in `valuation.topRisks` match the risk register.
- **Effort:** M · **Type:** skill · **Priority:** P0

### 2.8 **Conflict-of-interest disclosure** on sources
- Add `source.conflictOfInterest: string | null`. E.g. analyst report
  sponsored by the company, investor blog post by the lead VC. Enforce
  that high-confidence claims cannot rely solely on COI sources.
- **Effort:** S · **Type:** skill · **Priority:** P1

### 2.9 **Adverse-evidence "balance" score** per chapter
- Beyond `minAdverseQuestions` (questions) and adverseDistribution
  (sources), compute the share of *claims* that are adverse and warn if
  any chapter is < e.g. 10% adverse claims (suggests confirmation bias).
- **Effort:** S · **Type:** skill · **Priority:** P1

### 2.10 **Report-level ID space audit**
- Verify after `assemble` that every `S###`/`C###`/`T###`/`F###` referenced
  anywhere in the rendered `full-report.yaml` resolves, including inside
  prose blocks (`[C012]` markdown-style refs are not currently scanned).
- **Effort:** S · **Type:** skill · **Priority:** P0

---

## 3. Workflow & agent ergonomics

### 3.1 **Parallel chapter execution** with explicit dependency DAG
- `chapters.yaml` already encodes `optionalContext`. Expose a
  `--parallelizable` flag on `load-chapter.mjs` so a driver can run chapters
  with no dependencies concurrently (1+2+3, then 4+5+6, then 7, then 8).
- **Effort:** M · **Type:** skill · **Priority:** P1

### 3.2 **Pre-flight company-name disambiguation**
- Add a `disambiguate.mjs` helper that surfaces homonym risks (e.g.
  "Anthropic" pharma vs. AI; multiple "Linear" companies) and forces the
  agent to capture `companyUrl` plus `legalEntity` before running chapters.
- **Effort:** S · **Type:** skill · **Priority:** P0

### 3.3 **Resumable runs**
- The chapter loop already isolates per-chapter state. Add `--resume`
  semantics to `new-report.mjs` / `finalize.mjs` so a partial run can be
  re-entered without `--allow-duplicate`.
- **Effort:** S · **Type:** skill · **Priority:** P1

### 3.4 **Cost / token telemetry per run**
- Capture per-chapter `searchQueries.length`, `fetch-url` calls, bytes
  fetched, and (if available) LLM tokens into the postmortem. Enables
  trend-watching and budget caps.
- **Effort:** S · **Type:** skill+infra · **Priority:** P1

### 3.5 **Rate-limit & retry policy** in `fetch-url`
- Document and enforce per-host concurrency, exponential backoff, and
  "don't refetch within N hours" cache TTL. Today behavior is not visible
  in the skill SKILL.md.
- **Effort:** S · **Type:** skill · **Priority:** P1

### 3.6 **Snapshot archival** of fetched bodies
- Cache hit content under `.research-cache/` is gitignored and ephemeral.
  Optionally promote per-claim `evidenceQuote` plus a SHA-256 of the
  fetched body into the report so reruns are auditable even after the
  source page changes / disappears.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 3.7 **Wayback / archive.org mirroring**
- For every retained source, attempt to push to web.archive.org `Save
  Page Now` and store the snapshot URL on `source.archiveUrl`. Standard
  for legal/regulatory diligence so URLs remain citable.
- **Effort:** S · **Type:** skill · **Priority:** P0

### 3.8 **Adverse-search prompt templates**
- Provide a built-in checklist of adverse query templates per chapter
  (`{company} lawsuit`, `{company} layoffs`, `{company} outage`,
  `{company} SEC investigation`, `{founder} fraud`, `{product} CVE`,
  `{company} fired`, `{company} downround`). Currently each agent
  re-derives them.
- **Effort:** S · **Type:** skill · **Priority:** P0

### 3.9 **Source-type playbooks** (per chapter)
- Add tiny per-chapter playbooks under `references/playbooks/<chapter>.md`
  enumerating the canonical primary sources (e.g. financials → SEC EDGAR,
  Companies House UK, sayari, OpenCorporates, Crunchbase, PitchBook;
  product-tech → GitHub API, npm, PyPI, Docker Hub, HuggingFace). The
  generic "evidenceStrategy" bullets are too abstract.
- **Effort:** M · **Type:** skill · **Priority:** P0

### 3.10 **Multi-language / non-US source coverage**
- Encode `source.language` and require ≥ 1 non-English source for
  companies with material non-US revenue or HQ outside the Anglosphere.
  Today the gate is implicitly English-biased.
- **Effort:** S · **Type:** skill · **Priority:** P2

---

## 4. Website / consumption layer

### 4.1 **Diff between two runs** of the same company
- A `/[run]/diff/[priorRun]` route showing changed claims, new sources,
  resolved gaps, recommendation drift. Critical for monitoring.
- **Effort:** M · **Type:** website · **Priority:** P1

### 4.2 **Per-claim hover citations** in rendered prose
- Render `[C###]` inline tokens as hover-cards showing source title,
  publisher, date, and key quote — Wikipedia/Perplexity style.
- **Effort:** M · **Type:** website · **Priority:** P0

### 4.3 **Filter / sort the report index** by sector, recommendation, risk
- `_index.yaml` already has the data; the `index.astro` page does not
  expose filters. Add facets and sortable columns.
- **Effort:** S · **Type:** website · **Priority:** P1

### 4.4 **Portfolio / watchlist mode**
- Allow tagging a subset of reports as a "portfolio" via a YAML file and
  render a portfolio dashboard (aggregate risk distribution, sector mix,
  recommendation funnel, freshness heatmap of last refresh per holding).
- **Effort:** M · **Type:** website · **Priority:** P1

### 4.5 **Export to PDF / DOCX / IC memo template**
- LPs and ICs consume PDF. Wire `@astrojs/print` or a Puppeteer-based
  export that emits a paginated PDF with cover page, exec summary,
  chapters, appendices, bibliography.
- **Effort:** M · **Type:** website · **Priority:** P0

### 4.6 **Source bibliography page with health checks**
- For each source, show last-checked date and URL liveness (200/404/410).
  Run a weekly scheduled task that re-pings URLs and updates
  `accessStatus`.
- **Effort:** M · **Type:** website+infra · **Priority:** P1

### 4.7 **Search across all reports**
- `search-index.json.ts` exists; expose a `/search` UI with claim-level
  search (not just title) so users can find e.g. "all reports mentioning
  H100" or "all reports with NRR > 130%".
- **Effort:** M · **Type:** website · **Priority:** P1

### 4.8 **Confidence / freshness visual encoding**
- Color-code claims by `confidence` and render a freshness pill
  (`current / recent / historical / unknown`). Today the schema captures
  it; the renderer largely hides it.
- **Effort:** S · **Type:** website · **Priority:** P0

### 4.9 **Accessibility & i18n audit**
- `i18n.ts` exists. Verify color-contrast, alt text on rendered figures
  (YAML figures need a `summary` rendered as `aria-label`), and
  keyboard navigation across the figure types.
- **Effort:** S · **Type:** website · **Priority:** P1

---

## 5. Process, governance & quality

### 5.1 **Golden reports & regression suite**
- Pin two or three completed reports as "golden". `npm run validate` should
  re-run `check-chapter` + `check-report` against them and fail when
  validators get accidentally loosened.
- **Effort:** S · **Type:** infra · **Priority:** P0

### 5.2 **Schema migration tooling**
- `report-v2` will need to evolve. Add a `migrations/` directory and a
  `migrate.mjs` that takes a report folder from `vN` to `vN+1`. Today an
  out-of-band schema bump silently breaks existing reports.
- **Effort:** M · **Type:** skill · **Priority:** P1

### 5.3 **Postmortem analytics dashboard**
- `_postmortem.yaml` accumulates rich per-run stats. Add an Astro page
  that visualizes acknowledged-warning frequency, source-type mix over
  time, average sources/chapter, and adverse coverage trends. Drives
  schema/gate tuning decisions with data.
- **Effort:** S · **Type:** website · **Priority:** P1

### 5.4 **Chapter author "style" linting**
- Add a tiny prose linter (sentence length, hedging-word density,
  marketing-adjective blacklist: "leading", "innovative", "best-in-class")
  to keep the analytical voice consistent across runs.
- **Effort:** S · **Type:** skill · **Priority:** P2

### 5.5 **Claim → source bipartite check**
- Detect "orphan" sources retained but never cited by any claim and flag
  as wasted fetch budget. Detect "lonely" claims (single source, single
  domain, single sourceType) and require either a corroborating source or
  a downgrade to `confidence: low`.
- **Effort:** S · **Type:** skill · **Priority:** P0

### 5.6 **Conflict / contradiction surfacing**
- The schema supports `claim.type: conflicting` with `contradictsClaimRefs`
  but the report does not currently render a "Contradictions" appendix.
  IC memos always feature a "what we don't agree on / what the data
  disagrees on" section.
- **Effort:** S · **Type:** skill+website · **Priority:** P0

### 5.7 **Refresh cadence policy**
- Define per-sector refresh TTL (e.g. AI labs 30d, biotech 90d, hardware
  180d) and a monthly job that lists reports past TTL with stale
  high-confidence claims as candidates for refresh.
- **Effort:** S · **Type:** infra · **Priority:** P1

### 5.8 **Disclaimer & methodology page**
- Standardize a public methodology page documenting the gate values, the
  source-type taxonomy, evidence rules, and the limits ("we do no
  reference calls, no MNPI, no paid databases"). LPs will ask.
- **Effort:** S · **Type:** website · **Priority:** P1

---

## 6. Quick wins (≤ 1 day each)

1. Adverse-query template list shipped under
   `references/adverse-prompts.md` and surfaced by `load-chapter.mjs`. (3.8)
2. Stale-claim detector with default TTL table. (2.6)
3. `data-room-asks.yaml` emitted by `assemble.mjs`. (1.10)
4. Inline `[C###]` hover-card rendering. (4.2)
5. Confidence + freshness pills on every claim-bearing block. (4.8)
6. Wayback `Save Page Now` per retained source URL. (3.7)
7. Lonely-claim warning in `check-chapter.mjs`. (5.5)
8. Contradictions appendix auto-built from `type: conflicting`. (5.6)
9. Comparables table required artifact in `valuation`. (1.7)
10. Bear/Base/Bull scenario table required artifact in `valuation`. (1.6)

---

## 7. Open questions for the maintainer

- Is this pipeline meant to remain English-only / US-centric, or should
  multi-jurisdiction (EU AI Act, UK FCA, China NDRC, India MCA) coverage
  be a first-class goal? Drives 1.2, 1.4, 3.10.
- Is the target consumer an external LP / acquirer (PDF + COI disclosures
  matter) or an internal scout (web UI + diff + watchlist matter)? Drives
  4.x prioritization.
- Should `report-meta.yaml` judgments be authored by the same agent, or
  separated into a "second-opinion" model pass to reduce confirmation
  bias? Drives 2.9 and 5.x.
- Is there appetite to integrate paid databases (PitchBook, CB Insights,
  Crunchbase Pro, S&P Capital IQ) behind a feature flag, or is the
  free-public-source constraint a hard requirement?
