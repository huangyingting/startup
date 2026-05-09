<!-- GENERATED FILE: edit scripts/contracts/*.schema.mjs or scripts/build-contract-docs.mjs, then run npm run build:contracts. -->

# startup-research contracts

This file is generated from executable schemas and runtime catalogs. Do not hand-edit it.

## Source-of-truth files

- Workflow config schema: `scripts/contracts/workflow-config.schema.mjs`
- Report artifact schema: `scripts/contracts/report-artifacts.schema.mjs`
- Runtime context schema: `scripts/contracts/runtime-context.schema.mjs`
- Vocabularies and retry dimensions: `scripts/validation-catalog.mjs`
- Figure renderer contracts: `website/src/lib/figures.mjs`
- Workflow config data: `references/workflow-config.yaml`

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

## Canonical vocabularies

- `sourceType`: `analyst-market-data`, `customer-proof`, `developer-signal`, `filing`, `legal`, `news`, `official`, `other`, `partner-proof`, `regulatory`, `review`, `technical-docs`
- `sourceStance`: `adverse`, `confirming`, `neutral`, `unknown`
- `sourceAccessStatus`: `broken`, `js-only`, `ok`, `paywall`, `rate-limited`
- `sourceReputationTier`: `high`, `low`, `medium`
- `sourceIndependence`: `company`, `competitor`, `customer`, `independent`, `partner`, `unknown`
- `claimType`: `company-claimed`, `conflicting`, `estimated`, `inferred`, `observed`, `open-question`, `third-party-reported`
- `claimConfidence`: `high`, `low`, `medium`
- `claimFreshness`: `current`, `historical`, `recent`, `unknown`
- `questionType`: `adverse`, `comparison`, `enumeration`, `freshness`, `mechanism`, `quantification`, `verification`
- `questionStatus`: `answered`, `partial`, `unresolved`
- `calloutType`: `assumption`, `insight`, `recommendation`, `risk`, `strength`
- `enumerationCoverage`: `exhaustive`, `partial`, `sample`
- `evidenceGapType`: `access-blocked`, `conflicting-data`, `enumeration-incomplete`, `missing-source`, `private-evidence-only`, `stale`
- `severity`: `blocking`, `material`, `minor`
- `evidenceQuality`: `high`, `low`, `medium`, `unknown`
- `tone`: `adverse`, `critical`, `high`, `low`, `medium`, `negative`, `neutral`, `opportunity`, `positive`, `risk`, `warning`
- `blockType`: `callout`, `equation`, `figure`, `list`, `paragraph`, `table`
- `primaryTierSourceTypes`: `filing`, `legal`, `official`, `regulatory`
- `restrictedAccessStatuses`: `broken`, `js-only`, `paywall`, `rate-limited`
- `cardRecommendation`: `avoid`, `buy`, `research-more`, `strong-buy`, `track`
- `cardConfidence`: `high`, `low`, `medium`
- `cardRiskRating`: `critical`, `high`, `low`, `medium`, `unknown`
- `cardValuationStance`: `attractive`, `expensive`, `fair`, `stretched`, `unknown`

## Figure renderer summary

- Figure types: `timeline`, `flow`, `quadrant`, `bar`, `waterfall`, `matrix`, `stack`, `pyramid`, `journey-map`, `funnel`, `cohort`, `range`, `kpi`, `dag`, `other`
- Figure layouts: `compact`, `standard`, `wide`
- Figure data fields: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`, `xAxis`, `yAxis`

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

Current retry dimensions:
- `missingArtifact` rank=0 — Create the chapter YAML at the expected path.
- `yamlParse` rank=1 — Fix the YAML syntax error reported in the message.
- `documentHead` rank=2 — Fix the chapter document head: schemaVersion=report-v2, artifact matches the chapter key, slug, runDate=YYYY-MM-DD, company.name, and chapter.number matching the chapter order.
- `slugConsistency` rank=3 — Set slug: to the company slug only (the report folder basename with the leading <timestamp>- stripped).
- `localEvidenceMissing` rank=4 — Add the entire localEvidence block (researchQuestions, searchQueries, sources, claims, evidenceGaps).
- `researchQuestionShape` rank=5 — Fix the question object: id Q<ChapterLetter>### (e.g. QO001), >=20-char text, valid type, non-empty targets[], valid status.
- `researchQuestionTargets` rank=6 — Point the question.targets[] entries at a real contentRequirements/<index>, plannedTables/<slug>, or plannedFigures/<slug>.
- `researchQuestionTypeMix` rank=7 — Add questions of types you have not used yet to reach minQuestionTypeSpread.
- `researchQuestionAdverse` rank=8 — Add type:adverse questions until you reach minAdverseQuestions.
- `searchQueriesMissing` rank=9 — Append the actual queries you ran into localEvidence.searchQueries[] ({query, engine, hits, retainedSourceRefs}).
- `sourceShape` rank=10 — Fill accessStatus and stance (and other required fields) on each source.
- `sourceDomains` rank=11 — Add sources from new registrable domains; do not duplicate publishers.
- `sourceTypeSpread` rank=12 — Add sources with sourceType values you have not used yet.
- `sourceStanceSpread` rank=13 — Add at least one source with stance: adverse (regulator complaint, short report, skeptical analyst note, FT Alphaville-style critique, FOS/CFPB record). Mark a genuinely critical existing source as stance: adverse instead of inventing one.
- `requiredSourceTypes` rank=14 — Pull at least one source of each missing type listed in gate.requiredSourceTypes.
- `netNewSources` rank=15 — Run new searches to add URLs not seen in earlier chapters; reusing the global pool will not satisfy this gate.
- `paywallRisk` rank=16 — Swap restricted (paywall|js-only|broken|rate-limited) sources for ok ones to stay under the report-level 30% ceiling.
- `researchQuestions` rank=17 — Add more researchQuestion entries until you hit the per-chapter floor.
- `sources` rank=18 — Add more sources until you hit the per-chapter floor.
- `claims` rank=19 — Add more claims until you hit the per-chapter floor.
- `claimShape` rank=20 — Fix the claim object: required fields (statement, type, topic, sourceRefs, confidence, freshness), valid enum values, non-empty sourceRefs unless type is open-question, and contradictsClaimRefs when type is conflicting.
- `highConfidenceCorroboration` rank=21 — Either downgrade confidence:high to medium, or add a primary-tier source (filing|regulatory|legal|official or reputationTier:high).
- `researchQuestionAnswerCoverage` rank=22 — Convert questions from unresolved/partial to answered by adding the missing claim and citing it via claim.answersQuestionRefs.
- `researchQuestionClosure` rank=23 — Add an evidenceGap whose relatedQuestionRefs[] includes the still-open question.
- `claimAnswerRefs` rank=24 — Resolve dangling answersQuestionRefs entries; do not duplicate evidence.
- `claimContradictRefs` rank=25 — Resolve dangling contradictsClaimRefs entries; type:conflicting requires non-empty contradictsClaimRefs.
- `crossChapterRefLeak` rank=26 — Local C<L>### appears to come from another chapter. Chapter-letter ids cannot be reused across chapters — restate the underlying fact as a new local claim here with its own sourceRefs[].
- `claimRefs` rank=27 — Resolve dangling claimRefs across sections, tables, figures, and callouts.
- `enumerationScope` rank=28 — Add enumerationScope { coverage, basis(>=20 chars) } to the matching enumeration table.
- `enumerationRows` rank=29 — Add rows to reach expectedMinRows or set coverage to partial/sample with rationale.
- `enumerationCoverageGap` rank=30 — Open an evidenceGap whose topic mentions the table or whose relatedTableRefs[] cites it.
- `enumerationRowCorroboration` rank=31 — Add sources from additional registrable domains backing the table's claimRefs.
- `tableShape` rank=32 — Fix the table: non-empty columns, every row has the same number of cells as columns, enumerationScope { coverage, basis(>=20 chars) } when present.
- `figureShape` rank=33 — Fix the figure data to satisfy its type contract (e.g. dag needs edges, range needs numeric low/high, matrix needs columns and rows).
- `figureType` rank=34 — Render at least one of the planned figure types or document the substitution in evidenceGaps.
- `duplicateIds` rank=35 — Renumber the duplicate or malformed table/figure id; ids must match T### / F### and be unique within the chapter.
- `artifactRefs` rank=36 — Resolve the dangling figureRef/tableRef: it must point at an id that exists in this chapter's figures[] / tables[].
- `duplicateAnalysis` rank=37 — Either give the figure at least one claimRef the table does not have (a distinct slice/lens), rename it to reflect that lens, or merge it into the table.
- `calloutShape` rank=38 — Fix the callout: required title, body, claimRefs[], and optional calloutType in (strength|risk|recommendation|insight|assumption).
- `sectionsMin` rank=39 — Add the missing section(s) to reach minSections.
- `sectionsMax` rank=40 — Reduce or merge sections; the chapter looks over-fragmented.
- `artifactsMin` rank=41 — Add the missing table or figure (or substitute a planned figure with an extra table when data shape does not fit).
- `tablesMax` rank=42 — Reduce or merge tables; the chapter looks over-fragmented.
- `figuresMax` rank=43 — Reduce or merge figures; the chapter looks over-fragmented.
- `depthSection` rank=44 — Expand the prose of the shortest section(s) only; leave the others untouched.
- `depthSectionTotal` rank=45 — Expand prose across short sections to reach minSectionWordsTotal.
- `depthTableRows` rank=46 — Add rows to existing tables to reach minTableRowsTotal.
- `depthFigureData` rank=47 — Add data points to existing figures to reach minFigureDataPointsTotal.
- `contentRequirementCoverage` rank=48 — Add researchQuestions whose targets[] cover the un-targeted contentRequirements.
- `unverifiedSource` rank=49 — One or more cited sources never went through fetch-url during this run; re-pull them so accessStatus, sourceType, and stance are based on the actual page rather than a guess.
- `tableNotes` rank=null — Write tables[].notes (one line: data source / estimation / partial coverage / what null means), or acknowledge dimension "tableNotes" for pure factual snapshot tables.

## YAML rules

- Use spaces, not tabs.
- Quote scalar strings containing colon-space (`: `) so YAML does not parse them as mappings.
- Use `null` for unknown optional values, not `N/A` or empty strings.
- Keep numeric fields numeric, not formatted strings with currency signs or commas.
- Do not use YAML anchors/aliases in report artifacts; generated reports should be explicit and portable.
