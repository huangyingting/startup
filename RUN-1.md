# RUN-1 — `startup-research` skill review

来源：GitHub Actions run [25425279717 / job 74576996548](https://github.com/vibewatch/startup/actions/runs/25425279717/job/74576996548) 的 `Run startup research` 步骤日志（清洗后 3912 行，覆盖 Abnormal Security / Innovaccer / project44 三家公司，wall-clock ≈ 3h 49m，46.1M ↑ token）。

整体跑通了 3 份报告，但摩擦点非常集中、可量化。下文按"问题 → 证据 → 建议"列出，按性价比从高到低排。

---

## 1. Chapter 6（customers）会陷入 fetch 死循环

**证据**：单 Abnormal 一家，第 6 章里连续触发了约 30 个 fetch，覆盖 [.agents/skills/fetch-url/scripts/fetch.mjs](.agents/skills/fetch-url/scripts/fetch.mjs) 对 `abnormal.ai/customers`、`/blog/series-d-*`、`/case-study/{xerox,hyundai}`、`/resources/case-studies`、`/resource-center`、`/blog/2024-annual-report`、`/blog/series-d-announcement`、`/blog/abnormal-security-series-d-250-million`，以及 G2、Gartner Peer Insights、TrustRadius、Capterra、PeerSpot、CrunchBase、PR Newswire、SecurityWeek、Dark Reading、WSJ，再加 Wayback `2024/`、`20240901*`、`20241215*`、`1001000000*` 等多种通配符变体（`/tmp/research-clean.log` 第 880–1230 行）。这一段大概率消耗了本次 Run 一半的 wall-clock。

**建议（写进 SKILL.md / chapter 6 packet）**：
- 显式硬上限：每章 fetch 调用 ≤ N（建议 12），命中上限直接落 `evidenceGap` 而非继续找变体。
- "已知 JS-only / 反爬" 站点清单（G2、Gartner Peer Insights、TrustRadius、Capterra、PeerSpot、Crunchbase）写在 [.agents/skills/fetch-url/SKILL.md](.agents/skills/fetch-url/SKILL.md)：第一次失败即标 `accessStatus: js-only`，禁止再 retry。
- "同一 URL 的 wayback / r.jina.ai 变体最多 1 次"，第 2 次起视为 gap。

---

## 2. 跨章节 claim ID 冲突要事后批量重编号

**证据**：八章写完后才发现 Ch2/Ch3/Ch5/Ch7/Ch8 里有引到别章的 `C2xx`，agent 不得不算每章 offset 用 python 批量改 sed（第 2161–2270 行附近的 `Calculate exact offsets for all chapters` / `Fix cross-chapter claim refs in all failing chapters`）。这与 `SKILL.md` 里 "Local `S###`/`C###`/… IDs are scoped to one artifact" 矛盾。

**建议**：在 [.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs) 里加一个独立 dimension `crossChapterRefLeak`，扫描章内所有 `claimRefs` / 散文里的 `C\d+`，凡是不在本章 `localEvidence.claims[]` 出现的一律报错，并在 `failure.fix` 直接写"删除该引用，或在本章新增 atomic claim"。提前在 chapter-loop 里挡掉，远比末尾批量 renumber 便宜。

---

## 3. 校验失败信息缺枚举值，agent 在 grep 源码

**证据**：
- 第 567–585 行：为了找 `sourceType`、`stance`、`independence` 合法枚举值，agent 反复 grep [.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs) 和 [.agents/skills/startup-research/references/report-schema-v2.md](.agents/skills/startup-research/references/report-schema-v2.md)。
- 末尾 `report-meta.yaml`：`riskRating: medium-high` 被 reject，agent `sed` 改成 `high`（无任何提示告诉它合法集合是什么）。
- 第 272–303 行：为了搞清楚怎么写 `acknowledgedWarnings` 去消化 `duplicateAnalysis`，agent grep 了 `check-chapter.mjs` 的 `jaccardSimilarity` / `STOP_WORDS` 实现。

**建议**：所有 enum / 范围类校验失败的 `failure.message` 必须把合法集合塞进去，例如 `sourceType "press" invalid; allowed: official|filing|regulatory|legal|press|analyst|customer|community|other`。`acknowledgedWarnings` 的 `failure.fix` 字段直接给现成 YAML 片段。这是单点投入、复利收益最高的改动。

---

## 4. report-meta.yaml 没有可抄的范本

**证据**：第 3700+ 行，agent 在 [.agents/skills/startup-research/references/report-schema-v2.md](.agents/skills/startup-research/references/report-schema-v2.md) 里 grep `report-meta`、`companyProfile:`、`^companyProfile`，最后直接 `cat reports/20260506084415-innovaccer/report-meta.yaml` 当模板抄。这是一个清晰的"应该有 example 而不是只有 schema"的信号。

**建议**：在 [.agents/skills/startup-research/references/](.agents/skills/startup-research/references/) 加一个 `report-meta-example.yaml`（含合法 enum 注释），并在 `SKILL.md` 的 Finalization 段落点名它。

---

## 5. 验证脚本输出对 LLM 不友好，agent 自己写了 60 次 python 一行流

**证据**：日志中出现至少 ~60 次 `python3 -c "import sys,json; d=json.load(sys.stdin); print('ok:', d.get('ok')); print('failed:', d.get('failedDimensions',[])); ..."` 的桥接代码。

**建议**：给 [.agents/skills/startup-research/scripts/check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs) 加一个 `--brief`（或默认就是）输出格式：

```
ok: false
failed: [evidenceMissing, sourceTypeSpread]
retryOrder: [evidenceMissing, sourceTypeSpread]
issues: 3
top: F001 figureShape — needs `edges`; T004 duplicateAnalysis — share claimRefs C012,C013
fix: <one-liner per failure>
```

直接消除 60 个 python 桥接，节省可观 token。

---

## 6. 重复读同一份 schema

**证据**：`Read report-schema-v2.md` 出现在第 42、55、82 行三次，外加多次 grep。是重复加载相同长文件。

**建议**：`SKILL.md` 顶部加一句"`report-schema-v2.md` 只在 setup 阶段读一次；之后从 `load-chapter.mjs --include-context` 的 packet 里取章 gate"。或者让 [.agents/skills/startup-research/scripts/load-chapter.mjs](.agents/skills/startup-research/scripts/load-chapter.mjs) 把对应章节最相关的 schema 片段（如该章 figure type 的字段契约）也嵌进 packet。

---

## 7. 重复 figure-vs-table duplicate 误报触发大改

**证据**：第 290–303 行，`F001` 与 `T004` 因共享 `claimRefs` + 标题 stop-word 后 token 集相近，被判 `duplicateAnalysis`。Agent 最后做了 `+37/-37` 大改去"区分"它们；本质是噪音误报。

**建议**：要么对 figure↔table 对比放宽 jaccard 阈值（图与表本来就是同源数据的两种呈现），要么在 `failure.message` 里加"如果是图表配对，请用 `acknowledgedWarnings` 而非重写"。

---

## 8. fetch-url 的并行不够好用

**证据**：agent 频繁手写 `node fetch.mjs A & node fetch.mjs B`（第 134、836、950、1003 行等）。第 3503 行附近还触发了 `kill` 没有 PID 的报错（背景任务管理出问题）。

**建议**：[.agents/skills/fetch-url/scripts/fetch.mjs](.agents/skills/fetch-url/scripts/fetch.mjs) 支持 `fetch.mjs URL1 URL2 URL3 --parallel`，内部 `Promise.all`、统一格式化输出，省掉 bash `&` 编排和奇怪的 `kill` 报错。

---

## 9. 整批跑 3 家公司没有"按公司"隔离的预算

**证据**：第 1 家（Abnormal）的 ch6 fetch 风暴吃光了大段时间；如果不是 ch6 这一节，整体可能至少快 1 小时。一旦一家公司卡住，整个 step 都跟着抖。

**建议**：`SKILL.md` 在 "Hard rules" 加一条"单家公司总执行 ≤ X 分钟，超时则把当前公司当作 unresolved 写 `evidenceGap`，move on 到下一家"；workflow 也可以把 `for c in companies; do copilot -p ...; done` 拆成多次 `copilot` 调用，但这属于 workflow 改动，可以另议。

---

## 价值排序 / 建议先做

1. **#3 + #4**：错误信息带枚举值 + `report-meta-example.yaml`。改动小、见效快、消除最高频的 grep-schema 行为。
2. **#5**：`check-chapter.mjs --brief`。消除 60 次 python 桥接，token 立省。
3. **#2**：加 `crossChapterRefLeak` dimension，避免末尾批量 renumber。
4. **#1**：fetch-loop 上限 + 反爬域名清单。砍掉本次最大单点耗时来源。
5. 其余（#6/#7/#8/#9）按精力安排。
