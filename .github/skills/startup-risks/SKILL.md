---
name: startup-risks
description: "Use when: generating 07-risk-regulatory.yaml and 07-risk-regulatory.zh.yaml. Keywords: regulatory risk, legal risk, security incidents, operational risk, compliance, mitigation."
user-invocable: false
---

# Startup Risks

Seventh analysis stage. This skill owns the risk and regulatory chapter. It must identify what can break the thesis and how each risk transmits into customers, margins, financing, operations, or valuation.

## Read first

- `01-company-snapshot.yaml`
- `05-product-technology.yaml`, `06-customer-retention.yaml`, and `04-financial-unit-economics.yaml` when product/security, customer concentration, or financial exposure shapes risk.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `07-risk-regulatory.yaml`
- `07-risk-regulatory.zh.yaml`

## Chapter purpose

Answer: What legal, regulatory, operational, technical, financial, partner, customer, safety, or execution risks could impair the company, how severe are they, what mitigates them, and what kill criteria should investors monitor?

## Required chapter content

Cover these universal topics:

- Severity-ranked risk overview with likelihood, impact, mitigation maturity, residual exposure, and investment implication.
- Regulatory/legal risk: licenses, permits, approvals, litigation, enforcement, policy changes, contracts, IP, privacy/data, labor, consumer protection, environmental/safety, or industry-specific obligations.
- Operational risk: supply chain, manufacturing, service delivery, logistics, reliability, incidents, outages, quality, recalls, safety, facilities, labor, utilization, insurance, and business continuity.
- Partner/dependency risk: supplier, distributor, cloud/platform, bank/capital provider, channel, data/model provider, regulator, contractor, payer, project finance, or key customer concentration.
- Financial/model risk: burn, capital intensity, credit/default/loss exposure, commodity/input cost, fraud, working capital, reimbursement/pricing cuts, or margin compression.
- Mitigations, monitoring indicators, thesis-break triggers, and diligence asks.

## Required tables

- **Severity-ranked risk register** — risk, evidence date/source, likelihood, severity, mitigation, residual exposure, investment impact.
- **Regulatory / legal risk table** — rule/license/case/approval, jurisdiction, status, evidence, exposure, diligence path.
- **Operational / quality / security risk table** — failure mode, evidence, likelihood, impact, controls, unresolved gap.
- **Partner / dependency risk table** — dependency, counterparty, role, concentration, failure scenario, mitigation.
- **Mitigation and kill criteria table** — risk, monitorable trigger, threshold/event, action implication.

## Required figures

- **Risk heatmap** — `type: heatmap`; show impact, likelihood, mitigation maturity, or residual severity.
- **Risk transmission map** — `type: causal-map`; show how risks flow into revenue, customers, margin, financing, operations, and valuation.
- **Regulatory / approval pathway map** — `type: flow` when approvals, licenses, permits, clinical/regulatory steps, or government procurement matter.
- **Dependency map** — `type: matrix` or `flow`; show critical partners, suppliers, platforms, regulators, facilities, or financing dependencies.

## Evidence collection strategy

Adverse/disconfirming research is mandatory. Use `fetch-url` for retained primary or independent pages.

- Official risk/control evidence: trust/security/privacy/terms/DPA/compliance/status/incident/responsible-use/legal/subprocessor pages, quality policies, certifications, recall notices, safety pages, insurance/permit disclosures.
- Primary sources: regulators, court records, clinical/regulatory databases, patent/IP offices, environmental/safety agencies, filings, procurement documents, sanctions/export-control sources, recall databases.
- Independent sources: reputable adverse reporting, security incident coverage, customer complaints, analyst risk notes, industry publications, public-company comparable risk factors.
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

## Completion check

- Do not assign severity from intuition; cite evidence and mitigation for each top risk.
- Where active litigation, regulatory posture, certifications, incidents, safety, or concentration cannot be confirmed, record the exact diligence path.
- Include thesis-break triggers tied to measurable operating, regulatory, customer, financial, safety, or management events.
- Handoff includes top risks, risk rating signal, and selected domain-adaptive additions.
