#!/usr/bin/env node
// Generate the agent-readable contract reference from executable schemas.
//
// The output intentionally summarizes the contract instead of trying to dump
// raw Zod internals. Zod schemas remain the source of truth; this Markdown is
// generated documentation for humans and agents.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workflowContractSummary } from './contracts/workflow-config.schema.mjs';
import { reportContractSummary, SCHEMA_VERSION } from './contracts/report-artifacts.schema.mjs';
import { runtimeContextContractSummary } from './contracts/runtime-context.schema.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../references/contracts.md');

function yamlBlock(value) {
  return ['```yaml', value.trim(), '```'].join('\n');
}

function list(values) {
  return values.map((value) => `- ${value}`).join('\n');
}

const workflow = workflowContractSummary();
const report = reportContractSummary();
const runtime = runtimeContextContractSummary();

const text = `<!-- GENERATED FILE: edit scripts/contracts/*.schema.mjs or scripts/build-contract-docs.mjs, then run npm run build:contracts. -->

# startup-research contracts

This file is generated from executable schemas and runtime catalogs. Do not hand-edit it.

## Workflow config contract

Schema version: \`${workflow.schemaVersion}\`

Top-level fields:
${list(workflow.topLevelFields.map((field) => `\`${field}\``))}

Workflow-specific fields:
${list(workflow.workflowFields.map((field) => `\`workflow.${field}\``))}

Derived fields emitted at runtime:
${list(workflow.generatedFields.map((field) => `\`${field}\``))}

### Workflow config shape

${yamlBlock(`schemaVersion: workflow-config-v1
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
    gate: partial defaultGate override`)}

## Report artifact contract

Schema version: \`${SCHEMA_VERSION}\`

Artifacts:
${list(report.artifacts.map((field) => `\`${field}\``))}

Reusable objects:
${list(report.reusableObjects.map((field) => `\`${field}\``))}

Semantic validators that extend shape checks:
${list(report.semanticValidators.map((field) => `\`${field}\``))}

### Common document head

${yamlBlock(`schemaVersion: report-v2
artifact: string
slug: string
runDate: YYYY-MM-DD
company:
  name: string`)}

### Analysis chapter shape

${yamlBlock(`schemaVersion: report-v2
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
acknowledgedWarnings: [{ dimension, reason }]`)}

### Report meta shape

${yamlBlock(`slug: string
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
disclaimer: string | null`)}

## Runtime context contract

Runtime schema versions:
${list(runtime.schemaVersions.map((field) => `\`${field}\``))}

Projected authorities:
${list(runtime.projectedAuthorities.map((field) => `\`${field}\``))}

### Runtime context shape

${yamlBlock(`schemaVersion: chapter-runtime-context-v2
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
runCache: { cacheDir, refreshContext }     # only with --include-context`)}

## Validation result contract

All validation scripts should prefer this envelope for JSON output:

${yamlBlock(`ok: boolean
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
summary: object`)}

## YAML rules

- Use spaces, not tabs.
- Quote scalar strings containing colon-space (\`: \`) so YAML does not parse them as mappings.
- Use \`null\` for unknown optional values, not \`N/A\` or empty strings.
- Keep numeric fields numeric, not formatted strings with currency signs or commas.
- Do not use YAML anchors/aliases in report artifacts; generated reports should be explicit and portable.
`;

writeFileSync(outPath, text, 'utf8');
console.log(`[build-contract-docs] wrote ${outPath}`);
