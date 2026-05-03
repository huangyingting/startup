---
name: startup-valuation
description: "Use when: generating 08-valuation.yaml. Keywords: investment thesis, valuation, comparables, IPO readiness, scenarios, recommendation."
user-invocable: false
---

# Startup Valuation

Eighth analysis stage. This skill owns the investment recommendation and valuation chapter. It must convert evidence from prior chapters into a price-sensitive investment view.

## Read first

- `01-company-overview.yaml`
- `04-financials.yaml`
- `06-customers.yaml`
- `07-risks.yaml`
- `02-market-analysis.yaml`, `03-competitors.yaml`, or `05-product-tech.yaml` when market, moat, or product differentiation materially affects valuation.
- `.github/references/analysis-rules.md`

## Outputs

- `08-valuation.yaml`

## Chapter purpose

Answer: Given the evidence, what is the investment recommendation, how confident are we, what valuation stance is appropriate, what scenarios matter, and what diligence would change the decision?

## Required chapter content

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

## Evidence collection strategy

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

## Completion check

- Domain reflection is explicit: identify the valuation archetype(s), add supportable domain-specific scenario, comparable, or sensitivity tables/figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Include adverse searches on overvaluation, down-round risk, governance, liquidity, multiple compression, commercialization failure, or model-specific downside.
- Do not issue `buy` unless thesis and anti-thesis are both evidence-supported and valuation has sufficient support.
- If valuation inputs are missing, prefer `research-more` or `track` over false precision.
- Recommendation must be price-sensitive and evidence-sensitive, not a generic company-quality score.
- Handoff includes recommendation, confidence, risk rating, valuation stance, selected valuation method, and selected domain-adaptive additions.
