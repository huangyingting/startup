import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import type { Loader } from 'astro/loaders';
import type { Lang } from '../lib/i18n';

const REPORTS_DIR = resolve(process.cwd(), '..', 'reports');
const V2_SCHEMA = 'startup-diligence-report-v2';

function listRuns(): string[] {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      try {
        return statSync(join(REPORTS_DIR, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort()
    .reverse();
}

function shortHash(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 6);
}

function parseRunId(runId: string): { runTimestamp: string; folderSlug: string } {
  const m = runId.match(/^(\d{14})-(.+)$/);
  if (m) return { runTimestamp: m[1]!, folderSlug: `${m[2]!}-${shortHash(runId)}` };
  return { runTimestamp: '00000000000000', folderSlug: `${runId}-${shortHash(runId)}` };
}

function fixColonPaste(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fixColonPaste);
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 1 && /\s/.test(keys[0]!)) {
      const k = keys[0]!;
      const v = (value as Record<string, unknown>)[k];
      if (typeof v === 'string') return `${k}: ${v}`;
      if (v == null) return k;
    }
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = fixColonPaste((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

function normalizeYamlScalars(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeYamlScalars);
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) out[key] = normalizeYamlScalars(child);
    return out;
  }
  return value;
}

function readYaml(path: string): Record<string, any> | null {
  if (!existsSync(path)) return null;
  try {
    return normalizeYamlScalars(fixColonPaste(yaml.load(readFileSync(path, 'utf8')))) as Record<string, any>;
  } catch {
    return null;
  }
}

function normalizeRecommendation(value: unknown): string {
  return typeof value === 'string' ? value : 'research-more';
}

function normalizeReportCard(raw: Record<string, any>, runId: string): Record<string, any> {
  const { runTimestamp, folderSlug } = parseRunId(runId);
  const company = raw.company ?? {};
  const keyMetrics = raw.keyMetrics ?? {};
  return {
    schemaVersion: V2_SCHEMA,
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
    recommendation: normalizeRecommendation(raw.recommendation),
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
      valuationUsdM: keyMetrics.valuationUsdM ?? null,
      revenueRunRateUsdM: keyMetrics.revenueRunRateUsdM ?? null,
      arrUsdM: keyMetrics.arrUsdM ?? null,
      revenueGrowthYoYPct: keyMetrics.revenueGrowthYoYPct ?? null,
      grossMarginPct: keyMetrics.grossMarginPct ?? null,
      nrrPct: keyMetrics.nrrPct ?? null,
      totalRaisedUsdM: keyMetrics.totalRaisedUsdM ?? null,
      customerCount: keyMetrics.customerCount ?? null,
      headcount: keyMetrics.headcount ?? null,
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

function reportCardPath(folder: string, lang: Lang = 'en'): string | null {
  const localizedV2 = join(folder, `11-report-card.${lang}.yaml`);
  const v2 = join(folder, '11-report-card.yaml');
  const requiredZhDocument = join(folder, '10-report-document.zh.yaml');
  const requiredZhCard = join(folder, '11-report-card.zh.yaml');
  if (!existsSync(v2) || !existsSync(requiredZhDocument) || !existsSync(requiredZhCard)) return null;
  if (lang === 'zh' && existsSync(localizedV2)) return localizedV2;
  return v2;
}

function readLocalizedYaml(folder: string, basename: string, lang: Lang): unknown | null {
  const localized = join(folder, `${basename}.${lang}.yaml`);
  const fallback = join(folder, `${basename}.yaml`);
  const path = lang === 'zh' && existsSync(localized) ? localized : fallback;
  return readYaml(path);
}

export function reportsLoader(): Loader {
  return {
    name: 'startup-reports-v2-loader',
    load: async ({ store, parseData, logger }) => {
      store.clear();
      const runs = listRuns();
      logger.info(`[reports-loader] Loading ${runs.length} report run(s) from ${REPORTS_DIR}`);
      for (const runId of runs) {
        const folder = join(REPORTS_DIR, runId);
        const path = reportCardPath(folder, 'en');
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

export function hasZhTranslation(runId: string): boolean {
  const folder = join(REPORTS_DIR, runId);
  return existsSync(join(folder, '10-report-document.zh.yaml')) && existsSync(join(folder, '11-report-card.zh.yaml'));
}

export function loadLocalizedIndex(runId: string, lang: Lang = 'en'): Record<string, unknown> | null {
  const folder = join(REPORTS_DIR, runId);
  const path = reportCardPath(folder, lang);
  if (!path) return null;
  const raw = readYaml(path);
  return raw ? normalizeReportCard(raw, runId) : null;
}

export function loadStageFiles(runId: string, lang: Lang = 'en') {
  const folder = join(REPORTS_DIR, runId);
  return {
    reportBrief: readLocalizedYaml(folder, '00-report-brief', lang),
    evidenceLedger: readLocalizedYaml(folder, '01-evidence-ledger', lang),
    companySnapshot: readLocalizedYaml(folder, '02-company-snapshot', lang),
    marketMacro: readLocalizedYaml(folder, '03-market-macro', lang),
    competitiveBenchmarking: readLocalizedYaml(folder, '04-competitive-benchmarking', lang),
    financialUnitEconomics: readLocalizedYaml(folder, '05-financial-unit-economics', lang),
    productTechnology: readLocalizedYaml(folder, '06-product-technology', lang),
    customerRetention: readLocalizedYaml(folder, '07-customer-retention', lang),
    riskRegulatory: readLocalizedYaml(folder, '08-risk-regulatory', lang),
    investmentValuation: readLocalizedYaml(folder, '09-investment-valuation', lang),
    reportDocument: readLocalizedYaml(folder, '10-report-document', lang),
    reportCard: loadLocalizedIndex(runId, lang),
  };
}
