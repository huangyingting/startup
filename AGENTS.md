# AGENTS.md

## Working approach

- Keep the system YAML-first: generated reports are structured YAML artifacts rendered by the website, not prose-only deliverables.
- Keep reports evidence-first: every external factual claim should trace through `claimRefs` to claims in `01-evidence-ledger.yaml`, and each claim should trace to fetched `sourceRefs`.
- Make surgical changes. Do not preserve obsolete schema paths or reintroduce legacy compatibility unless explicitly requested.
- Validate after every report-generation, schema, loader, renderer, or workflow change with `npm run validate` from the repo root when dependencies are installed.
- Prefer simple static artifacts over databases until the project clearly needs mutable app state.
- Failed, duplicate, or incomplete partial report folders should be removed from `reports/` before final validation/commit.

## Repository map

- `.github/agents/` contains custom agent definitions plus the canonical schema and YAML syntax references.
- `.github/workflows/research-startup.yml` is the manual report-generation workflow.
- `reports/` contains generated startup research artifacts. Each report lives in `<YYYYMMDDHHmmss>-<company-slug>/`.
- `reports/_index.yaml` is the aggregated report catalog, rebuilt by `scripts/build-reports-index.mjs`.
- `scripts/` holds repo-level Node scripts for report folder creation, duplicate checks, catalog generation, and content-quality / translation-parity validation.
- `website/` contains the Astro site that validates and renders reports.
- `scripts/check-reports-content.mjs` validates evidence coverage, source diversity, and EN↔ZH parity.
- `website/scripts/check-reports.mjs` validates the rendering contract (schema heads, figure types, enums, refs) before `astro build`.

## Report workflow

- Use the `Startup Research` agent for a full named-company report. The default `depth` is `deep`; use `standard` only when explicitly requested.
- If no company name and no company URL are supplied, run automatic recent-unicorn discovery: select at least 5 recent private unicorn startups, avoid duplicates from `reports/_index.yaml` unless materially justified, then launch independent `Startup Research` runs for each company.
- In recent-unicorns mode, the default Copilot agent is the top-level orchestrator and should not be invoked with `--agent "Startup Research"`. It should fan out to `Startup Research` subagents, one per selected company.
- Do not use a `focus` input. The report scope is governed by the schema and `depth`.
- The specialist pipeline is: `Startup Report Evidence Analyst → Startup Market and Competition Analyst → Startup Financial and Product Analyst → Startup Risk and Valuation Analyst → Startup Report Writer → Startup Report Translator ZH`.
- Only `Startup Report Evidence Analyst` should use web research tools. Downstream agents must work from `01-evidence-ledger.yaml` and cite `claimRefs`.
- Downstream stages must not run until upstream YAML exists, parses, and all `claimRefs` / `sourceRefs` are valid.
- Agents must write complete YAML artifacts directly under `reports/<run>/`; do not use temporary files as canonical report output.
- A complete report folder contains `00-report-brief.yaml` through `11-report-card.yaml` plus the required `10-report-document.zh.yaml` and `11-report-card.zh.yaml`. The website index includes complete reports only.

## YAML schema conventions

- Canonical schema version: `startup-diligence-report-v2`.
- Required artifacts are `00-report-brief.yaml`, `01-evidence-ledger.yaml`, `02-company-snapshot.yaml`, `03-market-macro.yaml`, `04-competitive-benchmarking.yaml`, `05-financial-unit-economics.yaml`, `06-product-technology.yaml`, `07-customer-retention.yaml`, `08-risk-regulatory.yaml`, `09-investment-valuation.yaml`, `10-report-document.yaml`, and `11-report-card.yaml`.
- Required Simplified Chinese localized artifacts are `10-report-document.zh.yaml` and `11-report-card.zh.yaml`.
- Every artifact must include `schemaVersion`, `artifact`, `slug`, `runDate`, and `company.name`.
- `01-evidence-ledger.yaml` is the evidence backbone. Later artifacts cite `claimRefs`; claims cite fetched `sourceRefs`. Sources should include `accessDate`, `fetchVerified: true`, and concise `keyQuote` when available.
- Evidence source targets count retained `sources[]` entries (deep ≥100, standard ≥40). Many claims from a small source set do not satisfy the target.
- Evidence must be broad (multiple source buckets), fresh (last 24 months for current facts), and deduplicated by underlying event. Vary search angles instead of repeating one domain or query family. Detailed rules live in `.github/agents/evidence.agent.md`.
- Source IDs use `S001`, `S002`, etc. Claim IDs use `C001`, `C002`, etc. Figure IDs use `F001`, `F002`, etc. Table IDs use `T001`, `T002`, etc.
- Use descriptive camelCase field names.
- Include units in numeric field names where useful, such as `revenueRunRateUsdM`, `arrUsdM`, `grossMarginPct`, `nrrPct`, `burnMultiple`, `cacPaybackMonths`, and `valuationUsdM`.
- Numeric KPI and chart values must be numbers, not strings. Unsupported metrics should be `null` with an explanation rather than guessed.
- Use 2-space indentation. Quote strings containing `: `.
- `10-report-document.yaml` must include a non-empty `startupIntroduction.summary` so the website introduction never renders blank.
- Valid enums include recommendation `strong-buy | buy | track | research-more | avoid`, confidence `high | medium | low`, riskRating `low | moderate | significant | critical | unknown`, and valuationStance `attractive | fair | stretched | expensive | unknown`.

## Figure, chart, and table rules

- Figures/charts should be stored as structured YAML specs (`id`, `title`, `type`, `layout`, `summary`, `data`) and rendered by native website components from `10-report-document.yaml`.
- Valid figure types are `timeline`, `flow`, `decision-map`, `evidence-map`, `quadrant`, `competitive-matrix`, `metric-bars`, `bars`, `waterfall`, `risk-heatmap`, `matrix`, `architecture-stack`, `market-sizing-lens`, `unit-economics-waterfall`, `customer-surface-map`, `recommendation-logic`, `risk-transmission-map`, `stack`, `sensitivity`, `xy`, and `other`.
- Follow the exact field contracts in `.github/agents/startup-diligence.schema.md`; rendering is based on `figure.type` and canonical `data` fields, not title heuristics.
- Avoid non-canonical primary renderer fields such as `steps`, `cards`, `children`, `components`, or `name` when the schema requires `items`, `nodes`, `edges`, `points`, `rows`, `columns`, `series`, `layers`, `modules`, or `label`.
- `architecture-stack` figures must provide `data.layers[]` with renderable `label`, `detail`, and/or `modules`; empty layers create blank product-stack figures and are invalid.
- Table specs should use explicit columns and rows with stable table IDs. Source tables in the website do not need a Citation column.

## Website workflow

- Work inside `website/` for frontend changes.
- Astro 5 uses static output and TypeScript strict mode.
- Content is loaded from `../reports/` by `website/src/content/reports-loader.ts`, not Astro's default content directory.
- The report UI should remain flat, modern, and visually consistent across prose, cover metrics, tables, diagrams, maps, and charts.
- Chart-like figures use ECharts with canvas rendering; semantic diagrams use native DOM/CSS components.
- Claim references are hidden by default and revealed through a toggle.
- i18n requires English and Simplified Chinese (`Lang = 'en' | 'zh'`); both `.yaml` and `.zh.yaml` artifacts ship for every report.
- After changing schemas, loader logic, rendering components, workflow logic, or report files, validate with `npm run validate` from the repo root.

## CI workflow notes

- `research-startup.yml` uses Node 22, installs `@github/copilot`, runs generation, rebuilds `reports/_index.yaml`, validates, rejects partial report folders, then commits `reports/` when changed.
- Required secrets are `COPILOT_PAT` for the Copilot CLI and `STARTUP_PAT` for checkout/push.
- Single-company mode invokes `copilot --agent "Startup Research"`.
- Recent-unicorns mode invokes the default Copilot agent without `--agent`, then the default agent launches company-specific `Startup Research` subagents.
