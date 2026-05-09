<!-- GENERATED FILE: edit references/workflow-config.yaml, scripts/validation-catalog.mjs, or website/src/lib/figures.mjs, then run `npm run build:rules`. -->

# startup-research rules

The rules and reference values an agent must know to author valid chapter YAML and triage validator output. Read once at session start; refer back as needed during chapter authoring and finalization.

Pairs with [SKILL.md](../SKILL.md) (the workflow narrative) and [contracts.md](contracts.md) (the field shapes for the YAML you write).

## Agent policy (binding)

#### `hardRules` (do not violate)

- Set slug to the company slug only: the report folder basename with the leading timestamp removed.
- Do not hand-write evidence.yaml, full-report.yaml, or summary-card.yaml; let finalization scripts assemble them.
- Do not invent facts, metrics, customers, funding, valuation, or dates.
- Do not edit another chapter artifact while working on the current chapter.
- Keep scratch files under .research-cache/<runId>/, never under reports/<runId>/.
- Only chapter YAMLs, report-meta.yaml, and assembled final artifacts belong under reports/<runId>/.

#### `researchRules`

- Review direct URLs with fetch-url before retaining them as evidence; do not cite generic search-result pages.
- Prefer primary, official, independent, customer, regulatory, legal, and adverse sources over summary pages.
- Record reviewed sources, atomic claims, search queries, typed research questions, and typed evidence gaps in localEvidence.
- Re-fetch volatile facts every run; refresh context and earlier chapters are background only for those facts.
- Anchor freshness to runtimeContext.run.runDate, not the model's training cutoff: include the current year (and the prior year for trailing windows) in queries for volatile facts (funding, ARR, headcount, customers, leadership, regulatory) and prefer sources dated within ~12 months of runDate.

#### `chapterAuthoringRules`

- Use runtimeContext.chapter as the chapter brief and runtimeContext.chapter.gate as the binding per-chapter gate.
- Use the *Validator dimensions* section below for dimension precedence/suppressors and the inline allowed enum values in references/contracts.md for each field; trust the per-issue `fix` in check-chapter JSON output (`issues[].fix`) for concrete repair.
- Use the *Renderer contracts* section below before writing figures; substitute a table when the evidence does not fit the figure contract.
- Cite tables through table-level claimRefs, never through evidence-only columns that hold raw claim ids.
- Populate tables[].notes whenever the table contains estimates, partial coverage, computed/derived cells, or any caveat the reader needs (data-source convention, units, vintage, what null means). Leave notes null only for pure factual snapshot tables where every cell is a primary-source fact with no qualifier.

#### `retryPolicy`

```yaml
maxChapterRetries: 3
requireMonotonicFailureDecrease: true
```

#### `volatileFacts` (re-fetch every run; refresh context is background only for these)

- funding
- valuation
- headcount
- customer count
- pricing
- legal/regulatory status
- outages
- partnerships
- product launches

#### `finalResponseFields` (every field must appear in the final user-facing summary)

- report folder
- generated files
- source count
- claim count
- recommendation
- confidence
- risks
- valuation stance
- table count
- figure count
- finalize result
- main gaps

## Gates

Per-chapter `gate:` blocks in `workflow-config.yaml` override individual keys; un-overridden keys fall through to `defaultGate`. `check-chapter` enforces the merged gate per chapter; `check-report` enforces `reportGate` after finalization.

#### `defaultGate` (every chapter)

```yaml
minSections: 3
maxSections: 8
minArtifacts: 6
maxTables: 8
maxFigures: 6
minResearchQuestions: 25
minQuestionTypeSpread: 4
minAdverseQuestions: 1
minLocalSources: 25
minLocalClaims: 35
minSourceDomains: 10
minNetNewSources: 8
minSourceTypeSpread: 4
minHighConfidenceCorroboration: 2
minSourcesPerEnumerationRow: 2
minQuestionAnswerRate: 0.8
minContentRequirementCoverage: 0.8
requiredSourceTypes: []
depthFloor:
  minSectionBodyWords: 100
  minSectionWordsTotal: 600
  minTableRowsTotal: 16
  minFigureDataPointsTotal: 12
```

#### `reportGate` (post-finalize, evaluated against `evidence.yaml`)

```yaml
minDistinctDomains: 30
requireAdverseSource: true
maxPaywallPercent: 0.3
crossChapterTolerances:
  metricDrift: 0.1
  keyFactOverlap: 0.7
  duplicateOverlap: 0.7
```

#### `adverseDistribution` (per-chapter `gate.minAdverseSources` is injected from this)

```yaml
requireAtLeastOneAdverseSource:
  - company-overview
  - financials
  - customers
  - valuation
warnIfChaptersWithAdverseSourceAtMost: 2
```

## ID system

Every `S/C/T/F/Q` id has the shape `<TypeLetter><ChapterLetter><Seq3>`.

- **TypeLetter** is fixed per entity kind: `S` source, `C` claim, `T` table, `F` figure, `Q` question. These letters (C, F, Q, S, T) are reserved and cannot be reused as chapter letters.
- **ChapterLetter** is the current chapter's `letter` (single uppercase A–Z, declared in workflow-config). Use **only this chapter's letter** for ids you mint inside this chapter — reusing another chapter's letter trips the `crossChapterRefLeak` gate.
- **Seq3** is a zero-padded sequence within the chapter, `001`–`999`.

Examples: `SO001` = source #1 in the chapter whose `letter: O`; `CM045` = claim #45 in the chapter whose `letter: M`.

When you need to reference a fact established in another chapter, restate it as a new local claim with this chapter's letter and its own `sourceRefs[]`; do not import the other chapter's id.

## Validator dimensions

`check-chapter` and `check-report` emit failures tagged with these `dimension` keys. Fix in `precedence` order (lowest rank = root cause first); a suppressed dimension is masked while its upstream still fails, so the upstream fix usually clears the downstream too.

`defaultFix` is the generic guidance baked into the validator; concrete failures echo the same hint with the specific field/id filled in (e.g. "Add 3 more registrable domain(s)…"). Trust the per-failure `fix` in JSON output over the generic version below.

Precedence `—` marks **warning-class** dimensions: they never appear in `retryOrder[]`, never block `check-chapter` (default), and only block when `--strict` is set. They are the only dimensions that may appear in `acknowledgedWarnings[].dimension` (see below).

| Precedence | Dimension | Default fix | Suppressed by |
|---|---|---|---|
| 0 | `missingArtifact` | Create the chapter YAML at the expected path. | — |
| 1 | `yamlParse` | Fix the YAML syntax error reported in the message. | — |
| 2 | `documentHead` | Fix the chapter document head: schemaVersion=report-v2, artifact matches the chapter key, slug, runDate=YYYY-MM-DD, company.name, and chapter.number matching the chapter order. | `yamlParse` |
| 3 | `slugConsistency` | Set slug: to the company slug only (the report folder basename with the leading <timestamp>- stripped). | `yamlParse` |
| 4 | `localEvidenceMissing` | Add the entire localEvidence block (researchQuestions, searchQueries, sources, claims, evidenceGaps). | — |
| 5 | `researchQuestionShape` | Fix the question object: id Q<ChapterLetter>### (e.g. QO001), >=20-char text, valid type, non-empty targets[], valid status. | `yamlParse`, `localEvidenceMissing` |
| 6 | `researchQuestionTargets` | Point the question.targets[] entries at a real contentRequirements/<index>, plannedTables/<slug>, or plannedFigures/<slug>. | `yamlParse`, `localEvidenceMissing` |
| 7 | `researchQuestionTypeMix` | Add questions of types you have not used yet to reach minQuestionTypeSpread. | `yamlParse`, `localEvidenceMissing` |
| 8 | `researchQuestionAdverse` | Add type:adverse questions until you reach minAdverseQuestions. | `yamlParse`, `localEvidenceMissing` |
| 9 | `searchQueriesMissing` | Append the actual queries you ran into localEvidence.searchQueries[] ({query, engine, hits, retainedSourceRefs}). | `yamlParse`, `localEvidenceMissing` |
| 10 | `sourceShape` | Fill accessStatus and stance (and other required fields) on each source. | `yamlParse`, `localEvidenceMissing` |
| 11 | `sourceDomains` | Add sources from new registrable domains; do not duplicate publishers. | `yamlParse`, `localEvidenceMissing` |
| 12 | `sourceTypeSpread` | Add sources with sourceType values you have not used yet. | `yamlParse`, `localEvidenceMissing` |
| 13 | `sourceStanceSpread` | Add at least one source with stance: adverse (regulator complaint, short report, skeptical analyst note, FT Alphaville-style critique, FOS/CFPB record). Mark a genuinely critical existing source as stance: adverse instead of inventing one. | `yamlParse`, `localEvidenceMissing` |
| 14 | `requiredSourceTypes` | Pull at least one source of each missing type listed in gate.requiredSourceTypes. | `yamlParse`, `localEvidenceMissing` |
| 15 | `netNewSources` | Run new searches to add URLs not seen in earlier chapters; reusing the global pool will not satisfy this gate. | `yamlParse`, `localEvidenceMissing` |
| — | `paywallRisk` | Swap restricted (paywall\|js-only\|broken\|rate-limited) sources for ok ones to stay under the report-level 30% ceiling. | `yamlParse`, `localEvidenceMissing` |
| 17 | `researchQuestions` | Add more researchQuestion entries until you hit the per-chapter floor. | `yamlParse`, `localEvidenceMissing` |
| 18 | `sources` | Add more sources until you hit the per-chapter floor. | `yamlParse`, `localEvidenceMissing` |
| 19 | `claims` | Add more claims until you hit the per-chapter floor. | `yamlParse`, `localEvidenceMissing` |
| 20 | `claimShape` | Fix the claim object: required fields (statement, type, topic, sourceRefs, confidence, freshness), valid enum values, non-empty sourceRefs unless type is open-question, and contradictsClaimRefs when type is conflicting. | `yamlParse`, `localEvidenceMissing` |
| 21 | `highConfidenceCorroboration` | Either downgrade confidence:high to medium, or ensure the claim has at least gate.minHighConfidenceCorroboration sourceRefs with at least one primary-tier source (filing\|regulatory\|legal\|official or reputationTier:high). | `yamlParse`, `localEvidenceMissing` |
| 22 | `researchQuestionAnswerCoverage` | Convert questions from unresolved/partial to answered by adding the missing claim and citing it via claim.answersQuestionRefs. | `yamlParse`, `localEvidenceMissing` |
| 23 | `researchQuestionClosure` | Add an evidenceGap whose relatedQuestionRefs[] includes the still-open question. | `yamlParse`, `localEvidenceMissing` |
| 24 | `claimAnswerRefs` | Resolve dangling answersQuestionRefs entries; do not duplicate evidence. | `yamlParse`, `localEvidenceMissing` |
| 25 | `claimContradictRefs` | Resolve dangling contradictsClaimRefs entries; type:conflicting requires non-empty contradictsClaimRefs. | `yamlParse`, `localEvidenceMissing` |
| 26 | `crossChapterRefLeak` | Local C<L>### appears to come from another chapter. Chapter-letter ids cannot be reused across chapters — restate the underlying fact as a new local claim here with its own sourceRefs[]. | `yamlParse`, `localEvidenceMissing` |
| 27 | `claimRefs` | Resolve dangling claimRefs across sections, tables, figures, and callouts. | `yamlParse`, `localEvidenceMissing` |
| 28 | `enumerationScope` | Add enumerationScope { coverage, basis(>=20 chars) } to the matching enumeration table. | `yamlParse`, `localEvidenceMissing` |
| 29 | `enumerationRows` | Add rows to reach expectedMinRows or set coverage to partial/sample with rationale. | `yamlParse`, `localEvidenceMissing` |
| 30 | `enumerationCoverageGap` | Open an evidenceGap whose topic mentions the table or whose relatedTableRefs[] cites it. | `yamlParse`, `localEvidenceMissing` |
| 31 | `enumerationRowCorroboration` | Extend the enumeration table's table-level claimRefs[] so the underlying sources span more registrable domains (table-level, not per-row). | `yamlParse`, `localEvidenceMissing` |
| 32 | `tableShape` | Fix the table: non-empty columns, every row has the same number of cells as columns, enumerationScope { coverage, basis(>=20 chars) } when present. | `yamlParse` |
| 33 | `figureShape` | Fix the figure data to satisfy its type contract (e.g. dag needs edges, range needs numeric low/high, matrix needs columns and rows). | `yamlParse` |
| — | `figureType` | Render at least one of the planned figure types, or add an acknowledgedWarnings entry for dimension "figureType" with a >=30-char reason when the substitution is intentional. | `yamlParse` |
| 35 | `duplicateIds` | Renumber the duplicate or malformed table/figure id; ids must match T<ChapterLetter>### / F<ChapterLetter>### (e.g. TO001 / FO001) and be unique within the chapter. | `yamlParse` |
| 36 | `artifactRefs` | Resolve the dangling figureRef/tableRef: it must point at an id that exists in this chapter's figures[] / tables[]. | `yamlParse` |
| 37 | `duplicateAnalysis` | Either give the figure at least one claimRef the table does not have (a distinct slice/lens), rename it to reflect that lens, or merge it into the table. | `yamlParse` |
| 38 | `calloutShape` | Fix the callout: required title, body, claimRefs[], and optional calloutType in (strength\|risk\|recommendation\|insight\|assumption). | `yamlParse` |
| 39 | `sectionsMin` | Add the missing section(s) to reach minSections. | `yamlParse` |
| — | `sectionsMax` | Reduce or merge sections; the chapter looks over-fragmented. | `yamlParse` |
| 41 | `artifactsMin` | Add the missing table or figure (or substitute a planned figure with an extra table when data shape does not fit). | `yamlParse` |
| — | `tablesMax` | Reduce or merge tables; the chapter looks over-fragmented. | `yamlParse` |
| — | `figuresMax` | Reduce or merge figures; the chapter looks over-fragmented. | `yamlParse` |
| 44 | `depthSection` | Expand the prose of the shortest section(s) only; leave the others untouched. | `yamlParse` |
| 45 | `depthSectionTotal` | Expand prose across short sections to reach minSectionWordsTotal. | `yamlParse` |
| 46 | `depthTableRows` | Add rows to existing tables to reach minTableRowsTotal. | `yamlParse` |
| 47 | `depthFigureData` | Add data points to existing figures to reach minFigureDataPointsTotal. | `yamlParse` |
| 48 | `contentRequirementCoverage` | Add researchQuestions whose targets[] cover the un-targeted contentRequirements. | `yamlParse`, `localEvidenceMissing` |
| — | `unverifiedSource` | One or more cited sources never went through fetch-url during this run; re-pull them so accessStatus, sourceType, and stance are based on the actual page rather than a guess. | — |
| — | `fetchTrailMissing` | Set STARTUP_FETCH_LOG_PATH=.research-cache/<runId>/_fetch-log.jsonl in your shell BEFORE running fetch-url so check-chapter can audit cited URLs against actual retrievals; the default gate warns and --strict fails when the trail is missing. | — |
| 51 | `displayCompleteness` | Populate the report-meta field that drives the display surface (companyProfile.<field>, coverFacts items, claimRefs); when a field is genuinely unavailable, leave it null only for fields that document a null path. report-meta has no acknowledgedWarnings opt-out. | — |
| — | `tableNotes` | Write tables[].notes (one line: data source / estimation / partial coverage / what null means), or acknowledge dimension "tableNotes" for pure factual snapshot tables. | — |

### `acknowledgedWarnings` opt-out

You may opt out of intentional `--strict` warnings by listing them under a top-level `acknowledgedWarnings: [{ dimension, reason }]` entry on the chapter YAML. Each entry must satisfy:

- **dimension** is one of the warning-class dimensions above (precedence `—`): `fetchTrailMissing`, `figureType`, `figuresMax`, `paywallRisk`, `sectionsMax`, `tableNotes`, `tablesMax`, `unverifiedSource`. Acks against any other dimension surface as a non-blocking `acknowledgedWarnings` warning so the misuse is visible without breaking historical reports.
- **reason** is a string of at least 30 characters explaining why the warning is non-actionable for this chapter. Shorter reasons do not take effect and produce a non-blocking `acknowledgedWarnings` warning.

Acks never silence a real failure; the `failures.length === 0` gate is checked unconditionally. Use this only for genuinely non-actionable warnings (e.g. `tableNotes` on a pure factual snapshot whose `defaultFix` explicitly tells you to acknowledge it).

## Renderer contracts (figures)

Every figure must satisfy the contract for its `type`. The renderer ignores extra fields and refuses to render figures whose required arrays are missing or empty. If your evidence does not fit a figure type, swap the planned figure for an extra table — the chapter `gate.minArtifacts` floor counts both.

#### Allowed figure types

```yaml
- timeline
- flow
- quadrant
- bar
- waterfall
- matrix
- stack
- pyramid
- journey-map
- funnel
- cohort
- range
- kpi
- dag
- other
```

#### Allowed `layout` values (figures and tables)

```yaml
- compact
- standard
- wide
```

#### Allowed `data.*` field names (across all figure types)

```yaml
- items
- nodes
- edges
- points
- columns
- rows
- series
- layers
- xAxis
- yAxis
```

#### Required field combinations per figure type

Each entry is a list of alternative requirements; a figure satisfies the contract when **every** alternative has at least one populated field. Example: `bar: [["items", "series"]]` means a bar figure must populate either `data.items` or `data.series` (or both).

```yaml
timeline:
  - - items
flow:
  - - nodes
dag:
  - - nodes
  - - edges
quadrant:
  - - points
bar:
  - - items
    - series
funnel:
  - - items
    - series
waterfall:
  - - items
range:
  - - items
matrix:
  - - columns
  - - rows
cohort:
  - - columns
  - - rows
stack:
  - - layers
    - items
pyramid:
  - - nodes
    - items
journey-map:
  - - nodes
    - items
kpi:
  - - items
    - nodes
```

#### Allowed populated `data.*` fields per figure type

Populating a field outside this list for the given type is a `figureShape` failure. `other` allows none — use it only when the data does not fit any rendered type.

```yaml
timeline:
  - items
flow:
  - nodes
  - edges
dag:
  - nodes
  - edges
quadrant:
  - points
bar:
  - items
  - series
funnel:
  - items
  - series
waterfall:
  - items
range:
  - items
matrix:
  - columns
  - rows
cohort:
  - columns
  - rows
stack:
  - layers
  - items
pyramid:
  - nodes
  - items
journey-map:
  - nodes
  - items
kpi:
  - items
  - nodes
other: []
```
