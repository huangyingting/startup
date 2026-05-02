---
name: startup-customer-retention
description: "Use when: generating 07-customer-retention.yaml. Keywords: customers, retention, NRR, churn, case studies, segmentation, satisfaction, concentration, web_search."
user-invocable: false
---

# Startup Customer and Retention

Use this skill after `00`–`06` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `06-product-technology.yaml`.

## Outputs

Write exactly:

- `07-customer-retention.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing customer, case-study, segmentation, retention, NRR, churn, expansion, satisfaction, review, concentration, or partner proof. Parse packets per `.github/references/evidence-ledger.md`, append new cited sources/claims to `01-evidence-ledger.yaml`, then cite those `claimRefs` in `07`.

If customer count, named customers, retention, churn, NRR, satisfaction, or customer concentration are not publicly supported, use `null` with exact diligence asks. Do not infer retention metrics without labeling estimates and confidence.

## Output focus

Structure this as an investor-grade customer and retention chapter:

- Customer base overview and segment map.
- Named customer proof, case studies, partner proof, and referenceability.
- Retention, churn, NRR, expansion, satisfaction, and usage signals.
- Customer concentration and cohort-quality risks.
- Customer diligence asks required before underwriting.

Expected table families unless unavailable with a documented gap: customer segmentation, named customer proof, case studies, retention/churn/satisfaction, expansion drivers, concentration risks, customer diligence asks.

## Figure rules

- Use `customer-surface-map` for acquisition surface, segments, and expansion loops.
- Use `bars` or `metric-bars` only with numeric values; otherwise use explanatory cards/nodes with gaps.
- Use canonical renderer fields only.

## Handoff note

After writing, record a concise internal summary: output path, customer quality, retention signal, figure count, table count, evidence gaps closed, evidence gaps remaining.
