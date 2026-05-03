import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { FIGURE_TYPES } from './figures.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const reportsDir = join(repoRoot, 'reports');
export const workflowConfigPath = join(repoRoot, '.github', 'skills', 'startup-research', 'references', 'chapters.yaml');

export function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}

export function writeYaml(path, value) {
  writeFileSync(path, yaml.dump(value, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
}

export function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      try { return statSync(join(path, name)).isDirectory(); }
      catch { return false; }
    });
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'startup';
}

export function normalizeCompanyName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b(inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?|limited)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeDomain(value) {
  try {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function canonicalSourceUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(lower)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/#.*$/, '').replace(/\?.*utm_[^#]*/i, '').replace(/\/$/, '').toLowerCase();
  }
}

export function asDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

export function compactText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

// Recursively collects every value found under a `claimRefs` array anywhere in
// the document, regardless of nesting depth.
export function collectClaimRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectClaimRefs(item, refs);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'claimRefs' && Array.isArray(child)) refs.push(...child);
      else collectClaimRefs(child, refs);
    }
  }
  return refs;
}

// Convenience reader that throws a clear error message rather than the bare
// js-yaml stack trace.
export function tryReadYaml(path) {
  try {
    return { ok: true, value: readYaml(path) };
  } catch (err) {
    return { ok: false, error: err.message.split('\n')[0] };
  }
}

function assertConfig(condition, message) {
  if (!condition) throw new Error(`[workflow-config] ${message}`);
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    assertConfig(value !== undefined && value !== null && value !== '', `${label} contains an empty value`);
    assertConfig(!seen.has(value), `${label} contains duplicate value ${value}`);
    seen.add(value);
  }
}

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function mergeGate(defaultGate, chapterGate) {
  return {
    ...deepClone(defaultGate),
    ...deepClone(chapterGate ?? {}),
    depthFloor: {
      ...(defaultGate?.depthFloor ?? {}),
      ...(chapterGate?.depthFloor ?? {}),
    },
  };
}

function normalizeWorkflowConfig(config) {
  assertConfig(config && typeof config === 'object', `${workflowConfigPath} must contain a YAML object`);
  assertConfig(config.schemaVersion === 'workflow-config-v1', `expected schemaVersion workflow-config-v1, got ${config.schemaVersion}`);
  assertConfig(config.workflow?.reportSchemaVersion === 'report-v2', 'workflow.reportSchemaVersion must be report-v2');
  assertConfig(Array.isArray(config.chapters) && config.chapters.length > 0, 'chapters[] must be a non-empty array');
  assertConfig(config.finalArtifacts?.evidence?.file, 'finalArtifacts.evidence.file is required');
  assertConfig(config.finalArtifacts?.fullReport?.file, 'finalArtifacts.fullReport.file is required');
  assertConfig(config.finalArtifacts?.summaryCard?.file, 'finalArtifacts.summaryCard.file is required');

  const figureTypes = new Set(FIGURE_TYPES);
  const chapters = config.chapters
    .map((chapter) => ({ ...chapter, gate: mergeGate(config.analysisDefaults?.gate ?? {}, chapter.gate ?? {}) }))
    .sort((a, b) => Number(a.order) - Number(b.order));

  assertUnique(chapters.map((chapter) => chapter.order), 'chapters[].order');
  assertUnique(chapters.map((chapter) => chapter.file), 'chapters[].file');
  assertUnique(chapters.map((chapter) => chapter.artifact), 'chapters[].artifact');
  assertUnique(chapters.map((chapter) => chapter.chapterNumber), 'chapters[].chapterNumber');
  assertUnique(chapters.map((chapter) => chapter.loaderKey), 'chapters[].loaderKey');

  for (const chapter of chapters) {
    assertConfig(chapter.file?.endsWith('.yaml'), `${chapter.key}: file must end with .yaml`);
    assertConfig(chapter.artifact, `${chapter.key}: artifact is required`);
    assertConfig(chapter.title, `${chapter.key}: title is required`);
    assertConfig(chapter.loaderKey, `${chapter.key}: loaderKey is required`);
    assertConfig(Number.isInteger(chapter.chapterNumber), `${chapter.key}: chapterNumber must be an integer`);
    assertConfig(Number.isInteger(chapter.reportChapterNumber), `${chapter.key}: reportChapterNumber must be an integer`);
    for (const field of ['minSections', 'maxSections', 'minTables', 'maxTables', 'minFigures', 'maxFigures', 'minResearchQuestions', 'minLocalSources', 'minLocalClaims']) {
      assertConfig(Number.isFinite(chapter.gate?.[field]), `${chapter.key}: gate.${field} must be a number`);
    }
    for (const field of ['minSectionBodyWords', 'minSectionWordsTotal', 'minTableRowsTotal', 'minFigureDataPointsTotal']) {
      assertConfig(Number.isFinite(chapter.gate?.depthFloor?.[field]), `${chapter.key}: gate.depthFloor.${field} must be a number`);
    }
    for (const type of chapter.gate?.preferredFigureTypes ?? []) {
      assertConfig(figureTypes.has(type), `${chapter.key}: unknown preferred figure type ${type}`);
    }
    for (const figure of chapter.requiredFigures ?? []) {
      for (const type of figure.types ?? []) {
        assertConfig(figureTypes.has(type), `${chapter.key}: required figure ${figure.name ?? '?'} references unknown type ${type}`);
      }
    }
  }

  return { ...config, chapters };
}

export function loadWorkflowConfig() {
  if (!existsSync(workflowConfigPath)) {
    throw new Error(`[workflow-config] missing ${workflowConfigPath}`);
  }
  return normalizeWorkflowConfig(readYaml(workflowConfigPath));
}

export function getAnalysisArtifacts(config = loadWorkflowConfig()) {
  return config.chapters.map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    file: chapter.file,
    artifact: chapter.artifact,
    chapter: chapter.chapterNumber,
    reportChapter: chapter.reportChapterNumber,
    title: chapter.title,
    loaderKey: chapter.loaderKey,
    gate: chapter.gate,
    preferredFigureTypes: chapter.gate?.preferredFigureTypes ?? [],
    requiredTables: chapter.requiredTables ?? [],
    requiredFigures: chapter.requiredFigures ?? [],
  }));
}

export function getCoreArtifacts(config = loadWorkflowConfig()) {
  const analysis = getAnalysisArtifacts(config).map(({ file, artifact, chapter }) => ({ file, artifact, chapter }));
  const finalArtifacts = config.finalArtifacts ?? {};
  return [
    ...analysis,
    { file: finalArtifacts.evidence.file, artifact: finalArtifacts.evidence.artifact },
    { file: finalArtifacts.fullReport.file, artifact: finalArtifacts.fullReport.artifact },
    { file: finalArtifacts.summaryCard.file, artifact: finalArtifacts.summaryCard.artifact },
  ];
}
