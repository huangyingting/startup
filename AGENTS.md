# AGENTS.md

## Working approach
- Keep reports evidence-first: every external factual claim should trace to a fetched source in `research.yaml`.
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
- The pipeline is: `Startup Identity Investigator → Startup Evidence Researcher → Startup Product Strategist → Startup Business Analyst → Startup Memo Writer → ZH Research Translator`.
- The current research schema is `startup-diligence-v2`, a claims-based professional diligence schema.
- Downstream stages must not run until upstream YAML exists, parses, and all `claimRefs` / `sourceRefs` are valid.
- Failed or duplicate partial report folders should not remain directly under `reports/`.

## Website workflow
- Work inside `website/` for frontend changes.
- After changing schemas, loader logic, or report files, validate with `npm run validate` from the repo root when dependencies are installed.

## YAML schema conventions
- All generated artifacts are YAML files: `00-research-plan.yaml`, `01-company-identity.yaml`, `02-source-ledger.yaml`, `03-market-customers.yaml`, `04-product-technology.yaml`, `05-traction-gtm.yaml`, `06-competition-positioning.yaml`, `07-business-financials.yaml`, `08-risk-governance.yaml`, `09-investment-memo.yaml`, `10-summary-card.yaml`, plus optional matching `*.zh.yaml` translations.
- `02-source-ledger.yaml` is the evidence backbone. Later artifacts cite `claimRefs`; claims cite fetched `sourceRefs`.
- Source IDs use `S001`, `S002`, etc. Claim IDs use `C001`, `C002`, etc.
- Use descriptive camelCase field names.
- Include units in numeric field names where useful, such as `revenueK`, `fundingRaisedM`, `marginPct`, or `runwayMonths`.
- Use 2-space indentation. Quote strings containing `: `.
