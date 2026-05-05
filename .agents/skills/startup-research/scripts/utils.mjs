import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { FIGURE_TYPES } from './figures.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const reportsDir = join(repoRoot, 'reports');
export const workflowConfigPath = join(repoRoot, '.agents', 'skills', 'startup-research', 'references', 'chapters.yaml');

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

// Gate field shapes shared between defaultGate (validated as a complete spec)
// and chapter.gate overrides (validated post-merge with the merged value).
const GATE_NUMERIC_FIELDS = [
  'minSections', 'maxSections', 'minArtifacts', 'maxTables', 'maxFigures',
  'minResearchQuestions', 'minLocalSources', 'minLocalClaims',
  'minQuestionTypeSpread', 'minAdverseQuestions',
  'minSourceDomains', 'minNetNewSources', 'minSourceTypeSpread',
  'minHighConfidenceCorroboration', 'minSourcesPerEnumerationRow',
];
const GATE_RATE_FIELDS = ['minQuestionAnswerRate', 'minContentRequirementCoverage'];
const GATE_DEPTH_FIELDS = ['minSectionBodyWords', 'minSectionWordsTotal', 'minTableRowsTotal', 'minFigureDataPointsTotal'];

// Validate one gate object's shape. `scope` is "defaultGate" or
// "<chapterKey>: gate" so the error points at the right source. Used both for
// defaultGate (called once before merging) and for each chapter's merged gate.
function assertGateShape(gate, scope) {
  for (const field of GATE_NUMERIC_FIELDS) {
    assertConfig(Number.isFinite(gate?.[field]), `${scope}.${field} must be a number`);
  }
  for (const field of GATE_RATE_FIELDS) {
    const value = gate?.[field];
    assertConfig(Number.isFinite(value) && value >= 0 && value <= 1, `${scope}.${field} must be a number between 0 and 1`);
  }
  assertConfig(Array.isArray(gate?.requiredSourceTypes), `${scope}.requiredSourceTypes must be an array (use [] for none)`);
  for (const field of GATE_DEPTH_FIELDS) {
    assertConfig(Number.isFinite(gate?.depthFloor?.[field]), `${scope}.depthFloor.${field} must be a number`);
  }
}

function normalizeWorkflowConfig(config) {
  assertConfig(config && typeof config === 'object', `${workflowConfigPath} must contain a YAML object`);
  assertConfig(config.schemaVersion === 'workflow-config-v1', `expected schemaVersion workflow-config-v1, got ${config.schemaVersion}`);
  assertConfig(config.reportSchemaVersion === 'report-v2', 'reportSchemaVersion must be report-v2');
  assertConfig(config.defaultGate && typeof config.defaultGate === 'object', 'defaultGate must be an object');
  assertGateShape(config.defaultGate, 'defaultGate');
  assertConfig(Array.isArray(config.chapters) && config.chapters.length > 0, 'chapters[] must be a non-empty array');

  const figureTypes = new Set(FIGURE_TYPES);
  // Chapter identity is (key, order); the file name is derived as `<order:02>-<key>.yaml`.
  const chapters = config.chapters
    .map((chapter) => {
      assertConfig(chapter && typeof chapter === 'object', 'each chapter entry must be an object');
      assertConfig(chapter.key, 'chapter is missing key');
      assertConfig(/^[a-z][a-z0-9-]*$/.test(chapter.key), `${chapter.key}: key must be kebab-case (a-z, 0-9, -)`);
      assertConfig(Number.isInteger(Number(chapter.order)) && Number(chapter.order) > 0, `${chapter.key}: order must be a positive integer`);
      const order = Number(chapter.order);
      const key = String(chapter.key);
      return {
        key,
        order,
        file: `${String(order).padStart(2, '0')}-${key}.yaml`,
        title: chapter.title,
        mission: chapter.mission,
        optionalContext: chapter.optionalContext ?? [],
        contentRequirements: chapter.contentRequirements ?? [],
        plannedTables: chapter.plannedTables ?? [],
        plannedFigures: chapter.plannedFigures ?? [],
        evidenceStrategy: chapter.evidenceStrategy ?? [],
        qualityBar: chapter.qualityBar ?? [],
        gate: mergeGate(config.defaultGate, chapter.gate ?? {}),
      };
    })
    .sort((a, b) => a.order - b.order);

  assertUnique(chapters.map((chapter) => chapter.order), 'chapters[].order');
  assertUnique(chapters.map((chapter) => chapter.key), 'chapters[].key');

  const knownKeys = new Set(chapters.map((chapter) => chapter.key));
  for (const chapter of chapters) {
    assertConfig(chapter.title, `${chapter.key}: title is required`);
    for (const ref of chapter.optionalContext) {
      assertConfig(knownKeys.has(ref), `${chapter.key}: optionalContext references unknown chapter key "${ref}"`);
    }
    assertGateShape(chapter.gate, `${chapter.key}: gate`);
    for (const planned of chapter.plannedTables ?? []) {
      if (planned.enumeration === true) {
        assertConfig(Number.isInteger(planned.expectedMinRows) && planned.expectedMinRows > 0, `${chapter.key}: plannedTables[${planned.name}] enumeration:true requires positive integer expectedMinRows`);
      }
    }
    for (const figure of chapter.plannedFigures ?? []) {
      for (const type of figure.acceptedTypes ?? []) {
        assertConfig(figureTypes.has(type), `${chapter.key}: planned figure ${figure.name ?? '?'} references unknown type ${type}`);
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
    artifact: chapter.key,
    chapter: chapter.order,
    title: chapter.title,
    gate: chapter.gate,
    contentRequirements: chapter.contentRequirements ?? [],
    plannedTables: chapter.plannedTables ?? [],
    plannedFigures: chapter.plannedFigures ?? [],
  }));
}

export function getCoreArtifacts(config = loadWorkflowConfig()) {
  const analysis = getAnalysisArtifacts(config).map(({ file, artifact, chapter }) => ({ file, artifact, chapter }));
  return [
    ...analysis,
    ...Object.values(FINAL_ARTIFACTS),
  ];
}

// Final-stage artifact filenames are fixed by report-schema-v2 ("Literal value; do not rename").
// Keep this object shape — chapter packets and downstream tooling iterate by camelCase key.
export const FINAL_ARTIFACTS = {
  evidence: { file: 'evidence.yaml', artifact: 'evidence' },
  fullReport: { file: 'full-report.yaml', artifact: 'full-report' },
  summaryCard: { file: 'summary-card.yaml', artifact: 'summary-card' },
};
