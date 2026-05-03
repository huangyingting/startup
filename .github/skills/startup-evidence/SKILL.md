---
name: startup-evidence
description: "Use when: generating 90-evidence.yaml from 01-08 localEvidence. Keywords: evidence ledger, consolidation, dedupe, canonical S### C###, claimRefs."
user-invocable: false
---

# Startup Evidence

Consolidation stage. Generate canonical sources/claims only after `01`–`08` exist, parse, and have sufficient local evidence.

## Output

- `90-evidence.yaml` via `node scripts/build-evidence-ledger.mjs <reportFolder>`
- The script also rewrites `claimRefs` and inline `[C###]` references inside `01`–`08`, and removes `localEvidence` unless `--keep-local` is passed.

## Do not

- Do not gather new facts.
- Do not write `91-full-report.yaml` or any card artifact.
- Do not hand-write canonical `S###` or `C###` IDs.

## Pre-consolidation audit

Before consolidation, each `01`–`08` artifact must already have passed its own chapter-scoped audit:

```text
node scripts/check-chapter-readiness.mjs <reportFolder> <01-08-artifact.yaml> --pre-ledger
```

For each artifact, verify:

- `localEvidence.sources[]` contains retained, reviewed URLs or cited search annotations.
- `localEvidence.claims[]` contains atomic claims, not paragraph summaries.
- Each artifact passes the shared evidence-depth gate, or has explicit `evidenceGaps[]` explaining why public evidence cannot support the expected source/claim depth.
- Claims pass reflection: each one is necessary for a section/table/figure/gap, exactly supported by its `sourceRefs`, honestly typed, fresh enough for its topic, and not a bundled multi-fact summary.
- Material sections, tables, figures, and callouts have local `claimRefs`.
- Volatile critical facts are current/recent or explicitly listed as gaps.
- Source diversity fits the domain skill.
- The artifact shows domain reflection: selected domain-adaptive additions appear in sections, tables, figures, or evidence gaps rather than only satisfying the skill's universal requirements.

If evidence is empty, placeholder-like, or just enough to pass schema shape, stop and route back to the owning skill.

## Consolidation expectations

The script must:

- Deduplicate sources and claims.
- Assign canonical `S###` and `C###` IDs.
- Rewrite `01`–`08` `claimRefs` and inline `[C###]` references to canonical IDs.
- Remove `localEvidence` unless debugging with `--keep-local`.
- Preserve only schema-allowed enum values.

## Enum normalization

Evidence field vocabulary should follow `.github/references/report-schema-v2.md`. Do not introduce new source types, claim types, freshness labels, corroboration labels, or evidence-quality labels unless the schema reference is updated first.

## Completion check

- Output path exists and parses.
- Source count, claim count, evidence gaps, and claim rewrites are internally summarized.
- Downstream artifacts must use canonical claim IDs only.
