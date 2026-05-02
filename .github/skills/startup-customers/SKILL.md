---
name: startup-customers
description: "Use when: generating 06-customer-retention.yaml. Keywords: customers, retention, NRR, churn, case studies, segmentation, satisfaction, concentration, web_search."
user-invocable: false
---

# Startup Customers

Use this skill after `01` and relevant product/commercial context exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, and relevant context from `04-financial-unit-economics.yaml` / `05-product-technology.yaml` when pricing, product modules, or implementation claims affect customer analysis.

## Outputs

Write exactly:

- `06-customer-retention.yaml`

## Dynamic evidence use

You may use `web_search` directly to perform research for missing customer, case-study, segmentation, retention, NRR, churn, expansion, satisfaction, review, concentration, or partner proof. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `06-customer-retention.yaml.localEvidence`, then cite those local `claimRefs` in `06`.

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
