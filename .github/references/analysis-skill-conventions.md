# Analysis skill conventions

Shared rules for the eight analysis skills (`startup-snapshot`, `startup-market`, `startup-competition`, `startup-financials`, `startup-product`, `startup-customers`, `startup-risks`, `startup-valuation`). Each skill's `SKILL.md` only documents what is unique to its chapter; everything below applies to all eight.

## Inputs every analysis skill receives

The default agent passes the full invocation contract from `AGENTS.md` (`companyName`, optional `companyUrl`, `runTimestamp`, `currentDate`, `reportFolder`, `schemaPath`, `yamlSyntaxPath`). Skills do not re-list these. Read `schemaPath` and `yamlSyntaxPath` before writing, and read `.github/references/evidence-ledger.md` before touching local evidence. Read upstream artifacts only when the skill's own chapter or a discovered gap actually needs them.

## Outputs

Each skill writes exactly two files: `XX-name.yaml` and its Simplified Chinese sibling `XX-name.zh.yaml`. Both must exist before the next skill runs. The skill never writes `100-evidence-ledger.yaml`; that is `startup-ledger`'s job.

## Local evidence

- Register every retained external source in the artifact's `localEvidence.sources[]` and every reusable atomic fact in `localEvidence.claims[]`. Cite them via local `claimRefs` from sections, tables, figures, callouts, and notes.
- Parse `web_search` packets per `.github/references/evidence-ledger.md`. Emit the run-log line defined there for every `web_search` call.
- Source provenance follows `.github/references/evidence-ledger.md`: cited search-result URLs or directly reviewed first-party pages only — no inferred or unopened URLs.

## Research and freshness

- Treat `currentDate` as the freshness anchor for volatile, chapter-relevant facts (funding, valuation, revenue, pricing, product launches, customers, partnerships, lawsuits, regulatory posture, leadership, etc.).
- Use complete-sentence research questions tied to the specific paragraph, table, or figure being written. Avoid keyword-only queries.
- Vary queries across confirming, disconfirming, and adverse angles. Every chapter must include at least one adverse-evidence question.
- If a query returns thin or stale results, rewrite it from another angle before recording a gap.
- When `company.website` or `companyUrl` is available, mine the company's official surface (homepage, sitemap, navigation, docs, pricing, changelog, customer/partner pages, blog/news, trust/security, status, etc.) before relying on third-party snippets. Label company-authored claims as `company-claimed` or `observed`; corroborate volatile or critical facts independently when possible.
- For competitor or comparable analysis, mine competitor official surfaces too, but never treat vendor-authored comparisons as independent proof.

## Source quality gate (before writing the artifact)

- Retained `localEvidence` must cover the chapter's required source classes (listed under "Source mix" in each skill).
- For volatile or judgment-critical facts, prefer multi-source corroboration; if only one source exists, record the limitation in the claim's `corroboration` and in `evidenceGaps`.
- If a fact is unsupported, write `null` plus a precise diligence ask. Never invent values, capabilities, certifications, customers, multiples, or outcomes.
- Convert each retained source into atomic claims; do not retain a source as a bibliography-only entry.

## Artifact depth

Artifacts `01`–`08` are the research record, not a thin handoff. They must retain enough detail for `startup-report` to compose investor-grade analysis without re-doing research:

- Substantive sections, chapter-appropriate tables, structured figures, sourced facts, atomic claims, evidence gaps, and notes explaining which metrics are supported, estimated, conflicting, or unavailable.
- Tables should carry company-specific values, dated evidence, confidence, and a concrete implication or diligence ask. A table built only to hit the count is not substantive.
- Figures must encode chapter-specific structure (TAM layers, positioning quadrants, unit-economics bridges, architecture stacks, retention loops, risk transmission paths, valuation sensitivities). Generic three-node "Public anchor → Private bridge → Underwriting output" figures are an anti-pattern.
- Section titles must be chapter-specific. Do not reuse generic titles like "Evidence base", "Investor interpretation", "Contradictions and uncertainty", "Private diligence path" across all eight artifacts.

The depth floors in `AGENTS.md` ("Minimum depth gates") are floors, not targets. Each skill's "Expected table families" list is the practical target; stop at the floor only when evidence genuinely cannot support more, and document why.

## Figure rules

- Use structured YAML figure objects rendered by the website. No diagram-language source strings.
- Use canonical renderer fields only: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`. Do not introduce `name`, `components`, `children`, `steps`, `cards`, or `groups` as primary fields.
- Numeric chart values must be numbers, not strings.
- Visible cards/layers/nodes need a `label` plus renderable content; required arrays must not be empty.
- For `matrix` / heatmap-style figures, `data.columns[]` lists X-axis labels and `row.label` is the Y-axis identity. **`row.values.length` must equal `data.columns.length`** — do not put the row identifier (e.g. `Risk`, `Customer`) as the first column.
- Each skill's `SKILL.md` lists the figure types preferred for that chapter.

## Simplified Chinese sibling

Immediately after writing the English file, write its `.zh.yaml` sibling per `.github/references/zh-translation.md`. Both files must exist and pass the residual-English sweep and structural-parity check before the next skill starts. Preserve schema keys, IDs, claim/source IDs, numeric values, enums, array order, and YAML serialization style; translate every prose field.

## Handoff note

After writing, record a concise internal summary covering: output paths, figure count, table count, evidence gaps closed, evidence gaps remaining, and `web_search` calls (with query labels) or `web_search: not called`. Each skill's `SKILL.md` lists any extra fields its handoff must include (e.g. recommendation, valuation stance).

## Routing back

If a later skill discovers a missing fact that belongs to an earlier chapter, route back to the owning skill, update its `localEvidence` and artifact, then continue forward. Never edit another skill's artifact directly.
