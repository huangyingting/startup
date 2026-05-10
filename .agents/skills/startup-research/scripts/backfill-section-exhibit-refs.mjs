#!/usr/bin/env node
// One-shot migration: distribute each chapter's tables/figures into its
// sections via tableRefs[] / figureRefs[] using claim-overlap scoring, so
// the renderer can place exhibits next to the prose that cites them
// instead of collapsing every artifact into a trailing "Exhibits" block.
//
// Idempotent: sections that already declare tableRefs / figureRefs are left
// alone, and unmatched artifacts fall through to the Exhibits fallback that
// build-report.mjs still emits.
//
// Run once:
//   node .agents/skills/startup-research/scripts/backfill-section-exhibit-refs.mjs
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  EXIT,
  FINAL_ARTIFACTS,
  REPORT_META_FILE,
  getAnalysisArtifacts,
  isFinalizedReportFolder,
  reportsDir,
  tryReadYaml,
  writeYaml,
} from './utils.mjs';

function listReportFolders() {
  if (!existsSync(reportsDir)) return [];
  return readdirSync(reportsDir)
    .filter((name) => !name.startsWith('.'))
    .map((name) => join(reportsDir, name))
    .filter((path) => statSync(path).isDirectory() && isFinalizedReportFolder(path));
}

function intersectionSize(a, b) {
  let n = 0;
  for (const item of a) if (b.has(item)) n += 1;
  return n;
}

// For one artifact, pick the section whose claimRefs overlap the artifact's
// claimRefs the most (tiebreak: lowest section index). When no overlap is
// found we fall back to round-robin so artifacts still spread instead of
// piling into a single section.
function pickSectionIndex({ artifactClaimRefs, sectionClaimSets, fallbackCounter }) {
  if (sectionClaimSets.length === 0) return -1;
  const refs = new Set(artifactClaimRefs ?? []);
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < sectionClaimSets.length; i += 1) {
    const score = intersectionSize(refs, sectionClaimSets[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return bestIdx;
  return fallbackCounter % sectionClaimSets.length;
}

function backfillChapter(doc) {
  const sections = doc.sections ?? [];
  if (sections.length === 0) return false;
  const tables = (doc.tables ?? []).filter((t) => t?.id);
  const figures = (doc.figures ?? []).filter((f) => f?.id);
  if (tables.length === 0 && figures.length === 0) return false;

  // Skip sections that already declare exhibit refs so re-running the
  // migration is a no-op.
  const alreadyTagged = sections.some((s) => Array.isArray(s?.tableRefs) || Array.isArray(s?.figureRefs));
  if (alreadyTagged) return false;

  const sectionClaimSets = sections.map((s) => new Set(s?.claimRefs ?? []));
  const assignedTables = sections.map(() => []);
  const assignedFigures = sections.map(() => []);

  let tableFallback = 0;
  for (const table of tables) {
    const idx = pickSectionIndex({
      artifactClaimRefs: table.claimRefs,
      sectionClaimSets,
      fallbackCounter: tableFallback,
    });
    if (idx < 0) continue;
    assignedTables[idx].push(table.id);
    tableFallback += 1;
  }
  let figureFallback = 0;
  for (const figure of figures) {
    const idx = pickSectionIndex({
      artifactClaimRefs: figure.claimRefs,
      sectionClaimSets,
      fallbackCounter: figureFallback,
    });
    if (idx < 0) continue;
    assignedFigures[idx].push(figure.id);
    figureFallback += 1;
  }

  let mutated = false;
  for (let i = 0; i < sections.length; i += 1) {
    if (assignedTables[i].length > 0) {
      sections[i].tableRefs = assignedTables[i];
      mutated = true;
    }
    if (assignedFigures[i].length > 0) {
      sections[i].figureRefs = assignedFigures[i];
      mutated = true;
    }
  }
  return mutated;
}

function main() {
  const folders = listReportFolders();
  if (folders.length === 0) {
    console.log('[backfill] no finalized reports found');
    return;
  }
  const chapterSpecs = getAnalysisArtifacts();
  let totalChaptersUpdated = 0;
  let totalReportsTouched = 0;
  const reportsWithChange = [];
  for (const folder of folders) {
    let chapterUpdated = 0;
    for (const spec of chapterSpecs) {
      const chapterPath = join(folder, spec.file);
      const result = tryReadYaml(chapterPath);
      if (!result.ok) continue;
      const doc = result.value;
      if (backfillChapter(doc)) {
        writeYaml(chapterPath, doc);
        chapterUpdated += 1;
        totalChaptersUpdated += 1;
      }
    }
    if (chapterUpdated > 0) {
      totalReportsTouched += 1;
      reportsWithChange.push(folder);
      console.log(`[backfill] ${folder}: ${chapterUpdated} chapter(s) updated`);
    }
  }
  console.log(`[backfill] done — ${totalChaptersUpdated} chapter(s) across ${totalReportsTouched} report(s) updated`);
  if (reportsWithChange.length > 0) {
    console.log('[backfill] re-run build-report.mjs for each updated folder to regenerate full-report.yaml/summary-card.yaml.');
  }
}

main();
