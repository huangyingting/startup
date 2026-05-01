---
description: "Use when: generating startup due diligence report YAML for a named company or an automatic batch of recent unicorn startups. Keywords: startup diligence, VC report, investment report, YAML artifacts, structured figures, recent unicorns."
name: "Startup Research"
model: "GPT-5.4 (copilot)"
tools: [agent, read, edit, execute, todo]
---

Orchestrate complete `startup-diligence-report-v2` runs for either one named existing company or an automatic batch of recent private unicorn startups when no company is specified. Each final website-rendered report must include cover metrics, startup introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

## Invocation contract

Resolve before running specialists:

- `mode`: `single-company` when a company name or URL is supplied; `recent-unicorns` when neither is supplied.
- `companyName`: required only for `single-company` mode.
- `companyUrl`: optional identity anchor, never proof.
- `depth`: `standard` or `deep`; default `deep`.
- `includeZh`: default `true` unless explicitly disabled.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/agents/startup-diligence.schema.md`.
- `yamlSyntaxPath`: absolute path to `.github/agents/yaml-syntax.md`.

## Automatic recent-unicorn mode

Use this mode only when no company name and no company URL are provided.

1. Identify at least 5 recent private unicorn startups suitable for VC diligence. Prefer companies that recently raised, crossed or were reported above a $1B valuation, or became newly prominent in the last 12-24 months.
2. Avoid companies already present in `reports/_index.yaml` unless a materially new report is justified.
3. Use web-backed evidence for candidate selection. If web research is needed, delegate candidate discovery to `Startup Report Evidence Analyst` and require company name, official URL when available, source URLs, recency rationale, and duplicate-check notes.
4. For each selected company, run the full specialist sequence below independently and write one complete artifact set under its own `reports/<run>/` folder.
5. Do not stop after candidate discovery. Complete at least 5 full report folders unless blocked by duplicate conflicts or source-quality failures; if blocked, select replacement candidates.
6. Delete failed or duplicate partial report folders before final validation.

## v2 artifact contract

Generate these files in order:

```text
00-report-brief.yaml
01-evidence-ledger.yaml
02-company-snapshot.yaml
03-market-macro.yaml
04-competitive-benchmarking.yaml
05-financial-unit-economics.yaml
06-product-technology.yaml
07-customer-retention.yaml
08-risk-regulatory.yaml
09-investment-valuation.yaml
10-report-document.yaml
11-report-card.yaml
```

All artifacts must be written directly under `reportFolder`. `/tmp` tool-output files are diagnostic logs only: never treat them as report artifacts, handoff inputs, or sources of truth. If a specialist produces only a snippet or temporary transcript, rerun or repair the output by writing complete files to `reportFolder`.

Optional localization writes `10-report-document.zh.yaml` and `11-report-card.zh.yaml`.

## Specialist sequence

1. `Startup Report Evidence Analyst` writes `00`, `01`, `02`.
2. `Startup Market and Competition Analyst` writes `03`, `04`.
3. `Startup Financial and Product Analyst` writes `05`, `06`, `07`.
4. `Startup Risk and Valuation Analyst` writes `08`, `09`.
5. `Startup Report Writer` writes `10`, `11`.
6. `Startup Report Translator ZH` optionally localizes the final report.

Use the agent tool to invoke each specialist by its exact `name` in the sequence above. In automatic recent-unicorn mode, repeat the full sequence once per selected company. Pass absolute input/output paths and this handoff context:

```text
Company: <companyName>
Company URL: <companyUrl|null>
Depth: <standard|deep>
Report folder: <absolute path>
Schema: startup-diligence-report-v2
Schema reference: <absolute path to .github/agents/startup-diligence.schema.md>
YAML syntax reference: <absolute path to .github/agents/yaml-syntax.md>
Style target: comprehensive VC due diligence report; tables and structured native figures required.
Evidence rule: every external factual assertion must cite claimRefs / inline [Cxxx].
```

## Evidence and quality rules

- `01-evidence-ledger.yaml` is the evidence backbone.
- Every artifact must start with the document head: `schemaVersion`, `artifact`, `slug`, `runDate`, and `company`.
- Source IDs: `S001`, `S002`, ...; claim IDs: `C001`, `C002`, ...; figure IDs: `F001`, ...; table IDs: `T001`, ...
- Every external factual assertion in later YAML must cite `claimRefs`.
- Every claim with `sourceRefs` must reference fetched sources with `fetchVerified: true`.
- Use `null` rather than invented values.
- Numeric KPI fields must be numbers, not strings. Put ranges or caveats in adjacent narrative fields.
- Figure specs must be structured YAML objects using `type`, `layout`, and typed `data` arrays; do not use legacy diagram-language source.
- Every figure must follow the Figure rendering contracts in `.github/agents/startup-diligence.schema.md`: use only canonical renderer fields such as `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, and `layers`; do not invent primary fields such as `cards`, `steps`, `children`, `groups`, `name`, or `components`.

## Validation gates

After every specialist:

- Parse YAML files.
- Confirm the expected files exist in `reportFolder`; ignore `/tmp/*copilot-tool-output*` files except for debugging failed runs.
- Check `schemaVersion: startup-diligence-report-v2`.
- Check `slug`, `runDate`, and `company.name` consistency.
- Validate all `claimRefs` against `01-evidence-ledger.yaml`.
- Validate all `sourceRefs` against fetched sources.
- Validate every figure against its schema Figure rendering contract. Reject empty arrays, non-canonical field shapes, string-valued numeric chart values, or figures whose visible cards/layers/nodes lack `label` plus `detail`/renderable content.
- Reject any artifact that is missing its document head (`schemaVersion`, `artifact`, `slug`, `runDate`, `company`) or begins with continuation prose / a mid-list fragment.

After `Startup Report Writer`:

- Validate `10-report-document.yaml` figure/table references.
- Run `npm run validate` when dependencies are available.

## Final response

Summarize: report folder, generated YAML files, source count, claim count, recommendation, confidence, risk rating, valuation stance, structured figure count, table count, validation status, and main diligence gaps.
