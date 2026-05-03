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

Each analysis skill receives the invocation context resolved by the `startup-diligence` workflow:

- `companyName`
- optional `companyUrl`
- `runTimestamp`
- `currentDate`
- `reportFolder`
- `schemaPath`
- `yamlSyntaxPath`
- prompt-derived run requirements inferred from the user's instructions, if any

Before writing:

- Read `schemaPath`.
- Read `yamlSyntaxPath`.
- Read `.github/references/evidence-ledger.md` before touching local evidence.
- Read `.github/references/zh-translation.md` before writing any `.zh.yaml` sibling.
- Read upstream artifacts only when the chapter or a discovered gap needs them.

## Section-owned chapter contracts

Each analysis skill is the authoritative generation contract for its report chapter. The owning skill must state:

- chapter purpose and required analysis content;
- required tables, with intended columns and evidence expectations;
- required structured figures, with preferred renderer types and required data shape;
- evidence collection strategy and source classes;
- domain-adaptive additions inferred from the company, business model, and operating dependencies;
- completion checklist and handoff fields.

The shared rules below provide default research breadth expectations for every analysis skill. A chapter skill may add stricter chapter-specific source classes, questions, or depth expectations when its domain requires them.

Each analysis skill also has a sibling `contract.yaml` that mirrors the machine-checkable subset of the chapter contract: artifact name, chapter number, minimum section/table/figure floors, required table column alternatives, and required figure type alternatives. `scripts/audit-report-readiness.mjs` reads these files, so update `contract.yaml` whenever a required table or figure changes.

Global instructions define workflow, evidence, YAML, localization, and validation rules only. Section-level content belongs in the section skill, not in a central industry-template file.

## Prompt-derived run requirements

Each analysis skill must merge requirements in this order:

1. Base workflow, schema, and the skill's universal chapter requirements.
2. Domain-adaptive additions inferred by the skill for the current company.
3. Prompt-derived run requirements inferred from the user's instructions.

Prompt-derived run requirements win unless they conflict with schema, evidence provenance, renderer constraints, or factual support. Never invent values to satisfy a prompt requirement.

The orchestrator and each chapter skill must infer run-specific requirements directly from the user's prompt. Examples include audience, investment lens, chapter focus, required topics, required metrics, required tables, required figure purposes/types, required competitors/comparables, source preferences, forbidden domains, or chapter-specific diligence questions. Keep these requirements in the working context and satisfy them in the owned artifacts; do not introduce a separate configuration artifact or a repo-level industry template.

Before finalizing a chapter, verify every prompt-derived requirement assigned to that chapter:

- required topics or sections;
- required metrics;
- required tables and required columns;
- required figure types or purposes;
- required competitors or comparables;
- chapter-specific diligence questions;
- source preferences or forbidden domains.

If evidence is unavailable, do not invent values. Use `null`, explanatory notes, and `evidenceGaps[]` with a concrete diligence path. Mention unresolved prompt-derived requirements in the handoff note.

## Domain reflection and sufficiency gate

Before drafting, each analysis skill must explicitly reflect on the company's domain and decide whether the neutral `contract.yaml` floor is enough. The contract is only a minimum readiness shape; it is not the chapter plan.

Use upstream artifacts, official pages, and source discovery to identify:

- company domain and value-chain position;
- buyer, user, payer, and regulator distinctions;
- revenue mechanism: subscription, transaction, hardware sale, service/project, royalty/licensing, lending/credit, advertising/attention, marketplace take rate, usage-based, asset/project yield, or other;
- operating dependencies: physical assets, manufacturing, supply chain, scientific/clinical proof, regulated approvals, data/model rights, labor/service delivery, logistics, financial risk, partner platforms, or geopolitical exposure;
- adoption motion: consumer, enterprise, government, healthcare/provider/payer, channel/retail, marketplace liquidity, developer, distributor, or project finance;
- most decision-critical metrics and failure modes for that model.

Then decide, before writing, which domain-adaptive sections, tables, figures, source classes, and diligence questions this chapter needs beyond its minimal contract. Examples:

- physical-product companies may need manufacturing, capacity, warranty, certification, channel, and unit-cost treatment;
- healthcare/life-science companies may need clinical evidence, reimbursement, regulatory stage, safety, and provider/payer workflow;
- marketplaces may need liquidity, take-rate, multi-homing, cohort, and supply/demand quality;
- financial-risk businesses may need licensing, loss-rate, funding cost, delinquency, reserves, capital, and counterparty analysis;
- infrastructure/project businesses may need permitting, project finance, utilization, contracted backlog, offtake, capex, and commissioning milestones;
- AI/software companies may need model capability, data rights, compute, security, workflow integration, pricing/packaging, retention, and platform dependency.

Do not assume the company is an IT, Internet, software, SaaS, or AI startup. If the domain is unclear, record the ambiguity and add a diligence path rather than forcing a template.

Before finalizing, run this sufficiency check:

1. Which domain archetype(s) did this chapter infer, and why?
2. Which extra domain-specific sections, tables, figures, source classes, and questions were added because of that inference?
3. Is the chapter merely satisfying `contract.yaml`, or does it answer the domain-specific underwriting questions an investor would ask?
4. If content is still thin, can more credible research change the answer? If yes, continue research and expand the artifact. If no, add explicit `evidenceGaps[]` and explain why public evidence is unavailable.
5. If a requested or domain-critical table/figure cannot be supported, include the failed path and diligence ask rather than substituting a generic chart.

## Outputs

Each analysis skill writes exactly two files:

- `XX-name.yaml`
- `XX-name.zh.yaml`

Both files must exist and parse before the next skill starts.

Analysis skills never write `100-evidence-ledger.yaml`; that is `startup-ledger`'s job.

Research packs and cached text snapshots are diagnostics only; they are not final artifacts and must not be cited as sources of truth. For visible companies, complex domains, or prompt-critical topics, maintain a research pack unless the chapter's research is small enough to summarize completely in the handoff note.

## Parallel research packs

After the pre-stage duplicate check passes and `01-company-snapshot.yaml` is complete, research for `02`–`08` may be prepared in parallel as diagnostic packs. Parallel packs are read-only with respect to final artifacts.

Recommended pack contents:

- research questions asked, including adverse/disconfirming questions;
- reviewed URLs and fetch status;
- source type, independence, freshness, and reputation notes;
- candidate atomic claims and key quotes;
- conflicting facts and source disagreements;
- tables/figures the evidence can support;
- open gaps and diligence paths;
- prompt-derived run requirements satisfied or still unresolved;
- domain-adaptive additions selected and why.

Rules:

- Write each pack to a unique diagnostic path if persisted.
- Do not write or rewrite final `XX-name.yaml` files from parallel workers.
- When serializing the final artifact, convert retained evidence into `localEvidence.sources[]` and `localEvidence.claims[]`; never cite the pack file itself.
- If no pack is persisted, the handoff note must say why and must still list the research questions, reviewed source classes, unresolved gaps, and selected domain-adaptive additions.

## Local evidence

- Register every retained external source in `localEvidence.sources[]`.
- Register every reusable atomic fact in `localEvidence.claims[]`.
- Cite claims through local `claimRefs` from sections, tables, figures, callouts, and notes.
- Parse search/discovery packets and emit run-log lines per `.github/references/evidence-ledger.md`.
- Keep provenance strict: cited search URLs or directly reviewed pages only.

## Time, research, and freshness

- Treat `currentDate` as a research input, not just metadata. It anchors search recency, evidence freshness, volatile-fact review, and the report's default `runDate`.
- Build search queries against `currentDate` so discovery surfaces the latest material news: for volatile facts, include the current year or explicit recent/updated/date-bounded terms when the search surface supports them.
- Default to investor-grade research depth, not minimum viable output. Each chapter should collect as much decision-relevant, non-duplicative, evidence-backed material as practical before drafting; stop only when additional credible sources are repetitive, low quality, or no longer change the analysis.
- Retain breadth across source classes rather than volume for its own sake: official/company-authored sources, independent corroboration, adverse/disconfirming sources, and recent/freshness checks should all be represented or explicitly gapped.
- Refresh volatile chapter-relevant facts: funding, valuation, revenue, pricing, product launches, customers, partnerships, lawsuits, regulatory posture, leadership, and similar facts.
- Ask complete-sentence research questions tied to the intended paragraph, table, figure, or gap.
- Use search/discovery in both modes when useful: source discovery for candidate URLs and cited Q&A for precise diligence questions. Treat Q&A answers as hypotheses until the cited URLs or directly reviewed pages support the exact claim.
- Avoid keyword-only queries.
- Query confirming, disconfirming, and adverse angles. Every chapter needs at least one adverse-evidence question.
- If results are thin or stale, rewrite the question before recording a gap.
- Mine the company's official surface when `company.website` or `companyUrl` exists: homepage, sitemap, navigation, docs, pricing, changelog, customer/partner pages, blog/news, trust/security, status, and similar pages.
- Label official/company-authored claims as `company-claimed` or `observed`.
- Corroborate volatile or judgment-critical claims independently when possible.
- For competitor/comparable work, mine competitor official surfaces too, but never treat vendor-authored comparisons as independent proof.

Official-surface review order when applicable:

1. homepage and canonical domain redirects;
2. `robots.txt` and sitemap URLs;
3. about/company, leadership, careers, newsroom/blog, and press pages;
4. product, solution, pricing, packaging, customer, partner, and case-study pages;
5. docs, API/developer portals, changelog/release notes, integrations, status, trust/security, privacy, DPA, subprocessors, terms, and compliance pages;
6. marketplace listings, customer/partner announcements, filings/regulators, reviews, and independent reporting;
7. adverse/disconfirming sources tied to the chapter's claims.

Use official pages for observed/company-claimed facts, then use independent or primary third-party evidence for volatile, valuation-critical, customer, legal, regulatory, and recommendation-critical claims.

## Source quality gate

Before writing an artifact:

- Confirm `localEvidence` covers the chapter's required source classes.
- Prefer multi-source corroboration for volatile or judgment-critical facts.
- If only one credible source exists, record the limitation in claim `corroboration` and `evidenceGaps`.
- If a fact is unsupported, write `null` plus a precise diligence ask.
- Never invent values, capabilities, certifications, customers, multiples, outcomes, or metrics.
- Convert each retained source into atomic claims; do not keep bibliography-only sources.

## Research completeness gate

Before finalizing each analysis artifact, verify that the research record includes all four lenses below. If a lens produces no usable evidence, add an explicit `evidenceGaps` entry rather than silently omitting it.

- Official surface: company pages, docs, pricing, newsroom/blog, trust/status, customer/partner pages, sitemap-linked pages.
- Independent corroboration: tier-one news, filings/regulators, analyst or market data, credible trade press, customer/partner proof, or comparable public-company evidence.
- Adverse/disconfirming evidence: lawsuits, regulatory scrutiny, outages, churn/reviews, leadership departures, pricing pressure, customer pushback, competitor attacks, or contrary estimates.
- Freshness check: current facts within roughly 24 months, and volatile facts refreshed against `currentDate`.

For every major table or figure, ask: “Which source would change this cell/node if it were wrong?” If the answer is “none,” either source it, remove it, or mark it as a diligence gap.

For every prompt-derived run requirement, ask: “Where is this addressed?” If the answer is “nowhere,” add the missing analysis or record an evidence gap before moving on.

For every domain-adaptive addition selected by the skill, ask: “Which table, figure, section, or gap carries this?” If the answer is “none,” add it before moving on.

For every chapter, ask: “What would a domain expert expect to see here that the minimal contract did not name?” If the answer is supportable, add it. If not supportable, record it as an evidence gap with a diligence path.

If a chapter only meets the minimum section/table/figure floors but credible evidence supports deeper treatment, continue research and expand the artifact before handoff. Minimum floors are readiness gates, not stopping conditions.

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

Prefer richer artifacts when evidence supports them: additional sections, tables, figures, rows, sourced notes, and evidence gaps are expected for visible companies, complex domains, or prompt-critical topics. Do not compress useful research just to match a minimal template.

When a skill specifies required table columns, preserve those columns unless a better schema-compatible table design covers the same information. At minimum, diligence tables should expose the fact/metric, value or status, evidence date/source, confidence, implication, and diligence ask.

Figures must encode chapter-specific structure, such as:

- TAM layers;
- positioning quadrants;
- unit-economics bridges;
- architecture stacks;
- retention loops;
- risk transmission paths;
- valuation sensitivities.

Markdown, Mermaid, SVG, prose diagrams, and JSON strings must be converted into structured YAML figures before saving artifacts.

Avoid:

- generic three-node figures such as `Public anchor → Private bridge → Underwriting output`;
- reused section titles such as `Evidence base`, `Investor interpretation`, `Contradictions and uncertainty`, or `Private diligence path` across all artifacts;
- floor-only output when evidence supports more depth.

Depth floors in `scripts/report-manifest.mjs` and the `startup-diligence` workflow are minimums, not targets.

## Figure rules

- Use structured YAML figure objects rendered by the website.
- Do not use diagram-language source strings.
- Use only canonical renderer fields: `items`, `nodes`, `edges`, `points`, `columns`, `rows`, `series`, `layers`.
- Do not introduce non-canonical primary fields such as `name`, `components`, `children`, `steps`, `cards`, or `groups`.
- Numeric chart values must be numbers, not strings.
- Numeric chart values should match the corresponding table value or claim-supported numeric assumption. If a chart uses transformed or estimated values, explain the transformation in `approximationNotes`.
- Visible cards/layers/nodes need a `label` plus renderable content.
- Required arrays must not be empty.
- For `matrix` / heatmap figures:
  - `data.columns[]` is the X-axis.
  - `row.label` is the Y-axis identity.
  - `row.values.length === data.columns.length`.
  - Do not put the row identifier as the first column.

## Simplified Chinese sibling

Immediately after writing English, write the `.zh.yaml` sibling per `.github/references/zh-translation.md`.

Do not create a Chinese sibling by copying the English file and only changing metadata. Start from the English structure, then translate every user-visible prose field before saving.

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
- prompt-derived run requirements satisfied and unresolved;
- research pack path, or `research pack: not persisted`;
- evidence gaps closed;
- evidence gaps remaining;
- search/discovery calls with query labels, or `search: not called`;
- any skill-specific handoff fields listed in that skill.

## Routing back

If a later skill discovers a supportable missing fact owned by an earlier chapter:

1. Return to the owning skill.
2. Update its `localEvidence` and artifact.
3. Regenerate its `.zh.yaml` sibling.
4. Continue forward.

Never edit another skill's owned artifact directly.
