---
name: startup-brief
description: "Use when: generating 00-report-brief.yaml. Keywords: report brief, research scope, chapter needs, expected tables, expected figures, source strategy."
user-invocable: false
---

# Startup Brief

Use this skill at the start of every `Startup Research` run. It defines scope and downstream research needs before evidence gathering begins.

## Inputs

Read `schemaPath`, `yamlSyntaxPath`, company name, optional company URL, `runTimestamp`, and `reportFolder`.

## Outputs

Write exactly:

- `00-report-brief.yaml`

## Responsibility

Create the report plan only. Do not own the evidence ledger and do not write company snapshot facts here.

`00-report-brief.yaml` should include:

- Report scope and company identity inputs.
- `researchQuestions` keyed to artifacts `02`–`10`.
- `expectedTables` and `expectedFigures` for each downstream chapter.
- `sourceStrategy` with query angles and source buckets needed by later skills.
- Initial `evidenceGaps` for facts likely to need targeted search.

## Scope checklist

Cover downstream needs for:

- `02` identity, founding, founders, HQ, stage, funding, leadership, investors, headcount, cover metrics.
- `03` market definition, TAM/SAM/SOM, growth drivers, segmentation, geography.
- `04` named competitors, substitutes, feature/pricing comparisons, share signals, moat.
- `05` revenue model, pricing, ARR/run-rate, growth, margin, CAC/LTV/payback, burn, funding.
- `06` product modules, AI/automation, architecture, integrations, roadmap, security/compliance.
- `07` named customers, case studies, segmentation, retention/NRR/churn, satisfaction, concentration.
- `08` regulatory regime, filings, lawsuits, security incidents, operational/competitive risks.
- `09` last round terms, valuation marks, public/private comparables, IPO readiness.
- `10` appendices: management-team backgrounds, investor base, financial/projection anchors, competitive feature details, source caveats, unresolved diligence asks.

## Handoff note

After writing, record a concise internal summary: output path, downstream chapter priorities, expected evidence bottlenecks, and source strategy highlights.
