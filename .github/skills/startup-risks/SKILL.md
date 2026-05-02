---
name: startup-risks
description: "Use when: generating 07-risk-regulatory.yaml and 07-risk-regulatory.zh.yaml. Keywords: regulatory risk, legal risk, security incidents, operational risk, compliance, mitigation."
user-invocable: false
---

# Startup Risks

Seventh analysis stage. Build the regulatory, legal, security, operational, and thesis-break risk record.

## Read first

- `01-company-snapshot.yaml`
- `05-product-technology.yaml`, `06-customer-retention.yaml`, and `04-financial-unit-economics.yaml` when product/security, customer concentration, or financial exposure shapes risk.
- `.github/references/analysis-skill-conventions.md`

## Outputs

- `07-risk-regulatory.yaml`
- `07-risk-regulatory.zh.yaml`

## Focus

- Severity-ranked risk overview.
- Regulatory/legal exposure by jurisdiction, sector rules, filings, lawsuits, and enforcement signals.
- Partner, supplier, banking, cloud, model, data, or platform concentration.
- Credit, fraud, counterparty, macro, or default risk when business model requires it.
- Security, privacy, compliance, outages, integrations, AI/model error, operational, platform, and competitive risks.
- Mitigations, residual risk, financial/valuation transmission, stop-loss triggers, kill criteria, and diligence asks.

## Evidence targets

- Official trust/security/privacy/terms/DPA/compliance/status/incident/responsible-use/legal/subprocessor pages.
- Legal filings, regulators, court material, incident/status history, reputable adverse reporting, partner concentration evidence, mitigation/governance evidence.

## Section evidence acquisition

Use `web_search` to find adverse/current risk evidence; use `fetch-url` on the strongest primary or independent URL before assigning severity.

- Risk register: legal, regulatory, security, operational, partner, customer, financial, competitive risks.
- Regulatory/legal: lawsuits, settlements, agency actions, rules, licensing, filings, court/regulator pages.
- Security/privacy/compliance: trust center, SOC/ISO/HIPAA/BAA/DPA, subprocessors, incidents, breaches.
- Concentration: cloud, banking, model, data, distribution, channel, dependency terms.
- Operational/product: outages, regressions, failures, misuse, policy enforcement, complaints.
- Mitigation/stop-loss: controls, governance, management response, measurable kill criteria.

## Required tables and figures

- Risk register with dated evidence, status, likelihood, severity, mitigation, residual exposure, and investment impact.
- Regulatory/legal risk table.
- Partner/concentration risk table.
- Operational/security risk table.
- Kill criteria / stop-loss trigger table.
- Preferred figures: `risk-heatmap`, `matrix`, or `risk-transmission-map` with labeled nodes/edges.

## Completion check

- Adverse/disconfirming searches are mandatory.
- For each top risk, ask one source-finding query and one impact/mitigation query before assigning severity.
- Where active litigation, regulatory posture, certifications, incidents, or concentration cannot be confirmed, record the exact diligence path.
- Handoff includes top risks and risk rating signal.
