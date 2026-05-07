# Startup

Startup is a diligence report generator for startup companies. It produces evidence-backed YAML report artifacts and renders them as a static Astro website.

## What it does

- Researches a named startup company, optionally starting from an official URL.
- Generates structured report artifacts under `reports/`.
- Consolidates evidence and claim references into a final evidence ledger.
- Renders complete reports, summary cards, search pages, filters, scorecards, tables, and native figures through the Astro website.

## Repository layout

```text
.agents/skills/startup-research/  # report-generation workflow skill
.agents/skills/fetch-url/         # direct URL fetch helper skill
reports/                          # generated report runs (one folder per finalized run)
website/                          # Astro static site and website-owned validation
```

Important files:

- `.agents/skills/startup-research/SKILL.md` — canonical end-to-end report workflow.
- `.agents/skills/startup-research/references/workflow-config.yaml` — workflow policy, chapter order, artifacts, gates, and requirements.
- `.agents/skills/startup-research/references/workflow-config-schema-v1.md` — schema and field semantics for the workflow config.
- `.agents/skills/startup-research/references/report-schema-v2.md` — report-v2 YAML field shapes (the artifacts written under `reports/<runId>/`).
- `.agents/skills/startup-research/references/chapter-runtime-context-schema-v2.md` — runtime projection contract for the JSON the chapter loader emits.
- `.agents/skills/startup-research/references/yaml-rules.md` — YAML syntax constraints shared by every artifact.
- `.agents/skills/startup-research/scripts/` — skill-owned workflow scripts (chapter loader, gate checks, ledger consolidation, report assembly, validators).
- `website/src/lib/` — rendering contracts shared between the renderer and the chapter/report validators.
- `AGENTS.md` — repo-development conventions (working rules, core philosophy). Read before touching skills, scripts, or schemas.
- `.agents/skills/README.md` — skills index and skill-folder conventions.
## Quick start

Install dependencies from the repository root:

```bash
npm install
npm --prefix website install
```

Run all validation and build checks:

```bash
npm run validate
```

Start the website locally:

```bash
npm --prefix website run dev
```

## Generate a report

Ask the coding agent to run the Startup Research workflow with a company name and optional official URL, for example:

> Research Perplexity AI — official site https://www.perplexity.ai.

The workflow writes a new run under:

```text
reports/<YYYYMMDDHHmmss>-<company-slug>/
```

A complete report run contains:

```text
01-company-overview.yaml
02-market-analysis.yaml
03-competitors.yaml
04-financials.yaml
05-product-tech.yaml
06-customers.yaml
07-risks.yaml
08-valuation.yaml
evidence.yaml
full-report.yaml
report-meta.yaml
summary-card.yaml
```

After generation, run:

```bash
npm run validate
```

## Validation commands

From the repository root:

```bash
npm run check:workflow-config
npm run check:revision-graph
npm run check:reports-contract
npm run validate
```

From `website/`:

```bash
npm run build
npm run preview
```

## Ownership boundaries

- Skill workflow scripts live under `.agents/skills/*/scripts/` and are called directly with `node` by the skills.
- Website code and website validators live under `website/`.
- The root `package.json` only exposes repository-level checks; it does not alias skill-internal workflow steps.
- Report workflow details belong in `.agents/skills/startup-research/SKILL.md`, not in this README.
