---
name: startup-snapshot
description: "Use when: generating 01-company-snapshot.yaml with local evidence. Keywords: company identity, founders, HQ, funding, leadership, investors, snapshot, localEvidence, web_search."
user-invocable: false
---

# Startup Snapshot

Use this skill as the first report artifact stage after `reportFolder` exists. Read `schemaPath`, `yamlSyntaxPath`, company name, optional company URL, `runTimestamp`, `reportFolder`, and the evidence rules in `.github/references/evidence-ledger.md`.

## Outputs

Write exactly:

- `01-company-snapshot.yaml`

## Responsibility

Create the company snapshot and its local evidence. This skill does not write `100-evidence-ledger.yaml`; `startup-ledger` consolidates all local evidence into the final ledger after `01`–`08` exist.

## Dynamic evidence use

Use targeted `web_search` to perform research for company identity and snapshot facts: official website, founding, founders, HQ, product summary, funding, valuation, stage, leadership, investors, customers, headcount, and current company status.

Parse `web_search` packets per `.github/references/evidence-ledger.md`, register retained sources and atomic claims under `01-company-snapshot.yaml.localEvidence`, then cite those local `claimRefs` in `01-company-snapshot.yaml`.

## `localEvidence`

Initialize the local source and claim registry:

- Retain only source URLs cited/annotated by `web_search`.
- Create atomic `claims[]` entries for reusable external facts.
- Set `localEvidence.coverage.sourcesConsidered` correctly.
- Record unsupported but important identity facts in `evidenceGaps`.
- Local `S###` and `C###` IDs are scoped to this file and may start at `S001` / `C001`.

## `01-company-snapshot.yaml`

Create an investor-grade company snapshot with:

- `startupIntroduction` for final report reuse.
- Identity facts, founding, founders, headquarters, website, product summary, business model, stage, funding status.
- Cover metrics where supported.
- Leadership, investor base, timeline, investment highlights, and open identity questions.
- Local `claimRefs` for every external factual block, table, and figure.

## Handoff note

After writing, record a concise internal summary: output paths, source count, claim count, identity confidence, duplicate-check readiness, evidence gaps closed, evidence gaps remaining.
