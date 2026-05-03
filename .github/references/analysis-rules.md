# Analysis rules

Shared rules for the eight `startup-*` analysis skills. Each chapter skill documents chapter-specific work; this file only covers cross-chapter analysis, evidence, research, and validation rules.

## Ownership boundary

Chapter-specific expectations live in the owning `SKILL.md`. Workflow inputs, prompt routing, artifact mapping, concurrency, synchronization points, and artifact handoffs live in `startup-research/SKILL.md`.

## Common chapter workflow

Every `01`–`08` analysis chapter skill follows this execution loop, then applies its own mission, required content, tables, figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check:

1. Confirm shared identity inputs from `startup-research`: `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and the owning output filename.
2. Pull in prompt-derived requirements routed to the chapter; do not create repo-level templates from one-off user requirements.
3. Perform domain reflection before research: identify the relevant archetype(s), operating model, buyer/user/payer/regulator distinctions, revenue mechanism, dependencies, and failure modes; select the domain-adaptive additions that should become chapter outputs.
4. Build a chapter-specific research-question backlog from the owning skill's required content, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, optional coordination context, and prompt requirements; include questions intended to support every material section, table, figure, and gap.
5. Work the question backlog iteratively: use verified answer/search discovery to refine questions and candidate sources, then review retained direct URLs with `fetch-url`; keep asking follow-up questions around missing data until the chapter's evidence-depth gate passes or public-evidence limits are documented.
6. Convert reviewed evidence into `localEvidence.sources[]` and atomic `localEvidence.claims[]`; unsupported important facts become explicit `evidenceGaps[]` with diligence paths; derive content from the claims rather than writing claims after the prose.
7. Draft schema-native sections, tables, callouts, and structured figures for the chapter; make selected domain-adaptive additions visible in the artifact rather than only in notes; cite material claims with local `claimRefs` and use `null` plus explanation for unavailable private metrics.
8. Self-audit before saving: identity fields match the run, YAML parses, required tables/figures are substantive and non-duplicative, claim refs resolve locally, selected domain-adaptive additions appear in sections and at least one table or figure where supportable, evidence depth is adequate, and the owning skill's completion check passes.
9. Write only the owning skill's artifact, then run `node scripts/check-chapter-readiness.mjs <reportFolder> <01-08-artifact.yaml> --pre-ledger` so failures route directly back to this chapter. If research uncovers a supportable fact owned by another chapter, hand it back through the orchestrator instead of editing another artifact directly.

## Domain reflection and sufficiency gate

Before drafting, identify the company's domain archetype, value-chain position, buyer/user/payer/regulator distinctions, revenue mechanism, operating dependencies, adoption motion, and failure modes. Then apply the domain-adaptive additions defined in the owning chapter skill as first-class research targets.

Do not assume the company is an IT, Internet, software, SaaS, or AI startup. If the domain is unclear, record the ambiguity and add a diligence path rather than forcing a template.

Before finalizing, confirm the chapter answers domain-specific underwriting questions, not just the skill's universal checklist. Each chapter should include at least one domain-specific section and at least one domain-specific table or structured figure when evidence supports it. If public evidence is unavailable, record an explicit `evidenceGaps[]` item with the failed path, diligence ask, and the table/figure/section that could not be completed.

## Local evidence model

Every `01`–`08` analysis artifact owns local evidence before consolidation:

- Register every retained external source in `localEvidence.sources[]`.
- Register every reusable atomic fact in `localEvidence.claims[]`.
- Local `S###` and `C###` IDs are scoped to one artifact and may repeat across skills.
- Cite local claims through `claimRefs` from sections, tables, figures, callouts, and notes.
- Analysis skills never hand-write `90-evidence.yaml`; `startup-evidence` consolidates local evidence, rewrites claim IDs, and removes `localEvidence` unless debugging with `--keep-local`.

## Question-driven research loop

Do not start by drafting prose. Start each chapter with a research-question backlog, then use evidence to answer those questions and only then draft the artifact.

- For every chapter, create at least 50 targeted research questions before drafting. Questions should be complete diligence questions, not keyword fragments, and should be grouped by the intended section, table, figure, source family, domain-adaptive addition, or evidence gap they support.
- Across a complete `01`–`08` report, the combined backlog should therefore reach at least 400 targeted questions before finalization. High-profile, complex, heavily funded, regulated, or controversial companies may need more than 50 questions per chapter when public evidence is abundant or contradictory.
- Every required section, table, figure, domain-adaptive addition, and major evidence gap should map to at least one research question.
- Work questions in loops: ask via `web_search`/search, inspect cited answers and contradictions, fetch retained URLs, update `localEvidence`, identify missing variables, then ask narrower follow-up questions.
- Stop expanding only when the chapter has enough retained sources, atomic claims, source-family coverage, and explicit gaps to support its output. Do not stop because a table has enough rows or a section has enough words.
- Keep the question backlog in diagnostic notes, terminal/chat transcript, or a research pack; do not write it as a YAML report artifact unless the user asks for audit diagnostics.

## Evidence-depth gate

Each `01`–`08` chapter should be evidence-rich enough to stand as an investor-grade research record before consolidation:

- Default floor for every chapter: at least 50 retained, reviewed chapter-relevant sources and at least 75 reusable atomic claims. Claims intentionally exceed sources because one reviewed source should usually support multiple atomic, decision-relevant facts.
- Across a complete `01`–`08` report, expect at least 400 retained sources before cross-chapter deduplication and roughly 600 reusable atomic claims before finalization. If final deduplication reduces canonical source count below 400, the report must still demonstrate that each chapter met its 50-source local research floor or explicitly explain public-evidence limits.
- High-profile, complex, heavily funded, regulated, or controversial companies may require more than 50 retained sources and 75 claims per chapter when evidence is abundant, contradictory, or decision-critical.
- Cover at least three chapter-relevant source families where available, such as official/company-authored, independent reporting, filings/regulators, customer/partner proof, technical docs, reviews, competitor/comparable sources, analyst/market data, and adverse/disconfirming sources.
- Include at least one official or primary source and at least one independent, customer/partner, regulator/filing, or adverse/disconfirming source when available. Company-authored sources alone should not pass the gate for non-stealth companies.
- Claims must be atomic and reusable. Do not inflate claim count by splitting one sentence into trivial fragments, and do not count paragraph summaries as claims.
- If a chapter cannot meet the source or claim floor, it must explain why in `evidenceGaps[]`, list attempted source families, and state which sections/tables/figures are affected.

## Source provenance

Retain a source only if it is either:

- a cited URL returned by search/discovery; or
- a directly reviewed official, first-party, regulatory, filing, partner, customer, technical-doc, competitor, or other page discovered from a known URL, sitemap, navigation path, or cited source.

Never retain:

- generic search-result URLs;
- inferred URLs that were not opened/reviewed;
- duplicate wire-copy pages that add no original fact;
- sources kept only as bibliography filler.

Deduplicate by canonical URL and underlying event/date. Cluster press-release or wire-copy repeats as one event. Prefer fit-for-purpose sources: official pages, filings/regulators, tier-one news, analyst/market data, customer proof, technical docs, reviews, and disconfirming evidence.

Label `sourceType`, `reputationTier`, and `independence` honestly using the closed enum values in `.github/references/report-schema-v2.md`.

## Research tool usage

Use two complementary research tracks:

1. **Verified answer / discovery track** — use search/discovery tools, including `web_search` when available, to answer targeted diligence questions, surface current facts, triangulate source families, find cited URLs, and test confirming, disconfirming, and adverse hypotheses. Treat cited/verified answer text as research guidance and contradiction detection, not as a substitute for claim-level provenance.
2. **Direct source review track** — use direct URL review for retained sources so material claims trace back to source pages, filings, regulator records, official pages, customer/partner pages, competitor pages, docs, or adverse articles.

Use the repository `fetch-url` workflow for every retained direct URL, including official pages, cited search results, filings, regulator pages, customer/partner pages, competitor pages, docs, and adverse articles. In this repository, direct page review means following `.github/skills/fetch-url/SKILL.md` and using `node scripts/fetch-url.mjs ...` rather than native page-fetch tools unless higher-priority runtime instructions require otherwise.

For each retained source, the artifact should reflect what was actually reviewed: URL, title/source identity, publication or access date when available, source type, reputation/independence labels, and claim-level support. Do not retain a URL only because it appeared in search results.

Use direct URL review without search when the URL is already known, provided by the user, discovered from an official sitemap/navigation path, or cited by a reviewed source. Use search again when direct pages are thin, stale, contradictory, or insufficient for a decision-relevant claim.

## Search/discovery packet handling

Use search/discovery for both cited Q&A and source discovery. When `web_search` or another discovery tool returns a verified answer with citations, use the answer to shape research questions, identify likely facts, and detect contradictions; then retain the cited/reviewed URLs that support the exact atomic claim. Use citation spans when valid; if spans are missing or malformed, associate the citation with the closest topical paragraph and set `keyQuote: null`. Keep search queries only as diagnostic provenance; never retain generic search-result pages in `sources[]`.

After each targeted search/discovery call, record this run-log line in the chat/workflow transcript, terminal stdout, CI artifact, diagnostic research pack, or handoff note. Do not write it into YAML artifacts.

```text
[search debug] skill=<skill-name> call=<n> query="<query>" citedUrls=<count> retainedSources=<count> outcome="<used|gap>"
```

## Time, research, and freshness

- Treat `currentDate` as the anchor for recency, volatile-fact review, search-query freshness, and default `runDate`.
- Ask complete-sentence research questions tied to the intended paragraph, table, figure, or gap; avoid keyword-only queries.
- Include confirming, disconfirming, and adverse angles. If results are thin or stale, rewrite the question before recording a gap.
- Retain source breadth, not bibliography volume: official/company-authored, independent corroboration, adverse/disconfirming, and freshness-check sources should be represented or explicitly gapped.
- Label official/company-authored claims as `company-claimed` or `observed`; corroborate volatile or judgment-critical claims independently when possible.

## Date precision

- Preserve the precision supported by the source. Do not convert a year-only fact such as `founded in 2015` into `2015-01-01`, and do not convert month-only facts into the first day of the month unless the source states that exact date.
- Use exact `YYYY-MM-DD` dates only when the retained source supports the exact day. Otherwise use `YYYY`, `YYYY-MM`, `null`, or a clearly labeled status string in narrative tables/figures, depending on what the schema field allows.
- For schema fields that require `YYYY-MM-DD|null` and only a year or month is known, use `null` for the exact-date field and carry the partial date in the adjacent year/status/note field when available.
- For timeline or chronology items with only partial date support, display the supported partial date such as `2015` or `2019` rather than inventing January 1.
- If conflicting sources provide different exact dates, record the conflict and confidence rather than silently choosing one.

Freshness rubric anchored to `currentDate`:

- `current`: reviewed within ~90 days, or the latest official/current-status source available for a volatile fact.
- `recent`: reviewed within ~24 months and still likely relevant for the claim.
- `historical`: older than ~24 months but still useful for durable facts such as founding, prior round timing, or old milestones.
- `unknown`: source date or continued validity cannot be established.

Volatile claims require `current` or `recent` evidence, or an explicit evidence gap explaining why fresher evidence is unavailable.

When a company or competitor official surface exists, review the relevant homepage, sitemap/navigation, about/news, product/pricing/customer, docs/status/trust/legal pages before relying on summaries. Never treat vendor-authored comparisons as independent proof.

## Claim rules and reflection gate

Every new external fact needs an atomic, reusable local `claims[]` entry before consolidation. Claims need exact `sourceRefs` unless they are explicitly `claimType: open-question` with `corroboration: none`. Before finalizing, remove claims that do not support a decision-relevant section/table/figure/callout/gap; split bundled claims; label `claimType`, `freshness`, and `corroboration` honestly; and move unsupported important facts to `evidenceGaps[]` instead of implying them in prose.

## Source quality and coverage gates

Before writing, confirm that retained sources cover the chapter's required source classes. If a required source class has no usable evidence, add `evidenceGaps[]` rather than silently omitting it. Never invent values, capabilities, certifications, customers, multiples, outcomes, or metrics.

Before consolidation, ensure every retained URL satisfies source provenance rules, material sections/tables/figures/callouts cite local claims, and `localEvidence.coverage.sourcesConsidered` is updated. Chapter evidence coverage, depth, table, and figure thresholds are enforced by `scripts/check-chapter-readiness.mjs` before the ledger is built.

Reflection questions: Would a source change each major table cell, figure node, or conclusion if it were wrong? What investor decision does each major table/figure support? Does each important gap affect recommendation, confidence, risk, valuation stance, or only follow-up diligence? Resolve source contradictions as freshness, scope, definition, or true-conflict issues.

## Artifact depth

Artifacts `01`–`08` are the research record, not thin handoffs. They must retain substantive sections, chapter-appropriate tables, structured figures, sourced facts, atomic claims, evidence gaps, and notes explaining supported, estimated, conflicting, or unavailable metrics.

Tables should include company-specific values, dated evidence, confidence, implication, and diligence asks. Count-filler tables are not substantive.

Prefer richer artifacts when evidence supports them; do not compress useful research just to match a minimal template.

Use tables and figures as alternative expressions for a specific analysis, not duplicate containers for the same content. If a diligence question is best answered by exact rows, comparisons, evidence dates, confidence, and diligence asks, use a table. If it is best answered by structure, flow, positioning, causality, scenario shape, or sensitivity, use a figure. Do not create both a table and a figure that repeat the same title, claim set, rows/nodes, or conclusion; choose the stronger representation and use narrative cross-reference for any complementary interpretation.

When a skill specifies required table columns, preserve those columns unless a better schema-compatible table design covers the same information. At minimum, diligence tables should expose the fact/metric, value or status, evidence date/source, confidence, implication, and diligence ask.

Figures must encode chapter-specific structure such as TAM layers, positioning quadrants, unit-economics bridges, architecture stacks, retention loops, risk transmission paths, or valuation sensitivities.

Markdown, Mermaid, SVG, prose diagrams, and JSON strings must be converted into structured YAML figures before saving artifacts.

Avoid:

- generic three-node figures such as `Public anchor → Private bridge → Underwriting output`;
- reused section titles such as `Evidence base`, `Investor interpretation`, `Contradictions and uncertainty`, or `Private diligence path` across all artifacts;
- floor-only output when evidence supports more depth.

Minimum-depth gates defined by each owning chapter skill and enforced by automated checks are minimums, not targets.

## Figure rules

- Use structured YAML figure objects rendered by the website.
- Use only canonical figure data fields from `scripts/figure-registry.mjs`: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`, `xAxis`, `yAxis`.
- Do not introduce non-canonical primary fields such as `name`, `components`, `children`, `steps`, `cards`, or `groups`.
- Do not fabricate numeric chart values, coordinates, or time series to satisfy a requested figure type. If public evidence cannot support a numeric figure, use a schema-supported qualitative alternative such as `matrix`, `flow`, `logic-chain`, `scorecard`, or `dependency-map`, and record the missing numeric input as a note or `evidenceGaps[]` item.
- Numeric chart values must be numbers, not strings.
- Numeric chart values should match the corresponding table value or claim-supported numeric assumption. If a chart uses transformed or estimated values, explain the transformation in `approximationNotes`.
- Visible cards/layers/nodes need a `label` plus renderable content.
- Required arrays must not be empty.
- For `matrix`, `heatmap`, and `cohort` figures:
  - `data.columns[]` is the X-axis.
  - `row.label` is the Y-axis identity.
  - `row.values.length === data.columns.length`.
  - Do not put the row identifier as the first column.
