---
name: startup-product-tech
description: "Use when: generating 05-product-tech.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, docs, sitemap."
user-invocable: false
---

# Startup Product Tech

## Role and ownership

Analysis artifact `05`. This skill owns the product and technology chapter. It must explain what the company delivers, how it works, how mature it is, and what product or technical evidence supports or weakens the moat. It does not own customer retention proof, financial underwriting, or final investment recommendation.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Optional coordination context:

- `02-market-analysis.yaml`, `03-competitors.yaml`, or `04-financials.yaml`, when already available, for positioning, feature, pricing, or monetization context; do not block product/technology analysis on these artifacts.

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `05-product-tech.yaml`

## Skill workflow

- Follow the common chapter workflow from the required analysis rules reference.
- Apply that workflow to this skill's mission, required content specification, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check.
- Use optional coordination context only when already available; never block this chapter on peer artifacts.
- Write only `05-product-tech.yaml`; route facts owned by other chapters back through `startup-research`.

## Chapter mission

Answer: What product/service is being sold, how does the customer use it, what capabilities or assets make it differentiated, what is the maturity level, and what technical/product risks remain?

## Required content specification

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

## Evidence acquisition strategy

Apply the shared research tool usage rules. Official-surface mining is mandatory when a company URL exists. Prioritize these chapter-specific source families:

- Official pages: homepage, sitemap, product/service pages, docs/developer portals, catalogs, API references, release notes, changelog, integrations, pricing, trust/security, status, privacy, terms, certifications, customer stories, and product blog/news.
- Technical proof: patents, papers, clinical/trial records, certifications, regulatory databases, manufacturing/quality documentation, benchmarks, performance tests, uptime/status, implementation guides.
- External proof: reviews, customer deployments, partner announcements, independent benchmarks, regulator filings, recalls/incidents, security/adverse reporting.
- Do not infer architecture, approvals, certifications, throughput, accuracy, reliability, or safety from vague marketing copy.

## Domain-adaptive additions

Infer the product/operating dependency. Selected additions should become visible architecture, maturity, workflow, dependency, roadmap, or trust/safety outputs, not just background reasoning.

- If it is software or data-driven, add APIs, integrations, data flows, security/privacy controls, deployment model, reliability, and workflow depth.
- If it is hardware or robotics, add BOM/critical components, manufacturing process, certification, field reliability, maintenance, safety, and supply chain.
- If it is scientific, clinical, or biotech, add mechanism, pipeline/stage, trial/preclinical evidence, safety, IP estate, regulatory path, and manufacturing/CMC readiness.
- If it is consumer product or brand-led, add formulation/design, packaging, SKU architecture, sensory/user experience, channel feedback, quality, and repeat-use cues.
- If it is marketplace/platform, add matching mechanism, trust/safety, supply onboarding, demand conversion, liquidity tooling, payments/dispute flows, and platform governance.
- If it is industrial, energy, infrastructure, or deeptech, add technical readiness level, pilot results, uptime, deployment constraints, permitting/certification, and scaling bottlenecks.
- If it is service/operations-heavy, add service workflow, labor model, training, quality assurance, utilization, SLA, and repeatability.

## Quality bar

- Explain what is actually delivered, how users/customers interact with it, and what operating or technical dependencies make it work.
- Distinguish product maturity, roadmap claims, integrations, certifications, and technical performance that are verified from those that are only marketed.
- Make architecture and workflow figures specific to the product or operating model, not generic boxes.
- Surface product, security, reliability, regulatory, supply, or implementation gaps that could weaken the moat.

## Completion check

- Minimum depth gate: target range of 3–8 sections, 4–8 tables, and 3–6 structured figures; minimum prose/data floor of 100 words per section body, 900 total section words, 36 total table rows, and 18 total figure data points.
- Evidence-depth gate from the shared analysis rules passes for this chapter: at least 50 targeted research questions, 50 retained reviewed sources, and 75 reusable atomic claims, with explicit evidence gaps for missing public evidence.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Tables and figures are non-duplicative: a specific analysis appears as either a table or a figure, not both with the same title, claim set, rows/nodes, or conclusion.
- Domain reflection is explicit: identify the product/technology or operating-model archetype(s), add supportable domain-specific architecture/maturity figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Each module row states maturity/status, evidence URL, buyer/user, differentiation, and diligence gap.
- Unsupported architecture, certifications, integrations, performance, safety, or roadmap claims become gaps.
- Figures use structured YAML fields, not Mermaid or prose diagrams.
- Handoff includes product verdict, technical moat, official page families reviewed/missing, and selected domain-adaptive additions.
