---
name: startup-market
description: "Use when: generating 02-market-macro.yaml. Keywords: market sizing, TAM, SAM, SOM, segments, buyers, geography, adoption, web_search."
user-invocable: false
---

# Startup Market

Use this skill after `00` and `01` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `00-report-brief.yaml`, and `01-company-snapshot.yaml`.

## Outputs

Write exactly:

- `02-market-macro.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing market-definition, sizing, segmentation, buyer, geography, growth-driver, or adoption facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `02-market-macro.yaml.localEvidence`, then cite those local `claimRefs` in `02`.

Do not invent market sizes, growth rates, penetration, TAM/SAM/SOM, or segment shares. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade market chapter:

- Market definition and category boundaries.
- TAM/SAM/SOM or evidence-constrained market-sizing analysis.
- Growth drivers and constraints.
- Buyer/persona segmentation and customer budget owner.
- Geography, adoption, penetration, and timing.
- Market attractiveness verdict and open diligence asks.

Expected table families unless unavailable with a documented gap: market definitions, sizing lenses, growth drivers, buyer/customer segments, geography/penetration constraints, market evidence gaps.

## Figure rules

- Prefer `market-sizing-lens` for TAM/SAM/SOM or constrained sizing.
- For bars or metric views, use numeric `value` and formatted `displayValue`.
- Use canonical renderer fields only: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`.

## Handoff note

After writing, record a concise internal summary: output path, market attractiveness, figure count, table count, evidence gaps closed, evidence gaps remaining.
