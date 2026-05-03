# AGENTS.md

Repository instructions for coding agents working on the startup diligence report generator and Astro website.

This file holds repo-wide operating rules, paths, validation commands, and extension points. The end-to-end workflow for producing a complete report lives in the [`startup-research`](.github/skills/startup-research/SKILL.md) skill — start there when asked to generate or update a report.

## Operating principles

- Work systematically: understand the request, inspect only relevant context, plan briefly, execute, validate, summarize.
- Be clear and explicit: state what changed, why it changed, and how it was checked.
- Stay concise: use short bullets, avoid repeating unchanged context, full tool output, or long plans.
- Keep going when the next useful action is clear; ask only when blocked or when a choice materially changes the result.
- Report progress at meaningful milestones, not after every small step.
- Final replies should include the outcome, key files changed, validation status, and important follow-ups or blockers.
- Time matters for research: use the actual session date as the freshness anchor for search queries, evidence review, volatile facts, and report dates so reports capture the latest material news rather than stale company snapshots.

## Repository overview

- This repo generates startup diligence reports as structured YAML and renders them with an Astro static site.
- Reports live in `reports/<YYYYMMDDHHmmss>-<company-slug>/` and are indexed by `reports/_index.yaml`.
- The canonical report schema reference is `.github/skills/startup-research/references/report-schema-v2.md`.
- Reports are generated as English YAML artifacts.

## Canonical sources and machine mirrors

- `.github/skills/startup-research/SKILL.md` is the single startup workflow skill and is canonical for the end-to-end workflow, chapter iteration loop, execution order, concurrency model, synchronization points, finalization, and report-run gates.
- `.github/skills/startup-research/references/chapters.yaml` is canonical for required artifact set, artifact mapping, chapter order/numbering, loader keys, chapter-specific semantic requirements, required tables, required figures, evidence acquisition strategy, domain-adaptive additions, and completion gates.
- `.github/skills/startup-research/scripts/figures.mjs` is canonical for startup-research skill figure validation; `website/src/lib/figures.mjs` is the website mirror used by rendering and website validation.
- `.github/skills/startup-research/references/report-schema-v2.md` is canonical for report/card enums, full-report block/callout types, analysis artifact callout types, and evidence field vocabulary.
- For workflow-process changes, update `startup-research` first. For artifact/chapter changes, update `.github/skills/startup-research/references/chapters.yaml` first; validators, loaders, and scripts consume that config. For figure type or rendering-contract changes, update the figure registry first, then sync startup-research references and chapter config. For schema vocabulary, update `.github/skills/startup-research/references/report-schema-v2.md` first.

## Important paths

- `.github/skills/startup-research/SKILL.md` — single workflow entry point that runs configured analysis chapters, evidence consolidation, full-report assembly, summary-card generation, and validation end-to-end.
- `.github/skills/startup-research/references/chapters.yaml` — chapter and final artifact configuration consumed by workflow scripts, validators, and the website loader.
- `.github/skills/fetch-url/` — required skill for direct URL/link/page fetches.
- `.github/skills/startup-research/references/` — private startup-research YAML syntax, chapter config, and report schema references.
- `.github/skills/startup-research/references/report-schema-v2.md` — canonical report schema and rendering contract.
- `.github/skills/startup-research/scripts/figures.mjs` — startup-research skill figure type/data contract.
- `website/src/lib/figures.mjs` — website figure type/data contract used by the renderer and website report validator.
- `.github/skills/startup-research/scripts/` — skill-owned report preparation, index, evidence consolidation, figure contracts, workflow config validation, and chapter readiness checks.
- `.github/skills/fetch-url/scripts/` — direct URL fetch helper script used by the `fetch-url` skill.
- `website/` — website-owned Astro renderer, content loader, UI components, website figure contracts, and website validation.

## Setup and validation commands

- Install root dependencies: `npm install`.
- Install website dependencies: `npm --prefix website install`.
- Run full validation from repo root: `npm run validate`.
- After report, schema, loader, renderer, workflow, or script changes, run `npm run validate` before finishing unless the user explicitly asks for a narrower edit.

## URL and page fetching

- For direct URL/link/page fetches, always load and follow the `fetch-url` skill.
- Use `node .github/skills/fetch-url/scripts/fetch.mjs ...` for direct page review; do **not** use native `web_fetch` or similarly named built-in page-fetching tools in this repository.
- If a higher-priority runtime instruction requires a platform-provided fetch tool for a user-supplied URL, follow that instruction, then apply this repository's evidence and citation rules to the fetched content.
- Use `--text-only` for readable text intended for grep/skimming.
- Use `--out` only for diagnostic saved bodies; `/tmp` files are never report artifacts or sources of truth.
- Use search tools for discovery across many sources, then `fetch-url` for direct page review when needed.

## Generating or updating reports

Producing a complete report — including all `01`–`08` analysis artifacts, the evidence file, the full report, and the summary card — is governed by the [`startup-research`](.github/skills/startup-research/SKILL.md) skill. That skill defines:

- the invocation contract;
- required artifact set;
- artifact mapping, execution order, concurrency model, and dependency rules;
- synchronization points;
- chapter-level readiness checks and final validation gates;
- final response format.

Do not duplicate that workflow here. When working on a report, follow `startup-research` end-to-end and use `.github/skills/startup-research/references/chapters.yaml` for chapter-specific requirements and gates.

## Extension points

When adding a new analysis chapter or changing chapter order:

1. Update `.github/skills/startup-research/references/chapters.yaml` with the chapter order, artifact mapping, loader key, chapter mission, required content, tables, figures, evidence acquisition strategy, and completion gate.
2. Update `.github/skills/startup-research/SKILL.md` only if the workflow process itself changes.
3. Run `npm run validate`; scripts and website validation load chapter constants from the config.

When adding a required table, figure, metric, or diligence question inside an existing chapter:

1. Update that chapter entry in `.github/skills/startup-research/references/chapters.yaml` with the required content, table, figure, metric, source, or diligence requirement.
2. Keep table column requirements schema-compatible and figure types limited to both `.github/skills/startup-research/scripts/figures.mjs` and `website/src/lib/figures.mjs`.
3. Run the chapter readiness check for affected draft artifacts and then `npm run validate` for final artifacts.

When adding a new native figure/chart type:

1. Add the type, required data fields, allowed populated fields, and data-shape constraints to `.github/skills/startup-research/scripts/figures.mjs`.
2. Mirror the figure contract in `website/src/lib/figures.mjs` and implement or route the renderer in `website/src/components/FigureRenderer.astro`.
3. Reference the type from the relevant chapter entry in `.github/skills/startup-research/references/chapters.yaml` only after the renderer and validator support it.
4. Rebuild `reports/_index.yaml` and run `npm run validate`.

When adding a new evidence topic, source type, or other ledger vocabulary:

1. Update `.github/skills/startup-research/references/report-schema-v2.md`.
2. Update affected config entries, workflow instructions, or report examples if they list the vocabulary explicitly.
3. Run `npm run validate`.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Reports are loaded from `../reports/` via `website/src/content/reports-loader.ts`.
- English report artifacts are required for complete rendering.
