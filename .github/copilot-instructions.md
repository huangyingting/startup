# Copilot Instructions

## Architecture

This repository is a YAML-first startup due diligence research system. It has three layers:

1. **Multi-agent pipeline** (`.github/agents/`): Custom agents produce structured YAML artifacts. The `Startup Research` agent orchestrates a single-company run. In automatic recent-unicorn mode, the default Copilot agent selects companies and launches independent `Startup Research` runs.
2. **Report artifacts** (`reports/`): Each report lives in `<YYYYMMDDHHmmss>-<company-slug>/` and must contain the complete 12-file artifact set from `00-report-brief.yaml` through `11-report-card.yaml`. `reports/_index.yaml` is the generated catalog of complete reports.
3. **Astro website** (`website/`): A static Astro 5 site loads YAML directly via `website/src/content/reports-loader.ts`, validates report cards with Zod in `website/src/content/config.ts`, and renders report documents with native components plus ECharts canvas charts.

The specialist pipeline order is: Evidence Analyst → Market & Competition Analyst → Financial & Product Analyst → Risk & Valuation Analyst → Report Writer → Translator ZH. Each stage must wait for upstream YAML to exist, parse, and pass referential-integrity checks before continuing.

## Agent workflow rules

- Use `Startup Research` for a named company or company URL. The `depth` default is `deep`; `standard` is allowed only when explicitly requested.
- When no company name and no URL are provided, use automatic `recent-unicorns` mode: identify at least 5 recent private unicorn startups, avoid duplicates already present in `reports/_index.yaml` unless there is a materially new reason, and launch one independent `Startup Research` run per selected company.
- In recent-unicorns mode, do not pass `--agent "Startup Research"` to the top-level Copilot CLI invocation. The default top-level agent should orchestrate concurrent `Startup Research` subagents.
- Do not use a `focus` input or focus-specific behavior. The report should be a full due diligence report governed by `depth` and the schema.
- Agents must write final YAML artifacts directly under `reports/<run>/`. Do not use temporary report files as the canonical output and do not create non-YAML report deliverables.
- `Startup Report Evidence Analyst` is the only specialist that should fetch external sources. All downstream specialists must work from `01-evidence-ledger.yaml` and cite facts via `claimRefs`.
- Failed, duplicate, or incomplete partial report folders must not remain directly under `reports/` after a generation run. CI rejects folders containing YAML without `11-report-card.yaml`.

## Build, validate, and dev commands

From the repo root (requires Node 22):

```bash
npm install && npm --prefix website install   # install all deps
npm run validate                               # check index + validate reports + build site
npm run build:reports-index                    # rebuild reports/_index.yaml catalog
npm run check:reports-index                    # verify catalog is current
npm run check:reports                          # validate report YAML artifacts only
```

From `website/`:

```bash
npm run dev          # Astro dev server
npm run build        # production build, including report validation
npm run preview      # preview production build
```

There is no separate test suite. `npm run validate` is the primary quality gate and should pass after changing report YAML, schemas, loader logic, rendering logic, or workflows.

## YAML schema conventions

- Canonical schema version: `startup-diligence-report-v2`. Do not preserve or reintroduce legacy schema compatibility.
- Every artifact must include `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- Required report artifacts are `00-report-brief.yaml`, `01-evidence-ledger.yaml`, `02-company-snapshot.yaml`, `03-market-macro.yaml`, `04-competitive-benchmarking.yaml`, `05-financial-unit-economics.yaml`, `06-product-technology.yaml`, `07-customer-retention.yaml`, `08-risk-regulatory.yaml`, `09-investment-valuation.yaml`, `10-report-document.yaml`, and `11-report-card.yaml`.
- Optional Simplified Chinese artifacts use `.zh.yaml`, currently `10-report-document.zh.yaml` and `11-report-card.zh.yaml`.
- ID patterns: sources `S001`, claims `C001`, figures `F001`, tables `T001`.
- Use descriptive camelCase field names. Include units in numeric names when useful, such as `revenueRunRateUsdM`, `arrUsdM`, `grossMarginPct`, `nrrPct`, `burnMultiple`, `cacPaybackMonths`, and `valuationUsdM`.
- Numeric KPI and chart values must be YAML numbers, not strings. Unknown or unsupported metrics should be `null` with an explanatory note, not fabricated estimates.
- YAML style: 2-space indentation. Quote strings containing `: `.
- The report must include a non-empty startup introduction. `10-report-document.yaml` should provide `startupIntroduction.summary`; the website may also merge snapshot-level introduction data.
- Valid enums — recommendation: `strong-buy | buy | track | research-more | avoid`; confidence: `high | medium | low`; riskRating: `low | moderate | significant | critical | unknown`; valuationStance: `attractive | fair | stretched | expensive | unknown`.

## Evidence integrity

- `01-evidence-ledger.yaml` is the evidence backbone. All downstream factual claims must trace through `claimRefs` → claims → `sourceRefs` → fetched sources.
- Sources should include `accessDate`, `fetchVerified: true`, and concise `keyQuote` values when available.
- Downstream agents must not introduce unsupported factual claims. If evidence is absent, state the limitation and use `null` plus explanation for the affected metric.
- `website/scripts/check-reports.mjs` enforces artifact presence, schema version, cross-file references, source/claim integrity, startup introduction presence, and figure renderability.

## Figure and table conventions

- Figures are structured YAML specs with `id`, `title`, `type`, `layout`, `summary`, and `data`; they are rendered by website components, not generated as static image assets.
- Use canonical figure field shapes from `.github/agents/startup-diligence.schema.md`. The Report Writer must normalize non-canonical upstream shapes before writing `10-report-document.yaml`.
- Valid figure types are `timeline`, `flow`, `decision-map`, `evidence-map`, `quadrant`, `competitive-matrix`, `metric-bars`, `bars`, `waterfall`, `risk-heatmap`, `matrix`, `architecture-stack`, `market-sizing-lens`, `unit-economics-waterfall`, `customer-surface-map`, `recommendation-logic`, `risk-transmission-map`, `stack`, `sensitivity`, `xy`, and `other`.
- Do not use non-canonical primary renderer fields such as `steps`, `cards`, `children`, `components`, or `name` when a contract requires `events`, `items`, `layers`, `modules`, or `label`.
- `architecture-stack` must use `data.layers[]` with renderable `label`, `detail`, and/or `modules`; empty product-stack layers are invalid.
- Tables must be structured YAML table specs with stable IDs and explicit columns/rows. The source table shown by the website does not need a Citation column.

## Website conventions

- Astro 5, static output, TypeScript strict mode.
- Visual design should stay flat, modern, and consistent across prose, tables, diagrams, maps, and charts.
- Chart-like figures should use ECharts with the CanvasRenderer. Semantic diagrams should use native DOM/CSS components. Do not introduce Mermaid-style diagram source for report figures.
- Claim references are hidden by default in the report UI and shown through a toggle.
- i18n supports English and Simplified Chinese (`Lang = 'en' | 'zh'`). Localized YAML files use `.zh.yaml` suffixes.
- The content collection uses `reportsLoader` to read directly from `../reports/`, not Astro's default content directory.

## CI/CD

- **deploy-website.yml**: Triggers on push to `main` when `website/` or `reports/` change. It builds the Astro site and deploys to GitHub Pages.
- **research-startup.yml**: Manual workflow dispatch. Inputs are optional `companyName`, optional `companyUrl`, `depth` defaulting to `deep`, and `includeZh` defaulting to `true`.
- `research-startup.yml` runs `Startup Research` directly for single-company mode, but uses the default Copilot agent for recent-unicorns mode so it can fan out concurrent company-specific `Startup Research` runs.
- The workflow rebuilds `reports/_index.yaml`, runs `npm run validate`, rejects partial report folders, then commits `reports/` only when there are changes.
