# Analysis rules

Shared rules for the eight `startup-*` analysis skills. Each chapter skill documents chapter-specific work; this file only covers cross-chapter analysis, evidence, research, and validation rules.

## Ownership boundary

Chapter-specific expectations live in the owning `SKILL.md`. Workflow inputs, prompt routing, artifact order, concurrency, and stage handoffs live in `startup-diligence/SKILL.md`.

## Domain reflection and sufficiency gate

Before drafting, identify the company's domain archetype, value-chain position, buyer/user/payer/regulator distinctions, revenue mechanism, operating dependencies, adoption motion, and failure modes. Then apply the domain-adaptive additions defined in the owning chapter skill.

Do not assume the company is an IT, Internet, software, SaaS, or AI startup. If the domain is unclear, record the ambiguity and add a diligence path rather than forcing a template.

Before finalizing, confirm the chapter answers domain-specific underwriting questions, not just the skill's universal checklist. If supportable domain-critical content is missing, add it; if public evidence is unavailable, record an explicit `evidenceGaps[]` item with the failed path and diligence ask.

## Local evidence model

Every `01`–`08` analysis artifact owns local evidence before consolidation:

- Register every retained external source in `localEvidence.sources[]`.
- Register every reusable atomic fact in `localEvidence.claims[]`.
- Local `S###` and `C###` IDs are scoped to one artifact and may repeat across skills.
- Cite local claims through `claimRefs` from sections, tables, figures, callouts, and notes.
- Analysis skills never hand-write `90-evidence-ledger.yaml`; `startup-ledger` consolidates local evidence, rewrites claim IDs, and removes `localEvidence` unless debugging with `--keep-local`.

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

Label `sourceType`, `reputationTier`, and `independence` honestly. Use only enum values from `scripts/evidence-registry.mjs`; update the registry first when adding or changing evidence enums.

## Search/discovery packet handling

Use search/discovery for source discovery and cited Q&A, but treat answer text as research aid, not final evidence. Retain only reviewed/cited URLs that support the exact atomic claim. Use citation spans when valid; if spans are missing or malformed, associate the citation with the closest topical paragraph and set `keyQuote: null`. Keep search queries only as diagnostic provenance; never retain search-result pages in `sources[]`.

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

Before consolidation, ensure every retained URL satisfies source provenance rules, material sections/tables/figures/callouts cite local claims, and `localEvidence.coverage.sourcesConsidered` is updated. Ledger coverage and source-diversity thresholds are enforced by `scripts/check-reports-content.mjs`.

Reflection questions: Would a source change each major table cell, figure node, or conclusion if it were wrong? What investor decision does each major table/figure support? Does each important gap affect recommendation, confidence, risk, valuation stance, or only follow-up diligence? Resolve source contradictions as freshness, scope, definition, or true-conflict issues.

## Artifact depth

Artifacts `01`–`08` are the research record, not thin handoffs. They must retain substantive sections, chapter-appropriate tables, structured figures, sourced facts, atomic claims, evidence gaps, and notes explaining supported, estimated, conflicting, or unavailable metrics.

Tables should include company-specific values, dated evidence, confidence, implication, and diligence asks. Count-filler tables are not substantive.

Prefer richer artifacts when evidence supports them; do not compress useful research just to match a minimal template.

When a skill specifies required table columns, preserve those columns unless a better schema-compatible table design covers the same information. At minimum, diligence tables should expose the fact/metric, value or status, evidence date/source, confidence, implication, and diligence ask.

Figures must encode chapter-specific structure such as TAM layers, positioning quadrants, unit-economics bridges, architecture stacks, retention loops, risk transmission paths, or valuation sensitivities.

Markdown, Mermaid, SVG, prose diagrams, and JSON strings must be converted into structured YAML figures before saving artifacts.

Avoid:

- generic three-node figures such as `Public anchor → Private bridge → Underwriting output`;
- reused section titles such as `Evidence base`, `Investor interpretation`, `Contradictions and uncertainty`, or `Private diligence path` across all artifacts;
- floor-only output when evidence supports more depth.

Depth floors in `scripts/report-manifest.mjs` are minimums, not targets.

## Figure rules

- Use structured YAML figure objects rendered by the website.
- Use only canonical figure data fields from `scripts/figure-registry.mjs`: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`, `xAxis`, `yAxis`.
- Do not introduce non-canonical primary fields such as `name`, `components`, `children`, `steps`, `cards`, or `groups`.
- Numeric chart values must be numbers, not strings.
- Numeric chart values should match the corresponding table value or claim-supported numeric assumption. If a chart uses transformed or estimated values, explain the transformation in `approximationNotes`.
- Visible cards/layers/nodes need a `label` plus renderable content.
- Required arrays must not be empty.
- For `matrix`, `heatmap`, and `cohort` figures:
  - `data.columns[]` is the X-axis.
  - `row.label` is the Y-axis identity.
  - `row.values.length === data.columns.length`.
  - Do not put the row identifier as the first column.
