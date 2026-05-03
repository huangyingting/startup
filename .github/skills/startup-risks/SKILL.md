---
name: startup-risks
description: "Use when: generating 07-risks.yaml. Keywords: regulatory risk, legal risk, security incidents, operational risk, compliance, mitigation."
user-invocable: false
---

# Startup Risks

## Role and ownership

Analysis artifact `07`. This skill owns the risk and regulatory chapter. It must identify what can break the thesis and how each risk transmits into customers, margins, financing, operations, or valuation. It does not own final recommendation or valuation method selection.

## Inputs and dependencies

Required references:

- `.github/references/report-schema-v2.md`
- `.github/references/yaml-rules.md`
- `.github/references/analysis-rules.md`

Optional coordination context:

- `05-product-tech.yaml`, `06-customers.yaml`, and `04-financials.yaml`, when already available, for product/security, customer concentration, or financial exposure context; do not block risk analysis on these artifacts.

Inputs from `startup-research`:

- Resolved `company.name`, `slug`, `runDate`, `companyUrl` when provided, `reportFolder`, and any prompt-derived requirements routed to this chapter.

## Output

- `07-risks.yaml`

## Skill workflow

- Follow the common chapter workflow from the required analysis rules reference.
- Apply that workflow to this skill's mission, required content specification, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, quality bar, and completion check.
- Use optional coordination context only when already available; never block this chapter on peer artifacts.
- Write only `07-risks.yaml`; route facts owned by other chapters back through `startup-research`.

## Chapter mission

Answer: What legal, regulatory, operational, technical, financial, partner, customer, safety, or execution risks could impair the company, how severe are they, what mitigates them, and what kill criteria should investors monitor?

## Required content specification

Cover these universal topics:

- Severity-ranked risk overview with likelihood, impact, mitigation maturity, residual exposure, and investment implication.
- Regulatory/legal risk: licenses, permits, approvals, litigation, enforcement, policy changes, contracts, IP, privacy/data, labor, consumer protection, environmental/safety, or industry-specific obligations.
- Operational risk: supply chain, manufacturing, service delivery, logistics, reliability, incidents, outages, quality, recalls, safety, facilities, labor, utilization, insurance, and business continuity.
- People/execution risk: founder/key-person dependence, leadership churn, hiring gaps, incentive misalignment, culture/reputation issues, workforce constraints, and whether the team fits the operating complexity.
- Partner/dependency risk: supplier, distributor, cloud/platform, bank/capital provider, channel, data/model provider, regulator, contractor, payer, project finance, or key customer concentration.
- Financial/model risk: burn, capital intensity, credit/default/loss exposure, commodity/input cost, fraud, working capital, reimbursement/pricing cuts, or margin compression.
- Mitigations, monitoring indicators, thesis-break triggers, and diligence asks.

## Required tables

- **Severity-ranked risk register** — risk, evidence date/source, likelihood, severity, mitigation, residual exposure, investment impact.
- **Regulatory / legal risk table** — rule/license/case/approval, jurisdiction, status, evidence, exposure, diligence path.
- **Operational / quality / security risk table** — failure mode, evidence, likelihood, impact, controls, unresolved gap.
- **Partner / dependency risk table** — dependency, counterparty, role, concentration, failure scenario, mitigation.
- **People / execution risk table** — role/function, dependency or gap, evidence, impact, mitigation, diligence path.
- **Mitigation and kill criteria table** — risk, monitorable trigger, threshold/event, action implication.

## Required figures

- **Risk heatmap** — `type: heatmap`; show impact, likelihood, mitigation maturity, or residual severity.
- **Risk transmission map** — `type: causal-map`; show how risks flow into revenue, customers, margin, financing, operations, and valuation.
- **Regulatory / approval pathway map** — `type: flow` when approvals, licenses, permits, clinical/regulatory steps, or government procurement matter.
- **Dependency map** — `type: dependency-map`, `matrix`, or `flow`; show critical partners, suppliers, platforms, regulators, facilities, or financing dependencies.

## Evidence acquisition strategy

Apply the shared research tool usage rules. Adverse/disconfirming research is mandatory. Prioritize these chapter-specific source families:

- Official risk/control evidence: trust/security/privacy/terms/DPA/compliance/status/incident/responsible-use/legal/subprocessor pages, quality policies, certifications, recall notices, safety pages, insurance/permit disclosures.
- Primary sources: regulators, court records, clinical/regulatory databases, patent/IP offices, environmental/safety agencies, filings, procurement documents, sanctions/export-control sources, recall databases.
- Independent sources: reputable adverse reporting, security incident coverage, customer complaints, analyst risk notes, industry publications, public-company comparable risk factors.
- People/execution sources: leadership pages, executive departures, hiring patterns, layoffs, employee litigation, safety/labor records, credible employee/recruiting signals, and public founder/operator track record.
- For each top risk, find both severity evidence and mitigation/control evidence before assigning final severity.

## Domain-adaptive additions

Infer the company's real failure modes.

- If approvals/licenses/permits matter, add loss/denial/delay risk, compliance cost, regulator scrutiny, renewal timing, and jurisdiction map.
- If manufacturing or physical products matter, add quality, yield, recalls, warranty, certification, supplier concentration, safety, and field failure risk.
- If healthcare/biotech/life science matters, add clinical failure, adverse events, trial delay, FDA/EMA or local regulator path, reimbursement, safety monitoring, and IP exclusivity.
- If financial exposure exists, add credit/default/loss, fraud, AML/KYC/sanctions, capital/funding cost, counterparty, reserve, and regulatory capital risk.
- If data, software, or model dependency exists, add data rights, privacy, cybersecurity, model reliability, IP/training data, explainability, safety, misuse, and platform policy risk.
- If infrastructure/energy/industrial projects matter, add permitting, construction, commissioning, grid/site access, commodity/input cost, utilization, environmental, and project finance risk.
- If consumer/brand/physical channel matters, add product liability, reputation, channel conflict, returns, quality, labor, and demand cyclicality.
- If geopolitical supply chain matters, add tariffs, export controls, sanctions, country concentration, shipping disruption, and critical-material access.

## Quality bar

- Rank risks by thesis impact, not by generic category coverage; explain how each top risk transmits into customers, margins, financing, operations, or valuation.
- Pair severity evidence with mitigation/control evidence before assigning residual exposure.
- Include adverse, regulatory, legal, security, quality, safety, customer, and dependency searches appropriate to the domain.
- Define monitorable kill criteria or diligence paths for risks that cannot be resolved from public evidence.

## Completion check

- Minimum depth gate: at least 4 sections, 4 tables, 2 structured figures, 40 words per section body, 250 total section words, 20 total table rows, and 6 total figure data points.
- The artifact parses and has the expected `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Every material section, table, figure, and callout cites local `claimRefs` that resolve before consolidation.
- Domain reflection is explicit: identify the risk/regulatory archetype(s), add supportable domain-specific risk registers or transmission figures beyond this skill's universal requirements, and record gaps where public evidence is insufficient.
- Do not assign severity from intuition; cite evidence and mitigation for each top risk.
- Where active litigation, regulatory posture, certifications, incidents, safety, or concentration cannot be confirmed, record the exact diligence path.
- Include thesis-break triggers tied to measurable operating, regulatory, customer, financial, safety, or management events.
- Handoff includes top risks, risk rating signal, and selected domain-adaptive additions.
