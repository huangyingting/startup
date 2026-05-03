---
name: startup-financials
description: "Use when: generating 04-financial-unit-economics.yaml and 04-financial-unit-economics.zh.yaml. Keywords: revenue, pricing, unit economics, CAC, LTV, margins, burn, funding, projections."
user-invocable: false
---

# Startup Financials

Fourth analysis stage. This skill owns the financial and unit-economics chapter. It must explain how the company makes money, what unit drives margin, how capital intensive the model is, and which financial inputs are still missing.

## Read first

- `01-company-snapshot.yaml`
- `02-market-macro.yaml` and `03-competitive-benchmarking.yaml` when market, pricing, GTM, or competitor context affects interpretation.
- `.github/references/analysis-skill-conventions.md`
- `.github/references/zh-translation.md`

## Outputs

- `04-financial-unit-economics.yaml`
- `04-financial-unit-economics.zh.yaml`

## Chapter purpose

Answer: What is the revenue model, what are the cost and margin drivers, what unit economics can be supported, how much capital is needed, and what financial evidence is insufficient for underwriting?

## Required chapter content

Cover these universal topics:

- Revenue streams, pricing model, revenue recognition issues, and revenue mix where supportable.
- Cost structure, gross margin drivers, contribution margin logic, working capital, capex, inventory, partner/channel costs, or service-delivery costs.
- Public traction: revenue, ARR/run-rate, GMV/volume, units, backlog, bookings, locations, utilization, active users, or other business-model-specific financial proxies.
- Funding, valuation, debt/credit/project finance, burn/runway, cash needs, and financing dependency.
- Unit economics: CAC, LTV, payback, retention/expansion, loss rates, utilization, take rate, BOM, store economics, project margin, royalty economics, or explicit gaps.
- Scenario/projection support only when assumptions are source-backed; otherwise show missing inputs.
- Financial verdict: revenue quality, margin path, capital intensity, and diligence blockers.

## Required tables

- **Revenue streams table** — stream, mechanism, unit, current value/status, evidence, quality note, diligence request.
- **Pricing / monetization table** — price/unit/contract terms, list vs realized pricing, discounts/unknowns, source.
- **Unit economics table** — metric, value/null, confidence, why it matters, evidence or diligence ask.
- **Funding / capital needs table** — round/debt/facility/project capital, amount, date, participants, use of funds, runway/capex implication.
- **Margin / cost-driver bridge table** — cost driver, direction, evidence, sensitivity, margin implication.
- **Public financial gaps table** — missing private metrics, impact, exact diligence path.

## Required figures

- **Revenue model bridge** — `type: flow` or `waterfall`; show how customer activity converts into revenue and gross profit.
- **Unit economics bridge** — `type: bridge` when inputs exist; otherwise use qualitative nodes and explicit `approximationNotes`.
- **Revenue / volume / margin trend** — `type: bars` or `scatter`; numeric values only and source-backed.
- **Financial estimate range** — `type: range` for revenue, burn, runway, margin, or valuation-input ranges with explicit source-backed bounds.
- **Capital intensity / cash-flow map** — `type: flow`, `matrix`, or `waterfall` when capex, inventory, project finance, clinical burn, manufacturing scale-up, or credit exposure is material.

## Evidence collection strategy

Use search for public metrics/conflicts and `fetch-url` for retained source pages.

- Revenue/pricing: official pricing, customer contracts/examples, filings, interviews, investor announcements, credible estimates, app/store/channel data, tender/project disclosures.
- Funding/valuation: company/investor announcements, filings, tier-one coverage, debt/project finance sources, secondary/tender reports.
- Unit economics: public-company comps, customer case studies, cost benchmarks, partner terms, channel fees, manufacturing cost data, reimbursement/pricing schedules, loan/credit metrics, utilization data.
- Adverse checks: burn concerns, margin compression, pricing pressure, regulation, defaults/losses, inventory issues, cost overruns, failed projects, recalls, reimbursement cuts, customer concentration.

## Domain-adaptive additions

Infer the economic model, not the industry label.

- If subscription/recurring revenue drives economics, add ARR/MRR quality, contract duration, churn, NRR/GRR, expansion, CAC payback, and discounting.
- If transaction/take-rate revenue drives economics, add GMV/TPV/volume, take rate, refunds, fraud, payment/network costs, transaction frequency, and concentration.
- If physical product or hardware sales drive economics, add BOM, manufacturing yield, inventory, warranty, channel margin, logistics, returns, and scale economies.
- If services or project delivery drives economics, add backlog, milestone payments, utilization, labor leverage, delivery margin, working-capital timing, and change-order risk.
- If licensing/royalty/milestone economics drive value, add milestone payments, royalty rate, partner concentration, approval probability, and IP term.
- If lending/credit/insurance/financial risk is present, add loss rate, funding cost, delinquency, claims, reserves, capital requirements, and counterparty risk.
- If asset/project yield matters, add utilization, contracted revenue, capacity factor, offtake terms, capex, project IRR, and financing structure.
- If advertising/attention/community monetization matters, add audience quality, engagement, fill rate, CPM/CPA, creator/channel economics, and platform dependence.

## Completion check

- The `.zh.yaml` sibling passes `.github/references/zh-translation.md` checks; it is not an English copy with only metadata preserved.
- Domain reflection is explicit: identify the revenue/economic archetype(s), add supportable domain-specific unit-economics tables or figures beyond `contract.yaml`, and record gaps where public evidence is insufficient.
- Official pricing is list pricing, not realized revenue or margin.
- Every `null` unit-economics field needs a specific diligence request.
- Scenario inputs must be labeled public, estimated, or unavailable.
- Do not write generic software metrics unless the revenue model actually supports them.
- Handoff includes revenue quality, unit-economics verdict, capital intensity, and selected domain-adaptive additions.
