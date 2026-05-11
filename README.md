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
.agents/skills/translate-zh/      # Simplified Chinese overlay workflow skill
reports/                          # generated report runs (one folder per finalized run)
website/                          # Astro static site and website-owned validation
cloudflare/                       # Cloudflare Worker scheduler for GitHub Actions
```

Important files:

- `.agents/skills/startup-research/SKILL.md` — thin end-to-end workflow entry point that loads runtime contracts.
- `.agents/skills/startup-research/references/workflow-config.yaml` — workflow inputs, conditions, phases, policy, chapter order, artifacts, gates, and requirements.
- `.agents/skills/startup-research/references/contracts.md` — generated agent-readable contract reference.
- `.agents/skills/startup-research/scripts/contracts/` — executable Zod schemas for workflow config, report artifacts, and runtime context.
- `.agents/skills/startup-research/scripts/` — skill-owned workflow scripts (chapter loader, gate checks, ledger consolidation, report assembly, validators).
- `.agents/skills/translate-zh/SKILL.md` — Simplified Chinese sparse-overlay workflow for finalized reports.
- `website/src/lib/` — rendering contracts shared between the renderer and the chapter/report validators.
- `cloudflare/worker.js` — Cloudflare Cron Trigger that dispatches scheduled GitHub Actions workflows.
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

## Cloudflare scheduler

The GitHub Actions cron for `unicorns.yml` is disabled in favor of the Worker in `cloudflare/`. It fires every four hours at `:30` UTC and dispatches the `Research unicorns` workflow on `main` with the same default inputs as the former scheduled run.

Set the required Worker secrets from `cloudflare/`:

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
```

`GITHUB_TOKEN` needs Actions read/write permission on the target repository. `GITHUB_REPO` should be `vibewatch/startup`. Deploy the scheduler with:

```bash
npx wrangler deploy
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

Some finalized runs also contain Simplified Chinese overlay artifacts:

```text
summary-card.zh.yaml
full-report.zh.yaml
```

The `*.zh.yaml` files are sparse overlays for whitelisted translatable text, not full copies of the English YAML. They must be produced and checked through the translation workflow, not hand-assembled.

After generation, run:

```bash
npm run validate
```

## Chinese overlays

Use the translate-zh workflow for Simplified Chinese report overlays:

```bash
npm run translate:zh -- preflight <run-id-or-company-name>
npm run translate:zh -- init <run-id-or-company-name>
npm run translate:zh -- finalize-summary <run-id-or-company-name>
npm run translate:zh -- finalize-full <run-id-or-company-name>
npm run translate:zh -- verify <run-id-or-company-name>
```

Check all existing Chinese overlays with:

```bash
npm run check:translations-zh
```

The root `npm run validate` command includes this translation check.

## Validation commands

From the repository root:

```bash
npm run check:workflow-config
npm run check:revision-graph
npm run check:reports-contract
npm run check:translations-zh
npm run validate
```

For finalized report maintenance, `npm run check:reports-contract` verifies the assembled report artifacts. If it reports orphan exhibits, fix the source chapter YAML by anchoring each affected table or figure under the section whose prose introduces it via `section.tableRefs` or `section.figureRefs`, then rebuild the assembled artifacts for that report:

```bash
node .agents/skills/startup-research/scripts/build-report.mjs reports/<run-id>
npm run check:reports-contract
```

For normal report generation, prefer the full startup-research workflow and `finalize-report.mjs`; use `build-report.mjs` only when maintaining existing finalized reports and the chapter/evidence ledger is already current.

From `website/`:

```bash
npm run build
npm run preview
```

## Ownership boundaries

- Skill workflow scripts live under `.agents/skills/*/scripts/` and are called directly with `node` by the skills.
- Website code and website validators live under `website/`.
- The root `package.json` exposes repository-level checks and the `translate:zh` runner; other skill-internal workflow steps are called directly by their skills.
- Report workflow details belong in `.agents/skills/startup-research/SKILL.md`, not in this README.
