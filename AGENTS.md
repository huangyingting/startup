# AGENTS.md

Repository instructions for coding agents working on the startup diligence report generator and Astro website.

This file holds repo-wide operating rules, paths, validation commands, and extension points. The end-to-end workflow for producing a complete report lives in the [`startup-diligence`](.github/skills/startup-diligence/SKILL.md) skill — start there when asked to generate or update a report.

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
- The canonical report schema is `.github/schemas/startup-diligence-report-v2.md`.
- Reports are generated as English YAML artifacts.

## Canonical machine sources

- `scripts/report-manifest.mjs` is canonical for artifact order, loader keys, required files, and depth floors.
- `scripts/figure-registry.mjs` is canonical for supported native figure types and their data contracts.
- `scripts/evidence-registry.mjs` is canonical for evidence enums such as claim types, topics, source types, freshness, reputation, and independence.
- `scripts/report-registry.mjs` is canonical for report/card enums and report block/callout types.
- Human-facing skill and reference docs should explain usage, but update the machine source first when changing an enum, figure type, artifact, or validation contract.

## Important paths

- `.github/skills/startup-diligence/SKILL.md` — single workflow entry point that sequences chapter and integration skills end-to-end.
- `.github/skills/startup-*/SKILL.md` — per-chapter and integration skills (snapshot, market, competition, financials, product, customers, risks, valuation, ledger, report, card). The analysis skills are the single source for chapter-specific semantic requirements such as required section concepts, tables, figures, evidence strategy, and completion checks.
- `scripts/report-manifest.mjs` — artifact identity, chapter order, loader keys, preferred figure types, and numeric depth floors. Integration checks live in `scripts/check-reports-content.mjs` and `website/scripts/check-reports.mjs`.
- `.github/skills/fetch-url/` — required skill for direct URL/link/page fetches.
- `.github/references/` — shared rules: YAML syntax, evidence ledger, and analysis conventions.
- `.github/schemas/startup-diligence-report-v2.md` — canonical schema and rendering contract.
- `scripts/report-manifest.mjs` — central manifest of artifacts, chapter order, loader keys, and depth floors; consumed by validation, consolidation, audit, and the website loader.
- `scripts/figure-registry.mjs` — central native figure type/data contract; consumed by validators and the renderer.
- `scripts/evidence-registry.mjs` — central evidence enums (claim types, topics, freshness, source types, reputation tiers, independence).
- `scripts/` — report preparation, index, duplicate checks, evidence consolidation, and content checks.
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

Producing a complete report — including all `01`–`08` analysis artifacts, the evidence ledger, the report document, and the report card — is governed by the [`startup-diligence`](.github/skills/startup-diligence/SKILL.md) skill. That skill defines:

- the invocation contract;
- required artifact set;
- skill sequence and dependency rules;
- concurrency model and synchronization points;
- depth floors, readiness audit, and final validation gates;
- final response format.

Do not duplicate that workflow here. When working on a report, follow `startup-diligence` end-to-end and the per-chapter skills it delegates to.

## Extension points

When adding a new analysis chapter or changing chapter order:

1. Add or update the artifact entry in `scripts/report-manifest.mjs` (file, skill, loader key, chapter number, depth floors, preferred figure types).
2. Add or update the owning `.github/skills/startup-*/SKILL.md` guidance, including chapter purpose, required content, tables, figures, evidence strategy, and completion checks.
3. Ensure consolidation, readiness audit, report assembly, and website loading consume the manifest rather than new hard-coded file lists.
4. Run `npm run validate`.

When adding a required table, figure, metric, or diligence question inside an existing chapter:

1. Update that chapter's `SKILL.md` with the required content, table, figure, metric, source, or diligence requirement.
2. Keep table column requirements schema-compatible and figure types limited to `scripts/figure-registry.mjs`.
3. Run the readiness audit for a draft report folder and then `npm run validate` for final artifacts.

When adding a new native figure/chart type:

1. Add the type, required data fields, allowed populated fields, and data-shape constraints to `scripts/figure-registry.mjs`.
2. Implement or route the renderer in `website/src/components/FigureRenderer.astro`.
3. Reference the type from the relevant section-owned skill only after the renderer and validator support it.
4. Rebuild `reports/_index.yaml` and run `npm run validate`.

When adding a new evidence topic, source type, or other ledger enum:

1. Update `scripts/evidence-registry.mjs`.
2. Update `.github/schemas/startup-diligence-report-v2.md` if the schema doc lists the enum.
3. Run `npm run validate`.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Reports are loaded from `../reports/` via `website/src/content/reports-loader.ts`, which derives stage files from `scripts/report-manifest.mjs`.
- English report artifacts are required for complete rendering.
