---
name: startup-snapshot
description: "Use when: generating 01-company-snapshot.yaml with local evidence. Keywords: company identity, founders, HQ, funding, leadership, investors, snapshot, localEvidence, web_search."
user-invocable: false
---

# Startup Snapshot

Use this skill as the first report artifact stage after `reportFolder` exists. Read `schemaPath`, `yamlSyntaxPath`, company name, optional company URL, `runTimestamp`, `reportFolder`, and the evidence rules in `.github/references/evidence-ledger.md`.

## Outputs

Write exactly:

- `01-company-snapshot.yaml`
- `01-company-snapshot.zh.yaml` (Simplified Chinese sibling)

## Responsibility

Create the company snapshot and its local evidence. This skill does not write `100-evidence-ledger.yaml`; `startup-ledger` consolidates all local evidence into the final ledger after `01`–`08` exist.

## Dynamic evidence use

Use targeted web research and direct page reads for identity and snapshot facts: website, founding, founders, HQ, product summary, funding, valuation, stage, leadership, investors, customers, headcount, and current status. Register retained sources/claims in `01-company-snapshot.yaml.localEvidence` and cite local `claimRefs` in `01`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Mine official about, leadership, newsroom, funding, investor/partner, careers, contact, and product pages for self-description, footprint, financing milestones, and positioning. Label official claims as `company-claimed` or `observed`; corroborate financing, valuation, headcount, and customer scale independently when possible.

Treat `currentDate` as the freshness anchor for volatile snapshot facts. Use complete-sentence questions that include latest/current wording and the as-of date, for example: `What is the latest funding round and valuation for <companyName> as of <currentDate>, and did it supersede any previously reported round?` Avoid keyword-only searches. Include at least one adverse/current-status query.

Before writing `01`, ask multiple snapshot-specific questions covering identity, leadership, HQ, latest financing, valuation, investors, headcount, customers, and product status. If a query returns stale or thin results, rewrite it from another angle (for example `latest funding round` → `most recent financing round and post-money valuation`) before declaring a gap. Every snapshot table row needs support or an explicit gap.

## `01-company-snapshot.yaml`

Create an investor-grade company snapshot with:

- `startupIntroduction` for final report reuse.
- Identity facts, founding, founders, headquarters, website, product summary, business model, stage, funding status.
- Detailed raw diligence material retained in this artifact: leadership timeline, financing chronology, investor base, current operating scale signals, conflicting public reports, and explicit notes on which current metrics remain unsupported.
- Cover metrics where supported: valuation, total funding, revenue/run-rate or ARR, transaction/payment volume, customer count, headcount, and other company-specific KPIs.
- Key performance indicator table with value, growth signal, benchmark, confidence, and diligence gap for unsupported values.
- Leadership, management-team backgrounds, investor base, board/investor roles, timeline, investment highlights, key risks summary, and open identity questions.
- Company-level graphical abstract inputs for the final report: business description, major thesis pillars, core revenue vectors, exit/IPO path if relevant, and top risk nodes.
- Local `claimRefs` for every external factual block, table, and figure.

## Milestone timeline (F102) coverage

The financing-and-scale timeline figure must be substantive, not a 3-bullet skeleton. Before writing it, run dedicated milestone-discovery searches and aim to capture at least one entry per category whenever a public source supports it:

- Founding and incorporation (year, founders, place, original mission).
- Every named priced funding round in chronological order: seed, Series A/B/C/D/E/F/G..., bridge, secondary, strategic. For each: date (`YYYY-MM` if known), round name, amount raised, post-money valuation, lead investors. If the lifetime round count is N, the timeline should reference at least the rounds that materially changed valuation or capitalization (typically every priced round, plus any secondary or strategic that crossed valuation thresholds).
- Major product or platform launches: first GA of the flagship product, model/version generations, spin-off products, API releases, regulated-industry editions.
- Operating-scale milestones once disclosed: first revenue disclosure, first $X run-rate revenue, first $1M / $10M / $100M / $1B / $10B run-rate or ARR step, customer-count milestones (e.g. 10K, 100K, 1M, first Fortune 100 customer).
- Strategic compute / partner / customer milestones: hyperscaler partnerships, capacity commitments, exclusive deals, marketplace launches, government or sovereign deals.
- Material legal, regulatory, governance, or safety milestones: PBC conversion, board-level changes, settlement or ruling, voluntary safety commitments, frontier-AI compliance frameworks.
- Headcount milestones if reported (1st 100 / 500 / 1,000 / 5,000 employees).
- Most recent confirmed event close to `currentDate` (the timeline must extend to within ~3 months of `currentDate`; large gaps from the latest event to `currentDate` are themselves a diligence gap to flag).

Run a dedicated milestone-discovery query batch before writing F102, e.g.:

- `<companyName> funding history list of rounds Series A through latest`
- `<companyName> all priced rounds dates valuations Crunchbase | PitchBook coverage`
- `<companyName> product launch history flagship model versions <currentYear-3>..<currentYear>`
- `<companyName> revenue milestones first $1M $10M $100M $1B $10B disclosed`
- `<companyName> hyperscaler / cloud / compute partnership history`
- `<companyName> headcount milestones <currentYear-3>..<currentYear>`
- `<companyName> regulatory or governance milestones <currentYear-3>..<currentYear>`

If the timeline has fewer than 8 entries or skips more than 18 months between consecutive events when public sources support an intermediate event, treat it as incomplete: rerun targeted searches until the gap closes or document the unfilled gap explicitly in `evidenceGaps` with the specific missing milestone(s) and follow-up diligence path.

## Simplified Chinese sibling

Immediately after writing `01-company-snapshot.yaml`, write `01-company-snapshot.zh.yaml` as its full Simplified Chinese translation, following `.github/references/zh-translation.md`. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field including `chapter.title`, `chapter.summary`, callouts, sections, table cells, figure node detail, and notes. Do not move on to the next skill until both English and Chinese files exist and pass the residual-English sweep and structural-parity checks.

## Handoff note

After writing, record a concise internal summary: output paths, source count, claim count, identity confidence, duplicate-check readiness, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
