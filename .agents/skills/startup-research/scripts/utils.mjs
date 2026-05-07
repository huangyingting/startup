import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { FIGURE_TYPES } from '../../../../website/src/lib/figures.mjs';
import { REGISTRABLE_DOMAIN_MAX_PARTS, MULTI_PART_TLDS, RESERVED_TYPE_LETTERS } from './validation-catalog.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const reportsDir = join(repoRoot, 'reports');
const researchCacheRoot = join(repoRoot, '.research-cache');
export const workflowConfigPath = join(repoRoot, '.agents', 'skills', 'startup-research', 'references', 'workflow-config.yaml');
export const RUN_ID_RE = /^\d{14}-[a-z0-9-]+$/;
export const REVISION_STATUSES = new Set(['current', 'superseded']);
export const REPORT_META_FILE = 'report-meta.yaml';
// Final-stage artifact filenames are fixed by report-schema-v2 ("Literal value; do not rename").
// Keep this object shape — chapter runtime contexts and downstream tooling iterate by camelCase key.
export const FINAL_ARTIFACTS = Object.freeze({
  evidence: { file: 'evidence.yaml', artifact: 'evidence' },
  fullReport: { file: 'full-report.yaml', artifact: 'full-report' },
  summaryCard: { file: 'summary-card.yaml', artifact: 'summary-card' },
});
export const GENERATED_REPORT_FILES = Object.freeze(Object.values(FINAL_ARTIFACTS).map((artifact) => artifact.file));
const FINAL_REPORT_FILES = Object.freeze([...GENERATED_REPORT_FILES, REPORT_META_FILE]);

// Single contract for non-zero exit codes used across skill scripts. Callers
// (CI, test-refresh-pipeline, finalize-report) switch on these to distinguish recoverable
// state errors from validation failures. Keep stable; SKILL.md references
// some of these by number.
//
// `failure` collapses what used to be `validation` and `invalidArgs` — both
// mean "this script could not produce a passing artifact"; CI and humans only
// need to know it failed. Anything that needs to distinguish should read
// stderr (every script prefixes its messages with `[script-name]`).
export const EXIT = Object.freeze({
  ok: 0,
  failure: 1,            // bad CLI args, validation findings, or any non-recoverable failure
  alreadyExists: 2,      // company already has a finalized current report (create-report-run duplicate guard)
  inProgress: 3,         // an in-progress folder for the same run already exists; rerun with --resume
  notFound: 4,           // requested target (e.g. resume folder) does not exist
});

// Per-run scratch dir under .research-cache/ (gitignored). Single source of
// truth so create-report-run.mjs, test-refresh-pipeline.mjs, load-chapter-runtime-context.mjs, and any
// future consumer never hand-build the path. `base` is the run id
// (`<timestamp>-<companySlug>`) — the same name as the report folder.
export function researchCacheDir(base) {
  const value = String(base ?? '');
  if (!RUN_ID_RE.test(value)) {
    throw new Error(`[utils] researchCacheDir requires a runId matching ${RUN_ID_RE}; got: ${JSON.stringify(value)}`);
  }
  return join(researchCacheRoot, value);
}

// Strip the leading "<timestamp>-" prefix from a run id / report folder name
// to recover the company slug that chapter-level `slug:` fields and
// create-report-run.mjs's `slugify(companyName)` use. Single source of truth so
// every "what's the canonical slug for this run" caller agrees. Throws
// if `runId` is not in `<14-digit-timestamp>-<slug>` form so a misuse
// (e.g. an absolute path) fails loudly instead of silently producing
// nonsense paths downstream.
export function companySlugFromRunId(runId) {
  const value = String(runId ?? '');
  if (!RUN_ID_RE.test(value)) {
    throw new Error(`[utils] companySlugFromRunId requires a runId matching ${RUN_ID_RE}; got: ${JSON.stringify(value)}`);
  }
  return value.replace(/^\d{14}-/, '');
}

export function isRunId(value) {
  return RUN_ID_RE.test(String(value ?? ''));
}

// UTC YYYYMMDDHHmmss for the leading 14 chars of a runId. Single source of
// truth so create-report-run.mjs and test-refresh-pipeline.mjs never re-implement the
// formatting — both must agree on UTC and zero-padding so the same Date can
// reproduce the same runId.
export function nowRunTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

// Extract YYYY-MM-DD (UTC) from the leading timestamp of a runId. The runId
// is the canonical clock anchor for a report; chapter doc heads `runDate`
// values come from this so the agent never has to format a date itself.
export function runDateFromRunId(runId) {
  const value = String(runId ?? '');
  if (!RUN_ID_RE.test(value)) {
    throw new Error(`[utils] runDateFromRunId requires a runId matching ${RUN_ID_RE}; got: ${JSON.stringify(value)}`);
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function isFinalizedReportFolder(path) {
  return FINAL_REPORT_FILES.every((file) => existsSync(join(path, file)));
}

export function normalizeRevision(value) {
  const revision = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const status = revision.status === 'superseded' ? 'superseded' : 'current';
  const nullableString = (field) => (typeof revision[field] === 'string' && revision[field].trim() ? revision[field].trim() : null);
  return {
    status,
    refreshOfRunId: nullableString('refreshOfRunId'),
    supersededByRunId: nullableString('supersededByRunId'),
    refreshReason: nullableString('refreshReason'),
  };
}

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

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Parses a YYYY-MM-DD-ish value into a Date (UTC midnight) or null. Tolerates
// Date objects and strings; returns null on anything unparseable. Used by
// build-evidence-ledger and assemble-report for source/claim freshness anchoring.
export function parseDate(value) {
  const text = asDateString(value);
  if (!text) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

// Best-effort registrable domain (eTLD+1) for canonical-URL bookkeeping.
// Uses MULTI_PART_TLDS from validation-catalog for consistency across the codebase.
export function registrableDomain(url) {
  const host = normalizeDomain(url);
  if (!host) return '';
  const parts = host.split('.');
  if (parts.length <= REGISTRABLE_DOMAIN_MAX_PARTS) return host;
  const lastTwo = parts.slice(-2).join('.');
  return MULTI_PART_TLDS.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo;
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

const AGENT_POLICY_STRING_ARRAY_FIELDS = [
  'volatileFacts',
  'researchRules',
  'chapterAuthoringRules',
  'hardRules',
  'finalResponseFields',
];

function assertStringArray(value, scope) {
  assertConfig(Array.isArray(value), `${scope} must be an array (use [] for none)`);
  for (const [index, item] of value.entries()) {
    assertConfig(typeof item === 'string' && item.trim().length > 0, `${scope}[${index}] must be a non-empty string`);
  }
}

function normalizeAgentPolicy(policy = {}) {
  assertConfig(policy && typeof policy === 'object' && !Array.isArray(policy), 'agentPolicy must be an object');
  const out = deepClone(policy);
  for (const field of AGENT_POLICY_STRING_ARRAY_FIELDS) {
    if (out[field] === undefined) out[field] = [];
    assertStringArray(out[field], `agentPolicy.${field}`);
  }
  if (out.retryPolicy === undefined) out.retryPolicy = {};
  assertConfig(out.retryPolicy && typeof out.retryPolicy === 'object' && !Array.isArray(out.retryPolicy), 'agentPolicy.retryPolicy must be an object');
  if (out.retryPolicy.maxChapterRetries !== undefined) {
    const value = out.retryPolicy.maxChapterRetries;
    assertConfig(Number.isInteger(value) && value > 0, 'agentPolicy.retryPolicy.maxChapterRetries must be a positive integer');
  }
  if (out.retryPolicy.requireMonotonicFailureDecrease !== undefined) {
    assertConfig(typeof out.retryPolicy.requireMonotonicFailureDecrease === 'boolean', 'agentPolicy.retryPolicy.requireMonotonicFailureDecrease must be a boolean');
  }
  return out;
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
  const agentPolicy = normalizeAgentPolicy(config.agentPolicy ?? {});
  assertConfig(config.defaultGate && typeof config.defaultGate === 'object', 'defaultGate must be an object');
  assertGateShape(config.defaultGate, 'defaultGate');
  assertConfig(Array.isArray(config.chapters) && config.chapters.length > 0, 'chapters[] must be a non-empty array');

  const figureTypes = new Set(FIGURE_TYPES);
  // Chapter identity is (key, order, letter); the file name is derived as
  // `<order:02>-<key>.yaml`. The `letter` is the chapter's ID-space letter
  // (per validation-catalog.mjs) used by source/claim/table/figure/question IDs
  // generated within the chapter (e.g. SO001, CO045, TA008).
  const chapters = config.chapters
    .map((chapter) => {
      assertConfig(chapter && typeof chapter === 'object', 'each chapter entry must be an object');
      assertConfig(chapter.key, 'chapter is missing key');
      assertConfig(/^[a-z][a-z0-9-]*$/.test(chapter.key), `${chapter.key}: key must be kebab-case (a-z, 0-9, -)`);
      assertConfig(Number.isInteger(Number(chapter.order)) && Number(chapter.order) > 0, `${chapter.key}: order must be a positive integer`);
      assertConfig(typeof chapter.letter === 'string' && /^[A-Z]$/.test(chapter.letter), `${chapter.key}: letter must be a single uppercase A-Z`);
      assertConfig(!RESERVED_TYPE_LETTERS.has(chapter.letter), `${chapter.key}: letter "${chapter.letter}" collides with a reserved type letter (${[...RESERVED_TYPE_LETTERS].join(', ')})`);
      const order = Number(chapter.order);
      const key = String(chapter.key);
      return {
        key,
        order,
        letter: chapter.letter,
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
  assertUnique(chapters.map((chapter) => chapter.letter), 'chapters[].letter');

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

  // Report-level gate (hard floors across the entire report, not per-chapter).
  const reportGate = config.reportGate ?? null;
  if (reportGate) {
    assertConfig(typeof reportGate === 'object', 'reportGate must be an object');
    if (reportGate.minDistinctDomains !== undefined) {
      const value = reportGate.minDistinctDomains;
      assertConfig(Number.isInteger(value) && value > 0, 'reportGate.minDistinctDomains must be a positive integer');
    }
    if (reportGate.requireAdverseSource !== undefined) {
      assertConfig(typeof reportGate.requireAdverseSource === 'boolean', 'reportGate.requireAdverseSource must be a boolean');
    }
    if (reportGate.maxPaywallPercent !== undefined) {
      const value = reportGate.maxPaywallPercent;
      assertConfig(typeof value === 'number' && value >= 0 && value <= 1, 'reportGate.maxPaywallPercent must be a number between 0 and 1');
    }
    if (reportGate.crossChapterTolerances !== undefined) {
      const ct = reportGate.crossChapterTolerances;
      assertConfig(typeof ct === 'object', 'reportGate.crossChapterTolerances must be an object');
      if (ct.metricDrift !== undefined) {
        const v = ct.metricDrift;
        assertConfig(typeof v === 'number' && v >= 0 && v <= 1, 'reportGate.crossChapterTolerances.metricDrift must be a number between 0 and 1');
      }
      if (ct.keyFactOverlap !== undefined) {
        const v = ct.keyFactOverlap;
        assertConfig(typeof v === 'number' && v >= 0 && v <= 1, 'reportGate.crossChapterTolerances.keyFactOverlap must be a number between 0 and 1');
      }
      if (ct.duplicateOverlap !== undefined) {
        const v = ct.duplicateOverlap;
        assertConfig(typeof v === 'number' && v >= 0 && v <= 1, 'reportGate.crossChapterTolerances.duplicateOverlap must be a number between 0 and 1');
      }
    }
  }

  // Optional report-level adverse-evidence distribution gate. Default is no
  // floor / no concentration warning; workflow-config.yaml opts in.
  const adverseDistribution = config.adverseDistribution ?? null;
  if (adverseDistribution) {
    assertConfig(typeof adverseDistribution === 'object', 'adverseDistribution must be an object');
    const required = adverseDistribution.requireAtLeastOneAdverseSource ?? [];
    assertConfig(Array.isArray(required), 'adverseDistribution.requireAtLeastOneAdverseSource must be an array (use [] for none)');
    for (const ref of required) {
      assertConfig(knownKeys.has(ref), `adverseDistribution.requireAtLeastOneAdverseSource references unknown chapter key "${ref}"`);
    }
    if (adverseDistribution.warnIfChaptersWithAdverseSourceAtMost !== undefined) {
      const value = adverseDistribution.warnIfChaptersWithAdverseSourceAtMost;
      assertConfig(Number.isInteger(value) && value >= 0, 'adverseDistribution.warnIfChaptersWithAdverseSourceAtMost must be a non-negative integer');
    }
  }

  // Inject report-level adverse-distribution requirements into each chapter's
  // gate as gate.minAdverseSources. Single source of truth so every consumer
  // of loadWorkflowConfig (chapter runtime contexts, getAnalysisArtifacts, the
  // check-chapter retry loop) sees the same gate — the agent must receive
  // every constraint the gate will enforce.
  const adverseRequiredKeys = new Set(adverseDistribution?.requireAtLeastOneAdverseSource ?? []);
  for (const chapter of chapters) {
    chapter.gate = { ...chapter.gate, minAdverseSources: adverseRequiredKeys.has(chapter.key) ? 1 : 0 };
  }

  return { ...config, agentPolicy, chapters, adverseDistribution, reportGate };
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
    letter: chapter.letter,
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

// Convenience: ordered list of chapter YAML filenames (`01-…`, `02-…`, …).
// Use this anywhere you need to iterate per-chapter file names instead of
// hardcoding the list (e.g. fixture replay, full-report assembly, doc tools).
export function getAnalysisChapterFiles(config = loadWorkflowConfig()) {
  return getAnalysisArtifacts(config).map((c) => c.file);
}

export function getCoreArtifacts(config = loadWorkflowConfig()) {
  const analysis = getAnalysisArtifacts(config).map(({ file, artifact, chapter }) => ({ file, artifact, chapter }));
  return [
    ...analysis,
    ...Object.values(FINAL_ARTIFACTS),
  ];
}

