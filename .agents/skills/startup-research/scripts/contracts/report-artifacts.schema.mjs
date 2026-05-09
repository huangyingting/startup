// Executable Zod schemas for report-v2 artifacts.
//
// Shape validation lives here. Semantic/gate checks (cross refs, source
// diversity, net-new URLs, renderer deep checks) remain in the checker scripts
// and reuse this module for common object contracts.

import { z } from 'zod';
import {
  BLOCK_TYPES,
  CALLOUT_TYPES,
  CARD_CONFIDENCES,
  CARD_RECOMMENDATIONS,
  CARD_RISK_RATINGS,
  CARD_VALUATION_STANCES,
  CLAIM_CONFIDENCES,
  CLAIM_FRESHNESS,
  CLAIM_TYPES,
  ENUMERATION_COVERAGE,
  EVIDENCE_GAP_SEVERITIES,
  EVIDENCE_GAP_TYPES,
  EVIDENCE_QUALITIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  SOURCE_ACCESS_STATUSES,
  SOURCE_INDEPENDENCE,
  SOURCE_REPUTATION_TIERS,
  SOURCE_STANCES,
  SOURCE_TYPES,
} from '../validation-catalog.mjs';
import { validationIssue, zodIssues } from './validation-result.mjs';

export const SCHEMA_VERSION = 'report-v2';

// Fields that used to live at the top level of report-meta.yaml / summary-card.yaml
// but must now be nested under `summary`. check-report-meta.mjs flags them on
// report-meta.yaml; check-report.mjs flags them on summary-card.yaml. Single
// source so the two checkers cannot drift.
export const OBSOLETE_SUMMARY_ROOT_FIELDS = Object.freeze([
  'headline', 'recommendation', 'confidence', 'riskRating', 'valuationStance',
  'overallScore', 'keyMetrics', 'topStrengths', 'topRisks', 'unresolvedGaps',
]);

const nonEmptyString = z.string().trim().min(1, 'must be a non-empty string');
const nullableString = z.string().nullable();
const dateLike = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
  z.date(),
]);
const nullableDateLike = z.union([dateLike, z.null()]);
const claimRef = z.string().regex(/^C[A-Z]\d{3}$/, 'must be a claim id C<ChapterLetter>###');
const sourceRef = z.string().regex(/^S[A-Z]\d{3}$/, 'must be a source id S<ChapterLetter>###');
const questionRef = z.string().regex(/^Q[A-Z]\d{3}$/, 'must be a research question id Q<ChapterLetter>###');
const tableRef = z.string().regex(/^T[A-Z]\d{3}$/, 'must be a table id T<ChapterLetter>###');
const figureRef = z.string().regex(/^F[A-Z]\d{3}$/, 'must be a figure id F<ChapterLetter>###');
const scalarTableCell = z.union([z.string(), z.number(), z.null()]);

function enumMember(values, label) {
  const set = values instanceof Set ? values : new Set(values);
  return z.string().refine((value) => set.has(value), `${label} must be one of ${[...set].join('|')}`);
}

export const RevisionSchema = z.object({
  status: z.enum(['current', 'superseded']).default('current'),
  refreshOfRunId: nullableString.optional(),
  supersededByRunId: nullableString.optional(),
  refreshReason: nullableString.optional(),
}).strict();

export const CompanyHeadSchema = z.object({
  name: nonEmptyString,
}).passthrough();

export const DocumentHeadSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  artifact: nonEmptyString,
  slug: nonEmptyString,
  runDate: dateLike,
  company: CompanyHeadSchema,
}).passthrough();

// Topics historically allowed numbers (e.g. years) alongside strings; coerce
// to a string so the contract accepts both old and new evidence files.
const topicEntry = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  nonEmptyString,
);

export const SourceSchema = z.object({
  id: z.string().optional(),
  publisher: nonEmptyString,
  title: nonEmptyString,
  url: nonEmptyString,
  date: nullableDateLike.optional(),
  accessDate: dateLike,
  accessStatus: enumMember(SOURCE_ACCESS_STATUSES, 'accessStatus'),
  stance: enumMember(SOURCE_STANCES, 'stance'),
  sourceType: enumMember(SOURCE_TYPES, 'sourceType'),
  reputationTier: enumMember(SOURCE_REPUTATION_TIERS, 'reputationTier'),
  independence: enumMember(SOURCE_INDEPENDENCE, 'independence'),
  topics: z.array(topicEntry).min(1, 'topics must be a non-empty array'),
  keyQuote: nullableString.optional(),
}).passthrough();

export const ClaimSchema = z.object({
  id: z.string().optional(),
  statement: nonEmptyString,
  type: enumMember(CLAIM_TYPES, 'type'),
  topic: nonEmptyString,
  sourceRefs: z.array(sourceRef),
  confidence: enumMember(CLAIM_CONFIDENCES, 'confidence'),
  freshness: enumMember(CLAIM_FRESHNESS, 'freshness'),
  answersQuestionRefs: z.array(questionRef).optional(),
  contradictsClaimRefs: z.array(claimRef).optional(),
  claimType: z.any().optional(),
  corroboration: z.any().optional(),
}).passthrough().superRefine((claim, ctx) => {
  if (claim.claimType !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claimType'], message: "uses obsolete field 'claimType'; rename to 'type'" });
  }
  if (claim.corroboration !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['corroboration'], message: 'must not store corroboration; it is derived from sourceRefs.length and contradictsClaimRefs' });
  }
  if (claim.type !== 'open-question' && claim.sourceRefs.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceRefs'], message: 'sourceRefs must be non-empty unless type is open-question' });
  }
  if (claim.type === 'conflicting' && !(claim.contradictsClaimRefs ?? []).length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contradictsClaimRefs'], message: 'type=conflicting requires non-empty contradictsClaimRefs' });
  }
});

export const ResearchQuestionSchema = z.object({
  id: z.string().regex(/^Q[A-Z]\d{3}$/, 'id must match Q<ChapterLetter>###'),
  question: z.string().trim().min(20, 'question text must be at least 20 chars'),
  type: enumMember(QUESTION_TYPES, 'type'),
  targets: z.array(nonEmptyString).min(1, 'targets[] must be a non-empty array'),
  status: enumMember(QUESTION_STATUSES, 'status'),
}).passthrough();

export const SearchQuerySchema = z.object({
  query: nonEmptyString,
  engine: nullableString.optional(),
  hits: z.number().nullable().optional(),
  retainedSourceRefs: z.array(sourceRef).default([]),
}).passthrough();

export const EvidenceGapSchema = z.object({
  type: enumMember(EVIDENCE_GAP_TYPES, 'evidenceGap.type'),
  severity: enumMember(EVIDENCE_GAP_SEVERITIES, 'severity'),
  topic: nonEmptyString,
  missingEvidence: nonEmptyString,
  whyItMatters: nonEmptyString,
  diligencePath: nonEmptyString,
  relatedQuestionRefs: z.array(questionRef).optional(),
  relatedTableRefs: z.array(tableRef).optional(),
}).passthrough();

export const LocalEvidenceSchema = z.object({
  searchQueries: z.array(SearchQuerySchema),
  researchQuestions: z.array(ResearchQuestionSchema),
  sources: z.array(SourceSchema),
  claims: z.array(ClaimSchema),
  evidenceGaps: z.array(EvidenceGapSchema),
}).strict();

export const SectionSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  body: nonEmptyString,
  claimRefs: z.array(claimRef),
}).passthrough();

// enumerationScope historically carried optional descriptive fields
// (rationale, boundaryNote, relatedTableRefs, ...). Allow passthrough so old
// reports validate while still enforcing coverage and basis.
export const EnumerationScopeSchema = z.object({
  coverage: enumMember(ENUMERATION_COVERAGE, 'enumerationScope.coverage'),
  basis: z.string().trim().min(20, 'enumerationScope.basis must be a non-empty string (>=20 chars)'),
}).passthrough();

export const TableSchema = z.object({
  id: z.string().optional(),
  title: nonEmptyString.optional(),
  columns: z.array(nonEmptyString).min(1, 'requires non-empty data.columns'),
  rows: z.array(z.array(scalarTableCell)),
  notes: nullableString.optional(),
  enumerationScope: EnumerationScopeSchema.optional(),
  claimRefs: z.array(claimRef).optional(),
}).passthrough().superRefine((table, ctx) => {
  const expected = table.columns?.length ?? 0;
  for (const [rowIndex, row] of (table.rows ?? []).entries()) {
    if (row.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rows', rowIndex],
        message: `row ${rowIndex + 1} has ${row.length} cells but columns declares ${expected}`,
      });
    }
  }
});

export const CalloutSchema = z.object({
  calloutType: enumMember(CALLOUT_TYPES, 'calloutType').optional(),
  title: nonEmptyString,
  body: nonEmptyString,
  claimRefs: z.array(claimRef),
}).passthrough();

export const FigureSchema = z.object({
  id: z.string().optional(),
  title: nonEmptyString,
  type: nonEmptyString,
  layout: nonEmptyString.optional(),
  summary: nonEmptyString.optional(),
  data: z.record(z.string(), z.any()),
  approximationNotes: nullableString.optional(),
  claimRefs: z.array(claimRef).optional(),
}).passthrough();

export const AcknowledgedWarningSchema = z.object({
  dimension: nonEmptyString,
  reason: z.string().trim().min(30, 'reason must be at least 30 characters'),
}).strict();

export const AnalysisArtifactSchema = DocumentHeadSchema.extend({
  chapter: z.object({
    number: z.number(),
    title: nonEmptyString,
    summary: nonEmptyString,
  }).passthrough(),
  sections: z.array(SectionSchema),
  tables: z.array(TableSchema),
  figures: z.array(FigureSchema),
  callouts: z.array(CalloutSchema).default([]),
  localEvidence: LocalEvidenceSchema,
  acknowledgedWarnings: z.array(AcknowledgedWarningSchema).optional(),
}).passthrough();

export const CoverFactSchema = z.object({
  label: nonEmptyString,
  value: z.union([z.string(), z.number(), z.null()]),
  unit: nullableString.optional(),
  claimRefs: z.array(claimRef).optional(),
}).passthrough();

export const CompanyProfileFounderSchema = z.object({
  name: nonEmptyString,
  role: nullableString.optional(),
  background: nullableString.optional(),
  claimRefs: z.array(claimRef).optional(),
}).passthrough();

export const CompanyProfileSchema = z.object({
  summary: nonEmptyString,
  foundedDate: nullableDateLike.optional(),
  founders: z.array(CompanyProfileFounderSchema).optional(),
  foundingLocation: nullableString.optional(),
  headquarters: nullableString.optional(),
  productSummary: nonEmptyString,
  customerFocus: nullableString.optional(),
  businessModel: nullableString.optional(),
  stage: nullableString.optional(),
  fundingStatus: nullableString.optional(),
  disclosureProfile: z.enum(['public', 'private-disclosed', 'private-undisclosed', 'stealth']).nullable().optional(),
  claimRefs: z.array(claimRef).optional(),
}).passthrough();

export const KeyMetricsSchema = z.object({
  valuationUsdM: z.number().nullable(),
  revenueRunRateUsdM: z.number().nullable(),
  arrUsdM: z.number().nullable(),
  revenueGrowthYoYPct: z.number().nullable(),
  grossMarginPct: z.number().nullable(),
  nrrPct: z.number().nullable(),
  totalRaisedUsdM: z.number().nullable(),
  customerCount: z.number().nullable(),
  headcount: z.number().nullable(),
}).strict();

export const SummaryJudgmentSchema = z.object({
  headline: nonEmptyString,
  overallScore: z.number().min(0, 'overallScore must be 0–10').max(10, 'overallScore must be 0–10'),
  recommendation: enumMember(CARD_RECOMMENDATIONS, 'recommendation'),
  confidence: enumMember(CARD_CONFIDENCES, 'confidence'),
  riskRating: enumMember(CARD_RISK_RATINGS, 'riskRating'),
  valuationStance: enumMember(CARD_VALUATION_STANCES, 'valuationStance'),
  keyMetrics: KeyMetricsSchema,
  topStrengths: z.array(nonEmptyString).min(1, 'topStrengths must have at least one item'),
  topRisks: z.array(nonEmptyString).min(1, 'topRisks must have at least one item'),
  unresolvedGaps: z.array(nonEmptyString),
}).strict();

export const CompanyMetaSchema = z.object({
  name: nonEmptyString,
  website: nullableString.optional(),
  sector: nullableString.optional(),
  stage: nullableString.optional(),
  headquarters: nullableString.optional(),
  shortDescription: nullableString.optional(),
}).strict();

export const BlockSchema = z.object({
  type: enumMember(BLOCK_TYPES, 'block.type'),
  title: nullableString.optional(),
  body: nullableString.optional(),
  calloutType: enumMember(CALLOUT_TYPES, 'calloutType').nullable().optional(),
  tableRef: tableRef.nullable().optional(),
  figureRef: figureRef.nullable().optional(),
  items: z.array(nonEmptyString).optional(),
  equation: nullableString.optional(),
  claimRefs: z.array(claimRef).default([]),
}).passthrough();

export const AppendixSchema = z.object({
  id: z.string().regex(/^[A-Z]$/, 'appendix id must be A, B, C, ...'),
  title: nonEmptyString,
  blocks: z.array(BlockSchema),
}).passthrough();

export const ReportMetaSchema = z.object({
  slug: nonEmptyString,
  runDate: dateLike,
  company: CompanyMetaSchema,
  revision: RevisionSchema.nullable().optional(),
  subtitle: nullableString.optional(),
  coverageNotes: nullableString.optional(),
  coverFacts: z.array(CoverFactSchema).nullable().optional(),
  companyProfile: CompanyProfileSchema,
  summary: SummaryJudgmentSchema,
  appendices: z.array(AppendixSchema).nullable().optional(),
  disclaimer: nullableString.optional(),
}).passthrough();

export const EvidenceArtifactSchema = DocumentHeadSchema.extend({
  artifact: z.literal('evidence'),
  coverage: z.object({
    evidenceQuality: enumMember(EVIDENCE_QUALITIES, 'evidenceQuality'),
    sourceDiversityNotes: nullableString.optional(),
    deduplicationNotes: nonEmptyString.optional(),
    recencyNotes: nonEmptyString.optional(),
    coverageGaps: z.array(nonEmptyString).optional(),
  }).passthrough(),
  sources: z.array(SourceSchema),
  claims: z.array(ClaimSchema),
  evidenceGaps: z.array(EvidenceGapSchema),
}).passthrough();

export function schemaErrors(schema, value, { path = '/', dimension = 'schema', source = null, fix = null } = {}) {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return zodIssues(result.error, { dimension, source, fix }).map((issue) => ({
    ...issue,
    path: issue.path === '/' ? path : `${path}.${issue.path}`.replace(/\.\//g, ''),
  }));
}

export function requiredFieldIssue(path, field) {
  return validationIssue({
    path: `${path}.${field}`,
    message: `${path} missing ${field}`,
    dimension: 'schema',
    field,
  });
}

export function reportContractSummary() {
  return {
    source: 'scripts/contracts/report-artifacts.schema.mjs',
    schemaVersion: SCHEMA_VERSION,
    artifacts: ['analysis chapter', 'report-meta', 'evidence', 'full-report', 'summary-card'],
    reusableObjects: ['source', 'claim', 'researchQuestion', 'searchQuery', 'evidenceGap', 'table', 'figure', 'callout', 'coverFact', 'companyProfile', 'keyMetrics', 'appendix'],
    semanticValidators: ['check-chapter.mjs', 'check-report.mjs', 'check-cross-chapter.mjs'],
  };
}
