---
name: startup-snapshot
description: "Use when: generating 01-company-snapshot.yaml with local evidence. Keywords: company identity, founders, HQ, funding, leadership, investors, snapshot, localEvidence, web_search."
user-invocable: false
---

# Startup Snapshot

First analysis stage. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `01-company-snapshot.yaml`
- `01-company-snapshot.zh.yaml`

## Chapter focus

Build the company-identity record reused by every downstream chapter:

- `startupIntroduction` block (founding, founders, HQ, business model, stage, funding status, customer focus, product summary).
- Identity facts: website, founding date and place, founders, leadership, board, investors.
- Cover metrics where supported: valuation, total funding, revenue/run-rate or ARR, transaction/payment volume, customer count, headcount, other company-specific KPIs.
- Leadership and investor base with backgrounds and board/investor roles.
- Financing chronology and investor syndicate.
- Current operating-scale signals and conflicting public reports.
- Company-level graphical-abstract inputs for the final report: thesis pillars, core revenue vectors, exit/IPO path, top risk nodes.

## Expected table families

Snapshot KPIs (value / growth signal / benchmark / confidence / diligence gap), leadership timeline, investor/funding chronology, plus any company-specific KPI table evidence supports.

## Source mix

Official about/leadership/newsroom/funding/investor/careers pages, tier-one financing or valuation coverage, leadership/founder material, customer or operating-scale evidence, investor or partner evidence, adverse or current-status reporting.

## Milestone timeline (F102)

The financing-and-scale timeline must be substantive, not a 3-bullet skeleton. Aim for at least one entry per category whenever a public source supports it:

- Founding and incorporation (year, founders, place, original mission).
- Every named priced round in chronological order (seed, Series A/B/.../latest, bridge, secondary, strategic) with date (`YYYY-MM`), amount raised, post-money valuation, lead investors. Include every round that materially changed valuation or capitalization.
- Major product or platform launches (flagship GA, model/version generations, spin-off products, API releases, regulated-industry editions).
- Operating-scale milestones once disclosed (first revenue, $1M / $10M / $100M / $1B / $10B run-rate or ARR steps, customer-count milestones).
- Strategic compute / partner / customer milestones (hyperscaler partnerships, capacity commitments, marketplace launches, government or sovereign deals).
- Material legal, regulatory, governance, or safety milestones (PBC conversion, board changes, settlements/rulings, voluntary safety commitments, compliance frameworks).
- Headcount milestones if reported (1st 100 / 500 / 1,000 / 5,000 employees).
- Most recent confirmed event close to `currentDate`. The timeline must extend to within ~3 months of `currentDate`; a larger gap is itself a diligence gap.

Run a dedicated milestone-discovery query batch before writing F102, e.g.:

- `<companyName> funding history list of rounds Series A through latest`
- `<companyName> all priced rounds dates valuations Crunchbase | PitchBook coverage`
- `<companyName> product launch history flagship model versions <currentYear-3>..<currentYear>`
- `<companyName> revenue milestones first $1M $10M $100M $1B $10B disclosed`
- `<companyName> hyperscaler / cloud / compute partnership history`
- `<companyName> headcount milestones <currentYear-3>..<currentYear>`
- `<companyName> regulatory or governance milestones <currentYear-3>..<currentYear>`

If the timeline has fewer than 8 entries or skips more than 18 months between consecutive events when public sources support an intermediate event, rerun targeted searches or document the unfilled milestone(s) in `evidenceGaps` with a follow-up diligence path.

## Handoff extras

Add `identity confidence` and `duplicate-check readiness` to the standard handoff fields.
