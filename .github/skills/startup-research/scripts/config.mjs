#!/usr/bin/env node
// Validate the config-driven startup research workflow metadata.
import { FINAL_ARTIFACTS, getAnalysisArtifacts, getCoreArtifacts, loadWorkflowConfig, workflowConfigPath } from './utils.mjs';

try {
  const config = loadWorkflowConfig();
  const analysis = getAnalysisArtifacts(config);
  const core = getCoreArtifacts(config);
  const finalFiles = Object.values(FINAL_ARTIFACTS).map((artifact) => artifact.file);

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

  console.log(`[check:workflow-config] ✓ ${workflowConfigPath}`);
  console.log(`[check:workflow-config] analysis=${analysis.length} final=${finalFiles.length} core=${core.length}`);
} catch (err) {
  console.error(`[check:workflow-config] failure: ${err.message}`);
  process.exit(1);
}
