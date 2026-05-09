<!-- GENERATED FILE: edit scripts/contracts/*.schema.mjs or scripts/build-contract-docs.mjs, then run npm run build:contracts. -->

# startup-research contracts

This file is generated from executable schemas and runtime catalogs. Do not hand-edit it.

## Workflow config contract

Schema version: `workflow-config-v1`

Top-level fields:
- `schemaVersion`
- `reportSchemaVersion`
- `workflow`
- `agentPolicy`
- `defaultGate`
- `reportGate`
- `adverseDistribution`
- `chapters`

Workflow-specific fields:
- `workflow.inputs`
- `workflow.conditions`
- `workflow.phases`

Derived fields emitted at runtime:
- `chapters[].file`
- `chapters[].gate.minAdverseSources`
- `workflow.allowedReportFiles (runtime projection)`

### Workflow config shape

```yaml
schemaVersion: workflow-config-v1
reportSchemaVersion: report-v2
workflow:
  inputs:
    companyName: { type: string, required: true, description: string }
    companyUrl: { type: url, required: false, description: string }
  conditions:
    - key: kebab-case
      description: string
      checkedBy: script-or-gate-name
  phases:
    - key: kebab-case
      title: string
      objective: string
      entryConditions: [conditionKey]
      exitConditions: [conditionKey]
      steps:
        - key: kebab-case
          title: string
          command: string | null
          requires: [inputKey | conditionKey | artifact.token]
          produces: [artifact.token]
          gate: string | null
          notes: [string]
agentPolicy: {...}
defaultGate: {...}
reportGate: {...}
adverseDistribution: {...}
chapters:
  - key: kebab-case
    order: number
    letter: A-Z, not S/C/T/F/Q
    title: string
    mission: string
    optionalContext: [chapterKey]
    contentRequirements: [string]
    plannedTables: [{ name, requirement, enumeration?, expectedMinRows? }]
    plannedFigures: [{ name, requirement, acceptedTypes }]
    evidenceStrategy: [string]
    qualityBar: [string]
    gate: partial defaultGate override
```

## Report artifact contract

Schema version: `report-v2`

Artifacts:
- `analysis chapter`
- `report-meta`
- `evidence`
- `full-report`
- `summary-card`

Reusable objects:
- `source`
- `claim`
- `researchQuestion`
- `searchQuery`
- `evidenceGap`
- `table`
- `figure`
- `callout`
- `coverFact`
- `companyProfile`
- `keyMetrics`
- `appendix`

Semantic validators that extend shape checks:
- `check-chapter.mjs`
- `check-report.mjs`
- `check-cross-chapter.mjs`

### Common document head

```yaml
schemaVersion: report-v2
artifact: string
slug: string
runDate: YYYY-MM-DD
company:
  name: string
```

### Analysis chapter shape

```yaml
schemaVersion: report-v2
artifact: chapterKey
slug: companySlug
runDate: YYYY-MM-DD
company: { name: string }
chapter: { number: number, title: string, summary: string }
sections: [{ id, title, body, claimRefs }]
tables: [{ id, title, columns, rows, notes, enumerationScope?, claimRefs }]
figures: [{ id, title, type, layout, summary, data, approximationNotes, claimRefs }]
callouts: [{ calloutType, title, body, claimRefs }]
localEvidence:
  searchQueries: [{ query, engine?, hits?, retainedSourceRefs }]
  researchQuestions: [{ id, question, type, targets, status }]
  sources: [{ id, publisher, title, url, date, accessDate, accessStatus, stance, sourceType, reputationTier, independence, topics, keyQuote }]
  claims: [{ id, statement, type, topic, sourceRefs, confidence, freshness, answersQuestionRefs?, contradictsClaimRefs? }]
  evidenceGaps: [{ type, severity, topic, missingEvidence, whyItMatters, diligencePath, relatedQuestionRefs?, relatedTableRefs? }]
acknowledgedWarnings: [{ dimension, reason }]
```

### Report meta shape

```yaml
slug: string
runDate: YYYY-MM-DD
company: { name, website?, sector?, stage?, headquarters?, shortDescription? }
revision: { status, refreshOfRunId, supersededByRunId, refreshReason } | null
subtitle: string | null
coverageNotes: string | null
coverFacts: [{ label, value, unit, claimRefs }] | null
companyProfile:
  summary: string
  foundedDate: YYYY-MM-DD | null
  founders: [{ name, role, background, claimRefs }]
  foundingLocation: string | null
  headquarters: string | null
  productSummary: string
  customerFocus: string | null
  businessModel: string | null
  stage: string | null
  fundingStatus: string | null
  disclosureProfile: public | private-disclosed | private-undisclosed | stealth | null
  claimRefs: [claimId]
summary:
  headline: string
  overallScore: number  # 0-10
  recommendation: cardRecommendation
  confidence: cardConfidence
  riskRating: cardRiskRating
  valuationStance: cardValuationStance
  keyMetrics: keyMetrics
  topStrengths: [string]
  topRisks: [string]
  unresolvedGaps: [string]
appendices: [appendix] | null
disclaimer: string | null
```

## Runtime context contract

Runtime schema versions:
- `chapter-runtime-context-v2`
- `chapter-runtime-context-list-v2`

Projected authorities:
- `workflow config`
- `report artifact schema`
- `validation catalog`
- `renderer contracts`
- `run cache`

### Runtime context shape

```yaml
schemaVersion: chapter-runtime-context-v2
generatedFrom: absolute path to references/workflow-config.yaml
contractSources: { workflowConfig, workflowSchema, reportSchema, runtimeContextSchema, generatedContracts, vocabularies, checkDimensions, rendererContracts }
workflow:
  reportSchemaVersion: report-v2
  inputs: {...}
  phases: [...]
  conditions: [...]
  finalArtifacts: {...}
  allowedReportFiles: { chapterArtifacts, handAuthored, generated }
  agentPolicy: {...}
  totalChapters: number
vocabularies: {...}
checkDimensions: [{ dimension, precedenceRank, defaultFix, suppressedBy }]
rendererContracts: {...}
previousChapter: compactChapter | null
chapter: compactChapter
nextChapter: compactChapter | null
contextChapters: [...]       # only with --include-context
cumulativeContext: {...}     # only with --include-context
run: { runId, companySlug, runDate }       # only with --include-context
runCache: { cacheDir, refreshContext }     # only with --include-context
```

## Validation result contract

All validation scripts should prefer this envelope for JSON output:

```yaml
ok: boolean
validator: string
artifact: string | null
reportFolder: string | null
issueCount: number
warningCount: number
issues:
  - path: string
    message: string
    dimension: string
    code: string
    severity: error
    fix: string | null
warnings:
  - path: string
    message: string
    dimension: string
    code: string
    severity: warning
retryOrder: [dimension]
suppressedDimensions: [dimension]
globalHints: [{ dimension, note, fix }]
summary: object
```

## YAML rules

- Use spaces, not tabs.
- Quote scalar strings containing colon-space (`: `) so YAML does not parse them as mappings.
- Use `null` for unknown optional values, not `N/A` or empty strings.
- Keep numeric fields numeric, not formatted strings with currency signs or commas.
- Do not use YAML anchors/aliases in report artifacts; generated reports should be explicit and portable.
