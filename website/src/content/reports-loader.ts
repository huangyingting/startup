import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import type { Loader } from 'astro/loaders';
import { ANALYSIS_ARTIFACTS, SCHEMA_VERSION } from '../../../scripts/report-manifest.mjs';

const REPORTS_DIR = resolve(process.cwd(), '..', 'reports');

interface ReportCardData extends Record<string, unknown> {
  schemaVersion: typeof SCHEMA_VERSION;
  artifact: 'report-card';
  slug: string;
  runDate: string;
  company: {
    name: string;
    website: string | null;
    sector: string | null;
    stage: string | null;
    foundedYear: number | null;
    headquarters: string | null;
    shortDescription: string | null;
  };
  title: string;
  subtitle: string | null;
  headline: string;
  recommendation: string;
  confidence: string;
  riskRating: string;
  valuationStance: string;
  overallScore: number;
  sourceStats: { sourcesRetained: number; claimsReviewed: number };
  figureCount: number;
  tableCount: number;
  keyMetrics: Record<string, number | null>;
  topStrengths: string[];
  topRisks: string[];
  unresolvedGaps: string[];
  reportFiles: Record<string, string>;
  runId: string;
  runTimestamp: string;
  folderSlug: string;
}

const RUN_ID_RE = /^(\d{14})-(.+)$/;

// ---------------------------------------------------------------------------
// run discovery
// ---------------------------------------------------------------------------

function listRuns(): string[] {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => isDirectory(join(REPORTS_DIR, name)))
    .sort()
    .reverse();
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function shortHash(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 6);
}

function parseRunId(runId: string): { runTimestamp: string; folderSlug: string } {
  const match = runId.match(RUN_ID_RE);
  if (match) return { runTimestamp: match[1]!, folderSlug: `${match[2]!}-${shortHash(runId)}` };
  return { runTimestamp: '00000000000000', folderSlug: `${runId}-${shortHash(runId)}` };
}

// ---------------------------------------------------------------------------
// YAML reading with two defensive normalizers
// ---------------------------------------------------------------------------

// Repair `{ "Some Title": "value" }` shaped objects that come from manual edits
// where a `Title: value` line was indented one level too deep and parsed as a
// single-key object instead of a string.
function repairCollapsedKey(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(repairCollapsedKey);
  if (!value || typeof value !== 'object') return value;
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return value;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 1 && /\s/.test(keys[0]!)) {
    const onlyKey = keys[0]!;
    const child = obj[onlyKey];
    if (typeof child === 'string') return `${onlyKey}: ${child}`;
    if (child == null) return onlyKey;
  }
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = repairCollapsedKey(obj[key]);
  return out;
}

function normalizeDates(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (!value || typeof value !== 'object') return value;
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) out[key] = normalizeDates(child);
  return out;
}

function readYaml(path: string): Record<string, any> | null {
  if (!existsSync(path)) return null;
  try {
    const raw = yaml.load(readFileSync(path, 'utf8'));
    return normalizeDates(repairCollapsedKey(raw)) as Record<string, any>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// report card normalization
// ---------------------------------------------------------------------------

function normalizeReportCard(raw: Record<string, any>, runId: string): ReportCardData {
  const { runTimestamp, folderSlug } = parseRunId(runId);
  const company = raw.company ?? {};
  const metrics = raw.keyMetrics ?? {};
  return {
    schemaVersion: SCHEMA_VERSION,
    artifact: 'report-card',
    slug: raw.slug ?? runId,
    runDate: raw.runDate ?? '1970-01-01',
    company: {
      name: company.name ?? 'Unknown company',
      website: company.website ?? null,
      sector: company.sector ?? null,
      stage: company.stage ?? null,
      foundedYear: company.foundedYear ?? null,
      headquarters: company.headquarters ?? null,
      shortDescription: company.shortDescription ?? null,
    },
    title: raw.title ?? `${company.name ?? 'Startup'} — Due Diligence Report`,
    subtitle: raw.subtitle ?? null,
    headline: raw.headline ?? `${company.name ?? 'Startup'} diligence report`,
    recommendation: typeof raw.recommendation === 'string' ? raw.recommendation : 'research-more',
    confidence: raw.confidence ?? 'low',
    riskRating: raw.riskRating ?? 'unknown',
    valuationStance: raw.valuationStance ?? 'unknown',
    overallScore: typeof raw.overallScore === 'number' ? raw.overallScore : 0,
    sourceStats: {
      sourcesRetained: raw.sourceStats?.sourcesRetained ?? 0,
      claimsReviewed: raw.sourceStats?.claimsReviewed ?? 0,
    },
    figureCount: raw.figureCount ?? 0,
    tableCount: raw.tableCount ?? 0,
    keyMetrics: {
      valuationUsdM: metrics.valuationUsdM ?? null,
      revenueRunRateUsdM: metrics.revenueRunRateUsdM ?? null,
      arrUsdM: metrics.arrUsdM ?? null,
      revenueGrowthYoYPct: metrics.revenueGrowthYoYPct ?? null,
      grossMarginPct: metrics.grossMarginPct ?? null,
      nrrPct: metrics.nrrPct ?? null,
      totalRaisedUsdM: metrics.totalRaisedUsdM ?? null,
      customerCount: metrics.customerCount ?? null,
      headcount: metrics.headcount ?? null,
    },
    topStrengths: Array.isArray(raw.topStrengths) ? raw.topStrengths : [],
    topRisks: Array.isArray(raw.topRisks) ? raw.topRisks : [],
    unresolvedGaps: Array.isArray(raw.unresolvedGaps) ? raw.unresolvedGaps : [],
    reportFiles: raw.reportFiles ?? {},
    runId,
    runTimestamp,
    folderSlug,
  };
}

// ---------------------------------------------------------------------------
// path resolution
// ---------------------------------------------------------------------------

function isPublishableRun(folder: string): boolean {
  return existsSync(join(folder, '102-report-card.yaml'));
}

function reportCardPath(folder: string): string | null {
  if (!isPublishableRun(folder)) return null;
  return join(folder, '102-report-card.yaml');
}

function readStageYaml(folder: string, basename: string): unknown | null {
  return readYaml(join(folder, `${basename}.yaml`));
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

export function reportsLoader(): Loader {
  return {
    name: 'startup-reports-v2-loader',
    load: async ({ store, parseData, logger }) => {
      store.clear();
      const runs = listRuns();
      logger.info(`[reports-loader] Loading ${runs.length} report run(s) from ${REPORTS_DIR}`);
      for (const runId of runs) {
        const folder = join(REPORTS_DIR, runId);
        const path = reportCardPath(folder);
        if (!path) continue;
        const raw = readYaml(path);
        if (!raw) {
          logger.error(`[reports-loader] ${runId}: failed to parse ${path}`);
          continue;
        }
        const data = await parseData({ id: runId, data: normalizeReportCard(raw, runId) });
        store.set({ id: runId, data });
      }
    },
  };
}

export function loadReportCard(runId: string): ReportCardData | null {
  const folder = join(REPORTS_DIR, runId);
  const path = reportCardPath(folder);
  if (!path) return null;
  const raw = readYaml(path);
  return raw ? normalizeReportCard(raw, runId) : null;
}

export function loadStageFiles(runId: string): Record<string, unknown> {
  const folder = join(REPORTS_DIR, runId);
  const stages: Record<string, unknown> = {
    evidenceLedger: readStageYaml(folder, '100-evidence-ledger'),
    reportDocument: readStageYaml(folder, '101-report-document'),
    reportCard: loadReportCard(runId),
  };
  for (const artifact of ANALYSIS_ARTIFACTS as Array<{ loaderKey: string; file: string }>) {
    stages[artifact.loaderKey] = readStageYaml(folder, artifact.file.replace(/\.yaml$/, ''));
  }
  return stages;
}
