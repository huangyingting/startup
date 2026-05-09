// Executable schema for the agent-facing chapter runtime context.
//
// The runtime context emits per-chapter and per-run deltas only. The static
// frame (agent policy, gates, ID system, validator dimensions, renderer
// contracts) lives in references/rules.md (generated from workflow-config.yaml,
// validation-catalog.mjs, and website/src/lib/figures.mjs). Field shapes for
// chapter and report-meta YAML live in references/contracts.md (generated
// from report-artifacts.schema.mjs). Read both once at session start.
//
// This schema is intentionally permissive for projected nested objects whose
// authoritative contracts live in workflow-config.schema.mjs and
// report-artifacts.schema.mjs.

import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1, 'must be a non-empty string');
const nullableString = z.string().nullable();

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
  schemaVersion: z.literal('chapter-runtime-context-v3'),
  generatedFrom: nonEmptyString,
  totalChapters: z.number().int().positive(),
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
  schemaVersion: z.literal('chapter-runtime-context-list-v3'),
  generatedFrom: nonEmptyString,
  totalChapters: z.number().int().positive(),
  chapters: z.array(CompactChapterSchema),
}).strict();
