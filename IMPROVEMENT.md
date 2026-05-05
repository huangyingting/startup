# Improvement notes from concurrent unicorn report generation

This note captures issues observed while generating three new reports concurrently:

- `reports/20260505063138-cyberhaven`
- `reports/20260505063139-linear`
- `reports/20260505063140-gecko-robotics`

## What broke in practice

### 1. `finalize.mjs --skip-index` is not a strong enough completion gate

Two report folders completed `finalize.mjs --skip-index` successfully but still failed the repository validator later.

Observed failure classes:

- invalid `runDate` format in chapter files
- inconsistent `slug` values across artifacts in one folder
- malformed `chapter` blocks / wrong `chapter.number`
- invalid `sourceType`, `claim.type`, and `claim.freshness` enums in `evidence.yaml`
- missing required source fields in `evidence.yaml`
- figure `data` shapes that did not satisfy renderer/validator contracts

**Improvement:** add a report-folder validation step after finalize, or make `finalize.mjs` fail when the folder does not pass the same schema/shape checks used by `website/scripts/check-reports.mjs`.

## 2. Per-folder validation is missing from the authoring workflow

The current workflow is good at chapter gates and cross-chapter assembly, but it still lets repo-level report validation errors escape until the very end.

**Improvement:** introduce a script such as:

```bash
node .agents/skills/startup-research/scripts/validate-report.mjs <report-folder>
```

It should check exactly one folder for:

- schema validity
- enum validity
- required-field completeness
- chapter numbering / metadata consistency
- figure/table shape compatibility

That would make concurrent generation much safer, because each worker could fully validate its own folder before the shared index/website build step.

## 3. Evidence assembly is too permissive

Most of the cleanup work was in `evidence.yaml`, not in the prose sections.

Observed issues:

- malformed sources with missing `publisher`, `accessDate`, `topics`, `independence`, `reputationTier`
- invalid enum values
- claims with missing `statement` / `topic`
- claims with empty `sourceRefs` even though they were not `open-question`

**Improvement:** tighten validation in the evidence assembly pipeline (`ledger.mjs`, `assemble.mjs`, or an earlier normalization step) so malformed source/claim objects fail fast before final artifacts are emitted.

## 4. Figure contracts are easy to violate and hard to detect early

Several fixes were figure-only:

- matrix rows had fewer values than declared columns
- KPI/funnel/bar-style figures used non-numeric values where numbers were required
- one invalid bar figure had to be converted to a range figure
- one invalid cohort figure had to be replaced with a schema-valid structure

**Improvement:** add figure-type-specific validation at chapter gate time, using the same rules enforced later by `check-reports`. Right now chapter generation can still produce figures that look plausible but are invalid for the website.

## 5. Shared validation should not be the first full validator

In a concurrent workflow, the first repo-wide `npm run validate` should confirm a clean batch, not discover basic folder-local problems.

**Improvement:** require every report worker to pass a folder-local validator before marking the report complete. Then reserve:

- `index.mjs --strict` for shared index refresh
- `npm run validate` for final batch confirmation

## 6. The workflow would benefit from clearer agent-facing guidance

The generation agents produced good research, but some output drifted from schema conventions:

- top-level `title` where a `chapter` object was expected
- inconsistent metadata copied across chapter files
- repaired values that should have been normalized automatically

**Improvement:** update the startup-research skill instructions to say explicitly:

- do not consider a report complete after `finalize --skip-index` alone
- run the folder-local report validator before returning
- fix schema/shape problems before handing control back to the parent agent

## Recommended next changes

1. Add a single-report validation script that reuses the website validator logic.
2. Make `finalize.mjs` optionally call that validator, especially in `--skip-index` mode.
3. Tighten `evidence.yaml` object validation before assembly writes final artifacts.
4. Reuse website figure-shape validation rules during chapter gating.
5. Update the startup-research skill docs so concurrent workers know the expected completion bar.

## Additional improvements from the Stripe / Databricks / Rippling batch

This second concurrent batch completed cleanly and produced:

- `reports/20260505073001-stripe`
- `reports/20260505073002-databricks`
- `reports/20260505073003-rippling`

Even though the batch succeeded, the execution exposed a few workflow mismatches worth fixing.

### 7. "Green finalize" does not mean the same thing as "few unanswered questions"

The batch finalized cleanly, but the published index still shows a large spread in unresolved-question counts:

- Stripe: `unresolvedQuestionCount: 0`
- Databricks: `unresolvedQuestionCount: 32`
- Rippling: `unresolvedQuestionCount: 28`

This creates an ambiguous completion bar. If questions that are closed out by `evidenceGaps` are considered acceptable, the published rollups should distinguish:

- unresolved but documented
- unresolved and blocking

If they are not acceptable, then `check-report` should fail or warn harder once unanswered questions exceed a report-level threshold.

**Improvement:** align the report gate, summary-card fields, and `_index.yaml` semantics so "green" does not hide large differences in question closure quality.

### 8. Duplicate-analysis drift is still reaching final reports

`reports/_postmortem.yaml` shows `acknowledgedDimensions: [duplicateAnalysis]` at the Databricks run level and across several Databricks chapters. That means duplication was known and tolerated rather than prevented.

**Improvement:** move duplicate-analysis detection earlier in the authoring loop. Two good options:

1. add a pre-finalize cross-chapter redundancy pass that flags overlapping tables/figures before `report-meta.yaml` authoring
2. strengthen chapter prompts so adjacent chapters explicitly avoid re-covering the same comparison or sizing artifact unless the analytical question is different

### 9. Adverse-source coverage is too easy to satisfy unevenly

The Stripe report passed with very low adverse-source density outside the risk chapter:

- run-level `adversePct: 0.033`
- six chapters had `adverseSources: 0`

That is not necessarily wrong for Stripe, but it suggests the current gates are better at forcing adverse *questions* than adverse *evidence* distribution.

**Improvement:** add either:

- a minimum adverse-source floor for a subset of non-risk chapters (`company-overview`, `financials`, `customers`, `valuation`), or
- a report-level warning when adverse evidence is concentrated in only one or two chapters

That would make adverse coverage feel less box-checking and more structurally embedded in the report.

### 10. `npm run validate` is no longer a full report validator

In this execution, `npm run validate` ran:

- `npm run check:workflow-config`
- `npm run check:report-index`
- `npm --prefix website run build`

It did **not** run a dedicated report-artifact validator such as `check:reports`.

That means the command name now implies broader coverage than it actually provides.

**Improvement:** either:

- add `npm run check:reports` back into `npm run validate`, or
- rename/document the command so contributors do not assume report YAML contracts are being checked when they are not

### 11. Postmortem should expose deduped vs raw evidence counts together

The final summaries and the postmortem use different evidence totals:

- Stripe: summary-card `111` sources vs postmortem `210`
- Databricks: summary-card `178` sources vs postmortem `217`
- Rippling: summary-card `172` sources vs postmortem `217`

The difference is probably raw chapter-local totals versus deduped ledger totals, but the files do not make that obvious.

**Improvement:** make the postmortem explicitly publish both:

- raw chapter-local source/claim totals
- deduped report-level source/claim totals

That would make execution review much easier and prevent false alarms when counts do not line up across artifacts.

## Updated recommended next changes

1. Add a single-report validation script that reuses the website validator logic.
2. Make `finalize.mjs` optionally call that validator, especially in `--skip-index` mode.
3. Tighten `evidence.yaml` object validation before assembly writes final artifacts.
4. Reuse website figure-shape validation rules during chapter gating.
5. Align unanswered-question semantics across `check-report`, `summary-card.yaml`, and `reports/_index.yaml`.
6. Push duplicate-analysis detection earlier so redundancy is prevented, not merely acknowledged.
7. Strengthen adverse-evidence distribution checks across chapters, not just adverse-question counts.
8. Restore report-artifact validation to `npm run validate`, or rename the command to match its true scope.
9. Publish raw and deduped evidence totals side by side in `_postmortem.yaml`.
