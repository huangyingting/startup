# Analysis rules

Shared rules for the eight analysis skills:

- `startup-snapshot`
- `startup-market`
- `startup-competition`
- `startup-financials`
- `startup-product`
- `startup-customers`
- `startup-risks`
- `startup-valuation`

Each skill documents chapter-specific work. This file defines rules that apply to all eight.

## Section-owned chapter requirements

Chapter-specific expectations live in the owning `SKILL.md`. This file only defines shared analysis, evidence, research, and validation rules. Workflow-level inputs, prompt routing, artifact order, concurrency, and stage handoffs live in `startup-diligence/SKILL.md`.

## Domain reflection and sufficiency gate

Before drafting, each analysis skill must explicitly reflect on the company's domain and decide whether the universal requirements in the skill are enough. Those requirements are only a minimum readiness shape; they are not the full chapter plan.

Use upstream artifacts, official pages, and source discovery to identify the domain archetype, value-chain position, buyer/user/payer/regulator distinctions, revenue mechanism, operating dependencies, adoption motion, and failure modes. Then apply the domain-adaptive additions defined in the owning chapter skill.

Do not assume the company is an IT, Internet, software, SaaS, or AI startup. If the domain is unclear, record the ambiguity and add a diligence path rather than forcing a template.

Before finalizing, run this sufficiency check without duplicating the chapter skill's content checklist:

1. Which domain archetype(s) did this chapter infer, and why?
2. Which extra domain-specific sections, tables, figures, source classes, and questions were added because of that inference?
3. Is the chapter merely satisfying the skill's universal requirements, or does it answer the domain-specific underwriting questions an investor would ask?
4. If content is still thin, can more credible research change the answer? If yes, continue research and expand the artifact. If no, add explicit `evidenceGaps[]` and explain why public evidence is unavailable.
5. If a requested or domain-critical table/figure cannot be supported, include the failed path and diligence ask rather than substituting a generic chart.

## Local evidence model

Every `01`–`08` analysis artifact owns local evidence before consolidation:

- Register every retained external source in `localEvidence.sources[]`.
- Register every reusable atomic fact in `localEvidence.claims[]`.
- Local `S###` and `C###` IDs are scoped to one artifact and may repeat across skills.
- Cite local claims through `claimRefs` from sections, tables, figures, callouts, and notes.
- Analysis skills never hand-write `100-evidence-ledger.yaml`; `startup-ledger` generates it with `node scripts/consolidate-evidence.mjs <reportFolder>` after `01`–`08` exist.
- Consolidation dedupes final sources and claims, assigns canonical `S###` / `C###` IDs, rewrites `01`–`08` references, and removes `localEvidence` unless debugging with `--keep-local`.
- Canonical IDs are stable within a consolidation run but not guaranteed across re-runs; never cache or hand-link final `S###` / `C###` outside the artifacts the script rewrites.

## Source provenance

Retain a source only if it is either:

- a cited/annotated search/discovery result URL; or
- a directly reviewed official, first-party, regulatory, filing, partner, customer, technical-doc, competitor, or other page discovered from a known URL, sitemap, navigation path, or cited source.

Never retain:

- generic search-result URLs;
- inferred URLs that were not opened/reviewed;
- duplicate wire-copy pages that add no original fact;
- sources kept only as bibliography filler.

Deduplicate by canonical URL and underlying event/date. Cluster press-release or wire-copy repeats as one event. Prefer fit-for-purpose sources: official pages, filings/regulators, tier-one news, analyst/market data, customer proof, technical docs, reviews, and disconfirming evidence.

Label `sourceType`, `reputationTier`, and `independence` honestly. Use only enum values from `scripts/evidence-registry.mjs`; update the registry first when adding or changing evidence enums.

## Search/discovery packet handling

Search/discovery tools have two valid roles:

- source discovery: finding candidate URLs and source classes to review; and
- cited question answering: asking a precise diligence question and using the answer to identify supported facts, counter-facts, open questions, and follow-up searches.

In both roles, the answer text is a research aid, not final evidence. For each targeted search/discovery response that includes cited URL annotations:

1. Treat `output_text.text.value` as candidate narrative, not source truth.
2. Treat `output_text.text.annotations[].url_citation.url` as source candidates.
3. Use `start_index` and `end_index` to map nearby answer facts to cited URLs when spans are valid.
4. If spans are missing, malformed, empty, or garbled, associate the citation with the closest topical paragraph and set `keyQuote: null`.
5. Split narrative into atomic claims: one fact per claim.
6. Attach only URLs that support that exact claim.
7. Preserve useful Q&A conclusions as hypotheses, draft claims, or evidence gaps only after checking whether the cited URLs actually support them.
8. Use `bing_searches[]` only as query provenance in notes; never retain Bing/search-result URLs in `sources[]`.

After each targeted search/discovery call, record this run-log line in the chat/workflow transcript, terminal stdout, CI artifact, diagnostic research pack, or handoff note. Do not write it into YAML artifacts.

```text
[search debug] skill=<skill-name> call=<n> query="<query>" citedUrls=<count> retainedSources=<count> outcome="<used|gap>"
```

## Time, research, and freshness

- Treat `currentDate` as a research input, not just metadata. It anchors search recency, evidence freshness, volatile-fact review, and the report's default `runDate`.
- Build search queries against `currentDate` so discovery surfaces the latest material news: for volatile facts, include the current year or explicit recent/updated/date-bounded terms when the search surface supports them.
- Default to investor-grade research depth, not minimum viable output. Each chapter should collect as much decision-relevant, non-duplicative, evidence-backed material as practical before drafting; stop only when additional credible sources are repetitive, low quality, or no longer change the analysis.
- Retain breadth across source classes rather than volume for its own sake: official/company-authored sources, independent corroboration, adverse/disconfirming sources, and recent/freshness checks should all be represented or explicitly gapped.
- Refresh volatile chapter-relevant facts: funding, valuation, revenue, pricing, product launches, customers, partnerships, lawsuits, regulatory posture, leadership, and similar facts.
- Ask complete-sentence research questions tied to the intended paragraph, table, figure, or gap.
- Use search/discovery in both modes when useful: source discovery for candidate URLs and cited Q&A for precise diligence questions. Treat Q&A answers as hypotheses until the cited URLs or directly reviewed pages support the exact claim.
- Avoid keyword-only queries.
- Query confirming, disconfirming, and adverse angles. Every chapter needs at least one adverse-evidence question.
- If results are thin or stale, rewrite the question before recording a gap.
- Mine the company's official surface when `company.website` or `companyUrl` exists: homepage, sitemap, navigation, docs, pricing, changelog, customer/partner pages, blog/news, trust/security, status, and similar pages.
- Label official/company-authored claims as `company-claimed` or `observed`.
- Corroborate volatile or judgment-critical claims independently when possible.
- For competitor/comparable work, mine competitor official surfaces too, but never treat vendor-authored comparisons as independent proof.

Freshness rubric anchored to `currentDate`:

- `current`: reviewed within ~90 days, or the latest official/current-status source available for a volatile fact.
- `recent`: reviewed within ~24 months and still likely relevant for the claim.
- `historical`: older than ~24 months but still useful for durable facts such as founding, prior round timing, or old milestones.
- `unknown`: source date or continued validity cannot be established.

Volatile claims require `current` or `recent` evidence, or an explicit evidence gap explaining why fresher evidence is unavailable.

Official-surface review order when applicable:

1. homepage and canonical domain redirects;
2. `robots.txt` and sitemap URLs;
3. about/company, leadership, careers, newsroom/blog, and press pages;
4. product, solution, pricing, packaging, customer, partner, and case-study pages;
5. docs, API/developer portals, changelog/release notes, integrations, status, trust/security, privacy, DPA, subprocessors, terms, and compliance pages;
6. marketplace listings, customer/partner announcements, filings/regulators, reviews, and independent reporting;
7. adverse/disconfirming sources tied to the chapter's claims.

Use official pages for observed/company-claimed facts, then use independent or primary third-party evidence for volatile, valuation-critical, customer, legal, regulatory, and recommendation-critical claims.

## Claim rules and reflection gate

- Every new external fact needs a local `claims[]` entry before consolidation.
- Every claim needs `sourceRefs` unless it is explicitly `claimType: open-question` and `corroboration: none`.
- Claims are atomic, reusable facts, not paragraph summaries.
- Unsupported important facts go in `evidenceGaps` with impact and diligence path.
- If a section, table, or figure would need a claim that cannot be supported, add an explicit `evidenceGaps[]` entry rather than leaving the assertion implicit.

Before finalizing each analysis artifact, reflect on the claim set rather than treating claims as bibliography bookkeeping:

1. **Necessity** — Which section, table cell, figure node, callout, or gap needs this claim? Remove claims that do not support a decision-relevant artifact element.
2. **Atomicity** — Does the claim state exactly one factual assertion? Split bundled claims that combine metrics, dates, causality, and implications.
3. **Support fit** — Do the cited `sourceRefs` support the exact statement, not just the broad topic? If not, revise the claim or move it to `evidenceGaps`.
4. **Claim type honesty** — Label company statements as `company-claimed`, independently reported facts as `third-party-reported`, analyst/math outputs as `estimated`, reasoning outputs as `inferred`, and unresolved asks as `open-question`.
5. **Freshness and volatility** — For funding, valuation, revenue, customers, legal/regulatory posture, pricing, partnerships, leadership, and product packaging, refresh against `currentDate` or explicitly mark the stale/unknown evidence gap.
6. **Corroboration** — Judgment-critical claims should be multi-source or have a note explaining why only one credible source is available. Conflicting evidence should produce `claimType: conflicting` or an explicit gap.
7. **Completeness** — Ask what claims a domain expert would expect to see for this chapter. If a critical claim cannot be supported, create a precise `evidenceGaps[]` entry instead of omitting the issue.

## Source quality and coverage gates

Before writing an artifact:

- Confirm `localEvidence` covers the chapter's required source classes.
- Reflect on source mix bias: if the chapter relies mostly on company-authored, partner-authored, or vendor-authored material, add independent/adverse sources where available or record why they are unavailable.
- Prefer multi-source corroboration for volatile or judgment-critical facts.
- If only one credible source exists, record the limitation in claim `corroboration` and `evidenceGaps`.
- If a fact is unsupported, write `null` plus a precise diligence ask.
- Never invent values, capabilities, certifications, customers, multiples, outcomes, or metrics.
- Convert each retained source into atomic claims; do not keep bibliography-only sources.
- Update local `coverage.sourcesConsidered`.

Before finalizing each analysis artifact, verify that the research record includes all four lenses below. If a lens produces no usable evidence, add an explicit `evidenceGaps` entry rather than silently omitting it.

- Official surface: company pages, docs, pricing, newsroom/blog, trust/status, customer/partner pages, sitemap-linked pages.
- Independent corroboration: tier-one news, filings/regulators, analyst or market data, credible trade press, customer/partner proof, or comparable public-company evidence.
- Adverse/disconfirming evidence: lawsuits, regulatory scrutiny, outages, churn/reviews, leadership departures, pricing pressure, customer pushback, competitor attacks, or contrary estimates.
- Freshness check: current facts follow the freshness rubric above, and volatile facts are refreshed against `currentDate`.

Before consolidation:

- Every downstream chapter need has support or an explicit `evidenceGaps` entry.
- Every retained URL satisfies source provenance rules.
- Each `01`–`08` artifact has a domain-appropriate source mix.
- Material sections, tables, figures, and callouts cite local claims.

Final ledger quality checks after consolidation:

- `coverage.sourcesRetained === sources.length`.
- `coverage.claimsCreated === claims.length`.
- No single publisher/domain family should exceed 34% of retained sources when alternatives exist.
- At least 15% of retained sources should be independent when the source universe supports it.
- At most 50% of retained sources may be uncited by any claim.
- Counts alone are not quality. Assess diversity by source type, recency, independence, claim type, and chapter coverage.

For every major table or figure, ask: “Which source would change this cell/node if it were wrong?” If the answer is “none,” either source it, remove it, or mark it as a diligence gap.

For every major table or figure, ask: “What decision does this help an investor make?” If the answer is only “it satisfies the required count,” replace it with a decision-useful table/figure or remove it.

For every major conclusion, ask: “Which atomic claim carries this?” If the answer is “none,” create a supported claim, soften the conclusion, or record an evidence gap.

For every important evidence gap, ask: “Does this block the recommendation, change confidence, change risk rating, change valuation stance, or only define follow-up diligence?” Reflect the answer in the chapter conclusion and handoff note.

For every apparent contradiction between sources or chapters, ask: “Is this a real conflict, a date/freshness issue, a scope mismatch, or a definition mismatch?” Resolve it in prose, create `claimType: conflicting`, or add an evidence gap.

For every domain-adaptive addition selected by the skill, ask: “Which table, figure, section, or gap carries this?” If the answer is “none,” add it before moving on.

For every chapter, ask: “What would a domain expert expect to see here that the universal requirements did not name?” If the answer is supportable, add it. If not supportable, record it as an evidence gap with a diligence path.

## Artifact depth

Artifacts `01`–`08` are the research record, not thin handoffs. Each must retain:

- substantive sections;
- chapter-appropriate tables;
- structured figures;
- sourced facts;
- atomic claims;
- evidence gaps;
- notes explaining supported, estimated, conflicting, or unavailable metrics.

Tables should include company-specific values, dated evidence, confidence, implication, and diligence asks. Tables created only to hit a count are not substantive.

Prefer richer artifacts when evidence supports them: additional sections, tables, figures, rows, sourced notes, and evidence gaps are expected for visible companies or complex domains. Do not compress useful research just to match a minimal template.

When a skill specifies required table columns, preserve those columns unless a better schema-compatible table design covers the same information. At minimum, diligence tables should expose the fact/metric, value or status, evidence date/source, confidence, implication, and diligence ask.

Figures must encode chapter-specific structure, such as:

- TAM layers;
- positioning quadrants;
- unit-economics bridges;
- architecture stacks;
- retention loops;
- risk transmission paths;
- valuation sensitivities.

Markdown, Mermaid, SVG, prose diagrams, and JSON strings must be converted into structured YAML figures before saving artifacts.

Avoid:

- generic three-node figures such as `Public anchor → Private bridge → Underwriting output`;
- reused section titles such as `Evidence base`, `Investor interpretation`, `Contradictions and uncertainty`, or `Private diligence path` across all artifacts;
- floor-only output when evidence supports more depth.

Depth floors in `scripts/report-manifest.mjs` are minimums, not targets.

## Figure rules

- Use structured YAML figure objects rendered by the website.
- Do not use diagram-language source strings.
- Use only canonical renderer fields: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`.
- Do not introduce non-canonical primary fields such as `name`, `components`, `children`, `steps`, `cards`, or `groups`.
- Numeric chart values must be numbers, not strings.
- Numeric chart values should match the corresponding table value or claim-supported numeric assumption. If a chart uses transformed or estimated values, explain the transformation in `approximationNotes`.
- Visible cards/layers/nodes need a `label` plus renderable content.
- Required arrays must not be empty.
- For `matrix` / heatmap figures:
  - `data.columns[]` is the X-axis.
  - `row.label` is the Y-axis identity.
  - `row.values.length === data.columns.length`.
  - Do not put the row identifier as the first column.
