import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const reportsDir = join(repoRoot, 'reports');
export const workflowConfigPath = join(repoRoot, '.agents', 'skills', 'startup-research', 'references', 'chapters.yaml');

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

export function loadWorkflowConfig() {
  if (!existsSync(workflowConfigPath)) {
    throw new Error(`[workflow-config] missing ${workflowConfigPath}`);
  }
  const config = readYaml(workflowConfigPath);
  // Chapter identity is (key, order); the file name is derived as `<order:02>-<key>.yaml`.
  const chapters = (config.chapters ?? [])
    .map((chapter) => {
      const order = Number(chapter.order);
      const key = String(chapter.key ?? '');
      return {
        key,
        order,
        file: `${String(order).padStart(2, '0')}-${key}.yaml`,
        title: chapter.title,
        gate: mergeGate(config.defaultGate ?? {}, chapter.gate ?? {}),
      };
    })
    .sort((a, b) => a.order - b.order);
  return { ...config, chapters };
}

export function getAnalysisArtifacts(config = loadWorkflowConfig()) {
  return config.chapters.map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    file: chapter.file,
    artifact: chapter.key,
    chapter: chapter.order,
    title: chapter.title,
    gate: chapter.gate,
  }));
}

// Final-stage artifact filenames are fixed by report-schema-v2 ("Literal value; do not rename").
export const FINAL_ARTIFACTS = {
  evidence: { file: 'evidence.yaml', artifact: 'evidence' },
  fullReport: { file: 'full-report.yaml', artifact: 'full-report' },
  summaryCard: { file: 'summary-card.yaml', artifact: 'summary-card' },
};

export function getCoreArtifacts(config = loadWorkflowConfig()) {
  const analysis = getAnalysisArtifacts(config).map(({ file, artifact, chapter }) => ({ file, artifact, chapter }));
  return [...analysis, ...Object.values(FINAL_ARTIFACTS)];
}
