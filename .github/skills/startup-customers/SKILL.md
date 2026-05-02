---
name: startup-customers
description: "Use when: generating 06-customer-retention.yaml. Keywords: customers, retention, NRR, churn, case studies, segmentation, satisfaction, concentration, web_search."
user-invocable: false
---

# Startup Customers

Run after `01` and the relevant product/commercial context parse. Read `01-company-snapshot.yaml` for identity; read `04-financial-unit-economics.yaml` / `05-product-technology.yaml` only when pricing, modules, or implementation claims affect customer analysis. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `06-customer-retention.yaml`
- `06-customer-retention.zh.yaml`

## Chapter focus

- Customer base overview and segment map.
- Customer growth trajectory across time when evidence supports it.
- Customer segmentation by enterprise/mid-market/SMB, geography, vertical, ACV/ARR band, or usage profile where supportable.
- Named customer proof, case studies, partner proof, use cases, outcomes, referenceability.
- Retention, logo churn, gross retention, NRR, expansion, satisfaction, support quality, implementation time, reviews, usage signals.
- Expansion drivers (spend/usage growth, seat expansion, module adoption, pricing-tier upgrades, ecosystem adoption, geography expansion).
- Customer concentration and cohort-quality risks.
- Customer diligence asks required before underwriting.

## Expected table families

Customer growth trajectory, customer segmentation, named customer proof, case studies, retention/churn/satisfaction, expansion drivers, concentration risks, customer diligence asks.

## Source mix

Separate customer-count claims, named customer deployments, case-study outcomes, partner/channel proof, usage signals, review/satisfaction evidence, and adverse customer evidence. Logos alone are weak evidence; look for active deployment language, dated case studies, measurable outcomes, renewal/expansion signals, or independent customer statements.

## Domain-specific query angles

- Mine official customer pages, case studies, testimonials, partner stories, industry/solutions pages, webinars, press releases, marketplace announcements, and customer blog posts.
- Treat logos/testimonials as proof only when they support active deployment or a concrete use case; otherwise mark them weak and seek corroboration.
- Include at least one adverse query about churn, customer complaints, blocked deployments, concentration, or procurement/security objections.
- If customer count, named customers, retention, churn, NRR, satisfaction, or concentration are not publicly supported, write `null` plus exact diligence asks (cohort retention, logo churn, NRR/GRR, expansion by product, top-customer concentration, implementation duration, support metrics, reference calls). Do not infer retention metrics without labeling estimates and confidence.

## Preferred figure types

- `customer-surface-map` for acquisition surface, segments, and expansion loops.
- `bars` / `metric-bars` only with numeric values; otherwise use explanatory cards/nodes with gaps.
- `matrix` follows the conventions reference: `data.columns[]` is the X-axis, `row.label` is the customer / Y-axis identity, `row.values.length === data.columns.length`. Do not introduce a `Named customer` first column.

## Handoff extras

Add `customer quality` and `retention signal` to the standard handoff fields.
