---
name: startup-product
description: "Use when: generating 05-product-technology.yaml and 05-product-technology.zh.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, docs, sitemap."
user-invocable: false
---

# Startup Product

Fifth analysis stage. Map product, technology, integrations, roadmap, and technical risk.

## Read first

- `01-company-snapshot.yaml`
- `02-market-macro.yaml`, `03-competitive-benchmarking.yaml`, or `04-financial-unit-economics.yaml` only when positioning, feature, pricing, or monetization context matters.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `05-product-technology.yaml`
- `05-product-technology.zh.yaml`

## Focus

- Platform overview, module map, release chronology, feature availability.
- Company-specific product modules, AI/automation, architecture, integrations, APIs, data model, onboarding, reliability, scalability.
- Roadmap and packaging implications.
- Security, privacy, compliance, certifications, regulated-industry readiness, technical diligence asks.

## Evidence targets

- Official-site mining is mandatory when `company.website` or `companyUrl` exists.
- Inspect homepage, robots.txt, sitemap, product pages, docs/developer portals, API references, changelog/release notes, pricing, trust/security, status, integrations, customer/solutions, and product blog/news.
- Use external sources for corroboration, adverse evidence, benchmarks, reviews, implementation proof, outages, security incidents, or commoditization risk.

## Required tables and figures

- Product module matrix.
- AI/automation capability map.
- Roadmap or release chronology.
- Integration/API matrix.
- Security/compliance matrix.
- Architecture/infrastructure or implementation/onboarding table.
- Preferred figure: `architecture-stack` with labeled layers; use `flow` for product/data flows.

## Completion check

- Do not infer architecture from marketing copy; unsupported architecture, certifications, or integrations become gaps.
- Each module row states availability, evidence URL, buyer/user, differentiation, and diligence gap.
- Handoff includes product verdict, technical moat, official page families reviewed, and expected families missing.
