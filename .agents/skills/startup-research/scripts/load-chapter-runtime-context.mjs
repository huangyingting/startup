#!/usr/bin/env node
// Load the config-driven chapter runtime context used by the startup-research skill.
// The CLI intentionally reads only workflow-config.yaml through utils so the
// workflow has one machine-readable source of truth for chapter order, gates,
// output files, and final artifact names.
import { join, basename } from 'node:path';
import { EXIT, FINAL_ARTIFACTS, GENERATED_REPORT_FILES, REPORT_META_FILE, companySlugFromRunId, isRunId, loadWorkflowConfig, researchCacheDir, runDateFromRunId, tryReadYaml, workflowConfigPath } from './utils.mjs';
import { RESTRICTED_ACCESS_STATUSES, VOCABULARIES, dimensionCatalog } from './validation-catalog.mjs';
import {
  FIGURE_ALLOWED_POPULATED_FIELDS,
  FIGURE_CONTRACTS,
  FIGURE_DATA_FIELDS,
  FIGURE_LAYOUTS,
  FIGURE_TYPES,
} from '../../../../website/src/lib/figures.mjs';

const CONTRACT_SOURCES = Object.freeze({
  workflowConfig: 'references/workflow-config.yaml',
  workflowSchema: 'scripts/contracts/workflow-config.schema.mjs',
  reportSchema: 'scripts/contracts/report-artifacts.schema.mjs',
  runtimeContextSchema: 'scripts/contracts/runtime-context.schema.mjs',
  generatedContracts: 'references/contracts.md',
  vocabularies: 'scripts/validation-catalog.mjs',
  checkDimensions: 'scripts/validation-catalog.mjs',
  rendererContracts: 'website/src/lib/figures.mjs',
});

function usage() {
  console.error(`Usage: node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs [--order <n> | --key <key> | --file <artifact.yaml> | --list | --all] [--no-workflow] [--include-context --report-folder <path>]

Examples:
    node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --list
    node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order 1
    node .agents/skills/startup-research/scripts/load-chapter-runtime-context.mjs --order 4 --include-context --report-folder reports/20260503145959-openai`);
  process.exit(EXIT.failure);
}

function parseArgs(argv) {
  const args = {
    order: null,
    key: null,
    file: null,
    list: false,
    all: false,
    includeWorkflow: true,
    includeContext: false,
    reportFolder: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage();
    else if (arg === '--order') args.order = Number(argv[++i]);
    else if (arg === '--key') args.key = argv[++i] ?? null;
    else if (arg === '--file') args.file = argv[++i] ?? null;
    else if (arg === '--list') args.list = true;
    else if (arg === '--all') args.all = true;
    else if (arg === '--include-workflow') args.includeWorkflow = true;
    else if (arg === '--no-workflow') args.includeWorkflow = false;
    else if (arg === '--include-context') args.includeContext = true;
    else if (arg === '--report-folder') args.reportFolder = argv[++i] ?? null;
    else usage();
  }

  const selectors = [Number.isFinite(args.order), Boolean(args.key), Boolean(args.file), args.list, args.all].filter(Boolean).length;
  if (selectors > 1) usage();
  if (args.order !== null && !Number.isInteger(args.order)) usage();
  if (!selectors) args.list = true;

  return args;
}

function compactChapter(chapter) {
  return {
    key: chapter.key,
    order: chapter.order,
    letter: chapter.letter,
    file: chapter.file,
    artifact: chapter.key,
    title: chapter.title,
    mission: chapter.mission,
    optionalContext: chapter.optionalContext ?? [],
    contentRequirements: chapter.contentRequirements ?? [],
    plannedTables: chapter.plannedTables ?? [],
    plannedFigures: chapter.plannedFigures ?? [],
    evidenceStrategy: chapter.evidenceStrategy ?? [],
    qualityBar: chapter.qualityBar ?? [],
    // gate already carries gate.minAdverseSources (and any other workflow-
    // config-derived floors) because normalizeWorkflowConfig in utils.mjs
    // injects them — the same gate object check-chapter reads, so the runtime context
    // the agent receives and the check it must clear can never drift apart.
    gate: chapter.gate,
  };
}

function compactContextChapter(reportFolder, contextFile) {
  const path = join(reportFolder, contextFile);
  const result = tryReadYaml(path);
  if (!result.ok) {
    const status = result.error.startsWith('ENOENT') ? 'missing' : 'parseError';
    return { file: contextFile, status, ...(status === 'parseError' ? { error: result.error } : {}), sections: [], tables: [], figures: [] };
  }
  const doc = result.value;
  return {
    file: contextFile,
    status: 'loaded',
    artifact: doc.artifact ?? null,
    title: doc.chapter?.title ?? null,
    summary: doc.chapter?.summary ?? null,
    sections: (doc.sections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      claimRefs: section.claimRefs ?? [],
    })),
    tables: (doc.tables ?? []).map((table) => ({
      id: table.id,
      title: table.title,
      claimRefs: table.claimRefs ?? [],
    })),
    figures: (doc.figures ?? []).map((figure) => ({
      id: figure.id,
      title: figure.title,
      type: figure.type,
      claimRefs: figure.claimRefs ?? [],
    })),
  };
}

// Aggregates cumulative diligence signal from chapters that come BEFORE the
// chapter currently being authored. Surfaces (advisory only) two metrics:
//   - cumulativeUnresolvedQuestions: sum of researchQuestions whose status is
//     not `answered` across earlier chapters.
//   - cumulativeRestrictedAccessPct: share of localEvidence.sources whose
//     accessStatus is paywall|js-only|broken|rate-limited across earlier
//     chapters.
// Returned as a runtime-context field; never gates anything.
function cumulativeContext(reportFolder, currentOrder, allChapters) {
  let unanswered = 0;
  let totalSources = 0;
  let restricted = 0;
  const seen = [];
  for (const ch of allChapters) {
    if (ch.order >= currentOrder) continue;
    const result = tryReadYaml(join(reportFolder, ch.file));
    if (!result.ok) {
      // Keep the field set stable across loaded/missing entries so consumers
      // can read entry.unanswered without checking entry.status first.
      seen.push({ file: ch.file, status: 'missing', unanswered: null, sources: null, restricted: null });
      continue;
    }
    const doc = result.value ?? {};
    const sources = doc.localEvidence?.sources ?? [];
    const questions = doc.localEvidence?.researchQuestions ?? [];
    const chUnanswered = questions.filter((q) => q?.status !== 'answered').length;
    const chRestricted = sources.filter((s) => RESTRICTED_ACCESS_STATUSES.has(s?.accessStatus)).length;
    unanswered += chUnanswered;
    totalSources += sources.length;
    restricted += chRestricted;
    seen.push({ file: ch.file, status: 'loaded', unanswered: chUnanswered, sources: sources.length, restricted: chRestricted });
  }
  return {
    note: 'Advisory metrics aggregated from earlier chapters; does not gate this chapter.',
    cumulativeUnresolvedQuestions: unanswered,
    cumulativeRestrictedAccessPct: totalSources ? +(restricted / totalSources).toFixed(3) : 0,
    earlierChapters: seen,
  };
}

// Run identity derived from the report folder name. Split out from runCache
// because none of these come from `.research-cache/` — they are slices of the
// runId itself. `runtimeContext.run.runDate` is the canonical clock anchor
// chapter doc heads must copy as `runDate`, so the agent never formats a date.
function runIdentity(reportFolder) {
  const runId = basename(reportFolder);
  if (!isRunId(runId)) {
    return { runId, companySlug: null, runDate: null };
  }
  return {
    runId,
    companySlug: companySlugFromRunId(runId),
    runDate: runDateFromRunId(runId),
  };
}

// Per-run scratch surfaced into the chapter runtime context. create-report-run.mjs writes
// these into .research-cache/<runId>/ but historically they were never
// loaded back, so an agent invoking --refresh would never see the context.
// Surface it inside the runtime context so the agent reads the same file the
// orchestrator wrote.
//   refreshContext: prior-run summary card snapshot used as background /
//     diff context only; volatile facts must still be re-fetched.
function runCacheContext(reportFolder) {
  const runId = basename(reportFolder);
  // Be permissive about --report-folder: if the basename is not a runId
  // (developer pointing at a scratch folder), return an empty cache slot
  // instead of crashing the chapter runtime context loader.
  if (!isRunId(runId)) {
    return { cacheDir: null, refreshContext: null };
  }
  const cacheDir = researchCacheDir(runId);
  const out = {
    cacheDir,
    refreshContext: null,
  };
  const refresh = tryReadYaml(join(cacheDir, 'refresh-context.yaml'));
  if (refresh.ok) out.refreshContext = refresh.value;
  return out;
}

function workflowSummary(config, { includeTotalChapters = false } = {}) {
  const summary = {
    reportSchemaVersion: config.reportSchemaVersion,
    inputs: config.workflow?.inputs ?? {},
    phases: config.workflow?.phases ?? [],
    conditions: config.workflow?.conditions ?? [],
    finalArtifacts: FINAL_ARTIFACTS,
    allowedReportFiles: {
      chapterArtifacts: config.chapters.map((chapter) => chapter.file),
      handAuthored: [REPORT_META_FILE],
      generated: GENERATED_REPORT_FILES,
    },
    agentPolicy: config.agentPolicy ?? {},
  };
  if (includeTotalChapters) summary.totalChapters = config.chapters.length;
  return summary;
}

function rendererContractCatalog() {
  return {
    figureTypes: FIGURE_TYPES,
    figureLayouts: FIGURE_LAYOUTS,
    figureDataFields: FIGURE_DATA_FIELDS,
    figureContracts: FIGURE_CONTRACTS,
    figureAllowedPopulatedFields: FIGURE_ALLOWED_POPULATED_FIELDS,
  };
}

function buildRuntimeContext(config, chapter) {
  const chapters = config.chapters;
  const index = chapters.findIndex((item) => item.order === chapter.order);
  return {
    schemaVersion: 'chapter-runtime-context-v2',
    generatedFrom: workflowConfigPath,
    contractSources: CONTRACT_SOURCES,
    workflow: workflowSummary(config, { includeTotalChapters: true }),
    // Single source of truth for enum vocab and validator dimensions. Agents
    // and the SKILL.md should reference runtimeContext.vocabularies / runtimeContext.checkDimensions
    // rather than re-declaring these literals in prose; the same module backs
    // artifact-checks validation and check-chapter retry hints, so the runtime context
    // and the gate cannot drift.
    vocabularies: VOCABULARIES,
    checkDimensions: dimensionCatalog(),
    rendererContracts: rendererContractCatalog(),
    previousChapter: index > 0 ? compactChapter(chapters[index - 1]) : null,
    chapter: compactChapter(chapter),
    nextChapter: index < chapters.length - 1 ? compactChapter(chapters[index + 1]) : null,
  };
}

function selectChapter(config, args) {
  if (Number.isFinite(args.order)) return config.chapters.find((chapter) => chapter.order === args.order) ?? null;
  if (args.key) return config.chapters.find((chapter) => chapter.key === args.key) ?? null;
  if (args.file) return config.chapters.find((chapter) => chapter.file === args.file) ?? null;
  return null;
}

function orderedList(config) {
  return {
    schemaVersion: 'chapter-runtime-context-list-v2',
    generatedFrom: workflowConfigPath,
    contractSources: CONTRACT_SOURCES,
    workflow: workflowSummary(config),
    vocabularies: VOCABULARIES,
    checkDimensions: dimensionCatalog(),
    rendererContracts: rendererContractCatalog(),
    chapters: config.chapters.map(compactChapter),
  };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadWorkflowConfig();

  if (args.list) {
    printJson(orderedList(config));
    return;
  }

  if (args.all) {
    const runtimeContexts = config.chapters.map((chapter) => buildRuntimeContext(config, chapter));
    printJson(runtimeContexts);
    return;
  }

  const chapter = selectChapter(config, args);
  if (!chapter) {
    console.error('[chapter] no chapter matched the provided selector');
    process.exit(EXIT.failure);
  }
  const runtimeContext = buildRuntimeContext(config, chapter);
  if (args.includeContext) {
    if (!args.reportFolder) {
      console.error('[chapter] --include-context requires --report-folder <path>');
      process.exit(EXIT.failure);
    }
    const fileByKey = new Map(config.chapters.map((item) => [item.key, item.file]));
    runtimeContext.contextChapters = (chapter.optionalContext ?? []).map((key) => {
      const file = fileByKey.get(key);
      if (!file) return { key, status: 'unknownKey', sections: [], tables: [], figures: [] };
      return { key, ...compactContextChapter(args.reportFolder, file) };
    });
    runtimeContext.cumulativeContext = cumulativeContext(args.reportFolder, chapter.order, config.chapters);
    runtimeContext.run = runIdentity(args.reportFolder);
    runtimeContext.runCache = runCacheContext(args.reportFolder);
  }
  const output = args.includeWorkflow ? runtimeContext : runtimeContext.chapter;
  printJson(output);
}

main();