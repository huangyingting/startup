---
name: startup-product
description: "Use when: generating 05-product-technology.yaml and 05-product-technology.zh.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, docs, sitemap."
user-invocable: false
---

# Startup Product

Fifth analysis stage. This skill owns the product and technology chapter. It must explain what the company delivers, how it works, how mature it is, and what product/technical evidence supports or weakens the moat.

## Read first

- `01-company-snapshot.yaml`
- `02-market-macro.yaml`, `03-competitive-benchmarking.yaml`, or `04-financial-unit-economics.yaml` only when positioning, feature, pricing, or monetization context matters.
- `.github/references/analysis-skill-conventions.md`
- `.github/references/zh-translation.md`

## Outputs

- `05-product-technology.yaml`
- `05-product-technology.zh.yaml`

## Chapter purpose

Answer: What product/service is being sold, how does the customer use it, what capabilities or assets make it differentiated, what is the maturity level, and what technical/product risks remain?

## Required chapter content

Cover these universal topics:

- Product/service definition and value proposition in customer workflow terms, not only marketing language.
- Module, SKU, asset, pipeline, facility, service, or product-line map as appropriate to the company.
- Architecture or operating model: software stack, hardware design, manufacturing process, clinical/scientific mechanism, logistics network, service workflow, marketplace matching, or project delivery model.
- Deployment/onboarding path, integrations, implementation requirements, quality/reliability, support/service model, and roadmap.
- Differentiation: technology, IP, data, manufacturing know-how, supply access, brand/product design, regulatory approvals, distribution, or operational process.
- Trust, safety, security, privacy, compliance, certification, reliability, or quality controls where relevant.
- Product verdict: maturity, defensibility, scalability, and diligence gaps.

## Required tables

- **Product module / asset matrix** — module/asset/product line, user, status/maturity, evidence, differentiation, diligence gap.
- **Workflow / use-case table** — user job, current workflow, company solution, measurable benefit, evidence, limitation.
- **Technology / operating architecture table** — layer/process/component, role, evidence, dependency, risk.
- **Roadmap / release / development-stage table** — date/stage, feature/milestone, status, implication, source.
- **Trust / quality / compliance table** — control/certification/quality metric, status, scope, evidence, gap.
- **Implementation / integration / deployment table** — step, owner, timeline/friction, dependency, evidence, diligence ask.

## Required figures

- **Product architecture map** — `type: stack`; show layers/modules/components with details.
- **Customer workflow / operating flow** — `type: flow`; show how the product/service is used or delivered.
- **Product maturity / capability map** — `type: matrix`; show maturity or strength across modules/capabilities.
- **Critical dependency map** — `type: dependency-map` when the product depends on suppliers, platforms, data rights, regulators, facilities, scientific proof, or key partners.
- **Roadmap or development timeline** — `type: timeline` when milestones, releases, trials, certifications, facilities, or launches matter.

## Evidence collection strategy

Official-surface mining is mandatory when a company URL exists. Use `fetch-url` on retained direct pages.

- Official pages: homepage, sitemap, product/service pages, docs/developer portals, catalogs, API references, release notes, changelog, integrations, pricing, trust/security, status, privacy, terms, certifications, customer stories, and product blog/news.
- Technical proof: patents, papers, clinical/trial records, certifications, regulatory databases, manufacturing/quality documentation, benchmarks, performance tests, uptime/status, implementation guides.
- External proof: reviews, customer deployments, partner announcements, independent benchmarks, regulator filings, recalls/incidents, security/adverse reporting.
- Do not infer architecture, approvals, certifications, throughput, accuracy, reliability, or safety from vague marketing copy.

## Domain-adaptive additions

Infer the product/operating dependency.

- If it is software or data-driven, add APIs, integrations, data flows, security/privacy controls, deployment model, reliability, and workflow depth.
- If it is hardware or robotics, add BOM/critical components, manufacturing process, certification, field reliability, maintenance, safety, and supply chain.
- If it is scientific, clinical, or biotech, add mechanism, pipeline/stage, trial/preclinical evidence, safety, IP estate, regulatory path, and manufacturing/CMC readiness.
- If it is consumer product or brand-led, add formulation/design, packaging, SKU architecture, sensory/user experience, channel feedback, quality, and repeat-use cues.
- If it is marketplace/platform, add matching mechanism, trust/safety, supply onboarding, demand conversion, liquidity tooling, payments/dispute flows, and platform governance.
- If it is industrial, energy, infrastructure, or deeptech, add technical readiness level, pilot results, uptime, deployment constraints, permitting/certification, and scaling bottlenecks.
- If it is service/operations-heavy, add service workflow, labor model, training, quality assurance, utilization, SLA, and repeatability.

## Completion check

- The Simplified Chinese sibling translates every user-visible prose field per `.github/references/zh-translation.md`; it is not an English copy with only metadata preserved.
- Domain reflection is explicit: identify the product/technology or operating-model archetype(s), add supportable domain-specific architecture/maturity figures beyond `contract.yaml`, and record gaps where public evidence is insufficient.
- Each module row states maturity/status, evidence URL, buyer/user, differentiation, and diligence gap.
- Unsupported architecture, certifications, integrations, performance, safety, or roadmap claims become gaps.
- Figures use structured YAML fields, not Mermaid or prose diagrams.
- Handoff includes product verdict, technical moat, official page families reviewed/missing, and selected domain-adaptive additions.
