#!/usr/bin/env node
// Validate the config-driven startup research workflow metadata.
import { EXIT, FINAL_ARTIFACTS, getAnalysisArtifacts, getCoreArtifacts, loadWorkflowConfig, workflowConfigPath } from './utils.mjs';

const failures = [];
const fail = (message) => failures.push(message);

let config;
try {
  config = loadWorkflowConfig();
} catch (err) {
  console.error(`[check:workflow-config] failure: ${err.message}`);
  process.exit(EXIT.failure);
}

const analysis = getAnalysisArtifacts(config);
const core = getCoreArtifacts(config);
const finalFiles = Object.values(FINAL_ARTIFACTS).map((artifact) => artifact.file);
const policy = config.agentPolicy ?? {};

if (analysis.length !== 8) fail(`expected 8 analysis chapters, found ${analysis.length}`);
if (finalFiles.length !== 3) fail(`expected 3 final artifacts, found ${finalFiles.length}`);
for (const file of finalFiles) {
  if (!core.some((artifact) => artifact.file === file)) {
    fail(`final artifact ${file} is not present in core artifact list`);
  }
}
if (!policy.volatileFacts?.length) fail('agentPolicy.volatileFacts must list at least one volatile fact');
if (!policy.finalResponseFields?.length) fail('agentPolicy.finalResponseFields must list the final response contract');

if (failures.length) {
  console.error('[check:workflow-config] failures:\n' + failures.map((message) => `  - ${message}`).join('\n'));
  process.exit(EXIT.failure);
}

console.log(`[check:workflow-config] ✓ ${workflowConfigPath}`);
console.log(`[check:workflow-config] analysis=${analysis.length} final=${finalFiles.length} core=${core.length} policy=${policy.volatileFacts.length}/${policy.finalResponseFields.length}`);

