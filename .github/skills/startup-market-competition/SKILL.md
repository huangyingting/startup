---
name: startup-market-competition
description: "Use when: generating 03-market-macro.yaml and 04-competitive-benchmarking.yaml. Keywords: market sizing, TAM, SAM, SOM, competitors, feature matrix, pricing, moat, web_search."
user-invocable: false
---

# Startup Market and Competition

Use this skill after `00`–`02` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `00-report-brief.yaml`, `01-evidence-ledger.yaml`, and `02-company-snapshot.yaml`.

## Outputs

Write exactly:

- `03-market-macro.yaml`
- `04-competitive-benchmarking.yaml`

## Dynamic evidence use

You may use `web_search` directly when the ledger is too thin for market/competition work. Search only for chapter-specific missing facts, parse `web_search` packets per the shared ledger rules in [`startup-foundation/SKILL.md`](../startup-foundation/SKILL.md), append new cited sources/claims to `01-evidence-ledger.yaml`, then cite the new `claimRefs` in `03`/`04`.

Do not invent market sizes, growth rates, market share, pricing, or competitor capabilities. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this section as an investor-grade VC diligence chapter:

- Market definitions and sizing table.
- TAM/SAM/SOM analysis with a `market-sizing-lens` structured figure when supported.
- Growth drivers, segment analysis, buyer/persona segmentation, geographic exposure, adoption and penetration constraints.
- Competitive overview, primary competitors, incumbents, substitutes/adjacent competitors, feature matrix, pricing/packaging comparison when available, and moat assessment.
- Quadrant or competitive-matrix figure where supported.

Expected table families unless unavailable with a documented gap: market segment definitions/sizing, growth drivers, customer/buyer segments, primary competitor profiles, competitive feature matrix, pricing/packaging or GTM comparison, moat/switching-cost assessment.

## Figure rules

- Use canonical renderer fields only: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`.
- Do not use generic `flow` for TAM/SAM/SOM; use `market-sizing-lens`.
- For `quadrant` / `competitive-matrix`, use `data.points[]` with `label`, numeric `x`, numeric `y`, optional `tone`, and axis labels.
- For `bars` / `metric-bars`, use `data.items[]` with `label`, numeric `value`, optional `displayValue`, optional `tone`.

## Handoff note

After writing, record a concise internal summary: output paths, market attractiveness, positioning, figure count, table count, evidence gaps closed, evidence gaps remaining.