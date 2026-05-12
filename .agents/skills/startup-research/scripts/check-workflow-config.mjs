#!/usr/bin/env node
// Validate the config-driven startup research workflow metadata.
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { EXIT, FINAL_ARTIFACTS, getAnalysisArtifacts, getCoreArtifacts, loadWorkflowConfig, workflowConfigPath } from './utils.mjs';
import { validateWorkflowConfig } from './contracts/workflow-config.schema.mjs';
import { formatValidationCompact, formatValidationText, validationEnvelope, validationIssue } from './contracts/validation-result.mjs';

function parseArgs(argv) {
  const args = { format: 'text' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') args.format = argv[++i] ?? 'text';
    else if (arg === '-h' || arg === '--help') {
      console.error('Usage: node .agents/skills/startup-research/scripts/check-workflow-config.mjs [--format text|json|compact]');
      process.exit(EXIT.failure);
    } else {
      console.error(`[check:workflow-config] unknown argument: ${arg}`);
      process.exit(EXIT.failure);
    }
  }
  if (!['text', 'json', 'compact'].includes(args.format)) {
    console.error(`[check:workflow-config] invalid --format: ${args.format}`);
    process.exit(EXIT.failure);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const issues = [];
let rawConfig = null;
try {
  rawConfig = yaml.load(readFileSync(workflowConfigPath, 'utf8')) ?? {};
} catch (err) {
  issues.push(validationIssue({
    path: workflowConfigPath,
    message: `YAML parse failed: ${err.message.split('\n')[0]}`,
    dimension: 'yamlParse',
    fix: 'Fix YAML syntax in references/workflow-config.yaml.',
  }));
}

if (rawConfig) {
  const shape = validateWorkflowConfig(rawConfig);
  issues.push(...shape.issues);
}

let summary = {};
if (issues.length === 0) {
  const config = loadWorkflowConfig();
  const analysis = getAnalysisArtifacts(config);
  const core = getCoreArtifacts(config);
  const finalFiles = Object.values(FINAL_ARTIFACTS).map((artifact) => artifact.file);
  const policy = config.agentPolicy ?? {};
  const chapterSourceIndexByKey = new Map((rawConfig?.chapters ?? []).map((chapter, index) => [chapter.key, index]));

  for (const [index, artifact] of analysis.entries()) {
    const expectedOrder = index + 1;
    if (artifact.order !== expectedOrder) {
      const sourceIndex = chapterSourceIndexByKey.get(artifact.key) ?? index;
      issues.push(validationIssue({
        path: `chapters.${sourceIndex}.order`,
        message: `analysis chapter orders must be contiguous starting at 1; expected ${expectedOrder} for ${artifact.key}, found ${artifact.order}`,
        dimension: 'workflowConfigShape',
        fix: 'Edit chapters[].order in workflow-config.yaml so configured analysis chapters are numbered 1..N without gaps.',
      }));
    }
  }
  if (finalFiles.length !== 3) {
    issues.push(validationIssue({ path: 'finalArtifacts', message: `expected 3 final artifacts, found ${finalFiles.length}`, dimension: 'workflowConfigShape' }));
  }
  for (const file of finalFiles) {
    if (!core.some((artifact) => artifact.file === file)) {
      issues.push(validationIssue({ path: 'finalArtifacts', message: `final artifact ${file} is not present in core artifact list`, dimension: 'workflowConfigShape' }));
    }
  }
  if (!policy.volatileFacts?.length) {
    issues.push(validationIssue({ path: 'agentPolicy.volatileFacts', message: 'agentPolicy.volatileFacts must list at least one volatile fact', dimension: 'workflowConfigShape' }));
  }
  if (!policy.volatileFactQueryTokens?.length) {
    issues.push(validationIssue({ path: 'agentPolicy.volatileFactQueryTokens', message: 'agentPolicy.volatileFactQueryTokens must list at least one substring token; the searchQueryFreshness validator reads this list at runtime', dimension: 'workflowConfigShape' }));
  }
  if (!policy.finalResponseFields?.length) {
    issues.push(validationIssue({ path: 'agentPolicy.finalResponseFields', message: 'agentPolicy.finalResponseFields must list the final response contract', dimension: 'workflowConfigShape' }));
  }
  summary = {
    path: workflowConfigPath,
    analysisChapters: analysis.length,
    finalArtifacts: finalFiles.length,
    coreArtifacts: core.length,
    volatileFacts: policy.volatileFacts?.length ?? 0,
    volatileFactQueryTokens: policy.volatileFactQueryTokens?.length ?? 0,
    finalResponseFields: policy.finalResponseFields?.length ?? 0,
    workflowInputs: Object.keys(config.workflow?.inputs ?? {}).length,
    workflowPhases: config.workflow?.phases?.length ?? 0,
  };
}

const result = validationEnvelope({
  ok: issues.length === 0,
  validator: 'check-workflow-config',
  artifact: 'references/workflow-config.yaml',
  issues,
  summary,
});

if (args.format === 'json') console.log(JSON.stringify(result, null, 2));
else if (args.format === 'compact') console.log(formatValidationCompact(result));
else if (result.ok) {
  console.log(`[check:workflow-config] ✓ ${workflowConfigPath}`);
  console.log(`[check:workflow-config] analysis=${summary.analysisChapters} final=${summary.finalArtifacts} core=${summary.coreArtifacts} policy=${summary.volatileFacts}/${summary.volatileFactQueryTokens}/${summary.finalResponseFields} inputs=${summary.workflowInputs} phases=${summary.workflowPhases}`);
} else {
  console.error(formatValidationText(result, { failureMessage: '[check:workflow-config] failures' }));
}

process.exit(result.ok ? EXIT.ok : EXIT.failure);

