import { defineCollection, z } from 'astro:content';
import { reportsLoader } from './content/reports-loader';

const dateString = z.preprocess((v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}, z.string());

const nullableMetric = z.number().nullable().optional();

const reports = defineCollection({
  loader: reportsLoader(),
  schema: z.object({
    runId: z.string(),
    runTimestamp: z.string(),
    folderSlug: z.string(),
    schemaVersion: z.literal('report-v2'),
    artifact: z.literal('summary-card'),
    slug: z.string(),
    runDate: dateString,
    company: z.object({
      name: z.string(),
      website: z.string().nullable().optional(),
      sector: z.string().nullable().optional(),
      stage: z.string().nullable().optional(),
      headquarters: z.string().nullable().optional(),
      shortDescription: z.string().nullable().optional(),
    }),
    revision: z.object({
      status: z.enum(['current', 'superseded']),
      refreshOfRunId: z.string().nullable(),
      supersededByRunId: z.string().nullable(),
      refreshReason: z.string().nullable(),
      refreshOfFolderSlug: z.string().nullable(),
      supersededByFolderSlug: z.string().nullable(),
    }),
    headline: z.string(),
    recommendation: z.string(),
    confidence: z.string(),
    riskRating: z.string(),
    valuationStance: z.string(),
    overallScore: z.number(),
    sourceStats: z.object({
      sourcesRetained: z.number(),
      claimsReviewed: z.number(),
      domainCount: z.number(),
      adverseSourceCount: z.number(),
      openQuestionCount: z.number(),
      documentedGapQuestionCount: z.number(),
      blockingQuestionCount: z.number(),
      averageSourceAgeDays: z.number().nullable(),
    }),
    keyMetrics: z.object({
      valuationUsdM: nullableMetric,
      revenueRunRateUsdM: nullableMetric,
      arrUsdM: nullableMetric,
      revenueGrowthYoYPct: nullableMetric,
      grossMarginPct: nullableMetric,
      nrrPct: nullableMetric,
      totalRaisedUsdM: nullableMetric,
      customerCount: nullableMetric,
      headcount: nullableMetric,
    }),
    topStrengths: z.array(z.string()),
    topRisks: z.array(z.string()),
    unresolvedGaps: z.array(z.string()),
  }),
});

export const collections = { reports };
