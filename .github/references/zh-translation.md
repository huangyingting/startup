# Simplified Chinese translation rules

These rules apply to every Simplified Chinese sibling artifact: `01–08.zh.yaml`, `101-report-document.zh.yaml`, and `102-report-card.zh.yaml`.

## Scope

Each Simplified Chinese file is a structurally identical translation of its English source. Translate every user-visible prose string. Preserve schema keys, IDs, URLs, dates, numbers, booleans, nulls, enums, and array order exactly. Do not add facts, change claims, soften or strengthen the investment view, or use `web_search`.

## Translate

Walk the document and translate the value of every one of these fields wherever they appear:

- `chapter.title`, `chapter.summary`
- `startupIntroduction.summary`, `productSummary`, `customerFocus`, `businessModel`, `stage`, `fundingStatus`, `headquarters`, `foundingLocation`
- `startupIntroduction.founders[].role`, `background`
- `coverMetrics[].label`, `coverMetrics[].unit`
- `company.subtitle`, `company.sector`, `company.stage`, `company.headquarters`, `company.shortDescription`
- `reportMeta.title`, `title`, `subtitle`, `headline`
- `chapters[].title`, `chapters[].sections[].title`
- For every block in `chapters[].sections[].blocks[]` and `appendices[].blocks[]`: `title`, `body`, every entry of `items[]`
- For every `callouts[]` entry: `title`, `body`
- For every `tables[]` entry: `title`, `columns[]`, every natural-language cell in `rows[][]`, `notes`
- For every `figures[]` entry: `title`, `summary`, `approximationNotes`, `data.xAxis`, `data.yAxis`, and the `label` / `detail` of every `nodes[]`, `items[]`, `layers[]`, `points[]`, `series[]`, `series[].points[]`, `columns[]`, `rows[]`, `rows[].values[]`, `edges[].label`, `layers[].modules[]`, `layers[].outputs[]`
- For every `sections[]` entry: `title`, `body`
- `topStrengths[]`, `topRisks[]`, `unresolvedGaps[]` entries
- `disclaimer`
- `evidenceGaps[].gap`, `evidenceGaps[].diligencePath`
- `coverage.sourceDiversityNotes`, `coverage.deduplicationNotes`, `coverage.recencyNotes`, `coverage.coverageGaps[]`
- `localEvidence.coverage.*` notes if present, and any `notes` field on a claim or source
- Other free-text user-facing fields defined by the schema

## Preserve exactly

Never translate, reword, or reorder:

- All schema keys.
- All IDs: `S###`, `C###`, `T###`, `F###`, section numbers, chapter numbers.
- All URLs, email addresses, dates (`YYYY-MM-DD`), numeric values, booleans, nulls.
- All enum values: `recommendation`, `confidence`, `riskRating`, `valuationStance`, `tone`, `type`, `layout`, `claimType`, `freshness`, `corroboration`, `independence`, `reputationTier`, `sourceType`, block `type`, `calloutType` enum values.
- `claim.statement` and `source.keyQuote`: these are evidence quotes; keep them in the source language.
- Company, product, person, and investor proper names; keep the common English form unless a standard Simplified Chinese name is unambiguous.
- Order of arrays and shape of every nested object.
- `reportFiles.reportDocument`, `reportFiles.reportCard`, and all metric keys under `keyMetrics`.
- Numeric values in `coverMetrics[].value` strings such as `$183B`, `>30,000`, percentages such as `36.6x`, abbreviations such as `SOC 2`, `HIPAA`, `API`, `SaaS`. Translate the surrounding label, not the shorthand.

## YAML serialization style

The Simplified Chinese file should look structurally identical to the English source so reviewers can diff line-by-line.

- Match the English file's flow vs block style for every collection. If `tables[].columns` is written as a flow sequence (`[A, B, C]`) in English, write it as a flow sequence in Chinese; if it is block style, keep it block style.
- Match the English file's indentation, key order within each mapping, scalar quoting (plain, single-quoted, double-quoted, folded `>`, literal `|`), and use of `null` vs empty.
- Keep array element ordering and nested object ordering identical.
- Do not let the YAML serializer reformat the document. If the writer's default differs from the English source, post-process or hand-format so the structure matches.
- The Chinese file's line count should be within roughly ±10% of the English source. A large discrepancy almost always means style was not preserved or content was added/dropped; investigate before saving.

## Native-speaker style

Translate to natural, professional Simplified Chinese suitable for a Chinese-speaking VC investment committee. Aim for the writing quality of a Chinese-language equity research note, not a literal English-to-Chinese mapping. The reader should not be able to tell the source language is English.

### Sentence-level rewrites (required, not optional)

- Restructure sentences for Chinese natural order. English passive ("Anthropic was founded by ...") becomes active ("Anthropic 由 ... 创办"). English noun-heavy chains ("the durability of revenue retention") become Chinese verb-driven phrases ("收入留存的可持续性" 但更自然的写法："收入留存能否持续"). English long sentences with relative clauses split into shorter Chinese clauses joined by 而 / 但 / 同时 / 因此.
- Drop English filler that is awkward in Chinese: 的 应当节制使用; 一个/这个/那个 不要无脑加在专有名词前。Avoid 进行/作出/给出 + 名词 这种动词弱化。例如 `do diligence on` 译为 "尽调 X" 而非 "对 X 进行尽职调查"；`make an investment in` 译为 "投资 X" 而非 "对 X 进行投资"；`provide visibility into` 译为 "让人看清 X" 或 "披露 X"。
- Avoid mechanical 1:1 translation of connectors. English `because / however / therefore` map to Chinese `因为/但/因此`, but a fluent translator often drops or replaces them: `因为... 所以...` 在书面语里通常只保留 `所以`/`故` 一侧；`however` 经常译为 `但`/`不过`/`然而`，根据语气选用。
- Use Chinese investor/finance idioms instead of literal phrases:
  - "elite scale" → "顶级规模" / "罕见的体量"，不要 "精英规模"
  - "underwrite" (作为投资术语) → "承销" 在监管/承保语境下；在 VC 语境下译 "支撑估值" 或 "纳入投资判断"
  - "moat" → "护城河"
  - "wedge" (产品 wedge) → "切入点" 或 "立足点"
  - "exposure" → "敞口"，不要 "暴露"
  - "burn rate" → "现金消耗速度" 或 "烧钱速度"，不要 "燃烧率"
  - "payback" → "回本周期" 或 "回收期"
  - "stake" → "股权" 或 "份额"，不要 "桩"
  - "headwinds / tailwinds" → "逆风 / 顺风"
  - "supersede" → "取代" 或 "覆盖"，不要 "超越"
- Translate adjective+noun pairs as Chinese 4 字短语或定语从句，不要逐词堆砌。例如 "stretched valuation" → "估值偏高" 或 "估值偏紧" 而非 "拉伸的估值"；"durable retention" → "持久留存" 或 "留存稳定" 而非 "耐用的留存"。
- 不要把英文专有缩略保留在中文句子中央造成生硬。`API` `SaaS` `SOC 2` `HIPAA` `IPO` `CAC` `LTV` `NRR` `GRR` `ARR` 这类业内通用缩略可以保留在句中，但前后用空格隔开避免连读，例如 "通过 API 提供服务" 而非 "通过API提供服务"。
- 不要在中文句子里夹杂未必要的英文短语翻译注释。如果原文是 "go-to-market (GTM)"，中文写 "市场进入策略（GTM）" 即可，不要重复翻译两次。

### Numbers, currency, and units

- 美元金额：`$30B` 在 cell/short label 可保留原样；在 prose 中改写为自然中文 "300 亿美元"。`$1.5B Bartz settlement` 在叙述里写 "15 亿美元的 Bartz 和解金"。`>$30B` 写 "超过 300 亿美元"。`$30B+` 写 "300 亿美元以上"。
- 倍数：`12.7x` 在 prose 中可保留为 "约 12.7 倍" 或 "12.7x"；在表格 cell 保持原样以便 diff。
- 百分比：`33.2% CAGR` 写 "33.2% 的复合年增长率（CAGR）" 或更自然的 "复合年增长率 33.2%"。
- 时间表达：`February 2026` 在 prose 中写 "2026 年 2 月"；`Q1 2026` 写 "2026 年第一季度"；`H2 2025` 写 "2025 年下半年"。日期型字段（`YYYY-MM-DD`）按"保留"规则原样不动。
- 客户/员工数：`1,000+` 在 prose 中写 "超过 1,000 家" / "1,000 余家"；`8 of 10` 写 "10 家中的 8 家" 或 "财富 10 强中的 8 家"。

### Punctuation

- 中文使用全角标点：`，。：；！？（）"" ''`，不使用半角 `,.:;!?()` 在中文句子内。
- 英文公司名、产品名、缩略词周围用半角空格隔开两侧的中文字符，例如 "依靠 Claude 与 GPT-5 的差异" 而非 "依靠Claude与GPT-5的差异"。
- 数字和单位之间不加空格："300 亿美元" 写法可统一为 "300亿美元" 或 "300 亿美元"，全文保持一致；推荐数字与中文量词之间留空格。
- 顿号 `、` 用于并列名词；逗号 `，` 用于句间停顿。`A, B, and C` 译为 "A、B、C" 或 "A、B 和 C"，避免 "A，B，C"。
- 引号统一用 `""` 与 `''`，不用 `""` 或 ` `` `。

### Glossary (canonical translations — use these unless a section-specific gloss demands otherwise)

| English | Chinese | Notes |
|---|---|---|
| recommendation | 投资建议 | |
| confidence | 置信度 | |
| risk rating | 风险评级 | |
| valuation stance | 估值立场 | |
| moat | 护城河 | |
| anti-thesis | 反向论点 | |
| thesis | 投资论点 | |
| run-rate revenue | 收入运行率 | 不译为"运行收入" |
| ARR | ARR | 保留缩略；首次出现可补"年化经常性收入（ARR）" |
| NRR / GRR | 净/总收入留存率 | NRR=净，GRR=总 |
| CAC / LTV / payback | 获客成本 / 客户终身价值 / 回收期 | |
| burn / runway | 烧钱速度 / 现金跑道 | |
| valuation | 估值 | |
| post-money | 投后估值 | |
| pre-money | 投前估值 | |
| Series F / G | F 轮 / G 轮 | 不译为"系列" |
| preemptive offer | 抢投要约 | |
| secondary pricing | 二级市场定价 | |
| capitalization / cap table | 股权结构 | |
| liquidation preference | 清算优先权 | |
| due diligence | 尽职调查（首次） / 尽调（之后） | |
| diligence gap | 尽调缺口 | |
| evidence gap | 证据缺口 | |
| coverage | 覆盖度 | |
| public benefit corporation (PBC) | 公益公司（PBC） | |
| compute / compute commitment | 算力 / 算力承诺 | |
| inference / training | 推理 / 训练 | |
| token | token | 保留 |
| context window | 上下文窗口 | |
| agentic / agent | 代理式 / 智能体 | |
| workflow | 工作流 | |
| copilot | 副驾产品 / Copilot | 通用语境译 "副驾"，产品名保留 |
| frontier model | 前沿模型 | |
| benchmark | 基准（一般）/ 跑分（榜单） | |
| leaderboard | 排行榜 | |
| ROI | 投资回报率 | |
| TAM / SAM / SOM | 总潜在市场（TAM） / 可服务市场（SAM） / 可获取市场（SOM） | 后续可仅用缩略 |
| go-to-market (GTM) | 市场进入策略（GTM） | |
| enterprise | 企业级 | 修饰词；名词时译"企业" |
| customer concentration | 客户集中度 | |
| churn | 流失 | logo churn = "客户流失" |
| retention | 留存 | |
| margin / gross margin / contribution margin | 利润率 / 毛利率 / 贡献利润率 | |
| disclosure | 披露 | |
| IPO readiness | IPO 就绪度 | |
| stop-loss | 止损 | |
| underwriting | 承销（金融语境）/ 投资判断（VC 语境） | |
| postmortem | 事后分析 | |
| regression | 回归（质量回归）/ 回退 | |
| outage | 故障 / 停机 | |
| trust center | 信任中心 | |
| SOC 2 / ISO / HIPAA / BAA / DPA | 全部保留 | |
| litigation | 诉讼 | |
| settlement | 和解（动作）/ 和解金（金额） | |
| copyright | 版权 | |
| data provenance | 数据来源 | |
| safety / responsible scaling | 安全 / 负责任扩展 | |
| frontier AI | 前沿 AI | |

### Bad → Good examples (apply the same patterns elsewhere)

- ❌ `Anthropic 是一家成立于 2021 年的 AI 安全与研究公司，由 Dario Amodei、Daniela Amodei 等前 OpenAI 研究人员和高管创立。`
  ✅ `Anthropic 成立于 2021 年，定位为 AI 安全与研究公司，由 Dario Amodei、Daniela Amodei 等前 OpenAI 研究人员和高管创办。`
- ❌ `公司报告 2026 年收入运行率超过 300 亿美元，企业客户超过 300,000 家。`（直译）
  ✅ `公司披露 2026 年收入运行率已突破 300 亿美元，企业客户超过 30 万家。`（数字本地化、动词更准）
- ❌ `Anthropic 完成 130 亿美元 F 轮融资，投后估值 1830 亿美元。`（无问题，但语序可优化）
  ✅ `Anthropic 完成 130 亿美元 F 轮融资，投后估值达 1830 亿美元。` 或 `Anthropic 在 F 轮融资 130 亿美元，投后估值 1830 亿美元。`
- ❌ `这一 governance posture 对尽调来说并不是表面文章。`（夹英文）
  ✅ `这一治理姿态对尽调而言并非表面文章。`
- ❌ `如果增长可净留存、算力效率改善且企业工作流产品维持溢价定价，公司仍可能具吸引力。`（句式生硬）
  ✅ `如果增长能在净额口径下持续、算力效率改善、企业工作流产品维持溢价，公司仍具吸引力。`
- ❌ `估值倍数将压缩至高增长基础设施软件的水平。`（"压缩"误译）
  ✅ `估值倍数将向高增长型基础设施软件的水平回归。`
- ❌ `投资人应只在估值能在完成法律、算力、留存与利润率尽调后仍留有上行空间时寻求准入。`（英文式从句）
  ✅ `投资人应在完成法律、算力、留存与利润率尽调后，仅在估值仍留有上行空间时入场。`

## Completion check before saving

Run these checks and fix any failure rather than saving a partial translation:

1. Residual-English sweep: search the output for ASCII letter runs of 4 or more characters inside translatable fields. Allowed: proper names, product names, ticker symbols, IDs, URLs, enum values, currency shorthand such as `$30B`, percentages such as `36.6x`, and abbreviations such as `SOC 2`, `HIPAA`, `API`, `SaaS`. Anything else that is an English word or sentence must be translated, then re-run the sweep.
2. Structural parity: counts of `chapters`, `sections`, `blocks`, `tables`, `tables[].rows`, `tables[].columns`, `figures`, `figures[].data` arrays, `appendices`, `appendices[].blocks`, `coverMetrics`, `founders`, and every other array equal the English source.
3. ID/reference parity: every `claimRefs`, `sourceRefs`, `tableRef`, `figureRef`, `S###`, `C###`, `T###`, `F###` value is byte-identical to the English source.
4. Style parity: line count is within roughly ±10% of the English source.
5. Parse: the file parses as YAML and starts with `schemaVersion: startup-diligence-report-v2`.
6. Native-speaker self-review: re-read every translated paragraph as a Chinese-speaking VC partner. Flag and rewrite any sentence that:
   - sounds like a direct word-for-word translation;
   - contains 翻译腔 markers such as "进行+名词" / "作出+名词" / "给予+名词" / 多余的"的" / 滥用 "被" 字句;
   - uses English glossary terms inconsistent with the canonical glossary above;
   - mixes half-angle punctuation inside Chinese sentences;
   - leaves English words inside Chinese sentences without surrounding spaces;
   - uses anglicized phrases like "拉伸的估值" / "燃烧率" / "暴露于风险" instead of the idiomatic Chinese investor terms.
   Apply the bad → good rewrite patterns and re-run the sweep until no flagged sentence remains.

