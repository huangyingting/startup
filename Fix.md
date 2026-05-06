# Fix.md — `startup-research` skill remediation checklist

合并 [RUN-1.md](RUN-1.md) + [RUN-2.md](RUN-2.md) 的发现，按 **(投入小 × 影响大 × 同时治多个发现)** 排序。每条都给：
- 文件锚点
- 期望行为（diff 描述粒度）
- 验证步骤

> 总体方针：本轮全部改动落在 `check-chapter.mjs` / `finalize.mjs` / `ledger.mjs` / `references/`，**不改 prompt、不改 workflow、不改 SKILL.md 文字**（除非顺手补一行指向新 reference）。所有改动以"信号提前 + 反馈完整"为目标，砍掉 finalize 后回头改的循环。

---

## P0 — 信号提前到 chapter 阶段（每家公司省 3–6 轮回头改）

### [x] P0-1. 给 `check-chapter` 加 `slugConsistency` 维度  ✅ 已完成
**问题**：RUN-2 §A1。Revolut 6 个 chapter 的 `slug:` 漂移要等 finalize 失败才发现。

**真值来源**：`companySlug`，即 folder basename 去掉时间戳前缀。

- folder 由 [new-report.mjs#L176-L177](.agents/skills/startup-research/scripts/new-report.mjs#L176) 创建：`base = '${timestamp}-${slugify(companyName)}'` → `reports/20260506052900-revolut/`
- chapter `slug:` 字段约定 = **`slugify(companyName)`**（即 `revolut`），而不是整个 base
- 计算公式（一行）：`basename(reportFolder).replace(/^\d{14}-/, '')`

**现状**：两种 convention 实际并存（无 check 把关）：
- 正确（多数）：`slug: revolut` / `slug: monzo` / `slug: ramp` / `slug: anthropic` / `slug: cohere` / ...
- 漂移到错误：`slug: 20260506084414-abnormal-security` / `slug: 20260506084415-innovaccer` / `slug: 20260506084416-project44`（RUN-1 那批；写时把整段 base 抄进去了）

**两步落地**：

1. **写约定**：在 [.agents/skills/startup-research/SKILL.md](.agents/skills/startup-research/SKILL.md) "Hard rules" 加一行："Every YAML in `reports/<run>/` (chapter `0X-*.yaml`, `report-meta.yaml`) must set `slug:` to the company slug only — i.e. the report folder basename with the leading `<timestamp>-` stripped (the same value `slugify(companyName)` produces in `new-report.mjs`)."

2. **加校验**：[.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs)
   - 新增 dimension `slugConsistency`：
     ```js
     import { basename } from 'node:path';
     const canonical = basename(reportFolder).replace(/^\d{14}-/, '');
     if (chapterDoc.slug !== canonical) fail('slugConsistency', { actual: chapterDoc.slug, required: canonical });
     ```
   - `FIX_HINTS.slugConsistency = 'Set slug: to <canonical> (folder basename with the <timestamp>- prefix removed).'`
   - 同样的检查也在 [.agents/skills/startup-research/scripts/check-report.mjs](.agents/skills/startup-research/scripts/check-report.mjs) 对 `report-meta.yaml` 跑一次（finalize 阶段兜底）。
   - **副作用**：RUN-1 那 3 份 abnormal-security / innovaccer / project44 报告会立刻 fail。修复方式：一次性 sed 重写它们的 `slug:` 行：
     ```
     sed -i 's/^slug: 20260506084414-abnormal-security$/slug: abnormal-security/' reports/20260506084414-abnormal-security/*.yaml
     # innovaccer / project44 同理
     ```
   随后跑 `npm run validate` 确认全绿。

**验证**：
- 在 [reports/20260506052900-revolut/01-company-overview.yaml](reports/20260506052900-revolut/01-company-overview.yaml) 把 `slug: revolut` 改成 `slug: 20260506052900-revolut`，跑：
  ```
  node .agents/skills/startup-research/scripts/check-chapter.mjs reports/20260506052900-revolut 01-company-overview.yaml --format json
  ```
  应输出 `slugConsistency` 失败并提示 canonical 是 `revolut`；改回后通过。

---

### [ ] P0-2. 给 `check-chapter` 加 `sourceStanceSpread` 维度（每章 ≥1 adverse）
**问题**：RUN-2 §A2。`stance: adverse` 的最小覆盖只在 [check-report.mjs](.agents/skills/startup-research/scripts/check-report.mjs#L245) 的 `checkAdverseDistribution` 里查（report-level），导致每家公司 finalize 时才发现 1–3 章缺 adverse 源。
**改**：[.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs)
- 读 workflow-config 的 `adverseDistribution.requireAtLeastOneAdverseSource` 列表（已存在）。当前章 `key` 出现在该列表里 → `localEvidence.sources[]` 必须有至少 1 条 `stance: adverse`。
- 同步在 [.agents/skills/startup-research/references/chapters.yaml](.agents/skills/startup-research/references/chapters.yaml) 的相关章 `gate` 增加 `minAdverseSources: 1`，或者直接复用 `adverseDistribution` 配置；选一种避免双 source of truth。
- `FIX_HINTS.sourceStanceSpread = 'Add at least one source with stance: adverse (regulator complaint, short report, skeptical analyst note, FT Alphaville-style critique).'`

**验证**：在任何已有 chapter 把所有 `stance: adverse` 改成 `confirming`，跑 `check-chapter --format json`，应见 `sourceStanceSpread` 失败。

---

### [ ] P0-3. 给 `check-chapter` 加 `crossChapterRefLeak` 维度
**问题**：RUN-1 §2。八章写完才发现散文 / `claimRefs` 引用了别章的 `C2xx` / `S3xx`，agent 末尾批量 sed 重新编号。RUN-2 没复发但属侥幸。
**改**：[.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs)
- 扫描章内所有 `claimRefs`、散文里裸出现的 `\bC\d{3,}\b` / `\bS\d{3,}\b` / `\bT\d{3,}\b` / `\bF\d{3,}\b` / `\bRQ\d{3,}\b`，凡是不在本章 `localEvidence` 出现的一律报错。
- `FIX_HINTS.crossChapterRefLeak = 'Remove the cross-chapter reference (IDs are scoped to one artifact) or add a local atomic claim/source/RQ in this chapter.'`

**验证**：把 `reports/.../02-market-analysis.yaml` 里随便一个 `claimRefs: [C201]` 改成 `[C801]`，应触发该维度。

---

### [ ] P0-4. 放宽 figure↔table `duplicateAnalysis` 阈值（仅限同对图/表）
**问题**：RUN-1 §7 + RUN-2 §B2。本次 12 对 T/F 反复修 `claimRefs`。本质是图与表本来就是同源数据的两种呈现形式。
**改**：[.agents/skills/startup-research/scripts/chapter-schema.mjs](.agents/skills/startup-research/scripts/chapter-schema.mjs)（或 `check-chapter.mjs` 调用 jaccard 的位置）
- 当 duplicate 候选对一方是 `T###` 一方是 `F###` 时：仅当 jaccard ≥ 1.0（即 figure 的 claimRefs 完全是 table 的子集且无任何其他 claim 区分）才报错；其它对（T-T、F-F、analysisCallout-analysisCallout）维持现阈值。
- 否则把阈值改为可配（workflow-config.duplicateAnalysis 之类），默认对 T-F 配对 1.0、其它沿用原值。
- `FIX_HINTS.duplicateAnalysis` 末尾追加："For paired table/figure (same data, two views), keep ≥1 claimRef unique to the figure or accept via acknowledgedWarnings."

**验证**：跑 `npm run validate`，所有现有报告仍 pass。然后构造一个 100% 重叠的 T/F 对，仍应失败；构造一个 50% 重叠的 T/F 对，应通过。

---

## P1 — 反馈完整性（agent 不再 grep 源码）

### [ ] P1-1. 写 `report-meta-example.yaml` 范本
**问题**：RUN-1 §4 + RUN-2 §B1（强复发，3 家公司各 1 次 schema-grep 三连击）。
**改**：新增 [.agents/skills/startup-research/references/report-meta-example.yaml](.agents/skills/startup-research/references/report-meta-example.yaml)
- 内容：从 `reports/20260506084415-innovaccer/report-meta.yaml`（agent 自己抄过的那份）拷一份骨架。
- 在每个 enum 字段旁注释合法值：`riskRating` / `recommendation` / `confidence` / `valuationStance` / `companyProfile.*` / `keyMetrics.*` / `topStrengths/topRisks` 的形状。
- 在文件顶部 5 行注释：「This is the canonical template. Copy and edit. Do not invent fields. See `report-schema-v2.md` § report-meta for the full contract.」
- 在 [.agents/skills/startup-research/SKILL.md](.agents/skills/startup-research/SKILL.md) "Finalization" 段落加一行："Copy `references/report-meta-example.yaml` as the starting point for `report-meta.yaml`; do not hand-author from schema."

**验证**：`npm run validate` 仍 pass（example 文件不进入校验路径，是 references）。

---

### [ ] P1-2. ledger 输出 canonical claim 索引
**问题**：RUN-2 §A3。Ramp `report-meta.yaml` 写完 finalize 失败后，agent 写了 5 个 python 一行流去翻 `evidence.yaml` 找 founders / valuation / keyProducts 对应的 canonical `C###`。
**改**：[.agents/skills/startup-research/scripts/ledger.mjs](.agents/skills/startup-research/scripts/ledger.mjs)
- ledger 阶段额外写一份 `.research-cache/<runId-slug>/canonical-claims.yaml`：
  ```yaml
  byTopic:
    founders: [C003, C004]
    funding: [C012, C013]
    valuation: [C012]
    keyProducts.*: [C156, C201]
    keyMetrics.*: [C021, C023]
  byChapter:
    01-company-overview: { C101: C001, C102: C002, ... }   # localId -> canonicalId
  ```
- 在 finalize 失败 message 里指向这个文件："canonical claim IDs available at `.research-cache/<...>/canonical-claims.yaml`"。

**验证**：跑 `node .agents/skills/startup-research/scripts/finalize.mjs reports/<some-finalized-report> --rebuild`，确认 cache 里多出该文件且内容正确。

---

### [ ] P1-3.（可选 / 更彻底）让 `report-meta.yaml` 接受章内 local ID
**问题**：同 P1-2，但更治本。
**改**：[.agents/skills/startup-research/scripts/finalize.mjs](.agents/skills/startup-research/scripts/finalize.mjs)
- 在 ledger 之后、check-report 之前，新增一步 `rewriteReportMetaRefs.mjs`：把 `report-meta.yaml` 里所有 `Ch1.C101` / `Ch01.C101` 形式的引用，按 ledger 输出的 `byChapter` 映射重写为 canonical `C###`。
- 同步在 [.agents/skills/startup-research/references/report-schema-v2.md](.agents/skills/startup-research/references/report-schema-v2.md) 的 report-meta 段落注明："`claimRefs` accepts either canonical `C###` or scoped `Ch<order>.C###`; the latter is rewritten by finalize."

**验证**：在某 report 的 `report-meta.yaml` 把一处 `C012` 改成 `Ch1.C012`，跑 finalize 应通过。

> 若 P1-3 实现，P1-2 的 cache 文件可选保留为 debug 工具。

---

### [ ] P1-4. 检查并补全 enum failure message
**问题**：RUN-1 §3 + RUN-2 §B3。源码已经在 [.agents/skills/startup-research/scripts/chapter-schema.mjs](.agents/skills/startup-research/scripts/chapter-schema.mjs#L121-L125) 输出 `must be one of confirming|adverse|...`，但 agent 仍多次 grep 源码 — 说明：
1. 失败信息可能在 JSON 输出里被截断 / 嵌得太深。
2. 部分 enum（例如 `riskRating`、`recommendation`、`valuationStance`、`independence`、`reputationTier`）可能没在 failure 里复述合法集合。
**改**：
- 全文 grep `must be one of` 与所有 enum-style 校验（`SOURCE_TYPES`、`SOURCE_STANCES`、`INDEPENDENCE`、`REPUTATION_TIER`、`CLAIM_TYPES`、`CONFIDENCE`、`FRESHNESS`、`RQ_TYPE`、`RQ_STATUS`），保证每个 fail 调用的 message 都内联合法集合。
- 在 [.agents/skills/startup-research/scripts/check-report.mjs](.agents/skills/startup-research/scripts/check-report.mjs) 里 `report-meta` 校验对 `riskRating` / `recommendation` / `valuationStance` 也做同样的内联（这是 RUN-2 末尾 `riskRating: medium-high` reject 时缺的提示）。

**验证**：构造一个非法 `riskRating: bogus`，运行 check-report，message 应包含合法集合。

---

## P2 — 工具体验微调（可见但非阻塞）

### [ ] P2-1. `check-chapter.mjs --brief`
**问题**：RUN-1 §5。日志里 60+ 次 `python3 -c "import sys,json; d=json.load(sys.stdin); print('ok:', d.get('ok'))"`。
**改**：[.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs)
- 新增 `--format brief`：每行一条结构化输出：
  ```
  ok: false
  failed: [evidenceMissing, sourceStanceSpread]
  retryOrder: [evidenceMissing, sourceStanceSpread]
  issues: 3
  - F001 figureShape: needs `edges`. fix: <one-liner>
  - T004 duplicateAnalysis: shares claimRefs C012,C013 with F002. fix: <one-liner>
  ```
- 默认仍是 `text`，不影响现有调用。

**验证**：跑 `--format brief` 输出能直接读，不需 python 桥接。

---

### [ ] P2-2. fetch-url 反爬域名清单 + 每章 fetch 上限提示
**问题**：RUN-1 §1。Ch6 fetch 死循环（30+ 次 G2/Gartner Peer Insights/TrustRadius/Capterra/PeerSpot/Crunchbase + Wayback 通配符）。RUN-2 因 fintech 站点更友好未复发。
**改**：[.agents/skills/fetch-url/scripts/fetch.mjs](.agents/skills/fetch-url/scripts/fetch.mjs)
- 启动时维护 `.research-cache/<run>/fetch-deny.json` 持久化"已知 JS-only / 反爬"域名（首次失败后写入）。同 run 内对该域名第二次调用直接 fail-fast，message：`accessStatus: js-only — record this URL as a source with accessStatus: js-only and stop retrying`.
- 内置 deny-list 种子：`g2.com`、`gartner.com/reviews`、`trustradius.com`、`capterra.com`、`peerspot.com`、`crunchbase.com`、`wsj.com`（paywall）。
**改**：[.agents/skills/startup-research/SKILL.md](.agents/skills/startup-research/SKILL.md)
- 在 "Research and evidence rules" 加一行："Each chapter caps at 12 fetch-url calls; remaining gaps go to `evidenceGaps` with `type: source-blocked`."

**验证**：连续两次 `fetch.mjs https://www.g2.com/...`，第二次应立即 fail-fast 并提示标 `accessStatus: js-only`。

---

### [ ] P2-3. `fetch-url --parallel`
**问题**：RUN-1 §8。agent 频繁手写 `node fetch.mjs A & node fetch.mjs B`，触发过 `kill: PID required` 报错。
**改**：[.agents/skills/fetch-url/scripts/fetch.mjs](.agents/skills/fetch-url/scripts/fetch.mjs)
- 接受多 URL：`fetch.mjs URL1 URL2 URL3 [--parallel]`。`--parallel` 内部 `Promise.all`，输出每段前打 `=== <url> ===` 分隔符。

**验证**：`fetch.mjs https://example.com https://example.org --parallel` 应同时拉两段并按分隔输出。

---

## P3 — 防御性 / 文档

### [ ] P3-1. 重读 schema 频率上限
**问题**：RUN-1 §6 + RUN-2 §B1。`Read report-schema-v2.md` 在 setup 阶段就被读 3 次，后续 31 次 grep。
**改**：在 [.agents/skills/startup-research/SKILL.md](.agents/skills/startup-research/SKILL.md) "Required setup" 顶部加一行："`report-schema-v2.md` should be read once at setup; per-chapter contracts come from `load-chapter.mjs --include-context`. The `report-meta` template comes from `references/report-meta-example.yaml`."

### [ ] P3-2. Hard rules 加幂等 + 单公司预算
**问题**：RUN-1 §9（fetch storm 把单公司时间吃光）+ RUN-2 §A4（transient API 错误盲重试）。
**改**：在 [.agents/skills/startup-research/SKILL.md](.agents/skills/startup-research/SKILL.md) "Hard rules" 追加：
- "Per-company wall-clock budget: stop after 60 min of a single company; mark unresolved with an `evidenceGap` entry and move on."
- "All bash/python repair scripts must be idempotent (re-runnable after a transient API retry without re-applying the same edit twice)."

---

## 落地顺序（建议一周内 PR 顺序）

1. **PR1**：P0-1 + P0-2 + P0-3（三个新 dimension，集中改 `check-chapter.mjs` + `chapter-schema.mjs`），加各自 unit 验证。
2. **PR2**：P0-4（duplicateAnalysis T-F 阈值放宽），单独 PR 因为可能改变 baseline，需要 `npm run validate` 全跑确认 33 个现有报告仍 pass。
3. **PR3**：P1-1（example 文件，纯 reference 无副作用）。
4. **PR4**：P1-2 + P1-3（canonical claim 索引 + local ID 接受），动 ledger/finalize 流程，需要在 1–2 个旧报告上跑 `--rebuild` 验证不破坏既有 `evidence.yaml` 编号。
5. **PR5**：P1-4（enum message 巡检）+ P2-1（`--brief` 输出）。
6. **PR6**：P2-2 + P2-3（fetch-url 反爬清单 + 并行）。
7. **PR7**：P3-1 + P3-2（SKILL.md 文字补齐）。

每个 PR 后：
- `npm run check:workflow-config && npm run check:revision-graph && npm run validate`
- 在 1 个真实历史报告上跑 `node .agents/skills/startup-research/scripts/check-chapter.mjs <folder> 0X-*.yaml --format json`，确认输出符合预期。
