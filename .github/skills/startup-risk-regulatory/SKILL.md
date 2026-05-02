---
name: startup-risk-regulatory
description: "Use when: generating 08-risk-regulatory.yaml. Keywords: regulatory risk, legal risk, security incidents, operational risk, compliance, mitigation, web_search."
user-invocable: false
---

# Startup Risk and Regulatory

Use this skill after `00`–`07` exist and parse. Read `schemaPath`, `yamlSyntaxPath`, and `00-report-brief.yaml` through `07-customer-retention.yaml`.

## Outputs

Write exactly:

- `08-risk-regulatory.yaml`

## Dynamic evidence use

You may use `web_search` directly for missing regulatory, legal, litigation, compliance, security incident, operational, credit, competitive, geopolitical, or mitigation facts. Parse packets per `.github/references/evidence-ledger.md`, append new cited sources/claims to `01-evidence-ledger.yaml`, then cite those `claimRefs` in `08`.

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

After writing, record a concise internal summary: output path, top risks, risk rating signal, figure count, table count, evidence gaps closed, evidence gaps remaining.
