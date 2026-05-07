#!/usr/bin/env node
// Validate the config-driven startup research workflow metadata.
import { EXIT, FINAL_ARTIFACTS, getAnalysisArtifacts, getCoreArtifacts, loadWorkflowConfig, workflowConfigPath } from './utils.mjs';

try {
  const config = loadWorkflowConfig();
  const analysis = getAnalysisArtifacts(config);
  const core = getCoreArtifacts(config);
  const finalFiles = Object.values(FINAL_ARTIFACTS).map((artifact) => artifact.file);
  const policy = config.agentPolicy ?? {};

  if (analysis.length !== 8) {
    throw new Error(`expected 8 analysis chapters, found ${analysis.length}`);
  }
  if (finalFiles.length !== 3) {
    throw new Error(`expected 3 final artifacts, found ${finalFiles.length}`);
  }
  for (const file of finalFiles) {
    if (!core.some((artifact) => artifact.file === file)) {
      throw new Error(`final artifact ${file} is not present in core artifact list`);
    }
  }
  if (!policy.volatileFacts?.length) {
    throw new Error('agentPolicy.volatileFacts must list at least one volatile fact');
  }
  if (!policy.finalResponseFields?.length) {
    throw new Error('agentPolicy.finalResponseFields must list the final response contract');
  }

  console.log(`[check:workflow-config] ✓ ${workflowConfigPath}`);
  console.log(`[check:workflow-config] analysis=${analysis.length} final=${finalFiles.length} core=${core.length} policy=${policy.volatileFacts.length}/${policy.finalResponseFields.length}`);
} catch (err) {
  console.error(`[check:workflow-config] failure: ${err.message}`);
  process.exit(EXIT.failure);
}
