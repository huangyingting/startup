#!/usr/bin/env node
// Generate references/rules.md — the static rules and reference values an
// agent must know to author valid chapter YAML and triage validator output.
//
// Sources of truth:
//   - workflow-config.yaml agentPolicy / defaultGate / reportGate /
//     adverseDistribution (via loadWorkflowConfig())
//   - validation-catalog.mjs (RESERVED_TYPE_LETTERS, dimensionCatalog)
//   - website/src/lib/figures.mjs (FIGURE_*)
//
// Edit those, then run `npm run build:rules`. Do not edit the generated
// Markdown directly. Workflow inputs / phases / conditions / allowed files /
// vocabularies are intentionally NOT included here:
//   - inputs / phases / allowed files: covered by the SKILL.md narrative
//     (CLI commands, hardRules, finalize triage table) so the agent is not
//     re-told the same thing in two places.
//   - vocabularies: every enum field's allowed values are listed inline in
//     references/contracts.md at the field that uses them, so an agent
//     authoring a field never has to leave that file to look up its enum.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { loadWorkflowConfig } from './utils.mjs';
import {
  RESERVED_TYPE_LETTERS,
  dimensionCatalog,
} from './validation-catalog.mjs';
import {
  FIGURE_ALLOWED_POPULATED_FIELDS,
  FIGURE_CONTRACTS,
  FIGURE_DATA_FIELDS,
  FIGURE_LAYOUTS,
  FIGURE_TYPES,
} from '../../../../website/src/lib/figures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../references/rules.md');

function yamlBlock(value) {
  const text = typeof value === 'string' ? value : yaml.dump(value, { lineWidth: 100, noRefs: true });
  return ['```yaml', text.trimEnd(), '```'].join('\n');
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function policySection(policy) {
  const lines = [];
  lines.push(`#### \`hardRules\` (do not violate)`);
  lines.push('');
  lines.push(bulletList(policy.hardRules ?? []));
  lines.push('');
  lines.push(`#### \`researchRules\``);
  lines.push('');
  lines.push(bulletList(policy.researchRules ?? []));
  lines.push('');
  lines.push(`#### \`chapterAuthoringRules\``);
  lines.push('');
  lines.push(bulletList(policy.chapterAuthoringRules ?? []));
  lines.push('');
  lines.push(`#### \`retryPolicy\``);
  lines.push('');
  lines.push(yamlBlock(policy.retryPolicy ?? {}));
  lines.push('');
  lines.push(`#### \`volatileFacts\` (re-fetch every run; refresh context is background only for these)`);
  lines.push('');
  lines.push(bulletList(policy.volatileFacts ?? []));
  lines.push('');
  lines.push(`#### \`finalResponseFields\` (every field must appear in the final user-facing summary)`);
  lines.push('');
  lines.push(bulletList(policy.finalResponseFields ?? []));
  return lines.join('\n');
}

function gatesSection(config) {
  const lines = [];
  lines.push('#### `defaultGate` (every chapter)');
  lines.push('');
  lines.push(yamlBlock(config.defaultGate ?? {}));
  lines.push('');
  lines.push('#### `reportGate` (post-finalize, evaluated against `evidence.yaml`)');
  lines.push('');
  lines.push(yamlBlock(config.reportGate ?? {}));
  lines.push('');
  lines.push('#### `adverseDistribution` (per-chapter `gate.minAdverseSources` is injected from this)');
  lines.push('');
  lines.push(yamlBlock(config.adverseDistribution ?? {}));
  return lines.join('\n');
}

function idSystemSection() {
  const reserved = [...RESERVED_TYPE_LETTERS].sort().join(', ');
  return [
    'Every `S/C/T/F/Q` id has the shape `<TypeLetter><ChapterLetter><Seq3>`.',
    '',
    `- **TypeLetter** is fixed per entity kind: \`S\` source, \`C\` claim, \`T\` table, \`F\` figure, \`Q\` question. These letters (${reserved}) are reserved and cannot be reused as chapter letters.`,
    '- **ChapterLetter** is the current chapter\'s `letter` (single uppercase A–Z, declared in workflow-config). Use **only this chapter\'s letter** for ids you mint inside this chapter — reusing another chapter\'s letter trips the `crossChapterRefLeak` gate.',
    '- **Seq3** is a zero-padded sequence within the chapter, `001`–`999`.',
    '',
    'Examples: `SO001` = source #1 in the chapter whose `letter: O`; `CM045` = claim #45 in the chapter whose `letter: M`.',
    '',
    'When you need to reference a fact established in another chapter, restate it as a new local claim with this chapter\'s letter and its own `sourceRefs[]`; do not import the other chapter\'s id.',
  ].join('\n');
}

function dimensionsSection() {
  const dims = dimensionCatalog();
  const rows = dims.map((d) => {
    const fix = (d.defaultFix ?? '—').replace(/\|/g, '\\|');
    const suppressed = d.suppressedBy.length ? d.suppressedBy.map((s) => `\`${s}\``).join(', ') : '—';
    return `| ${d.precedenceRank ?? '—'} | \`${d.dimension}\` | ${fix} | ${suppressed} |`;
  });
  return [
    '`check-chapter` and `check-report` emit failures tagged with these `dimension` keys. Fix in `precedence` order (lowest rank = root cause first); a suppressed dimension is masked while its upstream still fails, so the upstream fix usually clears the downstream too.',
    '',
    '`defaultFix` is the generic guidance baked into the validator; concrete failures echo the same hint with the specific field/id filled in (e.g. "Add 3 more registrable domain(s)…"). Trust the per-failure `fix` in JSON output over the generic version below.',
    '',
    'Precedence `—` marks **warning-class** dimensions: they never appear in `retryOrder[]`, never block `check-chapter` (default), and only block when `--strict` is set. They are the only dimensions that may appear in `acknowledgedWarnings[].dimension` (see below).',
    '',
    '| Precedence | Dimension | Default fix | Suppressed by |',
    '|---|---|---|---|',
    ...rows,
    '',
    '### `acknowledgedWarnings` opt-out',
    '',
    'You may opt out of intentional `--strict` warnings by listing them under a top-level `acknowledgedWarnings: [{ dimension, reason }]` entry on the chapter YAML. Each entry must satisfy:',
    '',
    '- **dimension** is one of the warning-class dimensions above (precedence `—`): `paywallRisk`, `sectionsMax`, `tablesMax`, `figuresMax`, `figureType`, `tableNotes`, `unverifiedSource`. Acks against any other dimension surface as a non-blocking `acknowledgedWarnings` warning so the misuse is visible without breaking historical reports.',
    '- **reason** is a string of at least 30 characters explaining why the warning is non-actionable for this chapter. Shorter reasons are silently ignored (the ack does not take effect).',
    '',
    'Acks never silence a real failure; the `failures.length === 0` gate is checked unconditionally. Use this only for genuinely non-actionable warnings (e.g. `tableNotes` on a pure factual snapshot whose `defaultFix` explicitly tells you to acknowledge it).',
  ].join('\n');
}

function rendererContractsSection() {
  const lines = [];
  lines.push('Every figure must satisfy the contract for its `type`. The renderer ignores extra fields and refuses to render figures whose required arrays are missing or empty. If your evidence does not fit a figure type, swap the planned figure for an extra table — the chapter `gate.minArtifacts` floor counts both.');
  lines.push('');
  lines.push('#### Allowed figure types');
  lines.push('');
  lines.push(yamlBlock(FIGURE_TYPES));
  lines.push('');
  lines.push('#### Allowed `layout` values (figures and tables)');
  lines.push('');
  lines.push(yamlBlock(FIGURE_LAYOUTS));
  lines.push('');
  lines.push('#### Allowed `data.*` field names (across all figure types)');
  lines.push('');
  lines.push(yamlBlock(FIGURE_DATA_FIELDS));
  lines.push('');
  lines.push('#### Required field combinations per figure type');
  lines.push('');
  lines.push('Each entry is a list of alternative requirements; a figure satisfies the contract when **every** alternative has at least one populated field. Example: `bar: [["items", "series"]]` means a bar figure must populate either `data.items` or `data.series` (or both).');
  lines.push('');
  lines.push(yamlBlock(FIGURE_CONTRACTS));
  lines.push('');
  lines.push('#### Allowed populated `data.*` fields per figure type');
  lines.push('');
  lines.push('Populating a field outside this list for the given type is a `figureShape` failure. `other` allows none — use it only when the data does not fit any rendered type.');
  lines.push('');
  lines.push(yamlBlock(FIGURE_ALLOWED_POPULATED_FIELDS));
  return lines.join('\n');
}

function build() {
  const config = loadWorkflowConfig();
  const policy = config.agentPolicy ?? {};

  const sections = [
    `<!-- GENERATED FILE: edit references/workflow-config.yaml, scripts/validation-catalog.mjs, or website/src/lib/figures.mjs, then run \`npm run build:rules\`. -->`,
    '',
    `# startup-research rules`,
    '',
    `The rules and reference values an agent must know to author valid chapter YAML and triage validator output. Read once at session start; refer back as needed during chapter authoring and finalization.`,
    '',
    `Pairs with [SKILL.md](../SKILL.md) (the workflow narrative) and [contracts.md](contracts.md) (the field shapes for the YAML you write).`,
    '',
    `## Agent policy (binding)`,
    '',
    policySection(policy),
    '',
    `## Gates`,
    '',
    `Per-chapter \`gate:\` blocks in \`workflow-config.yaml\` override individual keys; un-overridden keys fall through to \`defaultGate\`. \`check-chapter\` enforces the merged gate per chapter; \`check-report\` enforces \`reportGate\` after finalization.`,
    '',
    gatesSection(config),
    '',
    `## ID system`,
    '',
    idSystemSection(),
    '',
    `## Validator dimensions`,
    '',
    dimensionsSection(),
    '',
    `## Renderer contracts (figures)`,
    '',
    rendererContractsSection(),
    '',
  ];

  writeFileSync(outPath, sections.join('\n'), 'utf8');
  console.log(`[build-rules-doc] wrote ${outPath}`);
}

build();
