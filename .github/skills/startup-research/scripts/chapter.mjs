#!/usr/bin/env node
// Load the config-driven chapter packet used by the startup-research skill.
// The CLI intentionally reads only chapters.yaml through utils so the
// workflow has one machine-readable source of truth for chapter order, gates,
// output files, and final artifact names.
import { loadWorkflowConfig, workflowConfigPath } from './utils.mjs';

function usage() {
  console.error(`Usage: node .github/skills/startup-research/scripts/chapter.mjs [--order <n> | --key <key> | --file <artifact.yaml> | --list | --all] [--format json|markdown] [--include-workflow]

Examples:
    node .github/skills/startup-research/scripts/chapter.mjs --list --format markdown
    node .github/skills/startup-research/scripts/chapter.mjs --order 1 --format json
    node .github/skills/startup-research/scripts/chapter.mjs --order 5 --format markdown`);
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
    includeWorkflow: false,
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
    file: chapter.file,
    artifact: chapter.artifact,
    chapterNumber: chapter.chapterNumber,
    reportChapterNumber: chapter.reportChapterNumber,
    loaderKey: chapter.loaderKey,
    title: chapter.title,
    mission: chapter.mission,
    optionalContext: chapter.optionalContext ?? [],
    contentRequirements: chapter.contentRequirements ?? [],
    requiredTables: chapter.requiredTables ?? [],
    requiredFigures: chapter.requiredFigures ?? [],
    preferredFigureTypes: chapter.gate?.preferredFigureTypes ?? chapter.preferredFigureTypes ?? [],
    evidenceStrategy: chapter.evidenceStrategy ?? [],
    qualityBar: chapter.qualityBar ?? [],
    gate: chapter.gate,
  };
}

function buildPacket(config, chapter) {
  const chapters = config.chapters;
  const index = chapters.findIndex((item) => item.order === chapter.order);
  return {
    schemaVersion: 'chapter-packet-v1',
    generatedFrom: workflowConfigPath,
    workflow: {
      skill: config.workflow?.skill,
      reportSchemaVersion: config.workflow?.reportSchemaVersion,
      references: {
        yamlRules: config.workflow?.yamlRules,
        reportSchema: config.workflow?.reportSchema,
      },
      researchLoop: config.analysisDefaults?.researchLoop ?? {},
      finalArtifacts: config.finalArtifacts ?? {},
      totalChapters: chapters.length,
    },
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
      skill: config.workflow?.skill,
      reportSchemaVersion: config.workflow?.reportSchemaVersion,
      references: {
        yamlRules: config.workflow?.yamlRules,
        reportSchema: config.workflow?.reportSchema,
      },
      researchLoop: config.analysisDefaults?.researchLoop ?? {},
      finalArtifacts: config.finalArtifacts ?? {},
    },
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
  return values.map((item) => `- ${item.name}: ${item.requirement}`).join('\n');
}

function figureItems(values) {
  if (!values?.length) return '- None';
  return values.map((item) => `- ${item.name} (${(item.types ?? []).join(' | ')}): ${item.requirement}`).join('\n');
}

function gateMarkdown(gate) {
  const floor = gate?.depthFloor ?? {};
  return [
    `- Sections: ${gate?.minSections}-${gate?.maxSections}`,
    `- Tables: ${gate?.minTables}-${gate?.maxTables}`,
    `- Figures: ${gate?.minFigures}-${gate?.maxFigures}`,
    `- Research questions: >= ${gate?.minResearchQuestions}`,
    `- Local sources: >= ${gate?.minLocalSources}`,
    `- Local claims: >= ${gate?.minLocalClaims}`,
    `- Depth floor: section body >= ${floor.minSectionBodyWords} words; total section words >= ${floor.minSectionWordsTotal}; table rows >= ${floor.minTableRowsTotal}; figure data points >= ${floor.minFigureDataPointsTotal}`,
  ].join('\n');
}

function printListMarkdown(value) {
  console.log(`# Startup research chapter order\n`);
  console.log(`Config: \`${value.generatedFrom}\``);
  console.log(`Workflow: \`${value.workflow.skill}\` / \`${value.workflow.reportSchemaVersion}\``);
  console.log('');
  for (const chapter of value.chapters) {
    console.log(`${chapter.order}. \`${chapter.file}\` — ${chapter.title} (key: \`${chapter.key}\`)`);
  }
  console.log('\nFinal artifacts:');
  for (const [key, artifact] of Object.entries(value.workflow.finalArtifacts ?? {})) {
    console.log(`- ${key}: \`${artifact.file}\` / \`${artifact.artifact}\``);
  }
}

function printPacketMarkdown(packet) {
  const chapter = packet.chapter;
  console.log(`# Chapter ${chapter.order}: ${chapter.title}\n`);
  console.log(`Config: \`${packet.generatedFrom}\``);
  console.log(`Output: \`${chapter.file}\``);
  console.log(`Artifact: \`${chapter.artifact}\``);
  console.log(`Chapter number: ${chapter.chapterNumber}`);
  console.log(`Report chapter number: ${chapter.reportChapterNumber}`);
  console.log(`Loader key: \`${chapter.loaderKey}\``);
  console.log(`Previous: ${packet.previousChapter ? `\`${packet.previousChapter.file}\`` : 'none'}`);
  console.log(`Next: ${packet.nextChapter ? `\`${packet.nextChapter.file}\`` : 'none'}`);
  console.log('\n## Mission\n');
  console.log(chapter.mission);
  console.log('\n## Optional context\n');
  console.log(listItems(chapter.optionalContext));
  console.log('\n## Content requirements\n');
  console.log(listItems(chapter.contentRequirements));
  console.log('\n## Required tables\n');
  console.log(tableItems(chapter.requiredTables));
  console.log('\n## Required figures\n');
  console.log(figureItems(chapter.requiredFigures));
  console.log('\n## Preferred figure types\n');
  console.log(listItems(chapter.preferredFigureTypes));
  console.log('\n## Evidence strategy\n');
  console.log(listItems(chapter.evidenceStrategy));
  console.log('\n## Quality bar\n');
  console.log(listItems(chapter.qualityBar));
  console.log('\n## Gate\n');
  console.log(gateMarkdown(chapter.gate));
  console.log('\n## Workflow iteration\n');
  console.log(`- Max gate iterations: ${packet.workflow.researchLoop?.maxGateIterations ?? 'unspecified'}`);
  console.log(`- Retry scope: ${packet.workflow.researchLoop?.retryScope ?? 'unspecified'}`);
  console.log(`- Freshness sweep required: ${packet.workflow.researchLoop?.freshnessSweepRequired ? 'yes' : 'no'}`);
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
  const output = args.includeWorkflow ? packet : packet.chapter;
  if (args.format === 'json') printJson(output);
  else printPacketMarkdown(packet);
}

main();