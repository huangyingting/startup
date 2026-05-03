---
name: startup-customers
description: "Use when: generating 06-customers.yaml. Keywords: customers, retention, NRR, churn, case studies, segmentation, satisfaction, concentration."
user-invocable: false
---

# Startup Customers

## Role and ownership

Analysis artifact `06`. This skill owns the customer quality and retention chapter. It must distinguish customer adoption signals from durable customer proof, retention, expansion, and concentration risk. It does not own product architecture, pricing mechanics, or final valuation stance.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Optional coordination context:

- `04-financials.yaml` and `05-product-tech.yaml`, when already available, for pricing, module, or implementation context; do not block customer analysis on these artifacts.

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `06-customers.yaml`

## Skill workflow

- Follow the common chapter workflow in `.github/references/analysis-rules.md`.
- Apply that workflow to this skill's mission, required content specification, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check.
- Use optional coordination context only when already available; never block this chapter on peer artifacts.
- Write only `06-customers.yaml`; route facts owned by other chapters back through `startup-research`.

## Chapter mission

Answer: Who uses or pays for the company’s product/service, what proof shows real adoption, how durable is usage/revenue, what expands, and where are customer concentration or retention risks hidden?

## Required content specification

Cover these universal topics:

- Customer base overview and segmentation by buyer/user/payer, geography, vertical, size, channel, use case, ACV/revenue band, or deployment type.
- Customer growth, active usage, repeat purchase, deployment, account, transaction, location, patient/provider, supplier/buyer, or utilization trajectory where supportable.
- Named customer proof: active use, case studies, outcomes, reference quality, evidence freshness, and whether logos are merely promotional.
- Retention and durability: NRR/GRR/churn, renewal, contract duration, termination rights when public, repeat purchase, cohort retention, frequency, utilization, expansion, satisfaction, complaints, reviews, support, or explicit gaps.
- Expansion and concentration: land-and-expand paths, cross-sell, geographic/segment expansion, top-customer risk, channel/partner dependence, procurement or implementation friction.
- Customer verdict and exact customer diligence asks.

## Required tables

- **Customer segmentation table** — segment, buyer/user/payer, use case, scale, revenue/strategic value, evidence, gap.
- **Customer growth / adoption trajectory table** — metric, value, date, source, confidence, implication, missing denominator.
- **Named customer proof table** — customer, segment, deployment/use case, production vs pilot status, outcome, evidence quality, limitation.
- **Retention / repeat usage / satisfaction table** — metric, value/null, segment, evidence, confidence, diligence ask.
- **Contract / renewal quality table** — segment/customer type, contract term or renewal signal, expansion surface, termination/procurement friction, evidence, diligence ask.
- **Expansion and concentration risk table** — expansion driver, evidence, concentration risk, impact, diligence path.

## Required figures

- **Customer journey map** — `type: journey-map`; show customer segments, adoption surfaces, and expansion loops.
- **Adoption / deployment funnel** — `type: funnel` or `flow`; show discovery-to-purchase-to-deployment-to-expansion path when relevant.
- **Customer growth / usage / retention chart** — `type: bars` or `scatter` when source-backed numeric values exist; otherwise use a customer-proof `matrix`/`journey-map`/`flow` and record the missing denominator or retention input.
- **Retention / repeat cohort** — `type: cohort` when renewal, repeat usage, NRR/GRR, repeat purchase, or churn cohorts are available.
- **Customer proof matrix** — `type: matrix`; compare evidence quality, outcome specificity, retention visibility, or production maturity.

## Evidence acquisition strategy

Use search to discover customer proof/adverse signals and `fetch-url` to verify retained source pages.

- Official customer evidence: customer pages, case studies, testimonials, webinars, press releases, partner stories, industry/solution pages, customer blogs, marketplaces, and logos only when tied to use.
- Independent customer evidence: procurement/tender records, reviews, app-marketplace ratings, community/forum reports, public customer announcements, filings, usage datasets, analyst reports, and media.
- Adverse customer evidence: churn/complaints, poor reviews, failed deployments, outages affecting customers, procurement blockers, safety/quality incidents, refund/return issues, lawsuits, concentration warnings.
- Separate broad customer-count claims from named deployments and from retention proof.

## Domain-adaptive additions

Infer the customer relationship and retention mechanism.

- If enterprise/government sales drive adoption, add ACV/contract size, sales cycle, implementation time, renewal, expansion, procurement/security blockers, and referenceability.
- If consumer demand drives adoption, add repeat purchase, purchase frequency, reviews, cohort retention, channel CAC, community/brand engagement, and returns/refunds.
- If marketplace/network effects matter, add buyer frequency, supplier retention, liquidity, fill rate, multi-homing, disintermediation, and trust/safety outcomes.
- If healthcare or life-science users matter, add provider adoption, patient outcomes, payer/reimbursement evidence, clinical workflow fit, and safety/complaints.
- If hardware/industrial deployment matters, add pilots converted to production, units deployed, uptime, maintenance, field failures, replacement cycles, and service burden.
- If physical locations/assets matter, add location-level performance, utilization, same-site/store metrics, occupancy, seasonality, and geography maturity.
- If project/service delivery matters, add backlog, repeat contracts, customer references, delivery quality, SLA, utilization, and renewal/rebid behavior.

## Quality bar

- Distinguish customer logos, named deployments, active use, outcomes, retention, and expansion; do not treat them as interchangeable proof.
- Tie customer evidence to buyer/user/payer segments and the revenue or strategic value of each segment.
- Surface churn, complaints, failed deployments, concentration, weak references, or procurement friction when evidence exists.
- Convert unsupported retention, NRR/GRR, customer count, satisfaction, or concentration claims into explicit diligence gaps.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Domain reflection is explicit: identify the customer/adoption archetype(s), add supportable domain-specific retention or customer-quality tables/figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Include adverse searches for churn, complaints, blocked deployments, concentration, failed pilots, reviews, or procurement objections.
- Unsupported customer count, retention, churn, NRR, satisfaction, repeat purchase, or concentration becomes `null` plus exact diligence asks.
- Logos alone do not prove retention or production deployment.
- Handoff includes customer quality, retention signal, concentration risk, and selected domain-adaptive additions.
