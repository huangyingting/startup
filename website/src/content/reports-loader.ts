import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import type { Loader } from 'astro/loaders';
import type { Lang } from '../lib/i18n';

const REPORTS_DIR = resolve(process.cwd(), '..', 'reports');

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

function parseRunId(runId: string): { runTimestamp: string; folderSlug: string } {
  const m = runId.match(/^(\d{14})-(.+)$/);
  if (m) return { runTimestamp: m[1]!, folderSlug: `${m[2]!}-${shortHash(runId)}` };
  return { runTimestamp: '00000000000000', folderSlug: `${runId}-${shortHash(runId)}` };
}

export function reportsLoader(): Loader {
  return {
    name: 'startup-reports-loader',
    load: async ({ store, parseData, logger }) => {
      store.clear();
      const runs = listRuns();
      logger.info(`[reports-loader] Loading ${runs.length} report run(s) from ${REPORTS_DIR}`);
      for (const runId of runs) {
        const summaryPath = join(REPORTS_DIR, runId, '10-summary-card.yaml');
        if (!existsSync(summaryPath)) {
          logger.warn(`[reports-loader] skipped ${runId}: missing 10-summary-card.yaml`);
          continue;
        }
        try {
          const raw = readFileSync(summaryPath, 'utf8');
          const repaired = fixColonPaste(yaml.load(raw)) as Record<string, unknown>;
          const { runTimestamp, folderSlug } = parseRunId(runId);
          const data = await parseData({ id: runId, data: { ...repaired, runId, runTimestamp, folderSlug } });
          store.set({ id: runId, data });
        } catch (err) {
          logger.error(`[reports-loader] ${runId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    },
  };
}

function readLocalizedYaml(folder: string, basename: string, lang: Lang): unknown {
  const localized = join(folder, `${basename}.${lang}.yaml`);
  const fallback = join(folder, `${basename}.yaml`);
  const path = lang === 'zh' && existsSync(localized) ? localized : fallback;
  const parsed = yaml.load(readFileSync(path, 'utf8'));
  return fixColonPaste(parsed);
}

export function hasZhTranslation(runId: string): boolean {
  return existsSync(join(REPORTS_DIR, runId, '10-summary-card.zh.yaml'));
}

export function loadLocalizedIndex(runId: string, lang: Lang = 'en'): Record<string, unknown> | null {
  const folder = join(REPORTS_DIR, runId);
  const localized = join(folder, `10-summary-card.${lang}.yaml`);
  const fallback = join(folder, '10-summary-card.yaml');
  const path = lang === 'zh' && existsSync(localized) ? localized : fallback;
  if (!existsSync(path)) return null;
  try {
    return fixColonPaste(yaml.load(readFileSync(path, 'utf8'))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function loadStageFiles(runId: string, lang: Lang = 'en') {
  const folder = join(REPORTS_DIR, runId);
  return {
    researchPlan: readLocalizedYaml(folder, '00-research-plan', lang),
    identity: readLocalizedYaml(folder, '01-company-identity', lang),
    sourceLedger: readLocalizedYaml(folder, '02-source-ledger', lang),
    marketCustomers: readLocalizedYaml(folder, '03-market-customers', lang),
    productTechnology: readLocalizedYaml(folder, '04-product-technology', lang),
    tractionGtm: readLocalizedYaml(folder, '05-traction-gtm', lang),
    competitionPositioning: readLocalizedYaml(folder, '06-competition-positioning', lang),
    businessFinancials: readLocalizedYaml(folder, '07-business-financials', lang),
    riskGovernance: readLocalizedYaml(folder, '08-risk-governance', lang),
    investmentMemo: readLocalizedYaml(folder, '09-investment-memo', lang),
    summaryCard: readLocalizedYaml(folder, '10-summary-card', lang),
  };
}
