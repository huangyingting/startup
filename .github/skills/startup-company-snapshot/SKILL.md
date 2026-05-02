---
name: startup-company-snapshot
description: "Use when: generating 01-evidence-ledger.yaml and 02-company-snapshot.yaml. Keywords: company identity, founders, HQ, funding, leadership, investors, snapshot, evidence ledger, web_search."
user-invocable: false
---

# Startup Company Snapshot

Use this skill after `00-report-brief.yaml` exists and parses. Read `schemaPath`, `yamlSyntaxPath`, `00-report-brief.yaml`, and the shared evidence rules in `.github/references/evidence-ledger.md`.

## Outputs

Write exactly:

- `01-evidence-ledger.yaml`
- `02-company-snapshot.yaml`

## Responsibility

Initialize the shared evidence ledger and create the company snapshot. This skill is not a central research stage for the whole report; later analysis skills append their own cited sources and claims to `01-evidence-ledger.yaml`.

## Dynamic evidence use

Use targeted `web_search` for company identity and snapshot facts: official website, founding, founders, HQ, product summary, funding, valuation, stage, leadership, investors, customers, headcount, and current company status.

Parse `web_search` packets per `.github/references/evidence-ledger.md`, register retained sources and atomic claims in `01-evidence-ledger.yaml`, then cite those `claimRefs` in `02-company-snapshot.yaml`.

## `01-evidence-ledger.yaml`

Initialize the shared source and claim registry:

- Retain only source URLs cited/annotated by `web_search`.
- Create atomic `claims[]` entries for reusable external facts.
- Set `coverage.sourcesConsidered`, `coverage.sourcesRetained`, and `coverage.claimsCreated` correctly.
- Record unsupported but important identity facts in `evidenceGaps`.
- Preserve this file as the shared evidence backbone for later skills.

## `02-company-snapshot.yaml`

Create an investor-grade company snapshot with:

- `startupIntroduction` for final report reuse.
- Identity facts, founding, founders, headquarters, website, product summary, business model, stage, funding status.
- Cover metrics where supported.
- Leadership, investor base, timeline, investment highlights, and open identity questions.
- `claimRefs` for every external factual block, table, and figure.

## Handoff note

After writing, record a concise internal summary: output paths, source count, claim count, identity confidence, duplicate-check readiness, evidence gaps closed, evidence gaps remaining.
