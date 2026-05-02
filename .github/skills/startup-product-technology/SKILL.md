---
name: startup-product-technology
description: "Use when: generating 06-product-technology.yaml. Keywords: product, platform, modules, architecture, AI, integrations, roadmap, security, compliance, web_search."
user-invocable: false
---

# Startup Product and Technology

Use this skill after `00`–`05` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `05-financial-unit-economics.yaml`.

## Outputs

Write exactly:

- `06-product-technology.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing product, platform, module, AI/automation, architecture, integration, roadmap, implementation, security, privacy, or compliance facts. Parse packets per `.github/references/evidence-ledger.md`, append new cited sources/claims to `01-evidence-ledger.yaml`, then cite those `claimRefs` in `06`.

Do not invent architecture, security certifications, model capabilities, roadmap timing, integrations, or compliance posture. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade product and technology chapter:

- Product platform overview and module map.
- AI/automation capabilities and technical differentiation.
- Architecture, integrations, APIs, data model, implementation/onboarding model.
- Roadmap and packaging implications.
- Security, privacy, compliance, reliability, and technical diligence asks.

Expected table families unless unavailable with a documented gap: product module matrix, AI/automation capability map, integration matrix, security/compliance matrix, roadmap evidence, implementation/onboarding model, technical diligence asks.

## Figure rules

- Use `architecture-stack` with `data.layers[]` entries containing `label`, `detail`, optional `tone`, optional `modules[]`, optional `outputs[]`.
- Use `flow` only for generic product or data flows.
- Use canonical renderer fields only; do not use `name`, `components`, `children`, `steps`, `cards`, or `groups` as primary fields.

## Handoff note

After writing, record a concise internal summary: output path, product verdict, technical moat, figure count, table count, evidence gaps closed, evidence gaps remaining.
