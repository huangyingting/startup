---
name: startup-competition
description: "Use when: generating 03-competitive-benchmarking.yaml. Keywords: competitors, substitutes, feature matrix, pricing, packaging, moat, positioning, web_search."
user-invocable: false
---

# Startup Competition

Use this skill after `01`–`02` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, and `02-market-macro.yaml`. Do not read unrelated prior artifacts unless needed to resolve a specific gap.

## Outputs

Write exactly:

- `03-competitive-benchmarking.yaml`

## Dynamic evidence use

Use `web_search` for missing competitor, substitute, incumbent, pricing, feature, GTM, customer-proof, market-share-signal, or moat facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `03-competitive-benchmarking.yaml.localEvidence`, then cite those local `claimRefs` in `03`. Emit the `web_search` run-log line defined in `.github/references/evidence-ledger.md` after every call.

Do not invent competitor capabilities, pricing, market share, or customer wins. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade competition chapter:

- Competitive landscape and category map.
- Primary competitors, incumbents, substitutes, and adjacent platforms.
- Distinguish direct modern competitors, legacy incumbents, adjacent platform players, and potential strategic acquirers where relevant.
- Competitor profiles should include valuation or market cap, funding, revenue scale, customer scale, target segment, differentiator, and strategic trajectory when evidence supports them.
- Feature, product, pricing, packaging, and GTM comparisons.
- Differentiation, switching costs, defensibility, and moat durability, including product velocity, data/network effects, pricing advantage, integration ecosystem, distribution channel, or compliance advantage when applicable.
- Competitive risks and diligence asks.

Expected table families unless unavailable with a documented gap: competitor profiles, feature matrix, pricing/packaging comparison, GTM comparison, customer/review signal comparison, moat/switching-cost assessment, competitive risk register, detailed appendix-ready feature deep dive.

## Figure rules

- Prefer `quadrant` or `competitive-matrix` for positioning.
- Use `data.points[]` with `label`, numeric `x`, numeric `y`, optional `tone`, and axis labels when useful.
- Use canonical renderer fields only; do not use `name`, `components`, `children`, `steps`, `cards`, or `groups` as primary fields.

## Handoff note

After writing, record a concise internal summary: output path, positioning, key competitors, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
