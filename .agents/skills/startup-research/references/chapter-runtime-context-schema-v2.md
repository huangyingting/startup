# Chapter runtime context contract (`chapter-runtime-context-v2`)

Schema reference for the JSON object emitted by `scripts/load-chapter-runtime-context.mjs`.

The chapter runtime context is the report-writing agent's per-chapter runtime projection. It does not own workflow-config fields, report artifact fields, enum catalogs, checker algorithms, or renderer contracts. It exposes those authorities in one context object and records where each authority lives.

## Top-level shape

```yaml
schemaVersion: chapter-runtime-context-v2
generatedFrom: <absolute path to references/workflow-config.yaml>
contractSources: contractSources
workflow: workflowProjection
vocabularies: object
checkDimensions: [checkDimension]
rendererContracts: rendererContracts
previousChapter: compactChapter | null
chapter: compactChapter
nextChapter: compactChapter | null

# Present only when loaded with context.
contextChapters: [contextChapter]
cumulativeContext: cumulativeContext
runCache: runCache
```

`load-chapter-runtime-context.mjs` can also emit:

- `chapter-runtime-context-list-v2` when called with `--list`. It replaces `chapter`, `previousChapter`, and `nextChapter` with `chapters: [compactChapter]`.
- An array of `chapter-runtime-context-v2` objects when called with `--all`.
- A raw `compactChapter` object when called with `--no-workflow`.

## Contract sources

Repository-relative pointers to the files that own each part of the runtime context.

```yaml
contractSources:
  workflowConfig: references/workflow-config.yaml
  workflowConfigSchema: references/workflow-config-schema-v1.md
  reportSchema: references/report-schema-v2.md
  runtimeContextSchema: references/chapter-runtime-context-schema-v2.md
  yamlRules: references/yaml-rules.md
  vocabularies: scripts/validation-catalog.mjs
  checkDimensions: scripts/validation-catalog.mjs
  rendererContracts: website/src/lib/figures.mjs
```

If runtime context output and a source file disagree, fix the source file or `load-chapter-runtime-context.mjs`; do not create another prose copy of the rule.

## Provenance map

| Runtime context field | Source owner | Runtime role |
|---|---|---|
| `workflow.reportSchemaVersion` | `workflow-config.yaml` | Names the report artifact schema version this workflow writes. |
| `workflow.finalArtifacts` | `scripts/utils.mjs` | Generated final artifact filenames and artifact values. |
| `workflow.allowedReportFiles` | `workflow-config.yaml` + `scripts/utils.mjs` | Derived report-folder allowlist for chapter files, hand-authored inputs, and generated outputs. |
| `workflow.agentPolicy` | `workflow-config.yaml` | Skill-facing policy projection. |
| `workflow.totalChapters` | `workflow-config.yaml` | Derived count, present on single-chapter runtime contexts. |
| `chapter`, `previousChapter`, `nextChapter`, `chapters` | normalized `workflow-config.yaml` | Authoring brief projection. Field semantics live in `workflow-config-schema-v1.md`. |
| `vocabularies` | `scripts/validation-catalog.mjs` | Agent-readable enum catalog. |
| `checkDimensions` | `scripts/validation-catalog.mjs` | Agent-readable retry dimension and default-fix catalog. |
| `rendererContracts` | `website/src/lib/figures.mjs` | Agent-readable figure contract summary. |
| `contextChapters` | existing report YAMLs | Truncated prior-chapter context only. Full artifact shapes live in `report-schema-v2.md`. |
| `cumulativeContext` | existing report YAMLs | Advisory metrics from earlier chapters; never gates the current chapter. |
| `runCache` | `.research-cache/<runId>/` | Disclosure and refresh context written by workflow scripts. Cache file shapes live in `report-schema-v2.md`. |

## workflowProjection

```yaml
workflow:
  reportSchemaVersion: report-v2
  finalArtifacts:
    <key>:
      file: string
      artifact: string
  allowedReportFiles:
    chapterArtifacts: [string]
    handAuthored: [string]
    generated: [string]
  agentPolicy: object
  totalChapters: number | absent
```

This is a projection of workflow and artifact ownership. `agentPolicy` field semantics live in `workflow-config-schema-v1.md`. Final artifact constants live in `scripts/utils.mjs`. Report artifact shapes live in `report-schema-v2.md`.

## compactChapter

```yaml
compactChapter:
  key: string
  order: number
  letter: string
  file: string
  artifact: string
  title: string
  mission: string
  optionalContext: [string]
  contentRequirements: [string]
  plannedTables: [plannedTable]
  plannedFigures: [plannedFigure]
  evidenceStrategy: [string]
  qualityBar: [string]
  gate: gate
```

`compactChapter` is the normalized authoring brief from `workflow-config.yaml`. It intentionally does not define the generated chapter YAML shape. The generated analysis artifact shape lives in `report-schema-v2.md`.

`chapter.gate` is already merged with `defaultGate` and includes derived values such as `minAdverseSources`. Consumers should read the gate from the runtime context and should not recompute workflow normalization.

## Vocabularies

`runtimeContext.vocabularies` is the JSON-friendly export of the canonical catalogs in `scripts/validation-catalog.mjs`. The runtime context schema owns only the field name; the module owns keys, values, and changes.

```yaml
vocabularies: object
```

## Check dimensions

```yaml
checkDimensions:
  - dimension: string
    precedenceRank: number
    defaultFix: string | null
    suppressedBy: [string]
```

`scripts/validation-catalog.mjs` owns the dimension catalog. Checker JSON output owns concrete failures, object-specific fixes, and retry ordering for a run.

## Renderer contracts

```yaml
rendererContracts:
  figureTypes: [string]
  figureLayouts: [string]
  figureDataFields: [string]
  figureContracts: object
  figureAllowedPopulatedFields: object
```

This is an agent-readable summary of `website/src/lib/figures.mjs`. The renderer and validators keep owning executable figure behavior.

## Context chapter

`contextChapters[]` is compact context for optional prior chapters. It is not a full embedded report artifact.

```yaml
contextChapters:
  - key: string
    file: string
    status: loaded | missing | parseError | unknownKey
    error: string | null
    artifact: string | null
    title: string | null
    summary: string | null
    sections:
      - id: string
        title: string
        claimRefs: [string]
    tables:
      - id: string
        title: string
        claimRefs: [string]
    figures:
      - id: string
        title: string
        type: string
        claimRefs: [string]
```

Read the full chapter artifact from disk when section bodies, table rows, figure data, or local evidence are needed.

## Cumulative context

Advisory metrics aggregated from earlier chapters. These values never gate the current chapter.

```yaml
cumulativeContext:
  note: string
  cumulativeUnresolvedQuestions: number
  cumulativeRestrictedAccessPct: number
  earlierChapters:
    - file: string
      status: loaded | missing
      unanswered: number | null
      sources: number | null
      restricted: number | null
```

## Run cache

Loaded from `.research-cache/<runId>/`. For `disclosureHint` and `refreshContext` file shapes, see `report-schema-v2.md`.

```yaml
runCache:
  cacheDir: string | null
  runId: string
  companySlug: string | null
  disclosureHint: object | null
  refreshContext: object | null
```

## Intentionally absent

- Report-meta judgment fields. They live in `report-meta.yaml` and are defined by `report-schema-v2.md`.
- Full prior-run chapter YAML bodies. Refresh context carries a summary-card snapshot only.
- Cross-chapter canonical claim ids. Chapters write local IDs; `build-evidence-ledger.mjs` consolidates after chapter generation.
