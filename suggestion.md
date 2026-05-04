# Suggested fix for startup-research evidence thresholds

## Recommendation

The best fix is to make the workflow enforce two separate contracts clearly:

1. `minResearchQuestions` should be enforced as a real gate, not just declared in `chapters.yaml`.
2. `minLocalSources` and `minLocalClaims` should remain hard minimums for each analysis chapter.
3. `evidenceGaps[]` should explain missing public evidence, but it should not downgrade a failed minimum into a warning.
4. If exceptions are needed for thin-public-data companies, they should be explicit in config, for example with a flag such as `allowThinEvidence: true` or `minEvidenceMode: warn`.

## Why this is the best solution

Right now the configuration reads like a strict contract, but the gate behaves like a soft guideline because low source and claim counts become warnings when `evidenceGaps[]` exists. That makes the workflow harder to trust and makes report quality inconsistent across runs.

The cleanest model is:

- **Fail** when `researchQuestions < minResearchQuestions`
- **Fail** when `localSources < minLocalSources`
- **Fail** when `localClaims < minLocalClaims`
- **Warn** when `evidenceGaps[]` is missing, weak, or uninformative
- **Warn** for duplication, thin prose, or over-fragmentation

This keeps the config honest: if the file says "minimum", the implementation should enforce a minimum. It also preserves flexibility by making exceptions explicit instead of silently weakening the standard.

## Concrete implementation direction

1. Add a required `researchQuestions[]` field to each analysis artifact schema.
2. Update `.github/skills/startup-research/scripts/gate.mjs` to count and enforce `researchQuestions[]`.
3. Change the pre-ledger evidence checks so low `localSources` and `localClaims` fail by default.
4. Introduce an explicit config override for exceptional cases rather than letting `evidenceGaps[]` act as an implicit override.
