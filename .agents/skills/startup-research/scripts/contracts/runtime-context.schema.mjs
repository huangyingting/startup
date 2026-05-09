// Executable schema for the agent-facing chapter runtime context.
//
// The runtime context is a projection, not an authoring source. This schema is
// intentionally permissive for projected nested objects whose authoritative
// contracts live in workflow-config.schema.mjs, report-artifacts.schema.mjs,
// validation-catalog.mjs, and website/src/lib/figures.mjs.

import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1, 'must be a non-empty string');
const nullableString = z.string().nullable();

export const ContractSourcesSchema = z.object({
  workflowConfig: nonEmptyString,
  workflowSchema: nonEmptyString,
  reportSchema: nonEmptyString,
  runtimeContextSchema: nonEmptyString,
  generatedContracts: nonEmptyString,
  vocabularies: nonEmptyString,
  checkDimensions: nonEmptyString,
  rendererContracts: nonEmptyString,
}).strict();

export const CompactChapterSchema = z.object({
  key: nonEmptyString,
  order: z.number().int().positive(),
  letter: z.string().regex(/^[A-Z]$/),
  file: nonEmptyString,
  artifact: nonEmptyString,
  title: nonEmptyString,
  mission: nonEmptyString,
  optionalContext: z.array(nonEmptyString),
  contentRequirements: z.array(nonEmptyString),
  plannedTables: z.array(z.record(z.string(), z.any())),
  plannedFigures: z.array(z.record(z.string(), z.any())),
  evidenceStrategy: z.array(nonEmptyString),
  qualityBar: z.array(nonEmptyString),
  gate: z.record(z.string(), z.any()),
}).strict();

export const RuntimeWorkflowProjectionSchema = z.object({
  reportSchemaVersion: nonEmptyString,
  inputs: z.record(z.string(), z.any()),
  phases: z.array(z.record(z.string(), z.any())),
  conditions: z.array(z.record(z.string(), z.any())),
  finalArtifacts: z.record(z.string(), z.any()),
  allowedReportFiles: z.object({
    chapterArtifacts: z.array(nonEmptyString),
    handAuthored: z.array(nonEmptyString),
    generated: z.array(nonEmptyString),
  }).strict(),
  agentPolicy: z.record(z.string(), z.any()),
  totalChapters: z.number().optional(),
}).passthrough();

export const ContextChapterSchema = z.object({
  key: nonEmptyString.optional(),
  file: nonEmptyString,
  status: z.enum(['loaded', 'missing', 'parseError', 'unknownKey']),
  error: nullableString.optional(),
  artifact: nullableString.optional(),
  title: nullableString.optional(),
  summary: nullableString.optional(),
  sections: z.array(z.record(z.string(), z.any())),
  tables: z.array(z.record(z.string(), z.any())),
  figures: z.array(z.record(z.string(), z.any())),
}).passthrough();

export const ChapterRuntimeContextSchema = z.object({
  schemaVersion: z.literal('chapter-runtime-context-v2'),
  generatedFrom: nonEmptyString,
  contractSources: ContractSourcesSchema,
  workflow: RuntimeWorkflowProjectionSchema,
  vocabularies: z.record(z.string(), z.any()),
  checkDimensions: z.array(z.record(z.string(), z.any())),
  rendererContracts: z.record(z.string(), z.any()),
  previousChapter: CompactChapterSchema.nullable(),
  chapter: CompactChapterSchema,
  nextChapter: CompactChapterSchema.nullable(),
  contextChapters: z.array(ContextChapterSchema).optional(),
  cumulativeContext: z.record(z.string(), z.any()).optional(),
  run: z.object({
    runId: nonEmptyString,
    companySlug: nullableString,
    runDate: nullableString,
  }).strict().optional(),
  runCache: z.object({
    cacheDir: nullableString,
    refreshContext: z.record(z.string(), z.any()).nullable(),
  }).strict().optional(),
}).strict();

export const ChapterRuntimeContextListSchema = z.object({
  schemaVersion: z.literal('chapter-runtime-context-list-v2'),
  generatedFrom: nonEmptyString,
  contractSources: ContractSourcesSchema,
  workflow: RuntimeWorkflowProjectionSchema.omit({ totalChapters: true }).passthrough(),
  vocabularies: z.record(z.string(), z.any()),
  checkDimensions: z.array(z.record(z.string(), z.any())),
  rendererContracts: z.record(z.string(), z.any()),
  chapters: z.array(CompactChapterSchema),
}).strict();

export function runtimeContextContractSummary() {
  return {
    source: 'scripts/contracts/runtime-context.schema.mjs',
    schemaVersions: ['chapter-runtime-context-v2', 'chapter-runtime-context-list-v2'],
    projectedAuthorities: ['workflow config', 'report artifact schema', 'validation catalog', 'renderer contracts', 'run cache'],
  };
}
