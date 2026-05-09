#!/usr/bin/env node
// Run the post-chapter finalization pipeline as a single command. Every step
// here only touches the given report folder (and, with --refresh, the prior
// report folder it supersedes). No cross-report catalog is written; the
// website discovers reports by walking reports/<runId>/summary-card.yaml.
//
// Pipeline:
//   1. check-report-meta.mjs -> shape + enum check on report-meta.yaml
//                                   (runs first so every missing/invalid field
//                                   surfaces in one shot, instead of one per
//                                   finalize-loop iteration)
//   2. (refresh only) link-refresh.mjs --prepare-current
//                       -> mark the new report as revision.status=current
//   3. build-evidence-ledger.mjs -> evidence.yaml + chapter claimRef consolidation
//   4. check-cross-chapter.mjs -> drift checks across chapters
//   5. build-report.mjs -> full-report.yaml + summary-card.yaml
//   6. check-report.mjs -> schema/contract validation and publishability gate
//   7. (refresh only) link-refresh.mjs
//                       -> mark the previous report as revision.status=superseded
//                          and reassemble it
//
// Re-runs after fixing report-meta.yaml or a chapter reuse the existing
// evidence.yaml; pass --rebuild to force a full ledger consolidation (which
// reassigns canonical claim IDs).
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXIT,
  FINAL_ARTIFACTS,
  REPORT_META_FILE,
  getAnalysisArtifacts,
  isRunId,
  researchCacheDir,
  tryReadYaml,
} from './utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function usage() {
  console.error('Usage: node .agents/skills/startup-research/scripts/finalize-report.mjs <report-folder> [--rebuild] [--refresh] [--refresh-reason <text>]');
  process.exit(EXIT.failure);
}

function parseArgs(argv) {
  const parsed = { folder: null, rebuild: false, refresh: false, refreshReason: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--rebuild') parsed.rebuild = true;
    else if (arg === '--refresh') parsed.refresh = true;
    else if (arg === '--refresh-reason') parsed.refreshReason = argv[++i] ?? '';
    else if (arg.startsWith('-')) usage();
    else if (!parsed.folder) parsed.folder = arg;
    else usage();
  }
  return parsed;
}

const parsedArgs = parseArgs(args);
const folderArg = parsedArgs.folder;
const rebuild = parsedArgs.rebuild;
const refresh = parsedArgs.refresh;
const refreshReason = parsedArgs.refreshReason;

if (!folderArg) {
  usage();
}

const reportFolder = resolve(folderArg);
if (!existsSync(reportFolder)) {
  console.error(`[finalize-report] report folder not found: ${reportFolder}`);
  process.exit(EXIT.notFound);
}
if (!existsSync(join(reportFolder, REPORT_META_FILE))) {
  console.error(`[finalize-report] missing ${REPORT_META_FILE} in ${reportFolder}; author it before finalizing.`);
  process.exit(EXIT.notFound);
}

function runStep(step) {
  console.log(`[finalize-report] -> ${step.name}`);
  const result = spawnSync(process.execPath, [resolve(here, step.script), ...step.argv], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[finalize-report] ${step.name} failed (exit ${result.status}); fix the reported issues and rerun this command.`);
    // Pass the subprocess exit code through as-is so callers see the same
    // semantic the underlying script emitted; only fall back to validation
    // when the subprocess died from a signal (status === null).
    process.exit(result.status ?? EXIT.failure);
  }
}

// Pre-finalization sweep: run check-chapter --strict on every configured
// chapter file. SKILL.md mandates this sweep, but agents can forget it; the
// pipeline enforces it here so unverifiedSource / tableNotes warnings cannot
// silently slip past finalize. Missing files become finalize failures so the
// agent fixes the chapter before the ledger and assembler run on partial
// inputs.
function strictCheckEveryChapter() {
  const chapters = getAnalysisArtifacts();
  const missing = chapters.filter((spec) => !existsSync(join(reportFolder, spec.file)));
  if (missing.length) {
    console.error(`[finalize-report] missing chapter file(s) before strict sweep: ${missing.map((m) => m.file).join(', ')}`);
    console.error('[finalize-report] author every configured chapter and pass check-chapter --strict before finalizing.');
    process.exit(EXIT.notFound);
  }
  for (const spec of chapters) {
    runStep({
      name: `check-chapter:${spec.key}:strict`,
      script: 'check-chapter.mjs',
      argv: [reportFolder, spec.file, '--strict'],
    });
  }
}

// Stale-evidence guard: when finalize is rerun without --rebuild, the
// pipeline reuses the existing evidence.yaml. If any chapter's localEvidence
// changed since evidence.yaml was last assembled, the ledger and downstream
// checks will see the *old* evidence and the agent's edits get silently
// ignored (a footgun documented in SKILL.md). Compare mtimes and fail fast
// when a chapter is newer; the agent must rerun with --rebuild.
function ensureEvidenceFresh() {
  const evidencePath = join(reportFolder, FINAL_ARTIFACTS.evidence.file);
  if (!existsSync(evidencePath)) return;
  const evidenceMtime = statSync(evidencePath).mtimeMs;
  const chapters = getAnalysisArtifacts();
  const newer = [];
  for (const spec of chapters) {
    const chapterPath = join(reportFolder, spec.file);
    if (!existsSync(chapterPath)) continue;
    if (statSync(chapterPath).mtimeMs > evidenceMtime) newer.push(spec.file);
  }
  if (newer.length) {
    console.error(`[finalize-report] evidence.yaml is older than ${newer.length} chapter file(s): ${newer.join(', ')}`);
    console.error('[finalize-report] localEvidence edits would be silently ignored. Rerun with --rebuild to reconsolidate the ledger.');
    process.exit(EXIT.failure);
  }
}

// Refresh-reason consistency: SKILL.md requires the same --refresh-reason
// string on create-report-run and finalize-report; otherwise the audit
// trail (refresh-context cache vs. report-meta revision) drifts silently.
// Compare against the cached refresh-context.yaml and fail if they diverge.
function ensureRefreshReasonMatchesCache() {
  if (!refresh) return;
  const runId = basename(reportFolder);
  if (!isRunId(runId)) return;
  const ctxPath = join(researchCacheDir(runId), 'refresh-context.yaml');
  const result = tryReadYaml(ctxPath);
  if (!result.ok) return; // create-report-run --refresh always writes it; absent means a refresh started without create-report-run, leave it to link-refresh
  const cached = result.value?.refreshReason ?? null;
  const provided = refreshReason || null;
  if ((cached ?? '') !== (provided ?? '')) {
    console.error(`[finalize-report] --refresh-reason mismatch: refresh-context.yaml has ${JSON.stringify(cached)} but finalize-report was given ${JSON.stringify(provided)}.`);
    console.error('[finalize-report] pass the same --refresh-reason string to both create-report-run and finalize-report so the audit trail stays consistent.');
    process.exit(EXIT.failure);
  }
}

// Strict sweep first so we never advance to the expensive ledger/assembler
// steps with unverified sources or missing table notes outstanding.
strictCheckEveryChapter();

// Refresh audit-trail consistency must hold before we touch report-meta.
ensureRefreshReasonMatchesCache();

// Stale-evidence guard runs before the existing-evidence reuse decision below
// so the agent gets a clear error rather than a silently stale ledger.
if (!parsedArgs.rebuild) ensureEvidenceFresh();

// Fast pre-flight: surface every shape/enum problem in report-meta.yaml
// before any expensive step runs. The full build-report.mjs check still
// runs later as defense-in-depth (it also covers cross-refs against
// evidence.yaml, which this step intentionally does not load).
runStep({ name: 'check-report-meta', script: 'check-report-meta.mjs', argv: [reportFolder] });

if (refresh) {
  const refreshArgs = [reportFolder, '--prepare-current'];
  if (refreshReason) refreshArgs.push('--refresh-reason', refreshReason);
  runStep({ name: 'prepare-refresh', script: 'link-refresh.mjs', argv: refreshArgs });
}

// Per-report pipeline. Build the evidence ledger only when there is no evidence.yaml yet (or when
// --rebuild forces a fresh consolidation). evidence.yaml is preserved across
// re-runs so canonical claim IDs stay stable; the chapter source of truth
// (localEvidence) is preserved by build-evidence-ledger so the agent always has a place to
// fix evidence-shape problems.
const hasExistingEvidence = existsSync(join(reportFolder, FINAL_ARTIFACTS.evidence.file));
const needsLedger = !hasExistingEvidence || rebuild;
const steps = [];
if (needsLedger) {
  steps.push({ name: 'build-evidence-ledger', script: 'build-evidence-ledger.mjs', argv: [reportFolder] });
} else {
  console.log('[finalize-report] reusing existing evidence.yaml; pass --rebuild to force a full evidence-ledger rebuild.');
}
steps.push({ name: 'check-cross-chapter', script: 'check-cross-chapter.mjs', argv: [reportFolder] });
steps.push({ name: 'build-report', script: 'build-report.mjs', argv: [reportFolder] });
steps.push({ name: 'check-report', script: 'check-report.mjs', argv: [reportFolder] });

// link-refresh runs after the publishability gate so we never mark a prior
// report superseded by a report that did not validate. It only touches the
// two report folders (new + previous), not any cross-report ledger.
if (refresh) {
  const refreshArgs = [reportFolder];
  if (refreshReason) refreshArgs.push('--refresh-reason', refreshReason);
  steps.push({ name: 'link-refresh', script: 'link-refresh.mjs', argv: refreshArgs });
}

for (const step of steps) runStep(step);
console.log('[finalize-report] ✓ pipeline complete; report passed schema validation.');
