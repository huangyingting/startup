---
name: startup-customers
description: "Use when: generating 06-customer-retention.yaml and 06-customer-retention.zh.yaml. Keywords: customers, retention, NRR, churn, case studies, segmentation, satisfaction, concentration."
user-invocable: false
---

# Startup Customers

Sixth analysis stage. This skill owns the customer quality and retention chapter. It must distinguish customer adoption signal from durable customer proof.

## Read first

- `01-company-snapshot.yaml`
- `04-financial-unit-economics.yaml` and `05-product-technology.yaml` when pricing, modules, or implementation claims affect customer analysis.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `06-customer-retention.yaml`
- `06-customer-retention.zh.yaml`

## Chapter purpose

Answer: Who uses or pays for the company’s product/service, what proof shows real adoption, how durable is usage/revenue, what expands, and where are customer concentration or retention risks hidden?

## Required chapter content

Cover these universal topics:

- Customer base overview and segmentation by buyer/user/payer, geography, vertical, size, channel, use case, ACV/revenue band, or deployment type.
- Customer growth, active usage, repeat purchase, deployment, account, transaction, location, patient/provider, supplier/buyer, or utilization trajectory where supportable.
- Named customer proof: active use, case studies, outcomes, reference quality, evidence freshness, and whether logos are merely promotional.
- Retention and durability: NRR/GRR/churn, renewal, repeat purchase, cohort retention, frequency, utilization, expansion, satisfaction, complaints, reviews, support, or explicit gaps.
- Expansion and concentration: land-and-expand paths, cross-sell, geographic/segment expansion, top-customer risk, channel/partner dependence, procurement or implementation friction.
- Customer verdict and exact customer diligence asks.

## Required tables

- **Customer segmentation table** — segment, buyer/user/payer, use case, scale, revenue/strategic value, evidence, gap.
- **Customer growth / adoption trajectory table** — metric, value, date, source, confidence, implication, missing denominator.
- **Named customer proof table** — customer, segment, deployment/use case, outcome, evidence quality, limitation.
- **Retention / repeat usage / satisfaction table** — metric, value/null, segment, evidence, confidence, diligence ask.
- **Expansion and concentration risk table** — expansion driver, evidence, concentration risk, impact, diligence path.

## Required figures

- **Customer journey map** — `type: journey-map`; show customer segments, adoption surfaces, and expansion loops.
- **Adoption / deployment funnel** — `type: flow`; show discovery-to-purchase-to-deployment-to-expansion path when relevant.
- **Customer growth / usage / retention chart** — `type: bars` or `scatter`; numeric values only and source-backed.
- **Customer proof matrix** — `type: matrix`; compare evidence quality, outcome specificity, retention visibility, or production maturity.

## Evidence collection strategy

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

## Completion check

- Include adverse searches for churn, complaints, blocked deployments, concentration, failed pilots, reviews, or procurement objections.
- Unsupported customer count, retention, churn, NRR, satisfaction, repeat purchase, or concentration becomes `null` plus exact diligence asks.
- Logos alone do not prove retention or production deployment.
- Handoff includes customer quality, retention signal, concentration risk, and selected domain-adaptive additions.
