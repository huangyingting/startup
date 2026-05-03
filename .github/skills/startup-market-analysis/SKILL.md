---
name: startup-market-analysis
description: "Use when: generating 02-market-analysis.yaml. Keywords: market sizing, TAM, SAM, SOM, segments, buyers, geography, adoption, budget pools."
user-invocable: false
---

# Startup Market Analysis

## Role and ownership

Analysis artifact `02`. This skill owns the market sizing and macro chapter. It must define the market boundary, quantify the reachable opportunity as far as evidence allows, and explain adoption drivers and blockers. It does not own competitive feature benchmarking, unit economics, customer retention proof, or final valuation.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `02-market-analysis.yaml`

## Agent workflow

1. Confirm the shared identity inputs from `startup-research`: `company.name`, `slug`, `runDate`, `companyUrl` when provided, and the owning output filename.
2. Pull in prompt-derived requirements routed to this chapter; do not create repo-level templates from one-off user requirements.
3. Perform domain reflection before research: identify the relevant archetype(s), operating model, buyer/user/payer/regulator distinctions, revenue mechanism, dependencies, and failure modes.
4. Build chapter-specific research questions from the required content, required tables, required figures, evidence strategy, domain-adaptive additions, and prompt requirements.
5. Discover sources, review retained direct URLs with `fetch-url`, and include confirming, independent, freshness, and adverse/disconfirming evidence where material.
6. Convert reviewed evidence into `localEvidence.sources[]` and atomic `localEvidence.claims[]`; unsupported important facts become explicit `evidenceGaps[]` with diligence paths.
7. Draft schema-native sections, tables, callouts, and structured figures for this chapter; cite material claims with local `claimRefs` and use `null` plus explanation for unavailable private metrics.
8. Self-audit before saving: identity fields match the run, YAML parses, required tables/figures are substantive, claim refs resolve locally, domain-adaptive additions are visible, and the completion check below passes.
9. Write only this skill's owned artifact. If research uncovers a supportable fact owned by another chapter, hand it back through the orchestrator instead of editing another artifact directly.

## Chapter mission

Answer: What market is this company actually competing for, who pays, how large is the reachable opportunity, what drives adoption, what blocks adoption, and what market facts matter for valuation?

## Required content specification

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

## Evidence acquisition strategy

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

## Quality bar

- Define the market boundary before sizing it: included spend, excluded spend, buyer, payer, geography, and use case must be explicit.
- Use multiple sizing/adoption lenses when evidence permits; do not rely on one broad TAM headline.
- Tie growth drivers and constraints to adoption timing, budget ownership, and valuation relevance.
- Preserve contradictory estimates or failed sizing paths as diligence gaps instead of inventing precision.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Domain reflection is explicit: identify the market archetype(s), add supportable domain-specific sizing/adoption tables or figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Do not rely on one generic TAM estimate or call the market “large” without boundary logic.
- If SAM/SOM cannot be isolated, preserve failed sizing paths and diligence asks instead of inventing precision.
- Every major chart number must match a source-backed table number or state its transformation in `approximationNotes`.
- Handoff includes market attractiveness, chosen domain-adaptive additions, and unresolved sizing gaps.
