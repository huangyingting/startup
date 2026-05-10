# translate-zh

Translate a finalized startup diligence report into 简体中文 by writing
two `*.zh.yaml` siblings. The website's `/zh/` route auto-loads them and
falls back to English per missing leaf.

## Files to translate

Per report folder, exactly two:

- `summary-card.yaml` — list-card text and detail-page cover (~11–20 leaves)
- `full-report.yaml` — entire detail-page body (~1500–2500 leaves)

Skip everything else (`report-meta.yaml`, `01-…08-*.yaml` chapters,
`evidence.yaml`, `.workflow-snapshot.yaml`). They are either author
input or rendered as-is in English.

## Translation philosophy: transcreate, don't word-trace

Per leaf:

1. Read the whole leaf, understand the underlying claim, evidence, and
   qualifiers.
2. Restate it in idiomatic 简体中文 the way a fluent Chinese
   investment analyst would — re-order clauses, merge or split
   sentences, swap voice as needed for natural flow.
3. Preserve every fact, number, date, named entity, and qualifier
   exactly. "Roughly $5B" → "约 50 亿美元" (not "50 亿美元").
   "Reportedly / estimated / approximately / may / could" must survive
   as "据报道 / 估计 / 大约 / 可能" or equivalents.
4. Re-read the Chinese alone. If it still reads as a literal
   transposition of English syntax, rewrite it.

Anti-patterns:

- Stacked "在……方面" / "对于……来说" filler clauses.
- Mechanically keeping "Moreover," / "However," as "此外，" / "然而，"
  when the Chinese flow doesn't need a connective.
- Always rendering a compound noun phrase the same way regardless of
  context ("regulatory exposure" is sometimes 监管敞口, sometimes
  合规风险 — pick by context).
- Doubling verbs ("the company says it expects" → "公司预期", not
  "公司称其预期").
- Splitting one analytic sentence into two short Chinese ones just
  because the English used a semicolon.

When unsure, prefer natural over literal — never at the cost of a
fact or a qualifier.

## Hard rules

1. **Schema-shape parity.** Same keys, array lengths, and field order
   as the English source. Only whitelisted leaves change. IDs, refs,
   URLs, dates, enums, numerics, `schemaVersion`, `artifact`
   byte-identical to English.
2. **Never translate.**
   - Company names, product names, proper nouns: keep Latin spelling,
     no parenthetical Chinese aliases ("OpenAI" stays "OpenAI", not
     "OpenAI（开放人工智能）").
   - URLs, dates, IDs, refs, enum values.
   - Numbers and units: "8520 亿美元", not "$852B"; the number stays.
3. **Whitelist is the gate.** `scripts/whitelist.mjs` defines which
   paths are translatable. The extractor only emits whitelisted leaves;
   the applier silently drops anything else; the validator
   byte-compares everything else.
4. **Terminology.** Use `references/glossary.zh.yaml` for recurring
   terms. If a recurring term is missing, add it before continuing so
   later files stay consistent.
5. **Punctuation.** 全角 inside Chinese sentences (，。；：？！「」).
   Half-width with one space on each side around embedded English
   tokens: "ARR 增长 80%，主要由 Microsoft Azure 渠道贡献". Numbers
   stay half-width.
6. **No invention, no hedging shift.** Don't add facts. Don't soften
   "fails to" to "尚未" or strengthen "may" to "将".

## Table cells

Most leaves in `full-report.yaml` come from `tables/[]/rows/[]/[]` —
short cells, not sentences. They follow stricter rules than prose:

- **Pure numbers / units / currency / percent / dates / IDs**: do not
  translate. "$2.6T–$4.4T", "13.8", "2024", "n/a", "—", "null", "T+1"
  all stay verbatim. Currency symbols stay too — write "$852B", not
  "8520 亿美元", inside a table cell, even though the prose convention
  is the opposite. Cells must align across rows; a column that is
  numeric in 9 rows and prose in 1 row should keep the same form.
- **Single-word status / level / enum-like values**: translate to a
  consistent short term and reuse it across rows. "High / Medium /
  Low" → "高 / 中 / 低". "Yes / No" → "是 / 否". "Confirming /
  Adverse / Neutral" → "证实 / 反向 / 中性". Pick one rendering per
  column and stick to it; do not vary by row.
- **Phrase cells (2–10 words)**: translate as natural Chinese noun
  phrases. Drop articles ("the", "a") and reorder modifiers as
  needed. Keep proper nouns in Latin spelling.
- **Sentence cells**: apply the prose translation philosophy above.
- **Cells that are mostly proper nouns + a small connector**: keep
  the proper nouns and translate only the connector. "Microsoft &
  Azure" → "Microsoft 与 Azure".

## Workflow

For one report folder (`reports/<runId>/`):

```
# 1. Extract
node .agents/skills/translate-zh/scripts/extract-translatable.mjs \
  reports/<runId>/summary-card.yaml --out /tmp/sc.json
node .agents/skills/translate-zh/scripts/extract-translatable.mjs \
  reports/<runId>/full-report.yaml --out /tmp/fr.json

# 2. Prepare response-sized batches. This is still one translation job from
#    the user's point of view; internally it avoids long stalls and lets table
#    strings be translated once, then expanded to every repeated path.
node .agents/skills/translate-zh/scripts/batch-translatable.mjs prepare \
  /tmp/fr.json --out-dir /tmp/fr-batches --max-chars 8000 --max-items 80

# 3. Transcreate each batch into the same JSON shape plus `target`.
#    - prose.*.json and figures.*.json keep {path, source, target}
#    - tables.unique.*.json keep {source, target}
#    Translate for fluent Chinese analyst prose; do not mirror English syntax.

# 4. Expand deduped table translations back to path-level entries.
node .agents/skills/translate-zh/scripts/batch-translatable.mjs expand-tables \
  /tmp/fr-batches/tables.unique.json /tmp/fr-batches/tables.unique.*.zh.json \
  --out /tmp/fr-batches/tables.expanded.zh.json

# 5. Concatenate the translated path-level batches. Include only files that
#    exist; pure numeric/date table cells may be omitted and will fall back.
jq -s 'add' /tmp/fr-batches/prose.*.zh.json \
  /tmp/fr-batches/figures.*.zh.json \
  /tmp/fr-batches/tables.expanded.zh.json > /tmp/fr.zh.json

# 6. Apply
node .agents/skills/translate-zh/scripts/apply-translation.mjs \
  reports/<runId>/summary-card.yaml /tmp/sc.zh.json
node .agents/skills/translate-zh/scripts/apply-translation.mjs \
  reports/<runId>/full-report.yaml /tmp/fr.zh.json

# 7. Validate
node .agents/skills/translate-zh/scripts/check-translation.mjs reports/<runId>
```

For `summary-card.yaml`, translate the small `/tmp/sc.json` directly.

## Fast/default mode

Do not translate a `full-report.yaml` extraction as one giant LLM response.
The task can be handled end-to-end in one run, but the translation work should
be batched internally:

- Keep batches small enough to return promptly. If a batch stalls, re-run
  `batch-translatable.mjs prepare` with `--max-chars 5000` or lower.
- Translate long prose by section or batch, then reread the Chinese alone and
  rewrite any English-shaped sentences before applying.
- Translate table cells by unique source string, not by path. This removes
  hundreds of duplicate cells and keeps status/level terms consistent.
- Skip pure table values that should stay verbatim: numbers, currency ranges,
  percentages, dates, IDs, `n/a`, `—`, and similar mechanical values.
- Apply and validate incrementally. It is acceptable for unfinished leaves to
  remain English while a report is in progress; the final pass should cover all
  non-mechanical prose, figure, and table text.

## Chunking `full-report.yaml`

A typical full-report has 1500–2500 leaves and 80–130KB of source
text — too large for one LLM call. Prefer the batching helper above. If
you need a manual fallback, split by path prefix into three shapes
(different translation rules apply to each per "Table cells" above),
translate independently, then concatenate.

```
# Inspect leaf distribution to decide chunk sizes
jq 'group_by(.path | split("/")[0]) | map({k: .[0].path | split("/")[0], n: length})' /tmp/fr.json

# Chunk A — prose: cover, profile, chapter sections
jq '[.[] | select(.path | test("^(coverFacts|companyProfile|subtitle|coverageNotes|disclaimer|chapters/[0-9]+/(title|sections/[0-9]+/(title|blocks))))"))]' \
  /tmp/fr.json > /tmp/fr.prose.json

# Chunk B — figures: every figure's title/summary/notes/labels
jq '[.[] | select(.path | startswith("figures/"))]' /tmp/fr.json > /tmp/fr.figures.json

# Chunk C — tables: one chunk per table id (each typically 50–200 cells)
jq -r '[.[] | .path] | map(capture("^tables/(?<i>[0-9]+)/").i) | unique[]' /tmp/fr.json \
  | while read i; do
      jq --arg i "$i" '[.[] | select(.path | startswith("tables/" + $i + "/"))]' \
        /tmp/fr.json > "/tmp/fr.table.$i.json"
    done

# After translating each chunk into /tmp/fr.<chunk>.zh.json,
# concatenate them back into a single array:
jq -s 'add' /tmp/fr.prose.zh.json /tmp/fr.figures.zh.json /tmp/fr.table.*.zh.json \
  > /tmp/fr.zh.json
```

Use whichever chunk granularity fits your LLM budget. The only hard
rule is that the concatenated array, when fed to
`apply-translation.mjs`, must contain every original `path` (or skip
the path entirely — leaves without a translation entry stay English,
which is fine for incremental work).

## Validator failures

`check-translation.mjs` failure modes and fixes:

- **`shape` — key missing/extra** in zh: regenerate from the current
  English source. The English file probably changed since the last
  extract.
- **`shape` — array length mismatch**: the translated JSON for that
  path's row collection had a wrong row count, OR a typo in `path`
  (e.g. trailing `/`, off-by-one index) caused one row not to apply.
  Re-check the `path` strings in the translations JSON against the
  extracted source list.
- **`preserve` — non-translatable leaf changed**: a translation slipped
  past the whitelist (often an enum value or an ID). Find the offending
  path in the translations JSON, remove the entry, re-apply.

## Common pitfalls

- Translating an enum value in the YAML (the website maps
  `recommendation: research-more` to "继续研究" via `displayLabel`;
  the YAML stays English).
- Reordering, merging, or splitting list items — schema validators
  address rows by index.
- Translating source titles / publishers / `keyQuote` — excluded by
  the whitelist; they stay in the original publication's language.
- Adding parenthetical Chinese aliases for companies / products.
