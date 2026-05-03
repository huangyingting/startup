import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const reportsDir = join(repoRoot, 'reports');
export const workflowConfigPath = join(repoRoot, '.github', 'skills', 'startup-research', 'references', 'chapters.yaml');

export function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}

export function asDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

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

export function tryReadYaml(path) {
  try {
    return { ok: true, value: readYaml(path) };
  } catch (err) {
    return { ok: false, error: err.message.split('\n')[0] };
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

// Each chapter is identified solely by `key` (kebab-case slug) and `order`.
// All other identifiers are deterministic functions of those two.
function kebabToCamel(value) {
  return String(value).replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

function deriveChapterIdentity(chapter) {
  const order = Number(chapter.order);
  const key = String(chapter.key ?? '');
  return {
    key,
    order,
    artifact: key,
    loaderKey: kebabToCamel(key),
    file: `${String(order).padStart(2, '0')}-${key}.yaml`,
    chapterNumber: order,
    reportChapterNumber: order + 1,
  };
}

export function loadWorkflowConfig() {
  if (!existsSync(workflowConfigPath)) {
    throw new Error(`[workflow-config] missing ${workflowConfigPath}`);
  }
  const config = readYaml(workflowConfigPath);
  const chapters = (config.chapters ?? [])
    .map((chapter) => ({
      ...deriveChapterIdentity(chapter),
      title: chapter.title,
      requiredTables: chapter.requiredTables ?? [],
      requiredFigures: chapter.requiredFigures ?? [],
      gate: mergeGate(config.analysisDefaults?.gate ?? {}, chapter.gate ?? {}),
    }))
    .sort((a, b) => Number(a.order) - Number(b.order));
  return { ...config, chapters };
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
