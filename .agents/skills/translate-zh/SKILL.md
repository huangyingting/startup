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

## Translation method: don't translate, re-author in Chinese

The English file is the **source of facts**, not the source of sentence
shape. Read the whole leaf, internalize the claim, then write Chinese the
way a Mandarin-speaking investment analyst would write it from scratch. If
your draft mirrors English clause order, you have not done the work — patching
word-by-word never removes 翻译腔, it only hides it.

The single self-check that matters: *could an experienced Chinese analyst
have written this from scratch, without ever seeing the English?*

### Mandatory 3-pass workflow (per leaf, per part, per file)

Do not skip the revision pass because the draft "looks fine." The most
common failure mode in this corpus is *technically correct but stiff and
translation-flavored*, and only the revision pass catches it.

1. **Pre-pass — read the whole part end-to-end before writing any Chinese.**
   Lock the file-wide rendering of every recurring term, every proper noun,
   and every acronym so the same English term gets the same Chinese form
   throughout. Note which leaves are mechanical (numbers, currency tokens,
   dates, IDs, mermaid blocks) and plan to copy them verbatim — translating
   `$60M` as `6 万美元` is off by 100×.
2. **Draft pass — translate segment by segment using the per-segment workflow
   below.** Internalize the claim, pivot the sentence shape, use concrete
   verbs, read it back silently.
3. **Revision pass — cover the English mentally and read the Chinese alone.**
   Walk the soundcheck and the anti-pattern table below. Any sentence that
   makes you pause is rewritten **as a whole sentence** — never patched
   word-by-word. Then re-open the English to spot-check that no fact, number,
   hedge, or qualifier was lost, strengthened, softened, or invented.
4. **Final write.** Only after the revision pass is clean, update the
  current sparse bundle or `parts/part.NNN.yaml` in place. The parent
  workflow imports/applies that bundle to produce the final `*.zh.yaml`
  mirror; do not edit the final mirror directly.
5. **Quality gate.** Run `check-translation.mjs --strict` on the report
  folder and repair until it passes. After both final overlays exist, the
  final gate is `check-translation.mjs --strict --require-final`. Repository
  validation also runs `npm run check:translations-zh`, which checks all
  existing Chinese overlays with `--strict`. If the
  gate fails, do an incremental repair: edit only the reported leaf/path in
  the existing `*.translate.yaml` bundle or affected `parts/part.NNN.yaml`,
  then re-import, re-apply, and re-run the gate. Do not re-export or redo
  the whole translation unless the bundle shape was corrupted.

### Per-segment workflow

For every prose leaf and every multi-word table cell:

1. **Internalize the claim.** Read the whole bullet or paragraph. State the
   claim in one Chinese clause in your head before you write anything. Note
   hedges (`may`, `likely`, `roughly`, `at least`, `reportedly`,
   `estimated`) and constraints (`only when`, `unless`, `provided that`) —
   they must survive at the same strength.
2. **Pivot the sentence shape.** Chinese is topic-comment, not
   subject-verb-with-trailing-modifiers. Apply these defaults *before*
   drafting, not as a post-hoc fix:
   - **Time, place, condition go to the front.** `Y is true when X` →
     `X 之后，Y` — never `Y，当 X 时`.
   - **Topic to the front; drop `对……来说`.** `For thin AppSec teams,
     manual reproduction is the bottleneck` → `AppSec 团队人手紧，手工复现
     就是瓶颈`.
   - **Long noun phrases become short verb clauses.** Any phrase with
     three or more `的` in a row is a smell. Flatten to a verb or split
     into clauses.
   - **Split long sentences.** A 30-word English sentence with two
     relative clauses becomes 2–3 short Chinese clauses joined by `，`
     `；` `——` or a period. Subordination is an English habit; in Chinese
     prefer parataxis.
3. **Use concrete verbs.** Prefer 落地 / 拼出 / 卡住 / 砸钱 / 吃掉 / 跑通 /
   挤压 / 撬动 / 顶住 / 守住 / 打穿 over 实现 / 进行 / 做出 / 完成 / 形成.
   Prefer 主动 over 被动. Collapse `进行 / 做出 + 名词` structures into one
   verb (`做出决策` → `决定`; `进行验证` → `验证`; `形成机制` → `建起机制`).
4. **Read it back silently.** If you would re-read the Chinese sentence to
   parse it, rewrite the whole sentence — do not patch a word. Repeat until
   nothing makes you pause.

### Tone targets

- **Investor-memo register**: confident, concise, analytical. Write toward
  the voice of 晚点 LatePost、海外独角兽、远川研究所 — punchy, opinionated,
  dense with verbs and numbers. Avoid 学术腔、公文味、营销文案腔 and
  textbook expressions like `市场进入策略`、`相关性分析`、`形成竞争优势`.
- **Match the source's certainty exactly.** Do not soften hedges, do not
  add new ones, do not promote `may` to `将` or demote `is` to `可能是`.
- **Length parity, not character parity.** A natural Chinese sentence is
  usually shorter than its English source. If your translation is
  dramatically longer, you are over-translating qualifiers (`approximately`,
  `essentially`, `in the context of`, `in order to`, `with respect to`); cut
  them. Specificity (numbers, names, dates, mechanisms, direct quotes) stays
  intact; rhetorical filler does not.

### 翻译腔 anti-patterns — rewrite the sentence, do not patch

When you spot one of these in your draft, rewrite the whole sentence.
Patching word-by-word never works.

| Anti-pattern | Why it sounds wrong | Rewrite toward |
|---|---|---|
| 长定语堆砌：`一个针对……的、能够……的、并且……的产品` | 中文偏好短句串联 | 拆为短句：`一个产品。它针对……、能够……，也……` |
| 段首 `对……来说 / 对于……而言` | 直译英文 `For X` 框架 | 主语前置：`团队需要……` 而非 `对团队来说，需要……` |
| `通过…… 来 ……` | 模板化的 `by/through` 直译 | 用 `靠 / 借助 / 凭 / 用` + 动词，或直接动宾 |
| `在 …… 的过程中 / 在 …… 上` | 凭空多出 4–6 字赘余 | 删除，或用 `时 / 中 / 里` 一字带过 |
| 被动语态：`被设计为 / 被要求 / 被使用` | 英文被动逐字映射 | 改主动：`团队设计成……`、`监管要求……` |
| `A 和 B 和 C` 串列 | 英文 `A, B, and C` 直译 | 用顿号：`A、B、C`；必要时加 `等` 收束 |
| `正在 …… 中` 翻译现在进行时 | 英文 `-ing` 不需要逐字 | 直接动词：`公司在调整`，不要 `公司正在调整中` |
| 跨句用 `这 / 这一 / 这些` 指代 | 中文需要明确名词 | 重复关键名词，或用 `上述 / 该` |
| `做出……决策 / 进行……尝试 / 形成……机制` | `make a decision / conduct an attempt` 的搬运 | 直接动词：`决定 / 尝试 / 建起` |
| `随着…… 的 ……` 套用 `with ... -ing` | 翻译腔顽症 | 换成 `当…… / 一旦…… / ……之后` |
| 数字前后堆 `约……的……的……` | `approximately X of Y` 直译 | `约 X` 后接动词，避免 `的` 连用 |
| 句尾判断挪到中间：`是一个……的……` | 英文 `is + 长定语` | 用判断句 `X 就是 Y`，或拆为两句 |
| 段段都用 `这意味着…… / 这表明……` | `this means / this suggests` 直译 | 换成 `因此 / 也就是说 / 反过来 / 换句话说`，或直接给结论 |
| `相关 / 相应 / 对应 / 该等 / 此项 / 之` | 律师函味，不是投资备忘录 | 删掉或改用具体名词 |
| 同义堆叠：`努力和尝试 / 机会与可能 / 挑战和困难` | 英文 `efforts and attempts` 在中文是一个概念 | 取一个 |
| 把 `Moreover, / However, / Furthermore,` 机械译成 `此外，/ 然而，/ 而且，` | 中文行文不需要这些连接词时强加 | 删掉，让句子自己接续 |
| `公司称其预期…… / 公司表示其将……` | 英文 `the company says it expects` 双动词搬运 | 合一：`公司预期……` |

### Worked example — stiff to native

A first-pass translation can be technically faithful and still feel flat.
This is the bar the revision pass must lift.

- **Source**: *"OpenAI's product experience depends on model availability, API/tool orchestration, SDK integration, and trust controls; partner channels add deployment reach but also opacity."*
- **Stiff but not wrong**: OpenAI 的产品体验依赖于模型可用性、API/工具编排、SDK 集成和信任控制；合作伙伴渠道增加了部署触达，但也带来了不透明度。
- **Natural Chinese**: OpenAI 的产品体验靠几样东西撑着：模型够稳、API 和工具编排能跑、SDK 接得上、信任控制守得住；合作伙伴渠道把部署做远了，但也把这条链做模糊了。

改写要点：把 `依赖于 + 一长串名词` 拆成 `靠几样东西撑着` 加四个短动词小句；把 `信任控制` 由抽象名词改为有动作的 `守得住`；把 `不透明度` 这个空洞名词换成 `把这条链做模糊了`，让因果连续。

### Soundcheck — grep your own draft

Before writing the file, mentally grep the Chinese for these signals. Each
match is a rewrite, not a patch:

- **`的` count.** Any noun phrase with 3 个 `的` 连用 is over-modified. Break
  it with verbs or split into clauses.
- **段首套语**: `对……来说`、`对于……而言`、`关于……方面`、`随着……`、
  `通过……来……`、`在……的过程中`、`在……方面`. Delete or restructure.
- **空动词 + 名词**: `做出决定`、`进行尝试`、`形成机制`、`产生影响`、
  `实现增长`. Collapse to one verb.
- **被动逐字**: `被设计为`、`被要求`、`被认为是`、`被使用`. Flip to active
  or use 让 / 由 / 受.
- **指代漂移**: 段段都用 `这 / 这一 / 这些` 代指上文。Repeat the noun.
- **公文词**: `相关 / 相应 / 对应 / 该等 / 此项 / 之`. Drop or replace with
  a concrete noun.
- **进行时直译**: `正在……中`. The bare verb is enough.
- **同义堆叠**: `努力和尝试`、`机会与可能`. Pick one.
- **机械连接词**: 段段都有 `此外，/ 然而，/ 而且，`. Delete most of them.

If any of these survive, the leaf is not done.

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
   - In prose, localize units where it improves readability: "8520 亿美元",
     not "$852B"; the number stays. Table cells have stricter rules below.
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
- **Mixed proper nouns + descriptive English**: keep the proper noun,
  translate the ordinary descriptor. Do not leave a whole cell in English
  just because one token is a company, product, API, or market acronym.
  "U.S. enterprise sample" → "美国企业样本"; "Global retail/CPG" →
  "全球零售 / CPG"; "API platform / Responses API" →
  "API 平台 / Responses API".
- **Sentence cells**: apply the prose translation philosophy above.
- **Cells that are mostly proper nouns + a small connector**: keep
  the proper nouns and translate only the connector. "Microsoft &
  Azure" → "Microsoft 与 Azure".
- **Pure model / version / SKU lists**: keep Latin tokens and normalize
  separators if useful. "GPT-5.x, GPT-4.1, o1, GPT-4o" →
  "GPT-5.x、GPT-4.1、o1、GPT-4o" is acceptable because every token is a
  model/version name.

## Figures

Figures (`figures/[]`) are charts. The renderer reads everything from
`figure.data.{items,nodes,edges,points,columns,rows,series,layers,xAxis,yAxis}`,
not from top-level keys, so reader-visible chart text is two layers
deep. Translate every reader-facing string under `data/`; leave
identifiers, enums, refs, and numerics alone.

- **Translate**: `title`, `subtitle`, `summary`, `description`,
  `caption`, `insight`, `basis`, `notes`, `approximationNotes`, the
  axis-label shapes (`xAxisLabel` / `yAxisLabel` / `xLabel` / `yLabel`
  / `xAxis` / `yAxis` / `xAxis.label` / `yAxis.label` /
  `data.xAxis` / `data.yAxis` / `data.xAxis.label` / `data.yAxis.label`
  / `data.xAxis.high|low` / `data.yAxis.high|low`), every
  `label` / `name` / `detail` / `description` / `note` / `notes` /
  `text` / `relationship` / `lowLabel` / `highLabel` / `examples` /
  `context` under `data.items[]` / `data.nodes[]` / `data.edges[]` /
  `data.points[]` / `data.layers[]` / `data.layers[].items[]` /
  `data.layers[].modules[]` / `data.layers[].outputs[]` / `data.series[]`
  / `data.series[].points[]` / `data.columns[]` / `data.rows[]` /
  `data.rows[].values[]`, and journey-map row text:
  `data.items[].actor` / `actors[]` / `phase` / `stage` / `emotion` /
  `channel` / `channels[]` / `touchpoints[]`, plus
  `data.nodes[].risk` / `segment`.
- **Never translate unless the exact path is explicitly listed above as
  visible chart text**: `id`, `key`, `slug`, `type`, `kind`, `layout`,
  `tone`, `status`, `sentiment`, `direction`, `trend`, `confidence`,
  `group`, `stage`, `phase`, `category`, `segment`, `unit`, `value`,
  `displayValue`, `date`, `delta`, `from`, `to`, `source`, `target`,
  `claimRef`, `claimRefs[]`, `sourceRefs[]`, `captionSources[]`,
  `xAxis.high|low` numerics, `yAxis.high|low` numerics. These are
  enum keys, chart geometry, refs, numbers, or publisher names — they
  drive CSS classes and bucketing logic in
  [website/src/lib/figures.mjs](../../../website/src/lib/figures.mjs)
  and [FigureRenderer.astro](../../../website/src/components/FigureRenderer.astro).

`scripts/whitelist.mjs` enforces this list — if a future figure shape
adds a new visible-text key, add it to `FIGURE_PATHS` there before
translating, otherwise the extractor will silently skip it and the
chart will render English in a Chinese page.

Style notes specific to figure text:

- Node / column / row / phase **labels** are 2–6 character headings.
  Translate as short noun phrases; drop articles. "Foundation control"
  → "基金会控制"; "OpenAI Group PBC" → keep verbatim.
- Mixed labels follow the same rule as table cells: keep brands/products,
  translate ordinary descriptors. "Meta / open weights" →
  "Meta / 开放权重"; do not keep the whole label English because it starts
  with a proper noun.
- `detail` / `description` / `note` are one-sentence captions that
  appear in tooltips. Apply the prose translation philosophy: lead
  with the topic, drop `对……来说`, prefer concrete verbs.
- Pure model / version / SKU lists in figure details may stay Latin with
  Chinese separators: "GPT-5.x、GPT-4.1、o1、GPT-4o" is fine.
- Axis labels often carry a parenthetical unit hint
  ("Inference Speed (tokens/sec, mid-size LLMs)"). Translate the
  prose, keep the parenthetical units verbatim:
  "推理速度（tokens/sec，中型 LLM）".
- Quadrant `high` / `low` labels are 2–4 character endpoints
  ("Single market (UAE)" / "Multi-market MENA"). Translate as short
  labels; do not narrate.

## Workflow

For one report folder (`reports/<runId>/`), translate `summary-card.yaml`
and `full-report.yaml` using the sparse-bundle pipeline. The bundle keeps
the source's nested shape, omits non-translatable keys, and uses `null`
placeholders only where arrays need index alignment. Translate the bundle
in place, then import that same updated file back into the applier.

```sh
set -e
RUN_ID=<runId>
export CACHE=".translate-cache/$RUN_ID"
mkdir -p "$CACHE"
```

The parent agent owns every script command in this workflow: export, split,
merge, import, apply, and validation. Do not delegate those commands to a
translation subagent or a free-form helper that might reinterpret them.
Subagents only edit their assigned sparse `parts/part.NNN.yaml` file in place.
Keep `set -e` active whenever chaining merge/import/apply/check commands; if
merge fails, stop there and repair the bundle before writing any final
`*.zh.yaml` overlay.

### summary-card.yaml

`summary-card.yaml` is small (~11 leaves: `summary.headline` + the three
list arrays `topStrengths` / `topRisks` / `unresolvedGaps`). Translate it
inline in one pass — no splitting, no subagents.

```sh
# 1. Export sparse bundle.
node .agents/skills/translate-zh/scripts/bundle-translatable.mjs export \
  reports/$RUN_ID/summary-card.yaml --out "$CACHE/summary-card.translate.yaml"

# 2. Translate $CACHE/summary-card.translate.yaml in place. Same keys, same
#    array order, every string value translated. Run the mandatory 3-pass
#    workflow (pre-pass → draft → revision → final write).

# 3. Import + apply + check.
node .agents/skills/translate-zh/scripts/bundle-translatable.mjs import \
  reports/$RUN_ID/summary-card.yaml "$CACHE/summary-card.translate.yaml" \
  --out "$CACHE/summary-card.zh.json"
node .agents/skills/translate-zh/scripts/apply-translation.mjs \
  reports/$RUN_ID/summary-card.yaml "$CACHE/summary-card.zh.json"
node .agents/skills/translate-zh/scripts/check-translation.mjs reports/$RUN_ID --strict
```

Notes specific to this file:

- `summary.headline` is the single sentence shown on the list card and on
  the detail-page cover. Read as one fluent Chinese clause — no English
  clause shape, no `对……来说`, no trailing modifier pile.
- `topStrengths` / `topRisks` / `unresolvedGaps` are 1-sentence bullets.
  Keep them parallel: every bullet in an array follows the same sentence
  shape (e.g. all noun-phrase, or all verb-led).
- Everything else (`schemaVersion`, `artifact`, `slug`, `runDate`,
  `company.*`, `revision.*`, `summary.overallScore`, `recommendation`,
  `confidence`, `riskRating`, `valuationStance`, `keyMetrics.*`,
  `sourceStats.*`) is whitelisted out of the bundle and passes through
  verbatim. Do not translate; do not even include in the bundle.
- The `summaryCard` whitelist is a strict subset of `fullReport`, so any
  mistake here (translating an enum, dropping a hedge) shows up
  immediately on the list page.

### full-report.yaml

A typical full-report has 1500–2500 leaves. If the sparse bundle fits in
the model context window, translate it in one pass like summary-card
above. If not, split into same-shape sparse parts and translate the parts
concurrently with subagents.

```sh
mkdir -p "$CACHE/parts"

# 1. Export sparse bundle. Mechanical table values (numbers, currency,
#    dates, n/a) are skipped by default — they fall back to English.
node .agents/skills/translate-zh/scripts/bundle-translatable.mjs export \
  reports/$RUN_ID/full-report.yaml --out "$CACHE/full-report.translate.yaml"

# 2a. Single-pass option — translate $CACHE/full-report.translate.yaml in
#     place; skip step 2b. Keep keys, array positions, and `null`
#     placeholders unchanged.

# 2b. Concurrent option — split, then spawn one subagent per part.
node .agents/skills/translate-zh/scripts/bundle-translatable.mjs split \
  "$CACHE/full-report.translate.yaml" --out-dir "$CACHE/parts" \
  --max-chars 45000 --max-items 400

# Spawn one subagent per part.NNN.yaml. See "Subagent contract" below for
# the verbatim prompt template — each subagent edits exactly one part file
# in place, no other commands.

# Wait for all part.*.yaml to be translated in place, then merge back into
# the same full-report sparse bundle path. First verify that every part still
# has the same number of string leaves as the split manifest.
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
const dir = `${process.env.CACHE}/parts`;
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
function countLeaves(node) {
  if (node == null) return 0;
  if (typeof node === 'string') return 1;
  if (Array.isArray(node)) return node.reduce((sum, item) => sum + countLeaves(item), 0);
  if (typeof node === 'object') return Object.values(node).reduce((sum, item) => sum + countLeaves(item), 0);
  return 0;
}
for (const part of manifest.parts) {
  const doc = yaml.load(readFileSync(join(dir, part.file), 'utf8')) ?? {};
  const actual = countLeaves(doc);
  if (actual !== part.leaves) throw new Error(`${part.file}: expected ${part.leaves}, got ${actual}`);
}
console.log(`[bundle] part leaf counts verified (${manifest.parts.length} part(s))`);
NODE
node .agents/skills/translate-zh/scripts/bundle-translatable.mjs merge \
  "$CACHE"/parts/part.*.yaml --out "$CACHE/full-report.translate.yaml"

# 3. Import + apply + check.
node .agents/skills/translate-zh/scripts/bundle-translatable.mjs import \
  reports/$RUN_ID/full-report.yaml "$CACHE/full-report.translate.yaml" \
  --out "$CACHE/full-report.zh.json"
node .agents/skills/translate-zh/scripts/apply-translation.mjs \
  reports/$RUN_ID/full-report.yaml "$CACHE/full-report.zh.json"
node .agents/skills/translate-zh/scripts/check-translation.mjs reports/$RUN_ID --strict --require-final
```

Use `--include-mechanical` only when you want numeric-looking table cells
in the bundle for review. In normal Chinese overlays, omitting them is
better — the renderer falls back to the source value verbatim.

### Subagent contract (concurrent part translation)

Every translation subagent the parent spawns gets exactly one part file and
must edit that file in place. Past failures: subagents invented helper
scripts (`MODULE_NOT_FOUND`), wrote outputs to `/tmp/...` instead of the
provided `.translate-cache/<runId>/parts/part.<NNN>.yaml`, or used
`require()` in this ESM repo (`require is not defined in ES module scope`).
Pin the contract by spawning each subagent with this prompt verbatim,
substituting only the bracketed values:

```
You are translating one part of a Chinese diligence-report overlay.

TARGET (read/write): /home/ythuang/workspace/startup/.translate-cache/<runId>/parts/part.<NNN>.yaml

Workflow:
1. Read the TARGET file in full.
2. Run the mandatory 3-pass workflow from .agents/skills/translate-zh/SKILL.md:
   pre-pass → draft → revision (cover English, walk soundcheck and
   anti-pattern table) → final write.
3. Update TARGET in place with the same keys, the same array length and
  order, and `null` placeholders left as `null`. Translate every non-null
  string value. Do not add new keys, do not drop keys, do not change the
  YAML shape.

Hard constraints — do NOT do any of these:
- Do NOT run `node`, `npm`, or any other command. Subagents only read
  one file and write one file.
- Do NOT invoke any script under `.agents/skills/translate-zh/scripts/`
  or any file you assume exists (`script.js`, `script_prose.js`, etc.).
  Those scripts are only for the parent agent.
- Do NOT write anywhere except the single TARGET path above. No `/tmp`,
  no extra `.json` / `.zh.json` files, no batch directories.
- Do NOT touch the English source under `reports/<runId>/` and do NOT
  read or modify any other `parts/part.*.yaml` file.
- Do NOT fetch URLs or invent facts.

Return when TARGET has been updated in place. The parent will merge all parts.
```

If the parent agent ever needs to run a one-off Node snippet for
inspection, this repo is ESM — use `import` syntax, not `require`. The
canonical idiom:

```sh
cd /home/ythuang/workspace/startup
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
// ... your code ...
NODE
```

Always `cd` to the workspace root first; `js-yaml` lives in the root
`package.json` and any inline script that imports it must run from there.

## Validator failures

`check-translation.mjs` failure modes and fixes:

- **`missing` — required Chinese mirror is missing**: final completion now
  requires both `summary-card.zh.yaml` and `full-report.zh.yaml`. Finish the
  missing overlay, then re-run with `--require-final`.
- **`shape` — key missing / extra in zh**: the sparse bundle was edited
  in a way that changed object keys. Prefer repairing the affected object in
  the current bundle or part. Re-export only that affected bundle/part if the
  local shape is too corrupted to repair safely; do not restart the whole
  report translation.
- **`shape` — array length mismatch**: a part's array was reordered or
  had entries added / removed during translation. Restore the affected array
  length/order in place. If needed, re-export only the affected part/subtree
  and re-translate that slice without touching the rest of the report.
- **`preserve` — non-translatable leaf changed**: a translation slipped
  past the whitelist (often an enum value or an ID). Find the offending
  path in the bundle, restore the original value, re-import, re-apply.
- **`translate` — leaf still looks English**: `--strict` found a missing,
  empty, byte-identical, or no-CJK translation leaf. Rewrite the value in the
  existing `*.translate.yaml` bundle or affected `parts/part.NNN.yaml`, then
  re-import and re-apply. This is a targeted leaf fix; do not redo unrelated
  leaves.

`bundle-translatable.mjs import` failure modes:

- **`translated array is longer than source array`**: a part grew extra
  entries during translation. Trim back to source length.
- **`key is not present in source`** / **`translated object does not
  match source shape`**: a part introduced new keys or changed shape.
  Re-export from the English source and try again.
- **`merge input does not match split manifest`**: at least one split part
  is missing, unexpected, or not from the current manifest. Finish or restore
  the affected `parts/part.NNN.yaml` file, then merge again.
- **`merged leaf count mismatch`**: a translated part changed sparse shape
  while still parsing as YAML. Do not import/apply after this error. Compare
  each `parts/part.NNN.yaml` string-leaf count against `parts/manifest.json`
  and repair the mismatched part first. If the bad path is not obvious,
  re-export the English report into a temporary cache, split it with the same
  limits, and compare the original vs translated string-path sets for that
  one part. Table rows are the common culprit: inspect exact whitespace with
  `sed -n 'START,ENDl'` and parse the row to confirm each cell remains a
  sibling array item rather than being folded into the previous cell.

## Common pitfalls

- Translating an enum value in the YAML (the website maps
  `recommendation: research-more` to "继续研究" via `displayLabel`;
  the YAML stays English).
- Reordering, merging, or splitting list items — schema validators
  address rows by index.
- Translating source titles / publishers / `keyQuote` — excluded by
  the whitelist; they stay in the original publication's language.
- Adding parenthetical Chinese aliases for companies / products
  ("OpenAI（开放人工智能）" — never).
- Translating a mechanical table cell (number, currency, date, `n/a`).
  These are skipped by `bundle-translatable.mjs export` for a reason;
  the renderer falls back to the English source verbatim.
- Leaving byte-identical short labels that include an English descriptor.
  Proper nouns stay Latin, but the reader-facing descriptor still needs
  Chinese: `U.S. federal courts` -> `美国联邦法院`, `Series E at $61.5B` ->
  `Series E 轮，估值 $61.5B`, `Responsible Scaling Policy v3.2` ->
  `Responsible Scaling Policy v3.2（负责任扩展政策）`.

