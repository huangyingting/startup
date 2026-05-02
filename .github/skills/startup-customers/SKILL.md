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
- `06-customer-retention.zh.yaml` (Simplified Chinese sibling)

## Dynamic evidence use

Use targeted web research and direct page reads for missing customer, case-study, segmentation, retention, NRR, churn, expansion, satisfaction, review, concentration, or partner-proof facts. Register retained sources/claims in `06-customer-retention.yaml.localEvidence` and cite local `claimRefs` in `06`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Mine official customer pages, case studies, testimonials, partner stories, industry/solutions pages, webinars, press releases, marketplace announcements, and customer blog posts. Extract named customers, deployments, outcomes, verticals, personas, implementation details, expansion paths, and referenceability. Treat logos/testimonials as proof only when they support active deployment or a concrete use case; otherwise mark them weak and seek corroboration.

Treat `currentDate` as the freshness anchor for customer count, named customers, enterprise adoption, retention, churn, usage, satisfaction, and partner-proof claims. Use complete-sentence questions tied to the customer paragraph/table being written, for example: `Which named enterprise customers, customer counts, usage metrics, and retention signals are publicly reported for <companyName> as of <currentDate>?` Avoid keyword-only searches. Include at least one adverse query about churn, customer complaints, blocked deployments, concentration, or procurement/security objections.

Before writing `06`, ask multiple customer-specific questions covering customer count, named customers, case studies, segment mix, geography, usage, retention, churn, NRR, reviews, satisfaction, support, expansion, concentration, partner proof, and adverse evidence. Do not treat logos as retained customers without active-deployment or customer-proof support.

If customer count, named customers, retention, churn, NRR, satisfaction, or customer concentration are not publicly supported, use `null` with exact diligence asks. Do not infer retention metrics without labeling estimates and confidence.

## Output focus

Structure this as an investor-grade customer and retention chapter:

- Customer base overview and segment map.
- Detailed raw customer evidence retained in this artifact: named customer proof, case-study outcomes, segment notes, usage metrics, reviews, partner references, contradictory signals, retention gaps, and customer diligence asks.
- Customer growth trajectory across time when evidence supports it.
- Customer segmentation by enterprise/mid-market/SMB, geography, vertical, ACV/ARR band, or usage profile where supportable.
- Named customer proof, case studies, partner proof, use cases, outcomes, and referenceability.
- Retention, logo churn, gross retention, NRR, expansion, satisfaction, support quality, implementation time, reviews, and usage signals.
- Expansion drivers such as spend/usage growth, seat expansion, module adoption, pricing-tier upgrades, ecosystem adoption, or geography expansion.
- Customer concentration and cohort-quality risks.
- Customer diligence asks required before underwriting.

Expected table families unless unavailable with a documented gap: customer growth trajectory, customer segmentation, named customer proof, case studies, retention/churn/satisfaction, expansion drivers, concentration risks, customer diligence asks.

## Figure rules

- Use `customer-surface-map` for acquisition surface, segments, and expansion loops.
- Use `bars` or `metric-bars` only with numeric values; otherwise use explanatory cards/nodes with gaps.
- If using `matrix` (e.g. customer proof by outcome specificity), `data.columns[]` lists X-axis labels and `row.label` is the customer / Y-axis name. **`row.values.length` must equal `data.columns.length`**; do not declare a `Named customer` first column — the customer name lives in `row.label`.
- Use canonical renderer fields only.

## Simplified Chinese sibling

Immediately after writing `06-customer-retention.yaml`, write `06-customer-retention.zh.yaml` as its full Simplified Chinese translation, following `.github/references/zh-translation.md`. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field including `chapter.title`, `chapter.summary`, callouts, sections, table cells, figure node detail, and notes. Do not move on to the next skill until both English and Chinese files exist and pass the residual-English sweep and structural-parity checks.

## Handoff note

After writing, record a concise internal summary: output path, customer quality, retention signal, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
