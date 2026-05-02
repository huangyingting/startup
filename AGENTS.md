# AGENTS.md

This file gives coding agents the minimum context needed to work in this repository. It follows the open `AGENTS.md` convention: plain Markdown, concise project notes, and actionable commands.

## Project overview

- This repo generates startup diligence reports as structured YAML and renders them with an Astro static website.
- Reports live in `reports/<YYYYMMDDHHmmss>-<company-slug>/` and are indexed by `reports/_index.yaml`.
- The report schema is `startup-diligence-report-v2`; see `.github/schemas/startup-diligence-report-v2.md` for exact contracts.

## Important paths

- `.github/agents/research.agent.md` — the single `Startup Research` agent.
- `.github/skills/` — stage skills used by that agent.
- `.github/references/` — shared YAML and evidence-ledger rules.
- `scripts/` — report folder, index, duplicate, and content checks.
- `website/` — Astro site and rendering-contract validation.

## Setup and validation

- Install root dependencies with `npm install`.
- Install website dependencies with `npm --prefix website install`.
- Run full validation from the repo root with `npm run validate`.
- After report, schema, loader, renderer, workflow, or script changes, run `npm run validate` before finishing.

## Report generation rules

- Use one `Startup Research` run per company. Internal report stages are skills, not separate agents.
- Skill order: `startup-brief → startup-company-snapshot → startup-market → startup-competition → startup-financials → startup-product-technology → startup-customer-retention → startup-risk-regulatory → startup-investment-valuation → startup-report-writer → startup-report-zh`.
- Reports must be complete YAML artifact sets: `00-report-brief.yaml` through `11-report-card.yaml`, plus `10-report-document.zh.yaml` and `11-report-card.zh.yaml`.
- Do not keep failed, duplicate, or partial report folders under `reports/`.

## Evidence and YAML conventions

- Keep reports YAML-first; do not add prose-only report deliverables.
- Every external factual claim should trace through `claimRefs` to `01-evidence-ledger.yaml` claims and retained source URLs from `web_search` citations/annotations.
- Use `null` with an explanation for unsupported private metrics; do not invent values.
- Numeric KPI and chart values must be numbers, not strings.
- Figures must use structured YAML specs rendered by the website; follow the schema instead of title-based heuristics.

## Website notes

- Work inside `website/` for frontend changes.
- Astro uses static output and TypeScript strict mode.
- Report content is loaded from `../reports/` via `website/src/content/reports-loader.ts`.
- English and Simplified Chinese report artifacts are both required for complete reports.
