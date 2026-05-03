---
name: startup-competitors
description: "Use when: generating 03-competitors.yaml. Keywords: competitors, substitutes, feature matrix, pricing, packaging, moat, positioning."
user-invocable: false
---

# Startup Competitors

## Role and ownership

Analysis artifact `03`. This skill owns the competitive benchmarking chapter. It must explain who can take the same customer budget, why the startup wins or loses, and what could erode the moat. It does not own market sizing, company identity, financial projections, or final recommendation.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Optional coordination context:

- `02-market-analysis.yaml`, when already available, for buyer/segment framing; do not block competitive analysis on this artifact.

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `03-competitors.yaml`

## Skill workflow

- Follow the common chapter workflow in `.github/references/analysis-rules.md`.
- Apply that workflow to this skill's mission, required content specification, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check.
- Use optional coordination context only when already available; never block this chapter on peer artifacts.
- Write only `03-competitors.yaml`; route facts owned by other chapters back through `startup-research`.

## Chapter mission

Answer: Who are the direct, incumbent, adjacent, substitute, and status-quo competitors; how does the company compare on the buying criteria that matter; and how durable is its differentiation?

## Required content specification

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

## Evidence acquisition strategy

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

## Quality bar

- Compare the company against every material way the buyer can solve the same job, including status quo and internal build.
- Choose comparison axes that affect buying decisions, switching, pricing, or moat durability.
- Mark unsupported matrix cells as unknown or gaps; do not infer competitor capability from category labels.
- Include adverse or disconfirming evidence on displacement risk, commoditization, channel power, or incumbent response.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Domain reflection is explicit: identify what buyers compare in this domain, add supportable domain-specific competitor axes/tables/figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Query by competitor class; do not build the matrix from one generic comparison source.
- Include adverse evidence on displacement, commoditization, switching, pricing compression, channel conflict, or incumbent response.
- Unsupported matrix cells should be marked unknown or become evidence gaps, not guessed.
- Handoff includes positioning, key competitors, chosen axes, and selected domain-adaptive additions.
