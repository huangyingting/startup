# AGENTS.md

This repository generates startup diligence reports as structured YAML and renders them with an Astro static website.

## Project map

- `reports/` — generated report runs and `reports/_index.yaml`.
- `.github/skills/startup-research/` — end-to-end report-generation skill, including private references and skill-owned scripts.
- `.github/skills/fetch-url/` — direct URL fetch helper skill.
- `website/` — Astro site, report loader, renderer, and website-owned validation helpers.

## Setup commands

- Install root dependencies: `npm install`
- Install website dependencies: `npm --prefix website install`
- Run full validation: `npm run validate`
- Run website locally: `npm --prefix website run dev`

## Testing instructions

- Before finishing code, schema, report, loader, renderer, or script changes, run `npm run validate` unless the user asked for a narrower edit.
- For website/report rendering checks only, run `npm run check:reports`.
- For workflow config/index checks only, run `npm run check:workflow-config` and `npm run check:report-index`.

## Working conventions

- Keep skill-owned scripts under `.github/skills/*/scripts/`; keep website-owned helpers under `website/`.
- Use `node .github/skills/.../scripts/*.mjs` directly for skill workflow scripts; do not add npm aliases for skill internals.
- Use the actual session date as the freshness anchor for startup research and volatile market/company facts.
- Reports are English YAML artifacts under `reports/<YYYYMMDDHHmmss>-<company-slug>/`.
- Do not duplicate the startup research workflow here; when generating or updating a report, follow `.github/skills/startup-research/SKILL.md`.

## Important references

- `.github/skills/startup-research/SKILL.md` — canonical report workflow.
- `.github/skills/startup-research/references/chapters.yaml` — chapter order, artifacts, gates, and requirements.
- `.github/skills/startup-research/references/report-schema-v2.md` — report schema and rendering contract.
- `.github/skills/startup-research/scripts/figures.mjs` — skill figure validation contract.
- `website/src/lib/figures.mjs` — website figure rendering/validation contract.
