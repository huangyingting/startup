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

## Pre-consolidation evidence audit

Before running `scripts/consolidate-evidence.mjs`, inspect each `01`–`08` artifact's `localEvidence` and stop if any stage has empty, placeholder, or obviously thin evidence. For each artifact, verify:

- `localEvidence.sources[]` contains retained URLs that were either directly reviewed or came from cited `web_search` annotations.
- `localEvidence.claims[]` contains atomic claims, not paragraph summaries.
- Every material table, figure, callout, and section has `claimRefs` that resolve to local claims.
- Report-critical volatile facts have current/recent evidence or an explicit `evidenceGaps` item.
- The source mix fits the domain skill's source collection quality gate.

If most artifacts have just enough generic claims to satisfy schema shape, or if any artifact lacks chapter-specific source diversity, route back to the owning skill. Consolidation should never turn thin local evidence into a polished-looking final ledger.

## Enum fields

Claim and source enum fields are closed; consolidation must preserve only allowed tokens. If an artifact's `localEvidence` uses a non-canonical value, normalize it during consolidation rather than copying it through.

- `claimType`: `observed` | `company-claimed` | `third-party-reported` | `estimated` | `inferred` | `open-question` | `conflicting`
- `freshness`: `current` | `recent` | `historical` | `unknown`
- `corroboration`: `single-source` | `multi-source` | `conflicting` | `none`
- `sourceType`: `official` | `filing` | `regulatory` | `tier-one-news` | `trade-press` | `analyst-market-data` | `technical-docs` | `customer-proof` | `partner-proof` | `developer-signal` | `review` | `legal` | `other`
- `reputationTier`: `high` | `medium` | `low`
- `independence`: `company` | `partner` | `customer` | `competitor` | `independent` | `unknown`
- `confidence`: `high` | `medium` | `low`

Common mappings: a partner's first-party statement about the target company is `third-party-reported` (not `partner-claimed`); a derived multiple or arithmetic result is `estimated` (not `calculated`).

## Handoff note

After writing, record a concise internal summary: output path, source count, claim count, evidence gaps, and whether claim rewrites completed.
