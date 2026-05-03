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
- The canonical report schema reference is `.github/references/report-schema-v2.md`.
- Reports are generated as English YAML artifacts.

## Canonical sources and machine mirrors

- `.github/skills/startup-research/SKILL.md` is canonical for the end-to-end workflow, required artifact set, artifact mapping, execution order, concurrency model, synchronization points, and report-run gates.
- `.github/skills/startup-*/SKILL.md` files are canonical for chapter-specific semantic requirements such as required section concepts, tables, figures, evidence acquisition strategy, and completion checks.
- `scripts/figure-registry.mjs` is canonical for supported native figure types and their data contracts.
- `.github/references/report-schema-v2.md` is canonical for report/card enums, full-report block/callout types, analysis artifact callout types, and evidence field vocabulary.
- For workflow/artifact changes, update the owning skill first, then sync validators, loaders, and scripts that need local machine constants. For figure type or rendering-contract changes, update the figure registry first, then sync references and skills. For schema vocabulary, update `.github/references/report-schema-v2.md` first.

## Important paths

- `.github/skills/startup-research/SKILL.md` — single workflow entry point that orchestrates chapter and integration skills end-to-end.
- `.github/skills/startup-*/SKILL.md` — per-chapter and integration skills (overview, market analysis, competitors, financials, product tech, customers, risks, valuation, evidence, full report, summary card). The analysis skills are the single source for chapter-specific semantic requirements such as required section concepts, tables, figures, evidence acquisition strategy, and completion checks.
- `.github/skills/fetch-url/` — required skill for direct URL/link/page fetches.
- `.github/references/` — shared YAML syntax, analysis rules, and report schema reference.
- `.github/references/report-schema-v2.md` — canonical report schema and rendering contract.
- `scripts/figure-registry.mjs` — central native figure type/data contract; consumed by validators and the renderer.
- `scripts/` — report preparation, index, evidence consolidation, figure contracts, and chapter readiness checks.
- `website/` — Astro renderer, content loader, UI components, and website validation.

## Setup and validation commands

- Install root dependencies: `npm install`.
- Install website dependencies: `npm --prefix website install`.
- Run full validation from repo root: `npm run validate`.
- After report, schema, loader, renderer, workflow, or script changes, run `npm run validate` before finishing unless the user explicitly asks for a narrower edit.

## URL and page fetching

- For direct URL/link/page fetches, always load and follow the `fetch-url` skill.
- Use `node scripts/fetch-url.mjs ...`; do **not** use native `web_fetch` or similarly named built-in page-fetching tools in this repository.
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
- chapter-level readiness audits and final validation gates;
- final response format.

Do not duplicate that workflow here. When working on a report, follow `startup-research` end-to-end and the per-chapter skills it delegates to.

## Extension points

When adding a new analysis chapter or changing chapter order:

1. Update `.github/skills/startup-research/SKILL.md` with the workflow order and required artifact set.
2. Add or update the owning `.github/skills/startup-*/SKILL.md` guidance, including chapter mission, required content, tables, figures, evidence acquisition strategy, and completion checks.
3. Sync consolidation, chapter readiness audit, report assembly checks, website validation, and website loading code where they need local machine constants for the new artifacts.
4. Run `npm run validate`.

When adding a required table, figure, metric, or diligence question inside an existing chapter:

1. Update that chapter's `SKILL.md` with the required content, table, figure, metric, source, or diligence requirement.
2. Keep table column requirements schema-compatible and figure types limited to `scripts/figure-registry.mjs`.
3. Run the chapter readiness audit for affected draft artifacts and then `npm run validate` for final artifacts.

When adding a new native figure/chart type:

1. Add the type, required data fields, allowed populated fields, and data-shape constraints to `scripts/figure-registry.mjs`.
2. Implement or route the renderer in `website/src/components/FigureRenderer.astro`.
3. Reference the type from the relevant section-owned skill only after the renderer and validator support it.
4. Rebuild `reports/_index.yaml` and run `npm run validate`.

When adding a new evidence topic, source type, or other ledger vocabulary:

1. Update `.github/references/report-schema-v2.md`.
2. Update affected skills or report examples if they list the vocabulary explicitly.
3. Run `npm run validate`.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Reports are loaded from `../reports/` via `website/src/content/reports-loader.ts`.
- English report artifacts are required for complete rendering.
