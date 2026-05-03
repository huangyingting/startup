import { defineCollection, z } from 'astro:content';
import { reportsLoader } from './reports-loader';

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
      foundedYear: z.number().nullable().optional(),
      headquarters: z.string().nullable().optional(),
      shortDescription: z.string().nullable().optional(),
    }),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    headline: z.string(),
    recommendation: z.string(),
    confidence: z.string(),
    riskRating: z.string(),
    valuationStance: z.string(),
    overallScore: z.number(),
    sourceStats: z.object({
      sourcesRetained: z.number(),
      claimsReviewed: z.number(),
    }),
    figureCount: z.number(),
    tableCount: z.number(),
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
    reportFiles: z.record(z.string()),
  }),
});

export const collections = { reports };
