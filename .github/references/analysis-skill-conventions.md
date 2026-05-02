# Analysis skill conventions

Shared rules for the eight analysis skills:

- `startup-snapshot`
- `startup-market`
- `startup-competition`
- `startup-financials`
- `startup-product`
- `startup-customers`
- `startup-risks`
- `startup-valuation`

Each skill documents chapter-specific work. This file defines rules that apply to all eight.

## Inputs

Each analysis skill receives the invocation contract from `AGENTS.md`:

- `companyName`
- optional `companyUrl`
- `runTimestamp`
- `currentDate`
- `reportFolder`
- `schemaPath`
- `yamlSyntaxPath`

Before writing:

- Read `schemaPath`.
- Read `yamlSyntaxPath`.
- Read `.github/references/evidence-ledger.md` before touching local evidence.
- Read upstream artifacts only when the chapter or a discovered gap needs them.

## Outputs

Each analysis skill writes exactly two files:

- `XX-name.yaml`
- `XX-name.zh.yaml`

Both files must exist and parse before the next skill starts.

Analysis skills never write `100-evidence-ledger.yaml`; that is `startup-ledger`'s job.

## Local evidence

- Register every retained external source in `localEvidence.sources[]`.
- Register every reusable atomic fact in `localEvidence.claims[]`.
- Cite claims through local `claimRefs` from sections, tables, figures, callouts, and notes.
- Parse `web_search` packets and emit run-log lines per `.github/references/evidence-ledger.md`.
- Keep provenance strict: cited search URLs or directly reviewed pages only.

## Research and freshness

- Treat `currentDate` as the freshness anchor.
- Refresh volatile chapter-relevant facts: funding, valuation, revenue, pricing, product launches, customers, partnerships, lawsuits, regulatory posture, leadership, and similar facts.
- Ask complete-sentence research questions tied to the intended paragraph, table, figure, or gap.
- Avoid keyword-only queries.
- Query confirming, disconfirming, and adverse angles. Every chapter needs at least one adverse-evidence question.
- If results are thin or stale, rewrite the question before recording a gap.
- Mine the company's official surface when `company.website` or `companyUrl` exists: homepage, sitemap, navigation, docs, pricing, changelog, customer/partner pages, blog/news, trust/security, status, and similar pages.
- Label official/company-authored claims as `company-claimed` or `observed`.
- Corroborate volatile or judgment-critical claims independently when possible.
- For competitor/comparable work, mine competitor official surfaces too, but never treat vendor-authored comparisons as independent proof.

## Source quality gate

Before writing an artifact:

- Confirm `localEvidence` covers the chapter's required source classes.
- Prefer multi-source corroboration for volatile or judgment-critical facts.
- If only one credible source exists, record the limitation in claim `corroboration` and `evidenceGaps`.
- If a fact is unsupported, write `null` plus a precise diligence ask.
- Never invent values, capabilities, certifications, customers, multiples, outcomes, or metrics.
- Convert each retained source into atomic claims; do not keep bibliography-only sources.

## Artifact depth

Artifacts `01`–`08` are the research record, not thin handoffs. Each must retain:

- substantive sections;
- chapter-appropriate tables;
- structured figures;
- sourced facts;
- atomic claims;
- evidence gaps;
- notes explaining supported, estimated, conflicting, or unavailable metrics.

Tables should include company-specific values, dated evidence, confidence, implication, and diligence asks. Tables created only to hit a count are not substantive.

Figures must encode chapter-specific structure, such as:

- TAM layers;
- positioning quadrants;
- unit-economics bridges;
- architecture stacks;
- retention loops;
- risk transmission paths;
- valuation sensitivities.

Avoid:

- generic three-node figures such as `Public anchor → Private bridge → Underwriting output`;
- reused section titles such as `Evidence base`, `Investor interpretation`, `Contradictions and uncertainty`, or `Private diligence path` across all artifacts;
- floor-only output when evidence supports more depth.

Depth floors in `AGENTS.md` are minimums, not targets.

## Figure rules

- Use structured YAML figure objects rendered by the website.
- Do not use diagram-language source strings.
- Use only canonical renderer fields: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`.
- Do not introduce non-canonical primary fields such as `name`, `components`, `children`, `steps`, `cards`, or `groups`.
- Numeric chart values must be numbers, not strings.
- Visible cards/layers/nodes need a `label` plus renderable content.
- Required arrays must not be empty.
- For `matrix` / heatmap figures:
  - `data.columns[]` is the X-axis.
  - `row.label` is the Y-axis identity.
  - `row.values.length === data.columns.length`.
  - Do not put the row identifier as the first column.

## Simplified Chinese sibling

Immediately after writing English, write the `.zh.yaml` sibling per `.github/references/zh-translation.md`.

Preserve exactly:

- schema keys;
- IDs;
- claim/source IDs;
- numeric values;
- enum values;
- array order;
- YAML serialization style.

Translate every user-visible prose field. Run residual-English and structural-parity checks before moving on.

## Handoff note

After writing, record a concise internal summary:

- output paths;
- figure count;
- table count;
- evidence gaps closed;
- evidence gaps remaining;
- `web_search` calls with query labels, or `web_search: not called`;
- any skill-specific handoff fields listed in that skill.

## Routing back

If a later skill discovers a supportable missing fact owned by an earlier chapter:

1. Return to the owning skill.
2. Update its `localEvidence` and artifact.
3. Regenerate its `.zh.yaml` sibling.
4. Continue forward.

Never edit another skill's owned artifact directly.
