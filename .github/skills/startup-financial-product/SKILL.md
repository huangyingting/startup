---
name: startup-financial-product
description: "Use when: generating 05-financial-unit-economics.yaml, 06-product-technology.yaml, and 07-customer-retention.yaml. Keywords: revenue, unit economics, product, technology, customers, retention, web_search."
user-invocable: false
---

# Startup Financial, Product, and Customer Analysis

Use this skill after `00`–`04` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `04-competitive-benchmarking.yaml`.

## Outputs

Write exactly:

- `05-financial-unit-economics.yaml`
- `06-product-technology.yaml`
- `07-customer-retention.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing financial, product, customer, retention, security, or compliance facts. Parse response packets per the shared ledger rules in [`startup-foundation/SKILL.md`](../startup-foundation/SKILL.md), append new cited sources/claims to `01-evidence-ledger.yaml`, then cite those `claimRefs` in `05`/`06`/`07`.

If revenue, gross margin, CAC, LTV, retention, churn, NRR, customer counts, or customer concentration are not publicly supported, use `null` with exact diligence asks. Do not infer metrics without labeling estimates and confidence.

## Output focus

Structure as investor-grade diligence chapters:

- Revenue model overview and revenue stream table.
- Pricing/packaging, unit economics, CAC, LTV, LTV/CAC, payback, margin trajectory.
- Financial projection scenarios only when defensible; otherwise use gaps.
- Product platform overview, modules, AI/automation, roadmap, architecture, integrations, security/compliance posture, implementation/onboarding model.
- Customer base, segmentation, named customer case studies, retention, churn, satisfaction, expansion drivers, concentration.
- Structured figures for revenue mix, unit-economics waterfall, platform architecture, customer growth, customer-surface expansion where supported.

Expected table families unless unavailable with a documented gap: revenue streams, pricing/packaging, CAC/LTV/payback, margin or cost-driver bridge, projection/scenario model, product module matrix, integration/security matrix, customer segmentation, named customer proof, retention/churn/satisfaction, expansion drivers.

## Figure rules

- Use `unit-economics-waterfall` for public-data-constrained economics bridges.
- Use `architecture-stack` for platform architecture with `data.layers[]` entries containing `label`, `detail`, optional `tone`, optional `modules[]`.
- Use `customer-surface-map` for customer-surface expansion.
- Preserve unknown metrics as explanatory cards rather than empty arrays.
- Use canonical renderer fields only; do not use `name`, `components`, `children`, `steps`, `cards`, or `groups` as primary fields.

## Handoff note

After writing, record a concise internal summary: output paths, revenue quality, product verdict, retention signal, figure count, table count, evidence gaps closed, evidence gaps remaining.