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

## Dynamic evidence use

You may use `web_search` directly to perform research for missing regulatory, legal, litigation, compliance, security incident, operational, credit, competitive, geopolitical, or mitigation facts. Parse packets per `.github/references/evidence-ledger.md`, write cited sources/claims to `07-risk-regulatory.yaml.localEvidence`, then cite those local `claimRefs` in `07`.

Immediately after each `web_search` call, emit a visible run-log line, not YAML, using this shape: `[web_search debug] skill=startup-risks call=<n> query="<query>" citedUrls=<count> retainedSources=<count> outcome="<used|gap>"`. This debug line is only for the chat/workflow transcript and must not be written into report artifacts.

Do not invent legal outcomes, regulatory posture, security incidents, or mitigations. If targeted searches do not produce cited evidence, keep the gap visible.

## Output focus

Structure this as an investor-grade risk chapter:

- Risk overview and severity ranking.
- Regulatory/legal risk and jurisdiction-specific exposure.
- Security, privacy, operational, credit, platform, and competitive risks.
- Mitigation evidence and residual risk.
- Kill criteria and unresolved diligence asks for risk reduction.

Expected table families unless unavailable with a documented gap: risk register, regulatory/legal risk, operational/security risk, competitive risk, mitigation framework, kill criteria, risk diligence asks.

## Figure rules

- Use `risk-heatmap` / `matrix` with `data.columns[]` and `data.rows[].values[]`.
- Use `risk-transmission-map` with `data.nodes[]` and `data.edges[]` when causal propagation matters.
- Use canonical renderer fields only; do not invent primary fields.

## Handoff note

After writing, record a concise internal summary: output path, top risks, risk rating signal, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls made with query labels or `web_search: not called`.
