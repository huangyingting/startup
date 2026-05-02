---
name: startup-ledger
description: "Use when: generating 100-evidence-ledger.yaml from 01-08 localEvidence. Keywords: evidence ledger, consolidation, dedupe, canonical S### C###, claimRefs."
user-invocable: false
---

# Startup Ledger

Use this skill after `01`–`08` exist, parse, and all supportable analysis gaps have either been researched by the relevant skill or documented as gaps.

## Outputs

Write exactly:

- `100-evidence-ledger.yaml` via `node scripts/consolidate-evidence.mjs <reportFolder>`

## Responsibility

Run final evidence consolidation only. Do not write `101-report-document.yaml` or `102-report-card.yaml` in this skill.

The consolidation script must:

- Read `localEvidence` from `01`–`08`.
- Deduplicate local sources and claims.
- Assign canonical `S###` and `C###` IDs.
- Rewrite `01`–`08` `claimRefs` and inline `[C###]` references to canonical IDs.
- Remove `localEvidence` unless explicitly debugging with `--keep-local`.

Do not use `web_search` to add new facts at this stage. If a report-critical fact is missing but appears supportable, route back to the relevant analysis skill so it can search, update its `localEvidence`, and rewrite its artifact first. Then rerun this skill.

## Handoff note

After writing, record a concise internal summary: output path, source count, claim count, evidence gaps, and whether claim rewrites completed.