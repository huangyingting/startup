---
name: startup-product
description: "Use when: generating 05-product-technology.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, official website, sitemap, docs, web_search."
user-invocable: false
---

# Startup Product

Use this skill after `01` and any relevant market/competition context exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, and relevant context from `02-market-macro.yaml` / `03-competitive-benchmarking.yaml` when positioning, buyer needs, or competitor features affect product analysis. Read `04-financial-unit-economics.yaml` only when pricing or monetization context is needed.

## Outputs

Write exactly:

- `05-product-technology.yaml`
- `05-product-technology.zh.yaml` (Simplified Chinese sibling)

## Dynamic evidence use

Use targeted web research and direct page reads for missing product, platform, module, AI/automation, architecture, integration, roadmap, implementation, security, privacy, or compliance facts. Register retained sources/claims in `05-product-technology.yaml.localEvidence` and cite local `claimRefs` in `05`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Start from the startup's website when `company.website` or `companyUrl` is available. Inspect homepage, `robots.txt`, `sitemap.xml`, product pages, docs/developer portals, API references, changelog/release notes, pricing/packaging, trust/security, status, integrations, customer/solutions, and product blog/news pages. Use sitemap and navigation before search snippets; if incomplete, fill gaps with targeted searches.

Treat official-site pages as the first pass for current product scope, packaging, feature availability, docs, integrations, security claims, and release chronology. Treat external sources as corroboration, adverse evidence, benchmark/review context, customer implementation proof, or gap-filling—not as a substitute for reading the company's own product surface. Retain official product URLs as local evidence when they support claims, and record `keyQuote` snippets when available.

Treat `currentDate` as the freshness anchor for product availability, model releases, platform features, pricing-linked packaging, security certifications, roadmap, incidents, and enterprise readiness. Use complete-sentence questions tied to the specific product paragraph or matrix, for example: `What product capabilities, model releases, enterprise controls, and API features has <companyName> made available as of <currentDate>, and which are still preview or unsupported?` Avoid keyword-only searches. Include at least one adverse query about outages, safety regressions, security gaps, roadmap delays, or technical commoditization.

Before writing `05`, ask multiple product-specific questions covering modules, releases, API/model capabilities, integrations, architecture, security controls, compliance, reliability, implementation, roadmap, packaging, developer ecosystem, and adverse technical issues. Do not infer architecture from marketing; record unsupported architecture or certifications as gaps.

Do not invent architecture, security certifications, model capabilities, roadmap timing, integrations, or compliance posture. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade product and technology chapter:

- Product platform overview and module map.
- Detailed raw product evidence retained in this artifact: module-by-module facts, release chronology, feature availability, architecture and integration evidence, security/compliance claims, reliability signals, unsupported technical metrics, and dated recency notes.
- Official-site discovery notes: record which homepage, sitemap, docs, product, pricing, changelog, trust/security, status, integrations, and blog/news pages were reviewed; if any expected official page family is missing, include an explicit product diligence gap.
- Core product module analysis by functional area, such as cards/payments, expense management, AP, procurement, travel, treasury, analytics, workflow, infrastructure, developer/API, or company-specific modules.
- AI/automation capabilities and technical differentiation, including agentic automation, anomaly/fraud detection, recommendations, policy automation, forecasting, or copilot workflows where relevant.
- Architecture, integrations, APIs, data model, implementation/onboarding model, real-time processing, reliability, and scalability evidence.
- Roadmap and packaging implications.
- Security, privacy, compliance, reliability, certifications, regulated-industry readiness, and technical diligence asks.

Expected table families unless unavailable with a documented gap: product module matrix, AI/automation capability map, product roadmap, integration matrix, security/compliance matrix, architecture/infrastructure evidence, implementation/onboarding model, technical diligence asks.

## Figure rules

- Use `architecture-stack` with `data.layers[]` entries containing `label`, `detail`, optional `tone`, optional `modules[]`, optional `outputs[]`.
- Use `flow` only for generic product or data flows.
- Use canonical renderer fields only; do not use `name`, `components`, `children`, `steps`, `cards`, or `groups` as primary fields.

## Simplified Chinese sibling

Immediately after writing `05-product-technology.yaml`, write `05-product-technology.zh.yaml` as its full Simplified Chinese translation, following `.github/references/zh-translation.md`. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field including `chapter.title`, `chapter.summary`, callouts, sections, table cells, figure node detail, and notes. Do not move on to the next skill until both English and Chinese files exist and pass the residual-English sweep and structural-parity checks.

## Handoff note

After writing, record a concise internal summary: output path, product verdict, technical moat, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
