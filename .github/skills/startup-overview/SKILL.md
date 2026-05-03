---
name: startup-overview
description: "Use when: generating 01-company-overview.yaml. Keywords: company identity, founders, HQ, funding, leadership, investors, overview, milestones, localEvidence."
user-invocable: false
---

# Startup Overview

## Role and ownership

Analysis artifact `01`. This skill owns the company introduction and snapshot chapter. It must make the company identity, scale, and milestone record legible for the full report. It does not own market sizing, financial underwriting, product deep dives, customer retention, risk scoring, or valuation.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `01-company-overview.yaml`

## Skill workflow

- Follow the common chapter workflow in `.github/references/analysis-rules.md`.
- Apply that workflow to this skill's mission, required content specification, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check.
- Write only `01-company-overview.yaml`; route facts owned by other chapters back through `startup-research`.

## Chapter mission

Answer: What is this company, what does it do, who controls it, how far along is it, what evidence anchors its current scale, and what should every later chapter treat as identity ground truth?

## Required content specification

Cover these universal topics:

- Company identity: legal/common name, website, headquarters, founding date/year, founding location, current stage, and category language used by the company and independent sources.
- Founders, leadership, board/governance, key executives, leadership changes, and relevant backgrounds.
- Product/service one-line definition, customer focus, business model, and value proposition.
- Funding status: priced rounds, valuation, total funding when supportable, investors, strategic partners, secondaries, tender events, debt/credit facilities, and conflicting reports.
- Cover metrics where supportable: valuation, total raised, revenue/run-rate/ARR, transaction volume, customer count, usage, headcount, locations/facilities, product units, approvals, or other company-specific KPIs.
- Milestones across founding, product launches, financing, customer/usage scale, regulatory/governance events, partnerships, facilities, leadership, and adverse events.
- Snapshot verdict: identity confidence, scale confidence, and key missing diligence paths.

## Required tables

- **Snapshot KPI table** — metric, value/status, date, evidence/source, confidence, benchmark/interpretation, diligence gap.
- **Leadership and founder table** — person, role, current/past status, background, evidence, diligence note.
- **Funding / governance chronology** — date, event, amount/valuation/status, participants, implication, evidence.
- **Stakeholder / investor map** — stakeholder, role, relationship, control/economic importance, evidence, diligence ask.
- **Milestone table** — at least 8 dated entries when public evidence supports them; include positive and adverse/governance milestones.

## Required figures

- **Company milestone timeline** — `type: timeline`; include dated milestone items with labels, details, tone, and claim refs.
- **Company snapshot logic** — `type: logic-chain` or `flow`; show how identity, product/service, customers, capital, dependencies, and risks connect.
- **Snapshot scorecard** — `type: scorecard` when cover-metric evidence quality, maturity, risk, traction, or investability can be summarized compactly.
- **Governance / stakeholder map** — `type: flow` or `matrix` when control, strategic partners, investors, regulators, facilities, or ecosystem dependencies are material.

## Evidence acquisition strategy

Use search for discovery and the `fetch-url` workflow for retained direct URLs.

- Official identity: homepage, about, leadership, newsroom, blog, investor, careers, product, trust, filings, and legal pages.
- Funding/valuation: company announcements, investor announcements, tier-one finance/tech reporting, filings, press releases, and credible databases only when directly reviewable.
- Leadership/governance: company pages, public bios only when necessary, board announcements, filings, official biographies, reputable reporting.
- Cover metrics: official claims first, independent corroboration for volatile numbers, and explicit source limits for private metrics.
- Adverse checks: duplicate identity, lawsuits, leadership churn, sanctions/regulatory issues, failed products, shutdowns, recalls, safety issues, layoffs, stale claims, and conflicting scale numbers.

## Domain-adaptive additions

Infer the company domain and operating model; add relevant snapshot rows/sections without forcing a fixed sector template.

- If the company needs approvals, licenses, certifications, permits, reimbursement, or government concessions, add approval/licensing status and regulator map.
- If it depends on scientific, clinical, or technical validation, add development stage, validation evidence, IP/patents, and maturity level.
- If it builds or sells physical products, add facilities, manufacturing partners, supply chain, capacity, certifications, units shipped, recalls, and warranty exposure.
- If it operates physical locations or assets, add location count, geography, utilization, ownership/lease model, and expansion status.
- If it is a marketplace or network, add supply-side scale, demand-side scale, liquidity indicators, take-rate surface, and platform governance.
- If it is project/infrastructure based, add project pipeline, contracted backlog, financing structure, permits, and commissioning milestones.
- If it is financial-risk bearing, add licenses, capital/funding partners, risk exposure, compliance posture, and counterparty dependencies.

## Quality bar

- Establish identity and scale ground truth that other chapters can safely reuse without guessing.
- Separate verified facts, company-claimed facts, conflicting reports, and unavailable private metrics.
- Make milestones decision-relevant: include financing, product, customer, regulatory, governance, and adverse events when supportable.
- Show why the selected domain-adaptive additions matter for underwriting, not just that they were considered.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Domain reflection is explicit: identify the company archetype(s), add supportable domain-specific snapshot fields beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Timeline has enough dated entries or the gaps explain why not.
- Unsupported cover metrics use `null` plus a concrete diligence path.
- Handoff includes identity confidence, selected domain-adaptive additions, and any post-snapshot identity ambiguity.
