---
name: startup-customers
description: "Use when: generating 06-customer-retention.yaml and 06-customer-retention.zh.yaml. Keywords: customers, retention, NRR, churn, case studies, segmentation, satisfaction, concentration."
user-invocable: false
---

# Startup Customers

Sixth analysis stage. Assess customer quality, retention evidence, expansion, and concentration risk.

## Read first

- `01-company-snapshot.yaml`
- `04-financial-unit-economics.yaml` and `05-product-technology.yaml` when pricing, modules, or implementation claims affect customer analysis.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `06-customer-retention.yaml`
- `06-customer-retention.zh.yaml`

## Focus

- Customer base overview and segment map.
- Customer growth trajectory when supported.
- Segmentation by enterprise/mid-market/SMB, geography, vertical, ACV/ARR band, or usage profile.
- Named customer proof, case studies, use cases, outcomes, referenceability.
- Retention, churn, GRR, NRR, expansion, satisfaction, support quality, implementation time, reviews, and usage signals.
- Concentration, cohort-quality risks, and customer diligence asks.

## Evidence targets

- Official customer pages, case studies, testimonials, partner stories, industry/solution pages, webinars, press releases, marketplaces, and customer blog posts.
- Separate customer-count claims, named deployments, case-study outcomes, partner/channel proof, usage signals, review evidence, and adverse customer evidence.
- Logos alone are weak unless they support active deployment or a concrete use case.

## Section evidence acquisition

Use `web_search` to discover customer proof and adverse signals; use `fetch-url` to verify original customer, partner, review, or news pages.

- Base/growth: customer counts, logos, milestones, usage counts, growth claims.
- Segmentation: verticals, size bands, geography, ACV/ARR bands, deployment types, personas.
- Named proof: case studies, customer blogs, press releases, webinars, partner announcements.
- Retention/satisfaction: NRR, GRR, churn, renewals, expansion, support, reviews, complaints.
- Expansion/concentration: seat/module expansion, large-account exposure, channel dependence, procurement/security objections.
- Customer-risk asks: churn, blocked deployments, outage reactions, contract/security objections.

## Required tables and figures

- Customer growth trajectory or explicit gap table.
- Customer segmentation.
- Named customer proof / case studies.
- Retention, churn, NRR, satisfaction, or explicit metric-gap table.
- Expansion drivers and concentration risks.
- Preferred figure: `customer-surface-map`; use numeric bars only with numeric values. Matrix rows use `row.label`; do not add a fake “Named customer” first column.

## Completion check

- Include adverse searches for churn, complaints, blocked deployments, concentration, or procurement/security objections.
- Unsupported customer count, retention, churn, NRR, satisfaction, or concentration becomes `null` plus exact diligence asks.
- Handoff includes customer quality and retention signal.
