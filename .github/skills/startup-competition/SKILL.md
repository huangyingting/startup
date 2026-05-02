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
- `03-competitive-benchmarking.zh.yaml` (Simplified Chinese sibling)

## Dynamic evidence use

Use targeted web research and direct page reads for missing competitor, substitute, incumbent, pricing, feature, GTM, customer-proof, market-share-signal, or moat facts. Register retained sources/claims in `03-competitive-benchmarking.yaml.localEvidence` and cite local `claimRefs` in `03`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Mine the startup's and key competitors' official product, docs, pricing, changelog, customer, marketplace, partner, integration, blog/news, and comparison pages for feature, packaging, and GTM evidence. Label vendor-authored claims honestly; never treat vendor comparisons as independent proof of superiority. Corroborate important claims with benchmarks, customer evidence, or reviews.

Treat `currentDate` as the freshness anchor for competitor funding, product launches, pricing, market-share signals, partnerships, and strategic shifts. Use complete-sentence questions tied to the exact comparison being written, for example: `As of <currentDate>, how do <companyName> and its main competitors compare on enterprise AI model capability, pricing, distribution, and customer adoption?` Avoid keyword-only searches. Include at least one adverse query on competitive displacement, commoditization, open-source pressure, customer switching, or pricing compression.

Before writing `03`, ask multiple competition-specific questions covering direct competitors, incumbents, substitutes, pricing/packaging, feature parity, GTM, customer wins, reviews, market-share signals, rival funding/valuation, and moat durability. Vary by competitor class and table. Do not build the competitive matrix from one generic comparison source.

Do not invent competitor capabilities, pricing, market share, or customer wins. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade competition chapter:

- Competitive landscape and category map.
- Detailed raw competitive evidence retained in this artifact: competitor profiles, dated product/pricing facts, feature-level comparisons, GTM proof, customer evidence, moat claims, contradictory market signals, and diligence gaps.
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

## Simplified Chinese sibling

Immediately after writing `03-competitive-benchmarking.yaml`, write `03-competitive-benchmarking.zh.yaml` as its full Simplified Chinese translation, following `.github/references/zh-translation.md`. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field including `chapter.title`, `chapter.summary`, callouts, sections, table cells, figure node detail, and notes. Do not move on to the next skill until both English and Chinese files exist and pass the residual-English sweep and structural-parity checks.

## Handoff note

After writing, record a concise internal summary: output path, positioning, key competitors, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
