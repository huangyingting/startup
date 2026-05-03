# Simplified Chinese translation rules

Applies to every Simplified Chinese sibling artifact:

- `01`–`08.zh.yaml`
- `101-report-document.zh.yaml`
- `102-report-card.zh.yaml`

## Purpose

Each `.zh.yaml` file is a structurally identical Simplified Chinese version of its English source. Translate user-visible prose only. Preserve facts, IDs, numbers, enum values, references, and structure exactly.

## Hard rules

- Do not add facts.
- Do not remove facts.
- Do not soften, strengthen, or reinterpret claims.
- Do not use search while translating.
- Do not translate schema keys, IDs, enum values, URLs, dates, numeric values, booleans, or nulls.
- Keep company, product, person, and investor proper names in their common English form unless a standard Simplified Chinese name is unambiguous.

## Translate these fields

Translate user-visible prose wherever these fields appear:

- `chapter.title`, `chapter.summary`
- `startupIntroduction.summary`, `productSummary`, `customerFocus`, `businessModel`, `stage`, `fundingStatus`, `headquarters`, `foundingLocation`
- `startupIntroduction.founders[].role`, `startupIntroduction.founders[].background`
- `coverMetrics[].label`, `coverMetrics[].unit`
- `company.subtitle`, `company.sector`, `company.stage`, `company.headquarters`, `company.shortDescription`
- `reportMeta.title`, `title`, `subtitle`, `headline`
- `chapters[].title`, `chapters[].sections[].title`
- block `title`, `body`, and every `items[]` entry in chapter sections and appendices
- `callouts[].title`, `callouts[].body`
- `tables[].title`, `tables[].columns[]`, natural-language cells in `tables[].rows[][]`, `tables[].notes`
- `figures[].title`, `figures[].summary`, `figures[].approximationNotes`
- figure `data.xAxis`, `data.yAxis`, labels/details in `nodes[]`, `items[]`, `layers[]`, `points[]`, `series[]`, `series[].points[]`, `columns[]`, `rows[]`, `rows[].values[]`, `edges[].label`, `layers[].modules[]`, `layers[].outputs[]`
- `sections[].title`, `sections[].body`
- `topStrengths[]`, `topRisks[]`, `unresolvedGaps[]`
- `disclaimer`
- `evidenceGaps[].gap`, `evidenceGaps[].diligencePath`
- `coverage.sourceDiversityNotes`, `coverage.deduplicationNotes`, `coverage.recencyNotes`, `coverage.coverageGaps[]`
- `localEvidence.coverage.*` notes when present
- claim/source `notes` fields when user-facing
- any other schema-defined free-text prose field

## Preserve exactly

Never translate, reword, or reorder:

- schema keys;
- all IDs: `S###`, `C###`, `T###`, `F###`, section numbers, chapter numbers;
- URLs, email addresses, dates (`YYYY-MM-DD`), numeric values, booleans, nulls;
- enum values, including `recommendation`, `confidence`, `riskRating`, `valuationStance`, `tone`, `type`, `layout`, `claimType`, `freshness`, `corroboration`, `independence`, `reputationTier`, `sourceType`, block `type`, and `calloutType`;
- `claim.statement` and `source.keyQuote`, because they are evidence quotes/statements;
- array order and nested object shape;
- `reportFiles.reportDocument`, `reportFiles.reportCard`;
- metric keys under `keyMetrics`;
- abbreviations and standard tokens such as `SOC 2`, `HIPAA`, `API`, `SaaS`, `IPO`, `ARR`, `NRR`, `GRR`, `CAC`, `LTV`.

## YAML style parity

The Chinese file should preserve structure exactly; cosmetic YAML style should be stable enough to review without becoming a false blocker.

- Preserve key order, array order, nested object shape, and `null` usage.
- Keep array ordering and nested object ordering identical.
- Avoid serializer churn that rewrites unrelated quoting or collection style.
- Do not use line count as a hard rule; use structural parity and copied-English checks instead.

## Native Chinese style

Write natural, professional Simplified Chinese suitable for a Chinese-speaking VC investment committee. Avoid translationese.

### Sentence rewriting

- Use Chinese natural word order.
- Split long English relative clauses into shorter Chinese clauses.
- Prefer active Chinese phrasing: `Anthropic 由 ... 创办` rather than literal passive structures.
- Avoid weak verb patterns such as `进行+名词`, `作出+名词`, `给予+名词` when a direct verb works.
- Use `尽调` after the first `尽职调查` mention.
- Avoid overusing `的`, `被`, `一个`, `这个`, `那个`.
- Translate connectors by meaning, not mechanically. `however` can be `但` / `不过` / `然而`; `because...therefore` often needs only one connector in Chinese.

### Investor terminology

Use idiomatic finance/investment terms:

| English | Chinese |
|---|---|
| recommendation | 投资建议 |
| confidence | 置信度 |
| risk rating | 风险评级 |
| valuation stance | 估值立场 |
| thesis | 投资论点 |
| anti-thesis | 反向论点 |
| moat | 护城河 |
| wedge | 切入点 / 立足点 |
| exposure | 敞口 |
| burn rate | 现金消耗速度 / 烧钱速度 |
| runway | 现金跑道 |
| payback | 回本周期 / 回收期 |
| stake | 股权 / 份额 |
| headwinds / tailwinds | 逆风 / 顺风 |
| supersede | 取代 / 覆盖 |
| run-rate revenue | 收入运行率 |
| ARR | ARR / 年化经常性收入（ARR） |
| NRR / GRR | 净/总收入留存率 |
| CAC / LTV / payback | 获客成本 / 客户终身价值 / 回收期 |
| post-money / pre-money | 投后估值 / 投前估值 |
| Series F / G | F 轮 / G 轮 |
| secondary pricing | 二级市场定价 |
| capitalization / cap table | 股权结构 |
| liquidation preference | 清算优先权 |
| diligence gap / evidence gap | 尽调缺口 / 证据缺口 |
| public benefit corporation (PBC) | 公益公司（PBC） |
| compute / compute commitment | 算力 / 算力承诺 |
| inference / training | 推理 / 训练 |
| agentic / agent | 代理式 / 智能体 |
| frontier model / frontier AI | 前沿模型 / 前沿 AI |
| benchmark / leaderboard | 基准或跑分 / 排行榜 |
| TAM / SAM / SOM | 总潜在市场（TAM）/ 可服务市场（SAM）/ 可获取市场（SOM） |
| go-to-market (GTM) | 市场进入策略（GTM） |
| customer concentration | 客户集中度 |
| churn / retention | 流失 / 留存 |
| margin / gross margin / contribution margin | 利润率 / 毛利率 / 贡献利润率 |
| IPO readiness | IPO 就绪度 |
| stop-loss | 止损 |
| underwriting | 承销（金融语境）/ 投资判断（VC 语境） |
| outage | 故障 / 停机 |
| trust center | 信任中心 |
| litigation / settlement | 诉讼 / 和解或和解金 |
| data provenance | 数据来源 |
| responsible scaling | 负责任扩展 |

Avoid bad literal translations:

- `stretched valuation` → `估值偏高` / `估值偏紧`, not `拉伸的估值`.
- `durable retention` → `留存稳定` / `留存能否持续`, not `耐用的留存`.
- `burn rate` → `烧钱速度`, not `燃烧率`.
- `exposure to risk` → `风险敞口`, not `暴露于风险`.

## Numbers, currency, and units

- In short labels/table cells, preserve compact values like `$30B` when diff stability matters.
- In prose, localize naturally:
  - `$30B` → `300 亿美元`
  - `>$30B` → `超过 300 亿美元`
  - `$30B+` → `300 亿美元以上`
  - `$1.5B settlement` → `15 亿美元和解金`
- `12.7x` → `约 12.7 倍` in prose; table cells may keep `12.7x`.
- `33.2% CAGR` → `复合年增长率（CAGR）33.2%`.
- `February 2026` → `2026 年 2 月` in prose.
- `Q1 2026` → `2026 年第一季度`.
- `H2 2025` → `2025 年下半年`.
- Date fields in `YYYY-MM-DD` stay unchanged.
- `1,000+` → `超过 1,000 家` / `1,000 余家` as context requires.

## Punctuation

- Use Chinese punctuation in Chinese sentences: `，。：；！？（）`.
- Separate English names/abbreviations from Chinese characters with half-width spaces: `通过 API 提供服务`.
- Use `、` for parallel nouns.
- Keep numeric style consistent across the file.
- Avoid unnecessary English phrase notes inside Chinese prose.

## Bad → good patterns

- ❌ `Anthropic 是一家成立于 2021 年的 AI 安全与研究公司，由 ... 创立。`
  ✅ `Anthropic 成立于 2021 年，定位为 AI 安全与研究公司，由 ... 创办。`
- ❌ `收入运行率超过 300 亿美元，企业客户超过 300,000 家。`
  ✅ `收入运行率已突破 300 亿美元，企业客户超过 30 万家。`
- ❌ `这一 governance posture 对尽调来说并不是表面文章。`
  ✅ `这一治理姿态对尽调而言并非表面文章。`
- ❌ `如果增长可净留存、算力效率改善且企业工作流产品维持溢价定价...`
  ✅ `如果增长能在净额口径下持续、算力效率改善、企业工作流产品维持溢价...`
- ❌ `估值倍数将压缩至高增长基础设施软件的水平。`
  ✅ `估值倍数将向高增长型基础设施软件的水平回归。`

## Completion check

Before saving, fix all failures:

1. Residual-English sweep: search translatable fields for ASCII letter runs of 4+ characters. Allowed: proper names, product names, ticker symbols, IDs, URLs, enum values, currency shorthand, percentages, and standard abbreviations.
2. Structural parity: counts of chapters, sections, blocks, tables, rows, columns, figures, appendices, cover metrics, founders, and all other arrays equal the English source.
3. ID/reference parity: all `claimRefs`, `sourceRefs`, `tableRef`, `figureRef`, `S###`, `C###`, `T###`, and `F###` values are byte-identical.
4. YAML parse: file parses and starts with `schemaVersion: startup-diligence-report-v2`.
5. Native-speaker review: rewrite any sentence that sounds word-for-word translated, uses inconsistent glossary terms, mixes punctuation styles, leaves avoidable English, or uses translationese markers.
