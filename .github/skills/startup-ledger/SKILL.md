---
name: startup-ledger
description: "Use when: generating 100-evidence-ledger.yaml from 01-08 localEvidence. Keywords: evidence ledger, consolidation, dedupe, canonical S### C###, claimRefs."
user-invocable: false
---

# Startup Ledger

Consolidation stage. Generate canonical sources/claims only after `01`–`08` and their `.zh.yaml` siblings exist, parse, and have sufficient local evidence.

## Output

- `100-evidence-ledger.yaml` via `node scripts/consolidate-evidence.mjs <reportFolder>`

## Do not

- Do not gather new facts.
- Do not write `101-report-document.yaml` or any card artifact.
- Do not hand-write canonical `S###` or `C###` IDs.

## Pre-consolidation audit

For each `01`–`08` artifact, verify:

- `localEvidence.sources[]` contains retained, reviewed URLs or cited search annotations.
- `localEvidence.claims[]` contains atomic claims, not paragraph summaries.
- Material sections, tables, figures, and callouts have local `claimRefs`.
- Volatile critical facts are current/recent or explicitly listed as gaps.
- Source diversity fits the domain skill.

If evidence is empty, placeholder-like, or just enough to pass schema shape, stop and route back to the owning skill.

## Consolidation expectations

The script must:

- Deduplicate sources and claims.
- Assign canonical `S###` and `C###` IDs.
- Rewrite `01`–`08` `claimRefs` and inline `[C###]` references to canonical IDs.
- Remove `localEvidence` unless debugging with `--keep-local`.
- Preserve only schema-allowed enum values.

## Enum normalization

- `claimType`: `observed`, `company-claimed`, `third-party-reported`, `estimated`, `inferred`, `open-question`, `conflicting`.
- `freshness`: `current`, `recent`, `historical`, `unknown`.
- `corroboration`: `single-source`, `multi-source`, `conflicting`, `none`.
- `sourceType`: `official`, `filing`, `regulatory`, `tier-one-news`, `trade-press`, `analyst-market-data`, `technical-docs`, `customer-proof`, `partner-proof`, `developer-signal`, `review`, `legal`, `other`.
- `reputationTier`: `high`, `medium`, `low`.
- `independence`: `company`, `partner`, `customer`, `competitor`, `independent`, `unknown`.
- `confidence`: `high`, `medium`, `low`.

## Completion check

- Output path exists and parses.
- Source count, claim count, evidence gaps, and claim rewrites are internally summarized.
- Downstream artifacts must use canonical claim IDs only.
