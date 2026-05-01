# AGENTS.md

## Working approach
- Keep reports evidence-first: every external factual claim should trace through `claimRefs` to fetched sources in `01-evidence-ledger.yaml`.
- Make surgical changes: preserve schemas and avoid unrelated redesigns.
- Validate YAML after every report-generation run.
- Prefer simple static artifacts over databases until the project clearly needs mutable app state.

## Repository map
- `reports/` contains generated startup research artifacts. Each report lives in a dated folder named `<YYYYMMDDHHmmss>-<company-slug>/`.
- `reports/_index.yaml` is the aggregated report catalog, rebuilt by `scripts/build-reports-index.mjs`.
- `website/` contains the Astro site that renders reports.
- `.github/agents/` contains the multi-agent workflow definitions.
- `scripts/` holds repo-level Node scripts for report folder creation, dedupe checks, and catalog generation.

## Report workflow
- Use the `Startup Research` agent for a full named-company report.
- The pipeline is: `Startup Report Evidence Analyst → Startup Market and Competition Analyst → Startup Financial and Product Analyst → Startup Risk and Valuation Analyst → Startup Report Writer → Startup Report Translator ZH`.
- The current generation schema is `startup-diligence-report-v2`, a report schema with evidence ledger, startup introduction, chapter documents, table/figure specs, Mermaid diagrams, and report-card metadata rendered by the website.
- Only `Startup Report Evidence Analyst` should use web research tools. Downstream agents must work from `01-evidence-ledger.yaml` and cite `claimRefs`.
- Downstream stages must not run until upstream YAML exists, parses, and all `claimRefs` / `sourceRefs` are valid.
- Failed or duplicate partial report folders should not remain directly under `reports/`.

## Website workflow
- Work inside `website/` for frontend changes.
- After changing schemas, loader logic, or report files, validate with `npm run validate` from the repo root when dependencies are installed.

## YAML schema conventions
- New generated artifacts are: `00-report-brief.yaml`, `01-evidence-ledger.yaml`, `02-company-snapshot.yaml`, `03-market-macro.yaml`, `04-competitive-benchmarking.yaml`, `05-financial-unit-economics.yaml`, `06-product-technology.yaml`, `07-customer-retention.yaml`, `08-risk-regulatory.yaml`, `09-investment-valuation.yaml`, `10-report-document.yaml`, and `11-report-card.yaml`.
- `01-evidence-ledger.yaml` is the evidence backbone. Later artifacts cite `claimRefs`; claims cite fetched `sourceRefs`. Sources may include `accessDate` and a verbatim `keyQuote` (≤ 240 chars).
- Source IDs use `S001`, `S002`, etc. Claim IDs use `C001`, `C002`, etc. Figure IDs use `F001`, `F002`, etc. Table IDs use `T001`, `T002`, etc.
- Use descriptive camelCase field names.
- Include units in numeric field names where useful, such as `revenueRunRateUsdM`, `arrUsdM`, `grossMarginPct`, `nrrPct`, `burnMultiple`, `cacPaybackMonths`, `valuationUsdM`. Numeric KPI fields must be numbers, not strings.
- Use 2-space indentation. Quote strings containing `: `.
- Mermaid diagrams/charts should be stored in YAML literal blocks and rendered by the website from `10-report-document.yaml`.
