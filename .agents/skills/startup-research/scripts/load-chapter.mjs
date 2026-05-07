#!/usr/bin/env node
// Load the config-driven chapter packet used by the startup-research skill.
// The CLI intentionally reads only chapters.yaml through utils so the
// workflow has one machine-readable source of truth for chapter order, gates,
// output files, and final artifact names.
import { join, basename } from 'node:path';
import { FINAL_ARTIFACTS, companySlugFromRunId, isRunId, loadWorkflowConfig, researchCacheDir, tryReadYaml, workflowConfigPath } from './utils.mjs';
import { RESTRICTED_ACCESS_STATUSES, VOCABULARIES, dimensionCatalog } from './check-dimensions.mjs';

function usage() {
  console.error(`Usage: node .agents/skills/startup-research/scripts/load-chapter.mjs [--order <n> | --key <key> | --file <artifact.yaml> | --list | --all] [--format json|markdown] [--no-workflow] [--include-context --report-folder <path>]

Examples:
    node .agents/skills/startup-research/scripts/load-chapter.mjs --list --format markdown
    node .agents/skills/startup-research/scripts/load-chapter.mjs --order 1 --format json
    node .agents/skills/startup-research/scripts/load-chapter.mjs --order 4 --include-context --report-folder reports/20260503145959-openai`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    order: null,
    key: null,
    file: null,
    list: false,
    all: false,
    format: 'json',
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
    else if (arg === '--format') args.format = argv[++i] ?? 'json';
    else if (arg === '--include-workflow') args.includeWorkflow = true;
    else if (arg === '--no-workflow') args.includeWorkflow = false;
    else if (arg === '--include-context') args.includeContext = true;
    else if (arg === '--report-folder') args.reportFolder = argv[++i] ?? null;
    else usage();
  }

  if (!['json', 'markdown'].includes(args.format)) usage();
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
    // injects them — the same gate object check-chapter reads, so the packet
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
// Returned as a packet field; never gates anything.
function cumulativeContext(reportFolder, currentOrder, allChapters) {
  let unanswered = 0;
  let totalSources = 0;
  let restricted = 0;
  const seen = [];
  for (const ch of allChapters) {
    if (ch.order >= currentOrder) continue;
    const result = tryReadYaml(join(reportFolder, ch.file));
    if (!result.ok) {
      seen.push({ file: ch.file, status: 'missing' });
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

// Per-run scratch surfaced into the chapter packet. new-report.mjs writes
// these into .research-cache/<runId>/ but historically they were never
// loaded back, so an agent invoking --disclosure stealth or --refresh would
// never see the hint/context. Surface both inside the packet so the agent
// reads the same files the orchestrator wrote.
//   disclosureHint: pre-populated canonical evidenceGaps for stealth /
//     private-undisclosed companies (chapter 04 financials should adopt them
//     as-is rather than rediscovering they are unavailable).
//   refreshContext: prior-run summary card snapshot used as background /
//     diff context only; volatile facts must still be re-fetched.
function runCacheContext(reportFolder) {
  const runId = basename(reportFolder);
  // Be permissive about --report-folder: if the basename is not a runId
  // (developer pointing at a scratch folder), return an empty cache slot
  // instead of crashing the load-chapter packet.
  if (!isRunId(runId)) {
    return { cacheDir: null, runId, companySlug: null, disclosureHint: null, refreshContext: null };
  }
  const cacheDir = researchCacheDir(runId);
  const out = {
    cacheDir,
    runId,
    companySlug: companySlugFromRunId(runId),
    disclosureHint: null,
    refreshContext: null,
  };
  const disclosure = tryReadYaml(join(cacheDir, 'disclosure-hint.yaml'));
  if (disclosure.ok) out.disclosureHint = disclosure.value;
  const refresh = tryReadYaml(join(cacheDir, 'refresh-context.yaml'));
  if (refresh.ok) out.refreshContext = refresh.value;
  return out;
}

function buildPacket(config, chapter) {
  const chapters = config.chapters;
  const index = chapters.findIndex((item) => item.order === chapter.order);
  return {
    schemaVersion: 'chapter-packet-v1',
    generatedFrom: workflowConfigPath,
    workflow: {
      reportSchemaVersion: config.reportSchemaVersion,
      finalArtifacts: FINAL_ARTIFACTS,
      totalChapters: chapters.length,
    },
    // Single source of truth for enum vocab and validator dimensions. Agents
    // and the SKILL.md should reference packet.vocabularies / packet.checkDimensions
    // rather than re-declaring these literals in prose; the same module backs
    // chapter-schema validation and check-chapter retry hints, so the packet
    // and the gate cannot drift.
    vocabularies: VOCABULARIES,
    checkDimensions: dimensionCatalog(),
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
    schemaVersion: 'chapter-list-v1',
    generatedFrom: workflowConfigPath,
    workflow: {
      reportSchemaVersion: config.reportSchemaVersion,
      finalArtifacts: FINAL_ARTIFACTS,
    },
    vocabularies: VOCABULARIES,
    checkDimensions: dimensionCatalog(),
    chapters: config.chapters.map(compactChapter),
  };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function listItems(values) {
  if (!values?.length) return '- None';
  return values.map((value) => `- ${value}`).join('\n');
}

function tableItems(values) {
  if (!values?.length) return '- None';
  return values.map((item) => {
    const tags = [];
    if (item.enumeration === true) tags.push(`enumeration: true (expectedMinRows=${item.expectedMinRows ?? '?'})`);
    const tagText = tags.length ? ` [${tags.join('; ')}]` : '';
    return `- ${item.name}${tagText}: ${item.requirement}`;
  }).join('\n');
}

function figureItems(values) {
  if (!values?.length) return '- None';
  return values.map((item) => `- ${item.name} (${(item.acceptedTypes ?? []).join(' | ')}): ${item.requirement}`).join('\n');
}

function gateMarkdown(gate, letter) {
  const floor = gate?.depthFloor ?? {};
  return [
    `- Sections: ${gate?.minSections}-${gate?.maxSections}`,
    `- Artifacts (tables + figures): >= ${gate?.minArtifacts}`,
    `- Tables ceiling: ${gate?.maxTables}`,
    `- Figures ceiling: ${gate?.maxFigures}`,
    `- Research questions: >= ${gate?.minResearchQuestions}`,
    `- Local sources: >= ${gate?.minLocalSources} (>= ${gate?.minAdverseSources ?? 0} with stance: adverse)`,
    `- Local claims: >= ${gate?.minLocalClaims}`,
    `- Depth floor: section body >= ${floor.minSectionBodyWords} words; total section words >= ${floor.minSectionWordsTotal}; table rows >= ${floor.minTableRowsTotal}; figure data points >= ${floor.minFigureDataPointsTotal}`,
    `- IDs in this chapter must use letter "${letter}": sources S${letter}###, claims C${letter}###, tables T${letter}###, figures F${letter}###, researchQuestions Q${letter}###. Never copy an id from another chapter's letter into this chapter's claimRefs[] or prose. If you need a fact established in a different chapter, restate it as a new local claim here with its own sourceRefs[]; ledger consolidation dedupes equivalent claims at the end.`,
  ].join('\n');
}

function vocabSummaryMarkdown(vocab) {
  if (!vocab) return '- (vocabularies unavailable)';
  const order = [
    'sourceType',
    'sourceStance',
    'sourceAccessStatus',
    'restrictedAccessStatuses',
    'sourceReputationTier',
    'sourceIndependence',
    'claimType',
    'claimConfidence',
    'claimFreshness',
    'questionType',
    'questionStatus',
    'calloutType',
    'enumerationCoverage',
    'primaryTierSourceTypes',
  ];
  return order
    .filter((key) => Array.isArray(vocab[key]))
    .map((key) => `- \`${key}\`: ${vocab[key].map((v) => `\`${v}\``).join(', ')}`)
    .join('\n');
}

function dimensionsSummaryMarkdown(dimensions) {
  if (!Array.isArray(dimensions) || !dimensions.length) return '- (dimension catalog unavailable)';
  return dimensions
    .map((d) => {
      const sup = d.suppressedBy?.length ? ` (suppressed by: ${d.suppressedBy.map((s) => `\`${s}\``).join(', ')})` : '';
      return `- \`${d.dimension}\` rank=${d.precedenceRank}${sup}`;
    })
    .join('\n');
}

function printListMarkdown(value) {
  console.log(`# Startup research chapter order\n`);
  console.log(`Config: \`${value.generatedFrom}\``);
  console.log(`Report schema: \`${value.workflow.reportSchemaVersion}\``);
  console.log('');
  for (const chapter of value.chapters) {
    console.log(`${chapter.order}. \`${chapter.file}\` — ${chapter.title} (key: \`${chapter.key}\`)`);
  }
  console.log('\nFinal artifacts:');
  for (const [key, artifact] of Object.entries(value.workflow.finalArtifacts ?? {})) {
    console.log(`- ${key}: \`${artifact.file}\` / \`${artifact.artifact}\``);
  }
  console.log('\n## Vocabularies (canonical enums)\n');
  console.log(vocabSummaryMarkdown(value.vocabularies));
  console.log('\n## Validator dimensions (retry order)\n');
  console.log(dimensionsSummaryMarkdown(value.checkDimensions));
}

function printPacketMarkdown(packet) {
  const chapter = packet.chapter;
  console.log(`# Chapter ${chapter.order}: ${chapter.title}\n`);
  console.log(`Config: \`${packet.generatedFrom}\``);
  console.log(`Output: \`${chapter.file}\``);
  console.log(`Artifact: \`${chapter.artifact}\``);
  console.log(`Previous: ${packet.previousChapter ? `\`${packet.previousChapter.file}\`` : 'none'}`);
  console.log(`Next: ${packet.nextChapter ? `\`${packet.nextChapter.file}\`` : 'none'}`);
  console.log('\n## Mission\n');
  console.log(chapter.mission);
  console.log('\n## Optional context\n');
  console.log(listItems(chapter.optionalContext));
  console.log('\n## Content requirements\n');
  console.log(listItems(chapter.contentRequirements));
  console.log('\n## Planned tables\n');
  console.log(tableItems(chapter.plannedTables));
  console.log('\n## Planned figures\n');
  console.log(figureItems(chapter.plannedFigures));
  console.log('\n## Evidence strategy\n');
  console.log(listItems(chapter.evidenceStrategy));
  console.log('\n## Quality bar\n');
  console.log(listItems(chapter.qualityBar));
  console.log('\n## Gate\n');
  console.log(gateMarkdown(chapter.gate, chapter.letter));
  console.log('\n## Vocabularies (canonical enums)\n');
  console.log(vocabSummaryMarkdown(packet.vocabularies));
  console.log('\n## Validator dimensions (retry order)\n');
  console.log(dimensionsSummaryMarkdown(packet.checkDimensions));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadWorkflowConfig();

  if (args.list) {
    const list = orderedList(config);
    args.format === 'json' ? printJson(list) : printListMarkdown(list);
    return;
  }

  if (args.all) {
    const packets = config.chapters.map((chapter) => buildPacket(config, chapter));
    args.format === 'json' ? printJson(packets) : packets.forEach((packet, index) => {
      if (index) console.log('\n---\n');
      printPacketMarkdown(packet);
    });
    return;
  }

  const chapter = selectChapter(config, args);
  if (!chapter) {
    console.error('[chapter] no chapter matched the provided selector');
    process.exit(1);
  }
  const packet = buildPacket(config, chapter);
  if (args.includeContext) {
    if (!args.reportFolder) {
      console.error('[chapter] --include-context requires --report-folder <path>');
      process.exit(1);
    }
    const fileByKey = new Map(config.chapters.map((item) => [item.key, item.file]));
    packet.contextChapters = (chapter.optionalContext ?? []).map((key) => {
      const file = fileByKey.get(key);
      if (!file) return { key, status: 'unknownKey', sections: [], tables: [], figures: [] };
      return { key, ...compactContextChapter(args.reportFolder, file) };
    });
    packet.cumulativeContext = cumulativeContext(args.reportFolder, chapter.order, config.chapters);
    packet.runCache = runCacheContext(args.reportFolder);
  }
  const output = args.includeWorkflow ? packet : packet.chapter;
  if (args.format === 'json') printJson(output);
  else printPacketMarkdown(packet);
}

main();