---
name: startup-financials
description: "Use when: generating 04-financials.yaml. Keywords: revenue, pricing, unit economics, CAC, LTV, margins, burn, funding, projections."
user-invocable: false
---

# Startup Financials

## Role and ownership

Analysis artifact `04`. This skill owns the financial and unit-economics chapter. It must explain how the company makes money, what unit drives margin, how capital intensive the model is, and which financial inputs remain missing. It does not own market sizing, customer retention proof, product architecture, or final valuation stance.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Optional coordination context:

- `02-market-analysis.yaml` and `03-competitors.yaml`, when already available, for market, pricing, GTM, or competitor interpretation; do not block financial analysis on these artifacts.

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `04-financials.yaml`

## Skill workflow

- Follow the common chapter workflow in `.github/references/analysis-rules.md`.
- Apply that workflow to this skill's mission, required content specification, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check.
- Use optional coordination context only when already available; never block this chapter on peer artifacts.
- Write only `04-financials.yaml`; route facts owned by other chapters back through `startup-research`.

## Chapter mission

Answer: What is the revenue model, what are the cost and margin drivers, what unit economics can be supported, how much capital is needed, and what financial evidence is insufficient for underwriting?

## Required content specification

Cover these universal topics:

- Revenue streams, pricing model, revenue recognition issues, and revenue mix where supportable.
- GTM motion and sales efficiency: sales cycle, pipeline quality, channel economics, CAC/payback or proxy signals, sales productivity, partner/channel dependency, and explicit gaps where private metrics are unavailable.
- Cost structure, gross margin drivers, contribution margin logic, working capital, capex, inventory, partner/channel costs, or service-delivery costs.
- Public traction: revenue, ARR/run-rate, GMV/volume, units, backlog, bookings, locations, utilization, active users, or other business-model-specific financial proxies.
- Funding, valuation, debt/credit/project finance, burn/runway, cash needs, and financing dependency.
- Unit economics: CAC, LTV, payback, retention/expansion, loss rates, utilization, take rate, BOM, store economics, project margin, royalty economics, or explicit gaps.
- Scenario/projection support only when assumptions are source-backed; otherwise show missing inputs.
- Financial verdict: revenue quality, margin path, capital intensity, and diligence blockers.

## Required tables

- **Revenue streams table** — stream, mechanism, unit, current value/status, evidence, quality note, diligence request.
- **Pricing / monetization table** — price/unit/contract terms, list vs realized pricing, discounts/unknowns, source.
- **GTM / sales efficiency table** — motion/channel, sales cycle or conversion proxy, CAC/payback/proxy, channel cost, evidence, limitation, diligence request.
- **Unit economics table** — metric, value/null, confidence, why it matters, evidence or diligence ask.
- **Funding / capital needs table** — round/debt/facility/project capital, amount, date, participants, use of funds, runway/capex implication.
- **Margin / cost-driver bridge table** — cost driver, direction, evidence, sensitivity, margin implication.
- **Public financial gaps table** — missing private metrics, impact, exact diligence path.

## Required figures

- **Revenue model bridge** — `type: flow` or `waterfall`; show how customer activity converts into revenue and gross profit.
- **Unit economics bridge** — `type: bridge` when inputs exist; otherwise use qualitative nodes and explicit `approximationNotes`.
- **Revenue / volume / margin trend** — `type: bars` or `scatter` when source-backed numeric values exist; otherwise replace with a revenue-quality or margin-driver `matrix`/`flow` and record the missing trend input.
- **Financial estimate range** — `type: range` for revenue, burn, runway, margin, or valuation-input ranges with explicit source-backed bounds.
- **Capital intensity / cash-flow map** — `type: flow`, `matrix`, or `waterfall` when capex, inventory, project finance, clinical burn, manufacturing scale-up, or credit exposure is material.

## Evidence acquisition strategy

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

## Quality bar

- Explain how activity becomes revenue, gross margin, cash need, and valuation input for this specific business model.
- Separate list pricing, company-claimed traction, independently corroborated metrics, estimates, and unavailable private data.
- Make each unit-economics row decision-relevant: why it matters, what evidence supports it, and what diligence would change it.
- Do not force SaaS metrics, marketplace metrics, or hardware metrics unless the revenue mechanism actually supports them.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Domain reflection is explicit: identify the revenue/economic archetype(s), add supportable domain-specific unit-economics tables or figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Official pricing is list pricing, not realized revenue or margin.
- Every `null` unit-economics field needs a specific diligence request.
- Scenario inputs must be labeled public, estimated, or unavailable.
- Do not write generic software metrics unless the revenue model actually supports them.
- Handoff includes revenue quality, unit-economics verdict, capital intensity, and selected domain-adaptive additions.
