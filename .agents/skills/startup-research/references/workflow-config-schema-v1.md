# Workflow config schema (`workflow-config-v1`)

Schema reference for `references/workflow-config.yaml`, the authoring-plan source for the startup-research workflow.

This file owns the shape and field semantics of the workflow config. It does not own report artifact fields, checker algorithms, enum catalogs, renderer contracts, or CLI behavior.

## Top-level shape

```yaml
schemaVersion: workflow-config-v1
reportSchemaVersion: report-v2
agentPolicy: agentPolicy
defaultGate: gate
reportGate: reportGate | null
adverseDistribution: adverseDistribution | null
chapters: [chapter]
```

`utils.loadWorkflowConfig()` validates this file, normalizes chapter order and gates, and injects derived values used by `load-chapter-runtime-context.mjs` and checkers.

## agentPolicy

Skill-facing policy that the runtime context surfaces as `runtimeContext.workflow.agentPolicy`.

```yaml
agentPolicy:
  volatileFacts: [string]
  retryPolicy:
    maxChapterRetries: number
    requireMonotonicFailureDecrease: boolean
  researchRules: [string]
  chapterAuthoringRules: [string]
  hardRules: [string]
  finalResponseFields: [string]
```

- `volatileFacts` lists fact categories that must be re-fetched every run and never copied from prior reports without verification.
- `retryPolicy` controls chapter retry discipline for the agent. Checker failure dimensions and fixes still come from `scripts/validation-catalog.mjs` and checker output.
- `researchRules`, `chapterAuthoringRules`, and `hardRules` are policy strings for the report-writing agent. They may reference runtime-context fields, but they should not duplicate report artifact schemas.
- `finalResponseFields` lists the information the final agent response should cover after a report run.

## gate

A per-chapter threshold set. `defaultGate` must be complete. Each `chapter.gate` is a partial override merged onto `defaultGate` by `utils.loadWorkflowConfig()`.

```yaml
gate:
  minSections: number
  maxSections: number
  minArtifacts: number
  maxTables: number
  maxFigures: number
  minResearchQuestions: number
  minQuestionTypeSpread: number
  minAdverseQuestions: number
  minQuestionAnswerRate: number
  minContentRequirementCoverage: number
  minLocalSources: number
  minLocalClaims: number
  minSourceDomains: number
  minNetNewSources: number
  minSourceTypeSpread: number
  requiredSourceTypes: [sourceType]
  minHighConfidenceCorroboration: number
  minSourcesPerEnumerationRow: number
  depthFloor:
    minSectionBodyWords: number
    minSectionWordsTotal: number
    minTableRowsTotal: number
    minFigureDataPointsTotal: number
```

Gate fields are workflow thresholds. The exact validation algorithms, failure dimensions, retry ordering, and default fixes are executable checker behavior, not workflow-config schema. Agents see the normalized current gate as `runtimeContext.chapter.gate`.

`requiredSourceTypes` uses the source-type vocabulary owned by `scripts/validation-catalog.mjs` and surfaced as `runtimeContext.vocabularies.sourceType`.

## reportGate

Report-level thresholds evaluated after finalization across consolidated artifacts.

```yaml
reportGate:
  minDistinctDomains: number
  requireAdverseSource: boolean
  maxPaywallPercent: number
  crossChapterTolerances:
    metricDrift: number
    keyFactOverlap: number
    duplicateOverlap: number
```

These values tune report-level and cross-chapter checks. The checkers own how failures are calculated and reported.

## adverseDistribution

Report-level adverse-source distribution policy that also creates a derived per-chapter floor.

```yaml
adverseDistribution:
  requireAtLeastOneAdverseSource: [chapterKey]
  warnIfChaptersWithAdverseSourceAtMost: number
```

`utils.loadWorkflowConfig()` injects `gate.minAdverseSources: 1` into every listed chapter and `0` into other chapters. Consumers should read the normalized gate from `runtimeContext.chapter.gate`, not recompute the injection.

## chapter

Authoring brief for one analysis chapter.

```yaml
chapters:
  - key: string
    order: number
    letter: string
    title: string
    mission: string
    optionalContext: [chapterKey]
    contentRequirements: [string]
    plannedTables: [plannedTable]
    plannedFigures: [plannedFigure]
    evidenceStrategy: [string]
    qualityBar: [string]
    gate: gate | null
```

- `key` is a stable kebab-case chapter id and becomes the chapter artifact value.
- `order` is a positive integer. The loader sorts chapters by this value.
- `letter` is the chapter's local ID-space letter for sources, claims, tables, figures, and research questions. Reserved type letters are rejected by config validation.
- `file` is not stored in the config. It is derived as `<order:02>-<key>.yaml` during normalization and surfaced in runtime contexts.
- `optionalContext` lists chapter keys whose compact prior artifacts should be included when the runtime context is loaded with context.
- `contentRequirements`, `plannedTables`, `plannedFigures`, `evidenceStrategy`, and `qualityBar` are authoring-plan data. The generated report artifact shapes remain in `report-schema-v2.md`.
- `gate` is optional and overrides `defaultGate` field-by-field.

## plannedTable

```yaml
plannedTable:
  name: string
  requirement: string
  enumeration: boolean | null
  expectedMinRows: number | null
```

`plannedTable` describes intended table coverage for the chapter. The generated report table shape (`tables[]`) belongs to `report-schema-v2.md`. Enumeration coverage values belong to `scripts/validation-catalog.mjs` and are surfaced through `runtimeContext.vocabularies.enumerationCoverage`.

## plannedFigure

```yaml
plannedFigure:
  name: string
  requirement: string
  acceptedTypes: [figureType]
```

`plannedFigure` describes intended figure coverage for the chapter. `acceptedTypes` must reference figure types owned by `website/src/lib/figures.mjs` and surfaced through `runtimeContext.rendererContracts.figureTypes`. The generated report figure shape belongs to `report-schema-v2.md`; renderer data contracts belong to `website/src/lib/figures.mjs`.

## Derived runtime-context values

The workflow config does not directly contain every field the agent receives. `load-chapter-runtime-context.mjs` derives or combines:

- `workflow.allowedReportFiles` from normalized chapter files plus shared artifact constants in `scripts/utils.mjs`.
- `workflow.finalArtifacts` from `scripts/utils.mjs`.
- `chapter.file` and merged `chapter.gate` from normalized config.
- `chapter.gate.minAdverseSources` from `adverseDistribution`.
- `vocabularies` and `checkDimensions` from `scripts/validation-catalog.mjs`.
- `rendererContracts` from `website/src/lib/figures.mjs`.
- `contextChapters`, `cumulativeContext`, and `runCache` from existing report artifacts and `.research-cache`.

## Verification

After editing `workflow-config.yaml`, run:

```bash
npm run check:workflow-config
```

Run `npm run validate` before finishing changes that affect scripts, schemas, renderers, or report contracts.
