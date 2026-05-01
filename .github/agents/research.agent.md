---
description: "Use when: generating startup due diligence report YAML for one named company. Keywords: startup diligence, VC report, investment report, YAML artifacts, structured figures."
name: "Startup Research"
model: "GPT-5.4 (copilot)"
tools: [agent, read, edit, execute, todo]
---

Orchestrate one complete `startup-diligence-report-v2` run for a named existing company. The final website-rendered report must include cover metrics, startup introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

For automatic recent-unicorn batches, the default top-level agent selects candidates and invokes this agent once per selected company. Do not use this agent as a recursive batch orchestrator.

## Invocation contract

Resolve before running specialists:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof.
- `depth`: `standard` or `deep`; default `deep`.
- `includeZh`: default `true` unless explicitly disabled.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `reportFolder`: create with `node scripts/prepare-report-folder.mjs <runTimestamp> <companyName>` and capture the printed absolute path.
- `schemaPath`: absolute path to `.github/agents/startup-diligence.schema.md`.
- `yamlSyntaxPath`: absolute path to `.github/agents/yaml-syntax.md`.

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

Use the agent tool to invoke each specialist by its exact `name` in the sequence above. Pass absolute input/output paths and this handoff context:

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
Evidence search rule: require diverse, recent, non-duplicative evidence. The Evidence Analyst must vary queries across source categories, avoid overusing one site/domain, filter stale sources for current facts, and dedupe repeated reports of the same underlying event.
```

## Evidence and quality rules

- `01-evidence-ledger.yaml` is the evidence backbone; the Evidence Analyst owns source/claim quality (see `evidence.agent.md`).
- Evidence source targets count retained `sources[]` entries: deep ≥100, standard ≥40. A ledger with many claims but few retained sources fails the gate.
- Every artifact starts with the document head (`schemaVersion`, `artifact`, `slug`, `runDate`, `company`). IDs use `S001`/`C001`/`F001`/`T001`.
- Every external assertion in later YAML cites `claimRefs`. Every claim with `sourceRefs` references fetched sources with `fetchVerified: true`.
- Numeric KPI fields are numbers or `null` (with explanation). Never invent values.
- Figures use structured `data` per the Figure rendering contracts in `.github/agents/startup-diligence.schema.md`. No diagram-language strings; no non-canonical primary fields (`cards`, `steps`, `children`, `groups`, `components`, `name`).

## Validation gates

After every specialist:

- Parse YAML files.
- Confirm the expected files exist in `reportFolder`; ignore `/tmp/*copilot-tool-output*` files except for debugging failed runs.
- Check `schemaVersion: startup-diligence-report-v2`.
- Check `slug`, `runDate`, and `company.name` consistency.
- After `Startup Report Evidence Analyst`, check that `coverage.sourceTarget`, `coverage.sourcesFetched`, `coverage.sourcesRetained`, `sources.length`, and `claims.length` are internally consistent. Reject deep ledgers with fewer than 100 retained sources and standard ledgers with fewer than 40 retained sources unless the run is explicitly marked incomplete and rerun/repaired before downstream specialists begin.
- After `02-company-snapshot.yaml`, run `node scripts/check-company-dedup.mjs <reportFolder>/02-company-snapshot.yaml`; stop on duplicate-risk unless the user explicitly requested a refresh.
- Validate all `claimRefs` against `01-evidence-ledger.yaml`.
- Validate all `sourceRefs` against fetched sources.
- Validate every figure against its schema Figure rendering contract. Reject empty arrays, non-canonical field shapes, string-valued numeric chart values, or figures whose visible cards/layers/nodes lack `label` plus `detail`/renderable content.
- Reject any artifact that is missing its document head (`schemaVersion`, `artifact`, `slug`, `runDate`, `company`) or begins with continuation prose / a mid-list fragment.

After `Startup Report Writer`:

- Validate `10-report-document.yaml` figure/table references.
- Run `npm run validate` when dependencies are available.

## Final response

Summarize: report folder, generated YAML files, source count, claim count, recommendation, confidence, risk rating, valuation stance, structured figure count, table count, validation status, and main diligence gaps.
