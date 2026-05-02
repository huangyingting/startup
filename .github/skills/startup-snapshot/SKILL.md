---
name: startup-snapshot
description: "Use when: generating 01-company-snapshot.yaml and 01-company-snapshot.zh.yaml. Keywords: company identity, founders, HQ, funding, leadership, investors, snapshot, milestones, localEvidence."
user-invocable: false
---

# Startup Snapshot

First analysis stage. Build the company identity record reused by every downstream chapter.

## Read first

- `schemaPath`
- `yamlSyntaxPath`
- `.github/references/analysis-skill-conventions.md`
- `.github/references/evidence-ledger.md`

## Outputs

- `01-company-snapshot.yaml`
- `01-company-snapshot.zh.yaml`

## Focus

- `startupIntroduction`: founding, founders, HQ, business model, stage, funding status, customer focus, product summary.
- Identity facts: website, founding date/place, founders, leadership, board, investors.
- Cover metrics where supported: valuation, total funding, revenue/run-rate or ARR, transaction volume, customer count, headcount, and company-specific KPIs.
- Leadership/investor background, board roles, financing chronology, current operating-scale signals, and conflicting public reports.
- Inputs for final graphical abstract: thesis pillars, revenue vectors, exit path, top risk nodes.

## Evidence targets

- Official about, leadership, newsroom, funding, investor, careers, product, and trust pages.
- Tier-one financing/valuation coverage, leadership/founder sources, investor/partner proof, customer/scale signals, adverse/current-status reporting.

## Section evidence acquisition

Use `web_search` to discover candidates, conflicts, and current status; use `fetch-url` to review every retained direct URL.

- Identity: official homepage/about, founding, HQ, website, founders.
- Leadership/governance: board, executives, trustees, founder backgrounds, departures.
- Funding/valuation: latest priced rounds, valuation, lead investors, secondaries, conflicting reports.
- Cover metrics: revenue/run-rate, ARR, customers, headcount, usage, partner-scale signals.
- Milestones: dated founding, rounds, product launches, operating scale, partnerships, legal/governance/headcount events.
- Adverse checks: duplicate identity, controversies, leadership churn, stale or contradictory scale claims.

## Required tables and figures

- Snapshot KPI table with value, growth signal, benchmark, confidence, and diligence gap.
- Leadership/founder table.
- Investor/funding chronology.
- Milestone timeline figure/table with at least 8 substantive entries when public sources support them.
- At least one company-specific KPI or operating-scale table if evidence supports it.

## Milestone timeline requirements

Include dated entries across founding, priced rounds, product/platform launches, operating-scale milestones, strategic partnerships, legal/regulatory/governance milestones, and headcount milestones when supported. The timeline should extend to within roughly 3 months of `currentDate`; otherwise record a freshness gap.

Before writing F102, run targeted queries for funding history, priced rounds, product launches, revenue milestones, cloud/compute/partner milestones, headcount, and regulatory/governance events. If fewer than 8 entries remain supportable, document the exact missing milestone paths in `evidenceGaps`.

## Completion check

- Both English and Simplified Chinese files parse and share `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every `claimRefs` resolves to local evidence before consolidation.
- Handoff includes identity confidence and duplicate-check readiness.
- After writing English `01`, run `node scripts/check-company-dedup.mjs <reportFolder>/01-company-snapshot.yaml`.
