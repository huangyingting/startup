---
name: startup-valuation
description: "Use when: generating 08-valuation.yaml. Keywords: investment thesis, valuation, comparables, IPO readiness, scenarios, recommendation."
user-invocable: false
---

# Startup Valuation

## Role and ownership

Analysis artifact `08`. This skill owns the investment recommendation and valuation chapter. It must convert evidence from the analysis artifacts into a price-sensitive investment view. It does not gather new facts for other chapters; if a missing or stale fact is chapter-owned elsewhere, route it back through the orchestrator.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Optional coordination context:

- `02-market-analysis.yaml`, `03-competitors.yaml`, `04-financials.yaml`, `05-product-tech.yaml`, `06-customers.yaml`, and `07-risks.yaml`, when already available, for market, moat, product differentiation, financial, customer, and risk context; do not block valuation analysis on these artifacts.

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `08-valuation.yaml`

## Agent workflow

1. Confirm the shared identity inputs from `startup-research`: `company.name`, `slug`, `runDate`, `companyUrl` when provided, and the owning output filename.
2. Pull in prompt-derived requirements routed to this chapter; optional coordination artifacts may be used only when already available and must not block this chapter.
3. Perform domain reflection before research: identify the relevant archetype(s), operating model, buyer/user/payer/regulator distinctions, revenue mechanism, dependencies, and failure modes.
4. Build chapter-specific research questions from the required content, required tables, required figures, evidence strategy, domain-adaptive additions, optional coordination context, and prompt requirements.
5. Discover sources, review retained direct URLs with `fetch-url`, and include confirming, independent, freshness, and adverse/disconfirming evidence where material.
6. Convert reviewed evidence into `localEvidence.sources[]` and atomic `localEvidence.claims[]`; unsupported important facts become explicit `evidenceGaps[]` with diligence paths.
7. Draft schema-native sections, tables, callouts, and structured figures for this chapter; cite material claims with local `claimRefs` and use `null` plus explanation for unavailable private metrics.
8. Self-audit before saving: identity fields match the run, YAML parses, required tables/figures are substantive, claim refs resolve locally, domain-adaptive additions are visible, and the completion check below passes.
9. Write only this skill's owned artifact. If research uncovers a supportable fact owned by another chapter, hand it back through the orchestrator instead of editing another artifact directly.

## Chapter mission

Answer: Given the evidence, what is the investment recommendation, how confident are we, what valuation stance is appropriate, what scenarios matter, and what diligence would change the decision?

## Required content specification

Cover these universal topics:

- Investment thesis and anti-thesis tied to market, product, customers, financials, competition, and risks.
- Recommendation, confidence, risk rating, valuation stance, target return/hold period/exit route/position sizing where supportable.
- Current financing/valuation context, entry discipline, and whether public evidence supports the price.
- Bull/base/bear cases with explicit assumptions, valuation ranges or qualitative bands, probability signals, and downside triggers.
- Comparable set: public companies, private rounds, M&A, milestone/asset comparables, project comps, brand/channel comps, or other model-appropriate references.
- Exit readiness: IPO, strategic M&A, secondary/private liquidity, licensing/partnership, project sale, commercialization milestone, or other realistic routes.
- Final diligence asks and thesis-break triggers.

## Required tables

- **Recommendation summary table** — recommendation, confidence, risk rating, valuation stance, evidence, decision implication.
- **Thesis / anti-thesis table** — argument, evidence, what would change the view, claim refs.
- **Bull / base / bear scenario table** — assumptions, valuation/return logic, key risks, probability signal.
- **Comparable valuation table** — comparable, metric, multiple/valuation/status, relevance, limitation.
- **Exit readiness table** — exit route, readiness dimension, current evidence, score/status, diligence ask.
- **Position sizing / thesis-break / final diligence table** — stance, trigger, evidence needed, action implication.

## Required figures

- **Recommendation logic** — `type: logic-chain`; show the chain from scale/proof/risks/valuation to recommendation.
- **Valuation sensitivity** — `type: sensitivity`; show sensitivity to revenue, margin, multiple, milestone probability, utilization, take rate, unit margin, capex, or other relevant driver.
- **Scenario outcome chart** — `type: scenario-tree`, `bars`, `waterfall`, or `matrix`; show bull/base/bear outcomes or downside bridge when numeric support exists.
- **Valuation / return range** — `type: range` for low/base/high valuation, exit, dilution, or return outcomes with explicit assumptions.
- **Investment scorecard** — `type: scorecard` for IC-ready scoring across market, proof, moat, economics, risk, valuation, and evidence quality.
- **Exit readiness map** — `type: matrix` when IPO/M&A/commercialization/project readiness needs scoring.

## Evidence acquisition strategy

Use search to test thesis, anti-thesis, comps, and downside; use `fetch-url` on sources behind recommendation-critical claims.

- Pull from upstream artifacts first; do not introduce new facts unless necessary and then route them to the owning chapter when they belong there.
- Valuation/financing: latest rounds, valuation marks, cap table/preference clues, investor syndicate, debt/project finance, public comps, private comps, M&A transactions, secondary marks.
- Scenario drivers: revenue/growth, margin, retention, unit economics, volume/utilization, approvals, clinical milestones, manufacturing scale, loss rates, commodity prices, market multiples, exit window.
- Adverse/downside: overvaluation, down-round risk, multiple compression, regulatory/legal blockers, customer concentration, failed commercialization, cost overruns, safety/quality events, liquidity constraints.

## Domain-adaptive additions

Select the valuation method from the business model and stage.

- If the company has recurring or visible revenue, use revenue, gross margin, growth, retention, cash efficiency, and comparable multiples.
- If it is pre-revenue or milestone-driven, use milestone-based valuation, technical/regulatory de-risking, capital needs, and probability-weighted paths.
- If scientific/clinical assets drive value, use pipeline stage, indication/market, approval probability, safety, IP term, milestone/royalty economics, and financing runway.
- If hardware or physical product scale drives value, use manufacturing scale, gross margin path, inventory/capex, channel margin, warranty/quality, and category comps.
- If marketplace or transaction economics drive value, use GMV/TPV, take rate, contribution margin, liquidity, frequency, concentration, and network durability.
- If consumer brand/channel drives value, use repeat purchase, gross margin, channel scalability, brand strength, distribution, and inventory/working capital.
- If infrastructure/project/asset yield drives value, use contracted revenue, utilization/capacity factor, project IRR, capex, financing structure, counterparty credit, and regulatory/permit status.
- If lending/insurance/financial risk drives value, use NIM/take rate, loss/claims ratio, funding cost, reserves, capital requirements, and cycle sensitivity.

## Enum discipline

`recommendation`, `confidence`, `riskRating`, and `valuationStance` are closed schema enums. Use exactly one allowed token; place nuance in prose, callouts, or scenario tables.

## Quality bar

- Make the recommendation price-sensitive and evidence-sensitive; do not convert company quality into a generic buy/track label.
- Tie thesis, anti-thesis, risk rating, confidence, and valuation stance to upstream evidence and explicit missing inputs.
- Use valuation methods that match the business model and stage; record when public evidence is insufficient for numeric precision.
- Show what diligence or price change would move the recommendation.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Domain reflection is explicit: identify the valuation archetype(s), add supportable domain-specific scenario, comparable, or sensitivity tables/figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Include adverse searches on overvaluation, down-round risk, governance, liquidity, multiple compression, commercialization failure, or model-specific downside.
- Do not issue `buy` unless thesis and anti-thesis are both evidence-supported and valuation has sufficient support.
- If valuation inputs are missing, prefer `research-more` or `track` over false precision.
- Recommendation must be price-sensitive and evidence-sensitive, not a generic company-quality score.
- Handoff includes recommendation, confidence, risk rating, valuation stance, selected valuation method, and selected domain-adaptive additions.
