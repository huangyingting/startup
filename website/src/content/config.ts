import { defineCollection, z } from 'astro:content';
import { reportsLoader } from './reports-loader';

const dateString = z.preprocess((v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}, z.string());

const reports = defineCollection({
  loader: reportsLoader(),
  schema: z.object({
    runId: z.string(),
    runTimestamp: z.string(),
    folderSlug: z.string(),
    schemaVersion: z.literal('startup-diligence-v2'),
    artifact: z.literal('summary-card'),
    slug: z.string(),
    runDate: dateString,
    company: z.object({
      name: z.string(),
      website: z.string().nullable(),
      sector: z.string().nullable(),
      stage: z.string().nullable(),
    }),
    headline: z.string(),
    recommendation: z.enum(['high-conviction', 'track', 'research-more', 'avoid']),
    confidence: z.enum(['high', 'medium', 'low']),
    overallScore: z.number(),
    sourceStats: z.object({
      sourcesRetained: z.number(),
      claimsReviewed: z.number(),
    }),
    topRisks: z.array(z.string()),
    topStrengths: z.array(z.string()),
    unresolvedGaps: z.array(z.string()),
    artifactFiles: z.record(z.string()),
  }),
});

export const collections = { reports };
