---
name: startup-competition
description: "Use when: generating 03-competitive-benchmarking.yaml. Keywords: competitors, substitutes, feature matrix, pricing, packaging, moat, positioning."
user-invocable: false
---

# Startup Competition

Third analysis stage. This skill owns the competitive benchmarking chapter. It must explain who can take the same customer budget, why the startup wins or loses, and what would erode the moat.

## Read first

- `01-company-snapshot.yaml`
- `02-market-macro.yaml`
- `.github/references/analysis-rules.md`

## Outputs

- `03-competitive-benchmarking.yaml`

## Chapter purpose

Answer: Who are the direct, incumbent, adjacent, substitute, and status-quo competitors; how does the company compare on the buying criteria that matter; and how durable is its differentiation?

## Required chapter content

Cover these universal topics:

- Competitive landscape: direct peers, incumbents, adjacent platforms, substitutes, status quo/manual workflow, internal build, and likely acquirers/entrants.
- Competitor profiles: scale, funding/market cap, revenue/customer signals, geography, target customer, product scope, pricing, and strategic direction.
- Feature/capability, pricing/packaging, GTM/distribution, brand/trust, performance, regulatory/compliance, and implementation comparisons.
- Switching costs, buyer lock-in, multi-homing, distribution power, supply/partner access, and cost/performance curves.
- Moat durability, commoditization/displacement risks, competitor adverse evidence, and diligence asks.

## Required tables

- **Competitor profile table** — competitor, category, scale/funding, target segment, differentiation, evidence, limitation.
- **Feature / capability matrix** — buying criteria, company, competitors, evidence notes, unsupported cells marked clearly.
- **Pricing / packaging comparison** — price/unit/contract model, included capabilities, discount or unknowns, implication.
- **GTM / distribution comparison** — channel, installed base, partner access, geography, sales motion, switching leverage.
- **Moat durability / competitive risk register** — moat claim, evidence, threat, severity, mitigation/diligence ask.

## Required figures

- **Competitive positioning map** — `type: positioning-map` or `quadrant`; use evidence-backed numeric axes and labeled points.
- **Feature breadth / capability map** — `type: matrix`; show capability coverage and strength by competitor.
- **Price-value or performance map** — `type: scatter` or `quadrant` when pricing/performance materially affects buying.
- **Moat / readiness scorecard** — `type: scorecard` when a compact multi-dimension score helps summarize competitive durability.
- **Incumbent displacement map** — `type: flow` when the key competition is status quo, legacy process, internal build, or channel lock-in.

## Evidence collection strategy

Use search to identify competitor classes and `fetch-url` to verify retained pages.

- Competitor official surfaces: product, pricing, docs, case studies, security/compliance, support, integrations, channel pages, and changelogs.
- Independent proof: benchmarks, reviews, public filings, funding/valuation coverage, market reports, customer references, procurement pages, and adverse reporting.
- Never treat vendor-authored comparison pages as independent proof.
- For each matrix axis or point placement, retain evidence that would change the score if wrong.

## Domain-adaptive additions

Infer what customers actually compare.

- If the customer can choose “do nothing,” include manual/status-quo workflow as a competitor.
- If incumbents control distribution, add incumbent channel power, switching cost, contract lock-in, trust, compliance, and installed-base analysis.
- If technical performance matters, add benchmark, reliability, certification, accuracy, uptime, safety, or field-performance comparisons.
- If physical products matter, add BOM/cost curve, manufacturing scale, quality, warranty, supply access, and certification comparisons.
- If brand/channel matters, add brand awareness, retail shelf/channel access, price tier, community, and repeat purchase differentiation.
- If regulated access matters, add licenses, approvals, reimbursement, compliance maturity, and regulator trust.
- If network effects matter, add liquidity, multi-homing, supply exclusivity, disintermediation, and take-rate defensibility.

## Completion check

- Domain reflection is explicit: identify what buyers compare in this domain, add supportable domain-specific competitor axes/tables/figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Query by competitor class; do not build the matrix from one generic comparison source.
- Include adverse evidence on displacement, commoditization, switching, pricing compression, channel conflict, or incumbent response.
- Unsupported matrix cells should be marked unknown or become evidence gaps, not guessed.
- Handoff includes positioning, key competitors, chosen axes, and selected domain-adaptive additions.
