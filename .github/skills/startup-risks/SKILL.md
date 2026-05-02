---
name: startup-risks
description: "Use when: generating 07-risk-regulatory.yaml. Keywords: regulatory risk, legal risk, security incidents, operational risk, compliance, mitigation, web_search."
user-invocable: false
---

# Startup Risks

Use this skill after `01` and the risk-relevant analysis artifacts exist and parse. Read `schemaPath`, `yamlSyntaxPath`, `01-company-snapshot.yaml`, and only the upstream artifacts needed for the risk at hand, such as product/security context from `05-product-technology.yaml`, customer concentration from `06-customer-retention.yaml`, or financial exposure from `04-financial-unit-economics.yaml`.

## Outputs

Write exactly:

- `07-risk-regulatory.yaml`
- `07-risk-regulatory.zh.yaml` (Simplified Chinese sibling)

## Dynamic evidence use

Use targeted web research and direct page reads for missing regulatory, legal, litigation, compliance, security-incident, operational, credit, competitive, geopolitical, or mitigation facts. Register retained sources/claims in `07-risk-regulatory.yaml.localEvidence` and cite local `claimRefs` in `07`. Parse `web_search` packets per `.github/references/evidence-ledger.md`; log each `web_search` call.

Mine official trust/security, privacy, terms, DPA, compliance, status, incident-history, responsible-use, regulatory, legal-notice, subprocessor, and security-doc pages. Use them for stated controls and mitigations; corroborate legal outcomes, incidents, regulatory posture, and certifications with independent legal, regulator, filing, or security sources. If reports are gated, record the gap and diligence path.

Treat `currentDate` as the freshness anchor for lawsuits, regulatory inquiries, enforcement actions, security incidents, policy changes, safety incidents, outages, geopolitical exposure, and mitigation claims. Use complete-sentence questions tied to the specific risk register row or narrative paragraph, for example: `What active lawsuits, regulatory investigations, safety concerns, or security incidents affect <companyName> as of <currentDate>, and what is their likely underwriting impact?` Avoid keyword-only searches. Include disconfirming/adverse searches by default; risk work is incomplete without them.

Before writing `07`, ask multiple risk-specific questions covering active/resolved litigation, regulatory inquiries, proposed laws, enforcement, security/privacy incidents, compliance, outages, model failures, partner concentration, credit/counterparty exposure, geopolitical exposure, and mitigations. For every top risk row, ask one source-finding and one impact/mitigation question before assigning severity.

Do not invent legal outcomes, regulatory posture, security incidents, or mitigations. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade risk chapter:

- Risk overview and severity ranking.
- Detailed raw risk evidence retained in this artifact: dated legal/regulatory items, active and resolved proceedings, security/privacy facts, incident history, mitigation evidence, risk-transmission logic, conflicting reports, and unresolved diligence asks.
- Regulatory/legal risk and jurisdiction-specific exposure, including sector-specific rules, proposed regulations, state/local exposure, licensing, filings, lawsuits, and enforcement signals where relevant.
- Partner, supplier, banking, cloud, model, data, or platform concentration risk where relevant.
- Credit, fraud, counterparty, macroeconomic, or default-risk framework when the business model has financing, lending, payments, or balance-sheet exposure.
- Security, privacy, compliance certifications, technology outage, integration failure, AI/model error, operational, platform, and competitive risks.
- Mitigation evidence, residual risk, risk transmission to financials/valuation, and management response.
- Kill criteria, stop-loss triggers, and unresolved diligence asks for risk reduction.

Expected table families unless unavailable with a documented gap: risk register, regulatory/legal risk, partner/concentration risk, credit/counterparty risk when relevant, operational/security risk, competitive threat assessment, mitigation framework, kill criteria/stop-loss triggers, risk diligence asks.

## Figure rules

- Use `risk-heatmap` / `matrix` with `data.columns[]` and `data.rows[].values[]`. `data.columns[]` lists X-axis labels; `row.label` is the Y-axis (risk) name. **`row.values.length` must equal `data.columns.length`** (one value per column). Do not include the row identifier (e.g. `Risk`) as the first column — the row name lives in `row.label`, not in `columns[]`.
- Use `risk-transmission-map` with `data.nodes[]` and `data.edges[]` when causal propagation matters.
- Use canonical renderer fields only; do not invent primary fields.

## Simplified Chinese sibling

Immediately after writing `07-risk-regulatory.yaml`, write `07-risk-regulatory.zh.yaml` as its full Simplified Chinese translation, following `.github/references/zh-translation.md`. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field including `chapter.title`, `chapter.summary`, callouts, sections, table cells, figure node detail, and notes. Do not move on to the next skill until both English and Chinese files exist and pass the residual-English sweep and structural-parity checks.

## Handoff note

After writing, record a concise internal summary: output path, top risks, risk rating signal, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
