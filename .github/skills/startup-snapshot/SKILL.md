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

## Handoff note

After writing, record a concise internal summary: output paths, source count, claim count, identity confidence, duplicate-check readiness, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
