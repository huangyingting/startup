---
name: startup-product
description: "Use when: generating 05-product-technology.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, web_search."
user-invocable: false
---

# Startup Product

Use this skill after `01` and any relevant market/competition context exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, and relevant context from `02-market-macro.yaml` / `03-competitive-benchmarking.yaml` when positioning, buyer needs, or competitor features affect product analysis. Read `04-financial-unit-economics.yaml` only when pricing or monetization context is needed.

## Outputs

Write exactly:

- `05-product-technology.yaml`

## Dynamic evidence use

Use `web_search` for missing product, platform, module, AI/automation, architecture, integration, roadmap, implementation, security, privacy, or compliance facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `05-product-technology.yaml.localEvidence`, then cite those local `claimRefs` in `05`. Emit the `web_search` run-log line defined in `.github/references/evidence-ledger.md` after every call.

Do not invent architecture, security certifications, model capabilities, roadmap timing, integrations, or compliance posture. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade product and technology chapter:

- Product platform overview and module map.
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

## Handoff note

After writing, record a concise internal summary: output path, product verdict, technical moat, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
