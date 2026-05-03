---
name: startup-research
description: "Use when: producing a startup research report, company diligence report, investment diligence report, or full report-v2 workflow for a named company."
user-invocable: true
---

# Startup Research

Single entry point for generating a complete `report-v2` startup diligence report.

Keep the workflow simple: load the ordered chapter config, generate each chapter, run its gate, iterate only failed parts, then build the final artifacts.

## Inputs

- `companyName` — required.
- `companyUrl` — optional identity anchor.
- `runTimestamp` — UTC `YYYYMMDDHHmmss`.
- `currentDate` — actual session date; use it for freshness and `runDate`.
- User requirements — route to the relevant chapter; do not create new repo templates from one request.

## Required setup

1. Read `./references/report-schema-v2.md` and `./references/yaml-rules.md`.
2. Load chapter order:
   `node .github/skills/startup-research/scripts/chapter.mjs --list --format json`
3. Create the report folder:
   `node .github/skills/startup-research/scripts/new.mjs <runTimestamp> <companyName> [--website <companyUrl>]`

If folder creation exits `2`, stop unless this is an intentional refresh; then rerun with `--allow-duplicate`.

## Chapter loop

For each chapter `order` from the loader:

1. Load the chapter packet:
   `node .github/skills/startup-research/scripts/chapter.mjs --order <n> --format json --include-workflow`
2. Use only `packet.chapter` as the chapter brief: `file`, `artifact`, `title`, `mission`, `optionalContext`, `contentRequirements`, `requiredTables`, `requiredFigures`, `preferredFigureTypes`, `evidenceStrategy`, `qualityBar`, and `gate`.
3. Generate targeted search questions from the packet's content and output requirements. Use `currentDate` in searches for volatile facts so results can reflect the latest funding, valuation, customers, pricing, legal, regulatory, outage, or product status.
4. Use `web_search` or available search tools to discover relevant facts and URLs, then review retained direct URLs with `fetch-url`:
   `node .github/skills/fetch-url/scripts/fetch.mjs <url> --text-only`
5. Convert reviewed evidence into `localEvidence.sources[]`, `localEvidence.claims[]`, and `localEvidence.evidenceGaps[]`.
6. Generate the chapter YAML at `reportFolder/<chapter.file>` according to the packet's output requirements and the report schema.
7. Run the packet gate:
   `node .github/skills/startup-research/scripts/gate.mjs <reportFolder> <chapter.file> --pre-ledger`
8. If the gate exits nonzero, start the chapter loop again for the failed dimensions: generate narrower queries, search/fetch more evidence, update the YAML, and rerun the gate. Retry up to `packet.workflow.researchLoop.maxGateIterations`; advance only when the gate exits `0`. Warnings are acceptable when evidence gaps clearly explain public-data limits.
9. Advance with `packet.nextChapter`; if it is `null`, move to finalization.

## Research and evidence rules

- Chapter-specific requirements come from the script-loaded chapter packet.
- Review direct URLs before retaining them as evidence; do not cite generic search-result pages.
- Prefer primary/official sources plus independent, customer, regulatory, or adverse sources when available.
- Put reviewed sources, atomic claims, and evidence gaps in the chapter's `localEvidence`.
- Cite material sections, tables, figures, and callouts with local `claimRefs`.
- Local `S###` and `C###` IDs are scoped to one artifact.
- Claims must be atomic; do not bundle several facts into one claim.
- Every factual claim needs `sourceRefs`, except `claimType: open-question` with `corroboration: none`.
- Use honest labels for `claimType`, `confidence`, `freshness`, and `corroboration`.
- Missing, stale, contradictory, private, or unsupported important facts become `evidenceGaps[]`.
- Use `currentDate` from the report run as the freshness anchor and preserve source date precision.
- Re-check volatile facts such as funding, valuation, headcount, customers, pricing, legal issues, outages, and regulatory status.
- Tables should contain evidence-backed values or explicit gaps.
- Figures must be structured YAML objects using schema-supported fields only; do not use Mermaid, SVG, prose diagrams, JSON strings, or fabricated chart data.

## Finalization

After all analysis chapters pass:

1. Build evidence:
   `node .github/skills/startup-research/scripts/ledger.mjs <reportFolder>`
2. Write `91-full-report.yaml` from the analysis artifacts and `90-evidence.yaml`.
3. Write `92-summary-card.yaml` from `91-full-report.yaml` and `90-evidence.yaml`.
4. Rebuild index:
   `node .github/skills/startup-research/scripts/index.mjs --strict`
5. Validate:
   `npm run validate`

## Hard rules

- Do not hand-write `90-evidence.yaml`; use the script.
- Do not edit another chapter's artifact while working on the current chapter.
- Do not invent facts, metrics, customers, funding, valuation, or dates.
- Use structured YAML figures only; no Mermaid/SVG/prose diagrams.
- Keep temporary files and research notes out of `reports/`.
- Final response: report folder, generated files, source/claim counts, recommendation, confidence, risks, valuation stance, table/figure counts, validation result, and main gaps.
