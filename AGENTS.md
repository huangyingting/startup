# AGENTS.md

This repository generates startup diligence reports as structured YAML and renders them with an Astro static website.

## Project map

- `reports/` — generated report runs and `reports/_index.yaml`.
- `.agents/skills/startup-research/` — end-to-end report-generation skill, including private references and skill-owned scripts.
- `.agents/skills/fetch-url/` — direct URL fetch helper skill.
- `website/` — Astro site, report loader, renderer, and website-owned validation helpers.

## Setup commands

- Install root dependencies: `npm install`
- Install website dependencies: `npm --prefix website install`
- Run full validation: `npm run validate`
- Run website locally: `npm --prefix website run dev`

## Testing instructions

- Before finishing code, schema, report, loader, renderer, or script changes, run `npm run validate` unless the user asked for a narrower edit.
- For workflow config/index checks only, run `npm run check:workflow-config` and `npm run check:report-index`.

## Working conventions

- Keep skill-owned scripts under `.agents/skills/*/scripts/`; keep website-owned helpers under `website/`.
- Use `node .agents/skills/.../scripts/*.mjs` directly for skill workflow scripts; do not add npm aliases for skill internals.

## Core philosophy

> ⚠️ **These rules govern repo development only — they have NO bearing on report generation.**
>
> - **Applies to:** code, schemas, scripts, workflows, docs.
> - **Does NOT apply to:** anything under `reports/`. Diligence reports are produced by skill orchestration (driven end-to-end by `.agents/skills/startup-research/`, with `.agents/skills/fetch-url/` as a helper). That pipeline owns its own rules and prioritizes thoroughness and source coverage.

- **Think before acting.** State assumptions explicitly. If something is unclear or has multiple reasonable interpretations, ask instead of guessing. Push back when a simpler approach exists.
- **Simplicity first.** Do the minimum that solves the problem. No speculative scope, extra options, or handling for situations that won't happen.
- **Surgical changes.** Touch only what the request requires. Don't reformat or "improve" adjacent content. Match existing style. Mention unrelated issues you notice rather than silently fixing them.
- **Goal-driven execution.** Turn each task into a verifiable success criterion (e.g. specific files written, a check now passing, a question answered). For multi-step work, state a brief plan with a verification step per item before executing.