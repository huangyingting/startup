---
name: startup-risks
description: "Use when: generating 07-risk-regulatory.yaml. Keywords: regulatory risk, legal risk, security incidents, operational risk, compliance, mitigation, web_search."
user-invocable: false
---

# Startup Risks

Run after `01` and risk-relevant analysis artifacts parse. Read `01-company-snapshot.yaml` for identity; read additional upstream artifacts only when needed for the risk at hand (product/security context from `05-product-technology.yaml`, customer concentration from `06-customer-retention.yaml`, financial exposure from `04-financial-unit-economics.yaml`). Follow `.github/references/analysis-skill-conventions.md` for inputs, evidence rules, freshness, source quality, figure conventions, the Simplified Chinese sibling, and handoff format.

## Outputs

- `07-risk-regulatory.yaml`
- `07-risk-regulatory.zh.yaml`

## Chapter focus

- Risk overview and severity ranking.
- Regulatory/legal risk and jurisdiction-specific exposure (sector-specific rules, proposed regulations, state/local exposure, licensing, filings, lawsuits, enforcement signals).
- Partner, supplier, banking, cloud, model, data, or platform concentration risk where relevant.
- Credit, fraud, counterparty, macroeconomic, or default-risk framework when the business model has financing, lending, payments, or balance-sheet exposure.
- Security, privacy, compliance certifications, technology outage, integration failure, AI/model error, operational, platform, and competitive risks.
- Mitigation evidence, residual risk, risk transmission to financials/valuation, management response.
- Kill criteria, stop-loss triggers, and unresolved diligence asks.

Each high-severity risk row needs dated evidence, current status, likelihood/severity rationale, mitigation evidence, residual exposure, and investment impact.

## Expected table families

Risk register, regulatory/legal risk, partner/concentration risk, credit/counterparty risk when relevant, operational/security risk, competitive threat assessment, mitigation framework, kill criteria/stop-loss triggers, risk diligence asks.

## Source mix

Source across official controls (trust/security/privacy/terms/DPA/compliance/status/incident-history/responsible-use/regulatory/legal-notice/subprocessor pages), legal filings or court/regulator material, privacy/security documentation, incident/status history, reputable adverse reporting, partner/concentration evidence, and mitigation/governance evidence.

## Domain-specific query angles

- Adverse/disconfirming searches are the default; risk work is incomplete without them.
- For every top risk row, ask one source-finding query and one impact/mitigation query before assigning severity.
- Use official material for stated controls and mitigations; corroborate legal outcomes, incidents, regulatory posture, and certifications independently. If reports are gated, record the gap and diligence path.
- Where active litigation, regulatory posture, safety/security incidents, or partner concentration cannot be confirmed, show the exact legal/security/compliance diligence path; do not reduce it to a generic risk warning.

## Preferred figure types

- `risk-heatmap` / `matrix` per the conventions reference (`row.values.length === data.columns.length`; row identifier lives in `row.label`).
- `risk-transmission-map` with `data.nodes[]` and `data.edges[]` when causal propagation matters.

## Handoff extras

Add `top risks` and `risk rating signal` to the standard handoff fields.
