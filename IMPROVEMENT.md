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
