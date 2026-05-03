---
name: startup-market
description: "Use when: generating 02-market-macro.yaml and 02-market-macro.zh.yaml. Keywords: market sizing, TAM, SAM, SOM, segments, buyers, geography, adoption, budget pools."
user-invocable: false
---

# Startup Market

Second analysis stage. This skill owns the market sizing and macro chapter. It must define the market boundary, quantify the opportunity as far as evidence allows, and show why adoption should or should not happen.

## Read first

- `01-company-snapshot.yaml`
- `.github/references/analysis-skill-conventions.md`
- `.github/references/zh-translation.md`

## Outputs

- `02-market-macro.yaml`
- `02-market-macro.zh.yaml`

## Chapter purpose

Answer: What market is this company actually competing for, who pays, how large is the reachable opportunity, what drives adoption, what blocks adoption, and what market facts matter for valuation?

## Required chapter content

Cover these universal topics:

- Market definition: included/excluded spend, adjacent categories, buyer/user/payer distinction, and status-quo substitutes.
- TAM/SAM/SOM or evidence-constrained sizing using multiple lenses rather than one broad market estimate.
- Customer segments by buyer, workflow/use case, geography, vertical, customer size, channel, or adoption maturity.
- Budget ownership and procurement/adoption path.
- Growth drivers: technology, regulation, demographic, cost, labor, supply-chain, financing, distribution, or behavioral changes.
- Adoption constraints: regulation, switching cost, reimbursement, capital intensity, implementation difficulty, trust/safety, ROI uncertainty, physical deployment, or macro cyclicality.
- Market attractiveness verdict and explicit sizing/adoption diligence gaps.

## Required tables

- **Market definition table** — segment/category, included spend, excluded spend, buyer/payer, relevance to the company.
- **TAM/SAM/SOM or sizing lens table** — source, year, geography, value, CAGR, methodology, confidence, limitation.
- **Segment / buyer map** — segment, buyer, user, payer, workflow/job-to-be-done, budget owner, adoption trigger.
- **Growth drivers and constraints table** — driver/constraint, direction, evidence, timing, implication, diligence ask.
- **Geography / channel / penetration table** — use the most relevant axis for the company; include penetration, maturity, or reach where supportable.

## Required figures

- **Market sizing lens** — `type: layered-lens`; show TAM/SAM/SOM or constrained sizing layers with numeric values when supported.
- **Market growth / sizing comparison** — `type: bars`; compare estimates, segments, geographies, or adoption proxies using numeric values only.
- **Market estimate range** — `type: range` when credible sources provide low/base/high market, penetration, or forecast ranges.
- **Buyer / segment map** — `type: matrix`, `journey-map`, or `flow`; show buyer-user-payer relationships and adoption path.
- **Adoption funnel or value-chain market map** — `type: funnel` or `flow` when purchase/deployment requires multiple steps or value-chain actors.

## Evidence collection strategy

Use search for discovery and `fetch-url` for retained direct URLs.

- Market data: analyst reports, government/industry statistics, filings, trade associations, regulatory publications, public-company disclosures, credible academic/NGO sources.
- Buyer/budget evidence: procurement pages, customer case studies, public budgets, job postings, reimbursement or tender data, channel/distribution evidence.
- Adoption/disconfirming evidence: slowdown reports, failed pilots, regulatory bottlenecks, reimbursement denials, infrastructure constraints, saturation, reviews, budget cuts, or contrary estimates.
- Company claims can define positioning, but independent or primary third-party sources should support market size and adoption constraints.

## Domain-adaptive additions

Infer the market mechanics instead of applying a fixed sector template.

- If demand is consumer-driven, add category growth, purchase frequency, channel mix, price sensitivity, brand discovery, and repeat/retention dynamics.
- If demand is enterprise/government-driven, add procurement owner, budget cycle, approval path, implementation burden, and replacement vs new-budget logic.
- If healthcare or life-science adoption is involved, add provider/patient/payer distinction, clinical workflow, reimbursement, guidelines, and regulatory adoption gates.
- If energy, infrastructure, climate, or industrial deployment is involved, add project finance, permitting, grid/site constraints, utilization, capex cycle, incentives, and commodity sensitivity.
- If marketplace/network effects matter, add supply/demand liquidity, density thresholds, multi-homing, disintermediation, and take-rate pool.
- If hardware/deeptech adoption matters, add replacement cycle, pilot-to-production conversion, certification, manufacturing capacity, and buyer risk tolerance.

## Completion check

- The Simplified Chinese sibling translates every user-visible prose field per `.github/references/zh-translation.md`; it is not an English copy with only metadata preserved.
- Domain reflection is explicit: identify the market archetype(s), add supportable domain-specific sizing/adoption tables or figures beyond `contract.yaml`, and record gaps where public evidence is insufficient.
- Do not rely on one generic TAM estimate or call the market “large” without boundary logic.
- If SAM/SOM cannot be isolated, preserve failed sizing paths and diligence asks instead of inventing precision.
- Every major chart number must match a source-backed table number or state its transformation in `approximationNotes`.
- Handoff includes market attractiveness, chosen domain-adaptive additions, and unresolved sizing gaps.
