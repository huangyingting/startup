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
    schemaVersion: z.literal('startup-diligence-report-v2'),
    artifact: z.literal('report-card'),
    slug: z.string(),
    runDate: dateString,
    company: z.object({
      name: z.string(),
      website: z.string().nullable(),
      sector: z.string().nullable(),
      stage: z.string().nullable(),
      foundedYear: z.number().nullable().optional(),
      headquarters: z.string().nullable().optional(),
      shortDescription: z.string().nullable().optional(),
    }),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    headline: z.string(),
    recommendation: z.enum(['strong-buy', 'buy', 'track', 'research-more', 'avoid']),
    confidence: z.enum(['high', 'medium', 'low']),
    riskRating: z.enum(['low', 'moderate', 'significant', 'critical', 'unknown']),
    valuationStance: z.enum(['attractive', 'fair', 'stretched', 'expensive', 'unknown']),
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
