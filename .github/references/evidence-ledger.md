# Evidence ledger rules

Use these rules whenever a skill writes local evidence or consolidates `100-evidence-ledger.yaml`.

## Ledger model

- Evidence gathering is distributed across analysis skills.
- Each analysis artifact first registers evidence in its own `localEvidence.sources[]` and `localEvidence.claims[]`.
- Local `S###` and `C###` IDs are scoped to one artifact file and may repeat across skills.
- Final evidence registration is centralized in `100-evidence-ledger.yaml`, generated after `01`–`08` by `scripts/consolidate-evidence.mjs`.
- Every retained external source is registered once in final `sources[]` after dedupe.
- Every reusable external factual assertion becomes an atomic final `claims[]` entry.
- Downstream artifacts cite `claimRefs`; claims cite `sourceRefs`.
- For existing published reports, preserve final `S###` and `C###` IDs when possible. New final IDs continue from the current maximum.

## Source provenance

Retained sources may come from either:

- cited/annotated `web_search` results; or
- directly fetched official, first-party, regulatory, filing, partner, customer, technical-doc, or competitor pages discovered from a known URL, sitemap, navigation, or cited source.

Never retain generic search-result URLs or URLs inferred but not opened/reviewed.

## `web_search` packet parsing

For every targeted `web_search` response:

1. Treat `output_text.text.value` as candidate narrative, not a source.
2. Treat each `output_text.text.annotations[].url_citation.url` as a source candidate.
3. Use `start_index` / `end_index` to map nearby answer facts to cited URLs when valid.
4. If spans are missing, malformed, empty, or garbled, associate the citation with the closest topical paragraph and use `keyQuote: null`; never invent a quote.
5. Split the answer into atomic claims: one fact per claim.
6. Attach only cited URLs that support that specific fact.
7. Use `bing_searches[]` as query provenance for `sourceStrategy` / notes only; never retain Bing/search-result URLs in `sources[]`.

## Source rules

- Deduplicate by canonical URL and underlying event/date.
- Cluster press-release or wire-copy repeats as one event; do not count them as independent corroboration.
- Prefer fit-for-purpose sources: official pages, filings/regulators, tier-one news, analyst/market data, customer proof, technical docs, reviews, and disconfirming evidence.
- Label `sourceType`, `reputationTier`, and `independence` honestly.
- Use recent sources for current company status, funding, valuation, customers, metrics, product packaging, pricing, and regulatory posture; durable historical facts can be `freshness: historical`.

## Update invariants

- Do not delete any final source or claim referenced by downstream artifacts.
- Every new external fact needs a local `claims[]` entry before consolidation.
- Every local and final claim needs `sourceRefs` unless it is explicitly `open-question` with `corroboration: none`.
- Analysis skills update local `coverage.sourcesConsidered`; consolidation updates final `coverage.sourcesConsidered`, `coverage.sourcesRetained`, and `coverage.claimsCreated`.
- Record unsupported but important facts in `evidenceGaps` with impact and diligence path.

## Quality gates

- Every downstream chapter need has support or an explicit `evidenceGaps` entry.
- Every retained URL must satisfy `## Source provenance` above.
- No single publisher/domain family should exceed 34% of retained sources when enough alternatives exist.
- At least 15% of retained sources should be independent when the source universe supports it.
- At most 50% of retained sources may be uncited by any claim.

## `web_search` run-log line

Immediately after each `web_search` call, the calling skill must emit a single visible run-log line in the chat/workflow transcript. Never write this line into report artifacts.

```text
[web_search debug] skill=<skill-name> call=<n> query="<query>" citedUrls=<count> retainedSources=<count> outcome="<used|gap>"
```
