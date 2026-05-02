---
name: startup-product
description: "Use when: generating 05-product-technology.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, official website, sitemap, docs, web_search."
user-invocable: false
---

# Startup Product

Run after `01` parses. Read `01-company-snapshot.yaml` for identity; read `02-market-macro.yaml` / `03-competitive-benchmarking.yaml` only when positioning, buyer needs, or competitor features affect product analysis; read `04-financial-unit-economics.yaml` only when pricing/monetization context is needed. Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `05-product-technology.yaml`
- `05-product-technology.zh.yaml`

## Chapter focus

- Product platform overview and module map.
- Module-by-module facts, release chronology, feature availability.
- Core product modules by functional area (cards/payments, expense, AP, procurement, travel, treasury, analytics, workflow, infrastructure, developer/API, or company-specific modules).
- AI/automation capabilities and technical differentiation (agentic automation, anomaly/fraud detection, recommendations, policy automation, forecasting, copilot workflows where relevant).
- Architecture, integrations, APIs, data model, implementation/onboarding model, real-time processing, reliability, scalability evidence.
- Roadmap and packaging implications.
- Security, privacy, compliance, reliability, certifications, regulated-industry readiness, technical diligence asks.

## Expected table families

Product module matrix, AI/automation capability map, product roadmap, integration matrix, security/compliance matrix, architecture/infrastructure evidence, implementation/onboarding model, technical diligence asks.

## Source mix (official-site mining is mandatory)

Start from the company's website when `company.website` or `companyUrl` is available. Inspect homepage, `robots.txt`, `sitemap.xml`, product pages, docs/developer portals, API references, changelog/release notes, pricing/packaging, trust/security, status, integrations, customer/solutions, and product blog/news. Use sitemap and navigation before search snippets. Treat official-site pages as the first pass for current product scope, packaging, feature availability, docs, integrations, security claims, and release chronology.

Use external sources for corroboration, adverse evidence, benchmarks/reviews, customer implementation proof, or gap-filling — not as a substitute for reading the company's own product surface. Retain official URLs as local evidence; capture `keyQuote` snippets when available.

For a well-covered company, retain chapter-specific official sources across product, docs/API, pricing/packaging, changelog/release notes, trust/security/privacy, status/reliability, integrations/partners, and customer/developer proof. Add independent evidence for benchmarks, outages, security incidents, adoption, or commoditization risk.

## Domain-specific query angles

- Include at least one adverse query about outages, safety regressions, security gaps, roadmap delays, or technical commoditization.
- Do not infer architecture from marketing; record unsupported architecture, integrations, or certifications as gaps.
- Each module/capability row indicates availability status, evidence URL, buyer/user, differentiation, and diligence gap.

## Preferred figure types

- `architecture-stack` with `data.layers[]` entries containing `label`, `detail`, optional `tone`, optional `modules[]`, optional `outputs[]`.
- `flow` only for generic product or data flows.

## Handoff extras

Add `product verdict`, `technical moat`, and the list of official-site page families reviewed (homepage, sitemap, docs, product, pricing, changelog, trust/security, status, integrations, blog/news) plus any expected family that was missing. The list of pages reviewed lives in the handoff log only — do not put it in the artifact YAML. If a missing official page family is itself a diligence concern, log it under `evidenceGaps`.
