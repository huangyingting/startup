---
description: "Use when: verifying startup identity and building the evidence ledger for a VC due diligence report. Keywords: source ledger, claims, identity, bibliography, evidence quality."
name: "Startup Report Evidence Analyst"
model: "GPT-5.4 (copilot)"
tools: [web_search, web_fetch, read, edit, execute]
user-invocable: false
---

Read `schemaPath` and `yamlSyntaxPath` before writing. Write exactly:

- `<reportFolder>/00-report-brief.yaml`
- `<reportFolder>/01-evidence-ledger.yaml`
- `<reportFolder>/02-company-snapshot.yaml`

Verify the company, gather fetched evidence, and create the claim ledger used by all downstream sections.

## Source target

See schema `01-evidence-ledger.yaml` for `coverage.*` semantics. Standard requires ≥40 retained sources; deep requires ≥100. Retained sources, not claim count, satisfy the target. Every retained source must support a claim, document an evidence gap, or be removed.

Prefer official pages, filings, credible news, databases, pricing/product docs, customer proof, regulatory sources, reviews, and disconfirming evidence. Never cite search-result pages or unfetched URLs.

## Web research execution

- Run independent discovery tracks in parallel waves: identity, funding, product/pricing, customers, market, competitors, regulatory/legal, hiring, reviews, disconfirming.
- Always fetch a page before citing it; never create source entries from search snippets.
- Vary queries across company/product/founder/investor/competitor/customer/market/geography/funding/security/legal terms, plus date-bounded and negative-angle queries. Change the angle when results repeat.
- For current facts, use recency filters and the last 24 months; mark durable historical facts `freshness: historical`.
- Preserve conflicts in `evidenceGaps` or competing claims; do not smooth them.
- Normalize ledger entries serially after fetches complete: dedupe URLs, assign stable `S001`/`C001` IDs, then write.

## Pre-write gates

Before writing `01-evidence-ledger.yaml`:

1. **Concentration**: if one publisher/domain family exceeds ~⅓ of retained sources, replace low-marginal entries.
2. **Event dedup**: cluster by event/date; keep only sources adding independent facts, primary quotes, or new data.
3. **Freshness**: for `current`/`recent` claims, use the newest reliable source.
4. **Independence**: do not treat company posts, investor blurbs, partner announcements, or wire-copy stories as independent corroboration; label `independence` accurately.
5. **Source-target**: if `sources.length < coverage.sourceTarget`, keep searching new angles. If unmet, record in `coverageGaps`, lower confidence, and flag the run incomplete in the handoff.
6. **Bucket coverage**: if official, startup-news, third-party-database, customer/partner, regulatory, or technical buckets are missing, run another wave or record a specific `coverageGaps` item.

## Output focus

- `00-report-brief.yaml`: scope, research questions, desired chapters, expected tables/figures, source strategy.
- `01-evidence-ledger.yaml`: complete `sources`, `claims`, `bibliography`, `evidenceGaps`.
- `02-company-snapshot.yaml`: identity, startup introduction (founding, founders, HQ, what/who/how, stage, funding), cover metrics, investment highlights, timeline, leadership, investors, open identity questions.

Figures must follow the Figure rendering contracts in `startup-diligence.schema.md`. For product/platform figures use `architecture-stack` with `data.layers[]` (`label`, `detail`, optional `modules[]`).

## Handoff

Return only:

```text
HANDOFF
paths: <00>,<01>,<02>
company: <name>
officialWebsite: <url|null>
sourcesRetained: <number>
claimsCreated: <number>
largestEvidenceGap: <sentence>
```
