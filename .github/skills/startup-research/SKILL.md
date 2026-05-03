---
name: startup-research
description: "Use when: producing a startup research report, company research report, startup diligence report, investment diligence report, or full end-to-end research on a named company. Trigger phrases include: research X company, research company X, analyze X startup, generate a report for X, startup research, company diligence, investment research, due diligence, full diligence workflow, report-v2."
user-invocable: true
---

# Startup Research

This is the single startup diligence workflow skill. It generates a complete `report-v2` run by reading the chapter definitions in `./references/chapters.yaml`, applying the shared writing and evidence rules in `./references/analysis-rules.md`, iterating each chapter until its configured gate passes, then assembling the evidence ledger, full report, summary card, index, and website validation.

Do not delegate to per-chapter startup skills. Chapter missions, required content, tables, figures, evidence acquisition strategies, domain-adaptive additions, and gates live in `./references/chapters.yaml`.

The final rendered report must include cover metrics, company introduction, executive recommendation, market sizing, competitive benchmarking, financial and unit economics, product and technology, customer retention, regulatory risk, valuation, appendices, bibliography, disclaimer, and structured native figures/charts.

## Invocation contract

Resolve these run inputs before setup:

- `companyName`: required.
- `companyUrl`: optional identity anchor, never proof by itself.
- `runTimestamp`: UTC `YYYYMMDDHHmmss`.
- `currentDate`: actual session date in `YYYY-MM-DD`, taken from runtime/session context at the start of the report run. If no reliable date is provided, run `date -u +%F` once. Do not infer `currentDate` from model knowledge, old report folders, source publication dates, or company timelines.
- Prompt-derived requirements: infer audience, investment lens, required topics, metrics, competitors/comparables, figures, source constraints, or diligence questions. Route each requirement to the matching configured chapter; one-off prompt requirements are run-local, not repo-level templates.

Before writing artifacts:

1. Read `./references/chapters.yaml`.
2. Read `./references/report-schema-v2.md` and `./references/yaml-rules.md`.
3. Read `./references/analysis-rules.md` for all `01`–`08` analysis stages.
4. Create the report folder with `node .github/skills/startup-research/scripts/create-report-run.mjs <runTimestamp> <companyName> [--website <companyUrl>]` and use the printed absolute path as `reportFolder`. Exit `2` means duplicate risk; stop unless the user explicitly requested a refresh/update, then rerun with `--allow-duplicate`.

## Config-driven artifact set

The required artifact set and analysis order are defined by `./references/chapters.yaml`:

- `chapters[]` defines analysis artifacts `01`–`08`, artifact enums, chapter numbers, report chapter numbers, loader keys, content requirements, and gates.
- `analysisDefaults.gate` defines shared evidence/depth floors inherited by every chapter unless overridden.
- `finalArtifacts` defines `90-evidence.yaml`, `91-full-report.yaml`, and `92-summary-card.yaml`.

Current complete report folders contain:

```text
01-company-overview.yaml
02-market-analysis.yaml
03-competitors.yaml
04-financials.yaml
05-product-tech.yaml
06-customers.yaml
07-risks.yaml
08-valuation.yaml
90-evidence.yaml
91-full-report.yaml
92-summary-card.yaml
```

Rules:

- Write all artifacts directly under `reportFolder`.
- Never hand-write `90-evidence.yaml`; generate it with `node .github/skills/startup-research/scripts/build-evidence-ledger.mjs <reportFolder>`.
- Temporary files, terminal transcripts, research packs, and `/tmp` outputs are diagnostics only, not final artifacts or evidence sources.
- If a tool produces a snippet or partial transcript, rewrite it as a complete YAML artifact under `reportFolder` before continuing.

## Chapter execution loop

For every configured `chapters[]` entry, execute this loop. Chapters may run in parallel only when each worker writes a distinct configured output file and cannot race on shared YAML files.

1. **Load chapter config**: identify `file`, `artifact`, `chapterNumber`, `title`, `mission`, `contentRequirements`, `requiredTables`, `requiredFigures`, `preferredFigureTypes`, `evidenceStrategy`, `domainAdaptiveAdditions`, `qualityBar`, and `gate`.
2. **Resolve chapter requirements**: combine config requirements with prompt-derived requirements routed to this chapter and optional peer-artifact context that already exists. Never block on optional peer artifacts during parallel analysis.
3. **Run domain reflection**: infer archetype(s), value-chain position, buyer/user/payer/regulator distinctions, revenue mechanism, operating dependencies, adoption motion, and failure modes. Select domain-adaptive additions that should become visible sections, tables, figures, or gaps.
4. **Generate a research-question backlog**: create at least `gate.minResearchQuestions` targeted, complete diligence questions tied to every material section, table, figure, source family, domain-adaptive addition, and evidence gap.
5. **Search/discover**: use available search/discovery tools to answer targeted questions, refine terms, identify cited URLs, test confirming/disconfirming/adverse hypotheses, and optimize follow-up queries using `currentDate`, latest/current-year phrasing, and bounded date windows for volatile facts.
6. **Fetch retained URLs**: for every retained direct URL, follow the `fetch-url` workflow and use `node .github/skills/fetch-url/scripts/fetch-url.mjs ...`. Native page-fetching tools may be used only when higher-priority runtime instructions require them; still apply repository source-provenance rules before retaining any source.
7. **Create local evidence first**: register reviewed sources in `localEvidence.sources[]`; convert evidence into atomic, reusable `localEvidence.claims[]`; unsupported facts become `localEvidence.evidenceGaps[]` with exact diligence paths. Draft from claims, not the other way around.
8. **Draft the YAML artifact**: produce schema-native sections, tables, callouts, and structured figures. Cite material facts with local `claimRefs`, use `null` plus explanation for unavailable private metrics, and keep table/figure analysis non-duplicative.
9. **Freshness sweep**: before saving, re-query decision-critical volatile facts with latest/current-year/currentDate phrasing; update claims or record freshness gaps.
10. **Self-audit and save**: verify identity fields, YAML shape, configured content/table/figure expectations, local claim refs, domain-adaptive visibility, and gate readiness.
11. **Run the configured gate**: `node .github/skills/startup-research/scripts/check-chapter-readiness.mjs <reportFolder> <chapter-file.yaml> --pre-ledger`.
12. **Iterate if needed**: if the gate fails, retry only the failed dimensions. Keep successful evidence unless contradicted. Continue up to `analysisDefaults.researchLoop.maxGateIterations`, then either pass the gate or document public-evidence limits explicitly in `evidenceGaps[]` before moving on.

Warnings are acceptable only when the chapter explicitly documents why evidence is unavailable or why the flagged structure is intentional. Failures must be fixed before moving to finalization.

## Finalization loop

After every configured analysis chapter exists and has passed its pre-ledger readiness gate, finalization is serialized.

1. **Evidence consolidation**
   - Run `node .github/skills/startup-research/scripts/build-evidence-ledger.mjs <reportFolder>`.
   - The script reads config-defined analysis files, deduplicates local sources/claims, writes `90-evidence.yaml`, rewrites `claimRefs` and inline `[C###]` references in analysis artifacts, and removes `localEvidence` unless debugging with `--keep-local`.
   - Do not gather new facts during consolidation.

2. **Full report assembly**
   - Read `90-evidence.yaml` and all config-defined analysis artifacts.
   - Write `91-full-report.yaml`.
   - Preserve upstream tables and figures unless `reportMeta.coverageNotes` explicitly lists omissions and reasons.
   - Map configured analysis artifacts to report chapters using `reportChapterNumber` from `./references/chapters.yaml`.
   - Do not compress rich analysis into a short summary, do not add new facts, and do not smooth over thin upstream chapters. If a critical fact is missing or stale, return to the owning configured chapter, rebuild evidence, then reassemble.

3. **Summary card**
   - Read `91-full-report.yaml` and `90-evidence.yaml`.
   - Write `92-summary-card.yaml`.
   - `figureCount` and `tableCount` must exactly match `91.figures.length` and `91.tables.length`.
   - Preserve recommendation, confidence, risk rating, valuation stance, strengths, risks, and gaps from `91`.
   - Do not gather new facts or polish a thin report into a stronger card.

4. **Index and validation**
   - Rebuild the index with `node .github/skills/startup-research/scripts/build-report-index.mjs --strict`.
   - Run `npm run validate`.
   - Remove failed, duplicate, or incomplete partial report folders before finishing.

## Concurrency and locking

Default safe mode is parallel analysis with serialized finalization.

Allowed after duplicate check and identity resolution:

- Parallel writes to distinct configured analysis artifacts.
- Parallel source discovery, direct URL review, official-surface fetching, cached text snapshots, and chapter research notes.
- Parallel diagnostic research packs if each pack uses a unique path and no final artifact is modified.

Always serialized:

- Edits to `90-evidence.yaml`, `91-full-report.yaml`, `92-summary-card.yaml`, or `reports/_index.yaml`.
- Evidence consolidation while any analysis artifact is still being edited.
- Final report and summary card assembly.

For automated or multi-agent runs, lock the specific artifact being written. Distinct analysis-artifact locks may coexist; final artifacts and index require exclusive locks. Never merge concurrent writes by hand.

## Routing and ownership

- The configured chapter owns its output file and local evidence.
- If research uncovers a supportable fact owned by another chapter, hand it back through this workflow; do not edit another chapter's artifact from the current chapter loop.
- Prompt-derived audiences, metrics, competitors/comparables, source constraints, and diligence questions are routed to the relevant configured chapter.
- External prose-style diligence reports are inputs or quality examples, not output format; convert useful content into schema-native YAML, structured figures, sources, claims, and `claimRefs`.

## Section numbering

- Analysis artifacts number sections from their own configured `chapterNumber`: `01` uses `1.x`, `02` uses `2.x`, ..., `08` uses `8.x`.
- In `91-full-report.yaml`, use configured `reportChapterNumber` values. Current mapping is report chapters `2`–`9` for analysis artifacts `01`–`08`.

## Evidence and freshness conventions

- Local `S###` and `C###` IDs are chapter-scoped before consolidation.
- Canonical `S###` and `C###` IDs are reassigned by each evidence-ledger rebuild; never cache or hand-edit them outside artifacts rewritten by the script.
- Re-run full report and summary card generation after any ledger rebuild.
- Volatile claims require current/recent support or explicit evidence gaps.
- Company-authored claims should be labeled honestly and corroborated independently when decision-critical.

## Updating an existing report

When fixing omissions, thin sections, or newly supportable data:

1. Load `./references/chapters.yaml` and identify the owning chapter.
2. Update the owning analysis artifact and its local evidence.
3. Run that chapter's readiness check.
4. Rerun evidence consolidation to rebuild canonical claim IDs.
5. Rerun full report and summary card generation if any downstream recommendation, confidence, risk rating, valuation stance, table, figure, or key metric changes.
6. Rebuild index and run `npm run validate`.

Do not leave a partially updated report folder.

## Final response for report runs

Summarize only:

- Report folder.
- Generated YAML files.
- Source count and claim count.
- Recommendation, confidence, risk rating, valuation stance.
- Structured figure count and table count.
- Validation status.
- Main diligence gaps.
