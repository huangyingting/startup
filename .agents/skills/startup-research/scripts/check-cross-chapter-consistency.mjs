#!/usr/bin/env node
// Cross-chapter consistency check. Looks for the same metric appearing in
// multiple chapters with conflicting values (cover metrics, KPI scorecards,
// range figures, and tables that share row labels). Catches drift between,
// say, Company Overview's "valuation" cover metric and the Financials chapter's
// capital-adequacy table referencing the same number with a different value.
//
// Strictly read-only; exits 1 on any conflict so the workflow stops before
// finalization. Warnings are non-fatal unless --strict is passed.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EXIT, getAnalysisArtifacts, loadWorkflowConfig, tryReadYaml } from './utils.mjs';
import { ANALYSIS_TOKEN_STOP_WORDS, KEY_FACT_TOPICS, MIN_ANALYSIS_TOKEN_LENGTH } from './validation-catalog.mjs';

const WORKFLOW_CONFIG = loadWorkflowConfig();

const args = (() => {
  const parsed = { folder: null, strict: false, format: 'text' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--strict') parsed.strict = true;
    else if (arg === '--format') {
      const next = argv[++i];
      if (next === undefined || next.startsWith('-')) {
        console.error('[cross-chapter] --format requires a value (text|json)');
        process.exit(EXIT.invalidArgs);
      }
      parsed.format = next;
    } else if (arg.startsWith('-')) {
      console.error(`[cross-chapter] unknown flag: ${arg}`);
      console.error('Usage: node .agents/skills/startup-research/scripts/check-cross-chapter-consistency.mjs <report-folder> [--strict] [--format text|json]');
      process.exit(EXIT.invalidArgs);
    } else if (!parsed.folder) parsed.folder = arg;
    else {
      console.error(`[cross-chapter] unexpected positional argument: ${arg}`);
      process.exit(EXIT.invalidArgs);
    }
  }
  return parsed;
})();

if (!args.folder) {
  console.error('Usage: node .agents/skills/startup-research/scripts/check-cross-chapter-consistency.mjs <report-folder> [--strict] [--format text|json]');
  process.exit(EXIT.invalidArgs);
}
if (!['text', 'json'].includes(args.format)) {
  console.error(`Invalid --format value: ${args.format}; expected text or json`);
  process.exit(EXIT.invalidArgs);
}

const reportFolder = resolve(args.folder);
if (!existsSync(reportFolder)) {
  console.error(`[cross-chapter] folder not found: ${reportFolder}`);
  process.exit(EXIT.notFound);
}

const conflicts = [];
const warnings = [];
const flag = (severity, dimension, message, extra = {}) => {
  (severity === 'fail' ? conflicts : warnings).push({ severity, dimension, message, ...extra });
};

const chapters = getAnalysisArtifacts();
const docs = [];
for (const spec of chapters) {
  const path = join(reportFolder, spec.file);
  const result = tryReadYaml(path);
  if (!result.ok) {
    if (result.error.startsWith('ENOENT')) {
      flag('fail', 'missingChapter', `${spec.file}: missing`);
    } else {
      flag('fail', 'yamlParse', `${spec.file}: ${result.error}`);
    }
    continue;
  }
  docs.push({ spec, doc: result.value });
}

// ---------------------------------------------------------------------------
// metric harvesting
// ---------------------------------------------------------------------------
function normalizeMetricKey(label) {
  return String(label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Returns numeric value when the input is a number or a money/percent/count
// string ($157B, 250M, 76.4%). Returns null when no clean number is parseable.
function parseNumeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null) return null;
  const text = String(value).trim();
  const match = text.match(/[-+]?\d[\d,.]*/);
  if (!match) return null;
  let num = Number(match[0].replace(/,/g, ''));
  if (!Number.isFinite(num)) return null;
  if (/\b(b|bn|billion)\b|\$\s*\d[\d.,]*\s*b/i.test(text)) num *= 1_000_000_000;
  else if (/\b(m|mn|million)\b/i.test(text)) num *= 1_000_000;
  else if (/\b(k|thousand)\b/i.test(text)) num *= 1_000;
  return num;
}

function pushMetric(metrics, key, entry) {
  if (!key) return;
  const list = metrics.get(key) ?? [];
  list.push(entry);
  metrics.set(key, list);
}

const metrics = new Map();

for (const { spec, doc } of docs) {
  const chapterTag = `${spec.file}`;

  // (a) figure: kpi cards and range figures
  for (const figure of doc.figures ?? []) {
    if (figure.type === 'kpi') {
      const items = [...(figure.data?.items ?? []), ...(figure.data?.nodes ?? [])];
      for (const item of items) {
        const key = normalizeMetricKey(item?.label);
        const numeric = parseNumeric(item?.value ?? item?.score);
        if (numeric != null) {
          pushMetric(metrics, key, { chapter: chapterTag, source: `figure ${figure.id} (kpi)`, value: item.value ?? item.score, numeric });
        }
      }
    } else if (figure.type === 'range') {
      for (const item of figure.data?.items ?? []) {
        const key = normalizeMetricKey(item?.label);
        for (const variant of ['low', 'min', 'mid', 'high', 'max', 'value']) {
          const numeric = parseNumeric(item?.[variant]);
          if (numeric != null) {
            pushMetric(metrics, `${key} :: ${variant}`, { chapter: chapterTag, source: `figure ${figure.id} (range.${variant})`, value: item[variant], numeric });
          }
        }
      }
    }
  }

  // (b) coverFacts live in the report-meta file but they may also appear in
  // a chapter's snapshot KPI table; catch numeric/value pairs there too.
  for (const table of doc.tables ?? []) {
    const headers = (table.columns ?? []).map((column) => normalizeMetricKey(column));
    const valueIndex = headers.findIndex((header) => /^(value|amount|metric value|number)$/.test(header));
    const labelIndex = headers.findIndex((header) => /^(metric|kpi|item|name|category|stream|driver)$/.test(header));
    if (valueIndex < 0 || labelIndex < 0) continue;
    for (const row of table.rows ?? []) {
      if (!Array.isArray(row)) continue;
      const key = normalizeMetricKey(row[labelIndex]);
      const numeric = parseNumeric(row[valueIndex]);
      if (key && numeric != null) {
        pushMetric(metrics, key, { chapter: chapterTag, source: `table ${table.id}`, value: row[valueIndex], numeric });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// conflict detection: same metric label, materially different numeric values
// across two or more chapters
// ---------------------------------------------------------------------------
const tolerances = WORKFLOW_CONFIG.reportGate?.crossChapterTolerances ?? {};
const metricDriftTolerance = tolerances.metricDrift ?? 0.10;

for (const [key, entries] of metrics) {
  // group by chapter (multiple values from one chapter are not cross-chapter
  // drift; they are single-artifact concerns)
  const byChapter = new Map();
  for (const entry of entries) {
    const list = byChapter.get(entry.chapter) ?? [];
    list.push(entry);
    byChapter.set(entry.chapter, list);
  }
  if (byChapter.size < 2) continue;
  // pick the median numeric per chapter to compare cross-chapter
  const reps = [...byChapter.entries()].map(([chapter, list]) => {
    const sorted = list.slice().sort((a, b) => a.numeric - b.numeric);
    return { chapter, rep: sorted[Math.floor(sorted.length / 2)], all: list };
  });
  const min = Math.min(...reps.map((row) => row.rep.numeric));
  const max = Math.max(...reps.map((row) => row.rep.numeric));
  if (min === 0) {
    if (max !== 0) {
      flag('fail', 'metricDrift', `metric "${key}" mixes zero and nonzero values across chapters`, { metric: key, occurrences: reps });
    }
    continue;
  }
  const drift = (max - min) / Math.abs(min);
  if (drift > metricDriftTolerance) {
    flag('fail', 'metricDrift', `metric "${key}" varies ${(drift * 100).toFixed(1)}% across chapters (${min} vs ${max})`, {
      metric: key,
      min,
      max,
      occurrences: reps.map(({ chapter, rep }) => ({ chapter, source: rep.source, value: rep.value, numeric: rep.numeric })),
    });
  } else if (drift > 0) {
    flag('warn', 'metricDriftSmall', `metric "${key}" varies ${(drift * 100).toFixed(1)}% across chapters (within tolerance)`, {
      metric: key,
      occurrences: reps.map(({ chapter, rep }) => ({ chapter, source: rep.source, value: rep.value, numeric: rep.numeric })),
    });
  }
}

// ---------------------------------------------------------------------------
// claim-id reuse: every chapter has its own local C### namespace, so a claim
// id appearing in two chapter localEvidence ledgers is a sign the agent
// hand-copied evidence between chapters instead of resolving via the ledger.
// (This catches the "did you accidentally duplicate evidence" failure mode.)
// ---------------------------------------------------------------------------
const claimOwners = new Map();
for (const { spec, doc } of docs) {
  for (const claim of doc.localEvidence?.claims ?? []) {
    if (!claim?.id) continue;
    const owners = claimOwners.get(claim.id) ?? [];
    owners.push({ chapter: spec.file, statement: claim.statement?.slice(0, 80) });
    claimOwners.set(claim.id, owners);
  }
}
for (const [id, owners] of claimOwners) {
  if (owners.length > 1) {
    flag('warn', 'duplicateLocalClaim', `local claim id ${id} appears in ${owners.length} chapter ledgers`, { claimId: id, owners });
  }
}

// ---------------------------------------------------------------------------
// Key-facts registry: company-overview is the canonical source for identity
// facts (founded, founders, headquarters, total raised, latest valuation,
// headcount, customer count). When later chapters restate these facts, they
// must do so by referencing claim IDs from company-overview rather than
// inventing parallel local claims.
// ---------------------------------------------------------------------------

const overview = docs.find((d) => d.spec.key === 'company-overview');
if (overview) {
  const overviewClaimStatements = new Map();
  for (const claim of overview.doc.localEvidence?.claims ?? []) {
    const norm = String(claim?.statement ?? '').toLowerCase();
    overviewClaimStatements.set(norm, claim.id);
  }
  for (const { spec, doc } of docs) {
    if (spec.key === 'company-overview') continue;
    for (const claim of doc.localEvidence?.claims ?? []) {
      const stmt = String(claim?.statement ?? '');
      const norm = stmt.toLowerCase();
      const matchesKey = KEY_FACT_TOPICS.some((re) => re.test(norm));
      if (!matchesKey) continue;
      // Look for a near-match in overview claims (>=keyFactOverlap token overlap)
      const keyFactOverlap = tolerances.keyFactOverlap ?? 0.7;
      for (const [overviewNorm, overviewId] of overviewClaimStatements) {
        const overlap = jaccardTokens(norm, overviewNorm);
        if (overlap >= keyFactOverlap && claim.id !== overviewId) {
          flag('fail', 'keyFactDrift', `${spec.file}: claim ${claim.id} restates a key fact ("${stmt.slice(0, 80)}") that already exists in company-overview as ${overviewId}; reference the canonical claim instead of creating a parallel local claim`, { chapter: spec.file, claimId: claim.id, canonicalId: overviewId });
          break;
        }
      }
    }
  }
}

function jaccardTokens(a, b) {
  const tokA = new Set(a.split(/[^a-z0-9]+/).filter((t) => t.length >= MIN_ANALYSIS_TOKEN_LENGTH && !ANALYSIS_TOKEN_STOP_WORDS.has(t)));
  const tokB = new Set(b.split(/[^a-z0-9]+/).filter((t) => t.length >= MIN_ANALYSIS_TOKEN_LENGTH && !ANALYSIS_TOKEN_STOP_WORDS.has(t)));
  if (!tokA.size || !tokB.size) return 0;
  const inter = [...tokA].filter((t) => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  return inter / union;
}

// ---------------------------------------------------------------------------
// Cross-chapter duplicate analysis: catches the same table or figure topic
// appearing in two chapters. The chapter-local check (check-chapter.mjs)
// only sees one chapter at a time and so cannot detect this. The fingerprint
// is (artifact kind, normalized title tokens, normalized header/row-label
// tokens for tables / data-label tokens for figures); two artifacts with
// >=0.7 token overlap on both title and structure are flagged.
// ---------------------------------------------------------------------------
function tableFingerprint(table) {
  const titleTokens = String(table?.title ?? '').toLowerCase();
  const structureTokens = [
    ...(table?.columns ?? []).map((c) => String(c ?? '')),
    ...(table?.rows ?? []).map((row) => Array.isArray(row) ? String(row[0] ?? '') : ''),
  ].join(' ').toLowerCase();
  return { titleTokens, structureTokens };
}

function figureFingerprint(figure) {
  const titleTokens = String(figure?.title ?? '').toLowerCase();
  const labelStrings = [];
  const collectLabels = (value) => {
    if (Array.isArray(value)) { value.forEach(collectLabels); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'label' && typeof child === 'string') labelStrings.push(child);
      else collectLabels(child);
    }
  };
  collectLabels(figure?.data);
  return { titleTokens, structureTokens: labelStrings.join(' ').toLowerCase() };
}

const tableFingerprints = [];
const figureFingerprints = [];
for (const { spec, doc } of docs) {
  for (const table of doc.tables ?? []) {
    tableFingerprints.push({ chapter: spec.file, id: table?.id, kind: 'table', ...tableFingerprint(table) });
  }
  for (const figure of doc.figures ?? []) {
    figureFingerprints.push({ chapter: spec.file, id: figure?.id, kind: 'figure', ...figureFingerprint(figure) });
  }
}

function findCrossChapterDuplicates(items) {
  const duplicateOverlap = tolerances.duplicateOverlap ?? 0.7;
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (a.chapter === b.chapter) continue;
      const titleOverlap = jaccardTokens(a.titleTokens, b.titleTokens);
      const structureOverlap = jaccardTokens(a.structureTokens, b.structureTokens);
      if (titleOverlap >= duplicateOverlap && structureOverlap >= duplicateOverlap) {
        flag('fail', 'duplicateAnalysisCrossChapter', `${a.kind} ${a.id ?? '?'} in ${a.chapter} duplicates ${b.kind} ${b.id ?? '?'} in ${b.chapter} (title overlap ${(titleOverlap * 100).toFixed(0)}%, structure overlap ${(structureOverlap * 100).toFixed(0)}%); merge into one chapter or sharpen one to answer a distinct question`, { kind: a.kind, a: { chapter: a.chapter, id: a.id }, b: { chapter: b.chapter, id: b.id } });
      }
    }
  }
}
findCrossChapterDuplicates(tableFingerprints);
findCrossChapterDuplicates(figureFingerprints);

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------
const ok = conflicts.length === 0 && (!args.strict || warnings.length === 0);

if (args.format === 'json') {
  console.log(JSON.stringify({ ok, reportFolder, conflicts, warnings, metricCount: metrics.size }, null, 2));
} else {
  console.log(`[cross-chapter] checked ${docs.length} chapters and ${metrics.size} normalized metric labels`);
  for (const entry of conflicts) {
    console.error(`  ✗ [${entry.dimension}] ${entry.message}`);
  }
  for (const entry of warnings) {
    console.warn(`  ! [${entry.dimension}] ${entry.message}`);
  }
  if (ok) console.log('[cross-chapter] ✓ no material drift detected.');
}

process.exit(ok ? EXIT.ok : EXIT.validation);
