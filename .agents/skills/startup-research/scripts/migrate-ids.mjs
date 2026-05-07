#!/usr/bin/env node
// One-shot migration: convert reports built under the legacy global id scheme
// (S001/C001/T001/F001/RQ001 etc.) to the new chapter-letter scheme
// (SO001/CO001/TO001/FO001/QO001 etc.).
//
// For each chapter file in the report:
//   1. Build a localToNew map that renumbers every id inside localEvidence
//      (sources, claims, researchQuestions) using the chapter letter and a
//      fresh 001..NNN sequence in document order. Tables and figures get the
//      same treatment but their old ids are usually <chapterNumber>xx
//      (T501, F202, ...) — they too become T<L>### / F<L>### sequenced.
//   2. Rewrite every claimRefs[]/figureRef/tableRef/sourceRefs/
//      answersQuestionRefs/contradictsClaimRefs/relatedQuestionRefs/
//      relatedTableRefs/retainedSourceRefs and every inline `[C\d+]` string
//      to the new id space.
//   3. Save the file back.
//
// claimRefs that live in chapter sections/tables/figures/callouts are GLOBAL
// post-ledger ids (C001 .. C(many)). For each global id we look up the
// originating chapter from evidence.yaml (by content match against
// localEvidence) and substitute the originating chapter's new id. After all
// chapters are rewritten, evidence.yaml / full-report.yaml / summary-card.yaml
// are deleted so the caller can rebuild them via the new ledger + assemble.
//
// Usage:
//   node .agents/skills/startup-research/scripts/migrate-ids.mjs <report-folder>
//   node .agents/skills/startup-research/scripts/migrate-ids.mjs --all
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compactText, FINAL_ARTIFACTS, getAnalysisArtifacts, loadWorkflowConfig, readYaml, writeYaml } from './utils.mjs';
import { makeId } from './check-dimensions.mjs';

const WORKFLOW_CONFIG = loadWorkflowConfig();
const ANALYSIS_ARTIFACTS = getAnalysisArtifacts(WORKFLOW_CONFIG);

function parseArgs(argv) {
  const args = { all: false, folder: null };
  for (const arg of argv) {
    if (arg === '--all') args.all = true;
    else if (!arg.startsWith('-')) args.folder = arg;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const reportsRoot = resolve('reports');
let folders = [];
if (args.all) {
  folders = readdirSync(reportsRoot)
    .map((name) => join(reportsRoot, name))
    .filter((path) => statSync(path).isDirectory());
} else if (args.folder) {
  folders = [resolve(args.folder)];
} else {
  console.error('Usage: node .agents/skills/startup-research/scripts/migrate-ids.mjs <report-folder> | --all');
  process.exit(1);
}

let totalMigrated = 0;
let totalSkipped = 0;
let totalErrors = 0;
for (const folder of folders) {
  try {
    const result = migrateReport(folder);
    if (result === 'migrated') totalMigrated += 1;
    else if (result === 'skipped') totalSkipped += 1;
  } catch (err) {
    totalErrors += 1;
    console.error(`[migrate] FAIL ${folder}: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
  }
}
console.log(`[migrate] done. migrated=${totalMigrated} skipped=${totalSkipped} errors=${totalErrors}`);
process.exit(totalErrors === 0 ? 0 : 1);

// ---------------------------------------------------------------------------

function migrateReport(folder) {
  // Read every chapter file present.
  const chapterDocs = []; // [{ spec, doc, path }]
  for (const spec of ANALYSIS_ARTIFACTS) {
    const path = join(folder, spec.file);
    if (!existsSync(path)) continue;
    chapterDocs.push({ spec, doc: readYaml(path), path });
  }
  if (!chapterDocs.length) {
    console.log(`[migrate] ${folder}: no analysis files; skipped`);
    return 'skipped';
  }

  // Idempotency check. If the first chapter's first claim/section already
  // carries the chapter's letter, treat as migrated.
  if (looksMigrated(chapterDocs)) {
    console.log(`[migrate] ${folder}: already on new ID scheme; skipped`);
    return 'skipped';
  }

  const evidencePath = join(folder, FINAL_ARTIFACTS.evidence.file);
  const evidence = existsSync(evidencePath) ? readYaml(evidencePath) : null;

  // Some older reports never persisted localEvidence per chapter \u2014 sources,
  // claims, and researchQuestions live only in evidence.yaml. For those we
  // assign each global source/claim to the lowest-order chapter that
  // references it via claimRefs (sources via the claims that use them), then
  // synthesize localEvidence per chapter from the assignment. Approximate
  // chapter affinity is acceptable: the facts are intact, just attributed to
  // the chapter that first uses them.
  const hasAnyLocalEvidence = chapterDocs.some(({ doc }) => (doc.localEvidence?.claims ?? []).length > 0);
  if (!hasAnyLocalEvidence) {
    if (!evidence) {
      throw new Error(`no localEvidence in any chapter and no evidence.yaml; cannot migrate ${folder}`);
    }
    synthesizeLocalEvidence(chapterDocs, evidence);
  }

  // Build per-chapter local -> new maps for sources, claims, questions,
  // tables, figures.
  const perChapter = new Map(); // file -> { spec, localMap }
  for (const { spec, doc } of chapterDocs) {
    const localMap = buildLocalToNewMap(doc, spec.letter);
    perChapter.set(spec.file, { spec, localMap });
  }

  // Build a global-claim -> new map and a global-source -> new map by
  // matching evidence.yaml entries against per-chapter localEvidence by
  // content. The legacy ledger renumbered local ids into global ones; we
  // reverse that by content match.
  const globalClaimToNew = new Map();
  const globalSourceToNew = new Map();
  if (evidence) {
    for (const globalClaim of evidence.claims ?? []) {
      const match = findOriginatingChapter(globalClaim, chapterDocs, 'claim');
      if (!match) continue;
      const localMap = perChapter.get(match.spec.file).localMap;
      const newId = localMap.claim.get(match.localId);
      if (newId) globalClaimToNew.set(globalClaim.id, newId);
    }
    for (const globalSource of evidence.sources ?? []) {
      const match = findOriginatingChapter(globalSource, chapterDocs, 'source');
      if (!match) continue;
      const localMap = perChapter.get(match.spec.file).localMap;
      const newId = localMap.source.get(match.localId);
      if (newId) globalSourceToNew.set(globalSource.id, newId);
    }
  }

  // Rewrite each chapter document:
  //  - localEvidence ids and self-referencing fields use the localMap.
  //  - All other claimRefs[] and inline [C###] strings use globalClaimToNew.
  for (const { spec, doc, path } of chapterDocs) {
    const { localMap } = perChapter.get(spec.file);
    const rewritten = rewriteChapter(doc, localMap, globalClaimToNew, globalSourceToNew);
    writeYaml(path, rewritten);
  }

  // Drop downstream artifacts; ledger and assemble must rebuild against the
  // new id space.
  for (const { file } of [FINAL_ARTIFACTS.evidence, FINAL_ARTIFACTS.fullReport, FINAL_ARTIFACTS.summaryCard]) {
    const path = join(folder, file);
    if (existsSync(path)) unlinkSync(path);
  }

  console.log(`[migrate] ${folder}: rewrote ${chapterDocs.length} chapter(s); deleted evidence/full-report/summary-card.`);
  return 'migrated';
}

// True if any chapter already carries chapter-letter ids in localEvidence
// (newer style) or in tables/figures (older style without localEvidence).
function looksMigrated(chapterDocs) {
  for (const { spec, doc } of chapterDocs) {
    const c = doc.localEvidence?.claims?.[0];
    if (c?.id && typeof c.id === 'string' && c.id.startsWith(`C${spec.letter}`)) return true;
    const t = doc.tables?.[0];
    if (t?.id && typeof t.id === 'string' && t.id.startsWith(`T${spec.letter}`)) return true;
    const f = doc.figures?.[0];
    if (f?.id && typeof f.id === 'string' && f.id.startsWith(`F${spec.letter}`)) return true;
  }
  return false;
}

// Older reports kept everything in evidence.yaml. We invent per-chapter
// localEvidence by attributing each global source/claim to the lowest-order
// chapter that references it (claims via claimRefs, sources via the claims
// that cite them). answersQuestionRefs are dropped because the older runs
// never persisted researchQuestion objects per chapter \u2014 those refs are
// orphaned and cannot be reconstructed.
function synthesizeLocalEvidence(chapterDocs, evidence) {
  const sortedChapters = [...chapterDocs].sort((a, b) => a.spec.order - b.spec.order);

  // claim -> first chapter that references it (lowest order).
  const claimToChapter = new Map();
  for (const { spec, doc } of sortedChapters) {
    for (const ref of collectAllClaimRefs(doc)) {
      if (!claimToChapter.has(ref)) claimToChapter.set(ref, spec.file);
    }
  }

  // source -> first chapter that references it (via the lowest-order claim
  // that uses the source). If no claim references the source, fall back to
  // chapter 1.
  const claimById = new Map((evidence.claims ?? []).map((c) => [c.id, c]));
  const sourceToChapter = new Map();
  for (const { spec } of sortedChapters) {
    for (const ref of collectAllClaimRefs(chapterDocs.find((c) => c.spec.file === spec.file).doc)) {
      const claim = claimById.get(ref);
      if (!claim) continue;
      for (const sRef of claim.sourceRefs ?? []) {
        if (!sourceToChapter.has(sRef)) sourceToChapter.set(sRef, spec.file);
      }
    }
  }
  const fallbackFile = sortedChapters[0].spec.file;
  for (const source of evidence.sources ?? []) {
    if (!sourceToChapter.has(source.id)) sourceToChapter.set(source.id, fallbackFile);
  }
  for (const claim of evidence.claims ?? []) {
    if (!claimToChapter.has(claim.id)) claimToChapter.set(claim.id, fallbackFile);
  }

  // Bucket sources and claims by chapter.
  const bucketsByFile = new Map();
  for (const { spec } of sortedChapters) {
    bucketsByFile.set(spec.file, { sources: [], claims: [] });
  }
  for (const source of evidence.sources ?? []) {
    const file = sourceToChapter.get(source.id);
    bucketsByFile.get(file)?.sources.push(source);
  }
  for (const claim of evidence.claims ?? []) {
    const file = claimToChapter.get(claim.id);
    if (!file) continue;
    // Strip orphaned answersQuestionRefs (no researchQuestion entries in
    // older reports) so the migrated chapter passes schema checks.
    const { answersQuestionRefs: _drop, ...rest } = claim;
    bucketsByFile.get(file)?.claims.push(rest);
  }

  // Inject the synthesized localEvidence into each chapter doc in place.
  for (const { spec, doc } of sortedChapters) {
    const bucket = bucketsByFile.get(spec.file);
    doc.localEvidence = {
      ...(doc.localEvidence ?? {}),
      sources: bucket.sources,
      claims: bucket.claims,
    };
  }
}

function collectAllClaimRefs(doc) {
  const out = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (key === 'claimRefs' && Array.isArray(child)) {
          for (const ref of child) if (typeof ref === 'string') out.add(ref);
        } else {
          walk(child);
        }
      }
      return;
    }
    if (typeof value === 'string') {
      const matches = value.match(/\[C\d{3,}\]/g);
      if (matches) for (const m of matches) out.add(m.slice(1, -1));
    }
  };
  walk(doc);
  return out;
}

function buildLocalToNewMap(doc, letter) {
  const map = {
    source: new Map(),
    claim: new Map(),
    question: new Map(),
    table: new Map(),
    figure: new Map(),
  };
  const local = doc.localEvidence ?? {};
  (local.sources ?? []).forEach((s, i) => { if (s?.id) map.source.set(s.id, makeId('S', letter, i)); });
  (local.claims ?? []).forEach((c, i) => { if (c?.id) map.claim.set(c.id, makeId('C', letter, i)); });
  (local.researchQuestions ?? []).forEach((q, i) => { if (q?.id) map.question.set(q.id, makeId('Q', letter, i)); });
  (doc.tables ?? []).forEach((t, i) => { if (t?.id) map.table.set(t.id, makeId('T', letter, i)); });
  (doc.figures ?? []).forEach((f, i) => { if (f?.id) map.figure.set(f.id, makeId('F', letter, i)); });
  return map;
}

// Match a global ledger entry to the chapter that originally contributed it.
// We compare statement+topic for claims and url+title+publisher for sources.
function findOriginatingChapter(globalEntry, chapterDocs, kind) {
  const targetKey = entryContentKey(globalEntry, kind);
  for (const { spec, doc } of chapterDocs) {
    const list = kind === 'claim' ? (doc.localEvidence?.claims ?? []) : (doc.localEvidence?.sources ?? []);
    for (const local of list) {
      if (entryContentKey(local, kind) === targetKey) {
        return { spec, localId: local.id };
      }
    }
  }
  return null;
}

function entryContentKey(entry, kind) {
  if (!entry || typeof entry !== 'object') return '';
  if (kind === 'claim') {
    // Match by statement only. Topic can drift between chapter localEvidence
    // and evidence.yaml when chapters were edited after ledger consolidated
    // them. Statements are atomic facts and unique enough in practice.
    return textKey(entry.statement);
  }
  // source: url is the canonical key when present; fall back to title+publisher.
  if (entry.url) return textKey(entry.url);
  return [textKey(entry.title), textKey(entry.publisher)].join('|');
}

function textKey(value) {
  return compactText(value ?? '').toLowerCase();
}

// Recursively rewrite a chapter document in place:
//  - localEvidence: source/claim/question id and self-refs use localMap.
//  - section/table/figure/callout claimRefs[] use globalClaimToNew.
//  - inline [C\d+] strings in any string value use globalClaimToNew.
function rewriteChapter(doc, localMap, globalClaimToNew, globalSourceToNew) {
  // Tables and figures live at the document root.
  const tables = (doc.tables ?? []).map((t) => rewriteArtifact(t, localMap, globalClaimToNew, 'table'));
  const figures = (doc.figures ?? []).map((f) => rewriteArtifact(f, localMap, globalClaimToNew, 'figure'));
  const sections = (doc.sections ?? []).map((s) => rewriteSection(s, localMap, globalClaimToNew));
  const callouts = (doc.callouts ?? []).map((c) => rewriteCallout(c, localMap, globalClaimToNew));
  const analysisCallouts = (doc.analysisCallouts ?? []).map((c) => rewriteCallout(c, localMap, globalClaimToNew));
  // Some legacy reports used a singular `analysisCallout` field (single object,
  // not an array). Handle both shapes.
  const analysisCallout = doc.analysisCallout
    ? rewriteCallout(doc.analysisCallout, localMap, globalClaimToNew)
    : undefined;

  const localEvidence = rewriteLocalEvidence(doc.localEvidence ?? {}, localMap, globalClaimToNew, globalSourceToNew);

  const result = { ...doc };
  if (doc.tables) result.tables = tables;
  if (doc.figures) result.figures = figures;
  if (doc.sections) result.sections = sections;
  if (doc.callouts) result.callouts = callouts;
  if (doc.analysisCallouts) result.analysisCallouts = analysisCallouts;
  if (doc.analysisCallout) result.analysisCallout = analysisCallout;
  if (doc.localEvidence) result.localEvidence = localEvidence;
  return result;
}

function rewriteLocalEvidence(local, localMap, globalClaimToNew, globalSourceToNew) {
  // Cross-chapter fallback: refs can target an entity that synthesizeLocalEvidence
  // attributed to a different chapter. Try the local map first (intra-chapter,
  // by definition for newer reports), then fall back to the global map.
  const mapClaim = (r) => localMap.claim.get(r) ?? globalClaimToNew?.get(r) ?? r;
  const mapSource = (r) => localMap.source.get(r) ?? globalSourceToNew?.get(r) ?? r;
  const sources = (local.sources ?? []).map((s) => ({
    ...s,
    id: localMap.source.get(s?.id) ?? s?.id,
  }));
  const claims = (local.claims ?? []).map((c) => ({
    ...c,
    id: localMap.claim.get(c?.id) ?? c?.id,
    sourceRefs: (c.sourceRefs ?? []).map(mapSource),
    answersQuestionRefs: (c.answersQuestionRefs ?? []).map((r) => localMap.question.get(r) ?? r),
    contradictsClaimRefs: (c.contradictsClaimRefs ?? []).map(mapClaim),
  }));
  const researchQuestions = (local.researchQuestions ?? []).map((q) => ({
    ...q,
    id: localMap.question.get(q?.id) ?? q?.id,
  }));
  const evidenceGaps = (local.evidenceGaps ?? []).map((g) => ({
    ...g,
    relatedQuestionRefs: (g.relatedQuestionRefs ?? []).map((r) => localMap.question.get(r) ?? r),
    relatedTableRefs: (g.relatedTableRefs ?? []).map((r) => localMap.table.get(r) ?? r),
  }));
  const searchQueries = (local.searchQueries ?? []).map((q) => ({
    ...q,
    retainedSourceRefs: (q.retainedSourceRefs ?? []).map(mapSource),
  }));
  return {
    ...local,
    ...(local.searchQueries ? { searchQueries } : {}),
    ...(local.researchQuestions ? { researchQuestions } : {}),
    ...(local.sources ? { sources } : {}),
    ...(local.claims ? { claims } : {}),
    ...(local.evidenceGaps ? { evidenceGaps } : {}),
  };
}

function rewriteArtifact(artifact, localMap, globalClaimToNew, kind) {
  const oldId = artifact?.id;
  const newId = kind === 'table' ? localMap.table.get(oldId) : localMap.figure.get(oldId);
  // claimRefs may carry the legacy LOCAL id (never renumbered in chapter body)
  // OR the legacy GLOBAL id. Prefer the local map first, then global.
  const claimRefs = (artifact.claimRefs ?? []).map((r) => localMap.claim.get(r) ?? globalClaimToNew.get(r) ?? r);
  const next = { ...artifact };
  if (oldId && newId) next.id = newId;
  if (artifact.claimRefs) next.claimRefs = claimRefs;
  // Recursively walk the data field for embedded figureRef/tableRef/inline refs.
  next.data = rewriteEmbedded(artifact.data, localMap, globalClaimToNew);
  if (artifact.notes) next.notes = rewriteInlineRefs(artifact.notes, localMap, globalClaimToNew);
  return next;
}

function rewriteSection(section, localMap, globalClaimToNew) {
  const claimRefs = (section.claimRefs ?? []).map((r) => localMap.claim.get(r) ?? globalClaimToNew.get(r) ?? r);
  return {
    ...section,
    body: rewriteInlineRefs(section.body, localMap, globalClaimToNew),
    ...(section.claimRefs ? { claimRefs } : {}),
  };
}

function rewriteCallout(callout, localMap, globalClaimToNew) {
  const claimRefs = (callout.claimRefs ?? []).map((r) => localMap.claim.get(r) ?? globalClaimToNew.get(r) ?? r);
  return {
    ...callout,
    body: rewriteInlineRefs(callout.body, localMap, globalClaimToNew),
    ...(callout.claimRefs ? { claimRefs } : {}),
  };
}

// Walk arbitrary nested objects/arrays, rewriting embedded artifact refs and
// inline [C###] in any string value. Used for figure.data.
function rewriteEmbedded(value, localMap, globalClaimToNew) {
  if (Array.isArray(value)) return value.map((item) => rewriteEmbedded(item, localMap, globalClaimToNew));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === 'figureRef' && typeof child === 'string') {
        out[key] = localMap.figure.get(child) ?? child;
      } else if (key === 'tableRef' && typeof child === 'string') {
        out[key] = localMap.table.get(child) ?? child;
      } else if (key === 'claimRefs' && Array.isArray(child)) {
        out[key] = child.map((r) => localMap.claim.get(r) ?? globalClaimToNew.get(r) ?? r);
      } else {
        out[key] = rewriteEmbedded(child, localMap, globalClaimToNew);
      }
    }
    return out;
  }
  if (typeof value === 'string') return rewriteInlineRefs(value, localMap, globalClaimToNew);
  return value;
}

function rewriteInlineRefs(text, localMap, globalClaimToNew) {
  if (typeof text !== 'string' || !text) return text;
  // Match either single `[C###]` or comma-separated lists `[C###, C###, ...]`.
  // Split multi-ref brackets into separate single-ref brackets so the website
  // renderer (which only matches `[C<L>\d{3}]`) finds every reference.
  // Reject anything that isn't strictly a comma-separated list of C### tokens
  // so we don't mangle prose that happens to contain bracketed text.
  return text.replace(/\[([^\]]+)\]/g, (match, inner) => {
    const tokens = inner.split(/,\s*/).map((t) => t.trim());
    if (tokens.length === 0 || !tokens.every((t) => /^C\d{3,}$/.test(t))) return match;
    const mapped = tokens.map((t) => localMap.claim.get(t) ?? globalClaimToNew.get(t) ?? t);
    return mapped.map((id) => `[${id}]`).join('');
  });
}
