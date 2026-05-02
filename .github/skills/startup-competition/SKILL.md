---
name: startup-competition
description: "Use when: generating 04-competitive-benchmarking.yaml. Keywords: competitors, substitutes, feature matrix, pricing, packaging, moat, positioning, web_search."
user-invocable: false
---

# Startup Competition

Use this skill after `00`–`03` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `03-market-macro.yaml`.

## Outputs

Write exactly:

- `04-competitive-benchmarking.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing competitor, substitute, incumbent, pricing, feature, GTM, customer-proof, market-share-signal, or moat facts. Parse packets per `.github/references/evidence-ledger.md`, append new cited sources/claims to `01-evidence-ledger.yaml`, then cite those `claimRefs` in `04`.

Do not invent competitor capabilities, pricing, market share, or customer wins. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade competition chapter:

- Competitive landscape and category map.
- Primary competitors, incumbents, substitutes, and adjacent platforms.
- Feature, product, pricing, packaging, and GTM comparisons.
- Differentiation, switching costs, defensibility, and moat durability.
- Competitive risks and diligence asks.

Expected table families unless unavailable with a documented gap: competitor profiles, feature matrix, pricing/packaging comparison, GTM comparison, moat/switching-cost assessment, competitive risk register.

## Figure rules

- Prefer `quadrant` or `competitive-matrix` for positioning.
- Use `data.points[]` with `label`, numeric `x`, numeric `y`, optional `tone`, and axis labels when useful.
- Use canonical renderer fields only; do not use `name`, `components`, `children`, `steps`, `cards`, or `groups` as primary fields.

## Handoff note

After writing, record a concise internal summary: output path, positioning, key competitors, figure count, table count, evidence gaps closed, evidence gaps remaining.
