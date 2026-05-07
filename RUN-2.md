# RUN-2 — `startup-research` skill review

来源：GitHub Actions run [25418182526 / job 74553995984](https://github.com/vibewatch/startup/actions/runs/25418182526/job/74553995984) 的 `Run startup research` 步骤日志（清洗后 3438 行；Revolut / Ramp / Monzo 三家 fintech；wall-clock ≈ 3h 27m；token ↑ 53.6M / ↓ 650.6k，cached 51.6M）。

跑通 3 份报告，但出现了 RUN-1 没暴露的 3 个新问题，以及 4 个老问题的复发。下面分两块给。

> 量化指标（来自清洗后的 3438 行）
> - 161 次 `Edit *.yaml`
> - 60 次 `Validate ... chapter` / `Re-validate`
> - 61 次 `claimRefs` / `duplicateAnalysis` 相关讨论
> - 31 次 grep `report-schema-v2.md`
> - 48 次提及 `report-meta`
> - 3 次 `Request failed due to a transient API error. Retrying...`

---

## A. RUN-2 新发现（RUN-1 没看到）

### A1. 章节文件之间 `slug:` 不一致，要等 finalize 失败才发现

**证据**：Revolut 第一次 finalize 失败（第 942 行）后报 *"Three issues to fix: slug inconsistency, no adverse sources in chapters 4 and 8"*。第 1032 行 `grep '^slug:' .../revolut/*.yaml | grep -v ": revolut$"` 返回 7 行 — 即 03/04/05/06/07/08 多个 chapter 的 `slug:` 不是 `revolut`。Agent 不得不 for 循环 sed 批改（第 1039 行）。

**为什么会出错**：[new-report.mjs](.agents/skills/startup-research/scripts/new-report.mjs) 创建 folder 时只写一份 `slug`；agent 后续每章 `Create XX.yaml` 时手填了 slug，同一份报告里出现漂移（公司名简写、连字符变体等）。

**建议**：
- 在 [check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs) 加 `slugConsistency` dimension：读取 `report-meta.yaml` 或 folder 名解析出 canonical slug，要求当前章 `slug:` 完全相等。
- 或者更彻底：让 `load-chapter.mjs --include-context` 把 canonical slug 直接塞进 packet，agent 写章时直接 copy 就不会漂。

### A2. "源 stance 至少一个 `adverse`" 只在报告级 gate 才查，章节级查不到

**证据**：
- Revolut：finalize 才报 ch4/ch8 缺 adverse 源（第 948 行）。Agent 把 `S422` 和 `S823` 的 `stance: skeptical-analyst-research` 改成 `adverse`（第 967、1009 行）。
- Monzo：相同模式，finalize 又报 ch1/ch6/ch8 缺 adverse 源（第 3266–3370 行）。Agent 再把 FOS 投诉 / FT Alphaville 等"本质就是批评性分析"的源由 `neutral` 改 `adverse`。

**问题本质**：`gate.minAdverseQuestions` 是对 `researchQuestion.type=adverse` 的强制；但 **source `stance: adverse`** 是一条独立的隐性要求，agent 在写章时不知道，只能等 finalize 报错回头改。这是典型"晚到的反馈"，每家公司都要付 1–3 次回头改的代价。

**建议**：在 [check-chapter.mjs](.agents/skills/startup-research/scripts/check-chapter.mjs) 加 `sourceStanceSpread` dimension（或扩展现有 `sourceTypeSpread`）：每章至少 1 个 `stance: adverse` 源，failure message 直接给"把哪类源标 adverse"的提示（监管投诉、负面分析师 note、FOS/CFPB 申诉、做空报告等）。

### A3. `report-meta.yaml` 的 `claimRefs` 要用 ledger 后的 canonical ID，但没文档化获取办法

**证据**：Ramp finalize 失败后（第 2119 行起），agent 写了 5 个 python 一行流去翻 `evidence.yaml` 找 `card volume`、`$25B`、`$13B`、`Travel` 对应的 canonical claim ID（第 2139–2197 行），最后总结："C012 = valuation ($13B), C021 = card volume ($25B), C015 = 25,000 customers, C023 = ARR, C156 = Ramp Travel"，再回去 4 次 `Edit report-meta.yaml ±N -N`。

**建议**：
- 在 [finalize.mjs](.agents/skills/startup-research/scripts/finalize.mjs) ledger 阶段输出 `.research-cache/<run>/canonical-claims.yaml`（按 topic 索引：`founders`, `valuation`, `funding`, `keyMetrics.*`, `keyProducts.*`），让 agent 写 `report-meta.yaml` 时直接 grep 对应 topic 就能拿到 canonical ID。
- 或者让 `report-meta.yaml` 接受**章内 local ID**（`C101` 等），由 finalize 阶段自动重写到 canonical — 这样 agent 根本不需要等 ledger。后者更彻底。

### A4.（信息）3 次 transient API 错误

**证据**：第 1434、1620、1622 行 `Request failed due to a transient API error. Retrying...`。

非 skill 可控，但说明 chapter 中段如果失败，agent 会盲重试整段 edit 序列，可能把刚做的局部修复也重做一遍。建议把 chapter 修复脚本化成幂等 python（很多操作其实已经是）并在 SKILL.md 里强调"修复脚本必须幂等"。

---

## B. RUN-1 老问题复发情况

### B1. `report-meta.yaml` 没范本（RUN-1 #4）— **强复发**

每家公司都要重新摸索：
- Revolut（第 864–916 行）：grep `report-meta` / `companyProfile:` / `keyMetrics` / 然后 `cat reports/.../report-meta.yaml` 抄。
- Ramp（第 2081–2110 行）：又一次 grep `report-meta` 找字段，再 `cat` 现有 report-meta 抄格式。
- Monzo（第 3240–3260 行）：同样的 schema-grep 三连击。

48 次 `report-meta` mention、31 次 grep `report-schema-v2.md`，绝大部分发生在 finalize 段。

**结论**：RUN-1 的建议（在 `references/report-meta-example.yaml` 放注释完整的范本）必须做，且 `SKILL.md` 的 Finalization 段落要点名它。

### B2. 表-图 `duplicateAnalysis` 为每章每对 T/F 触发（RUN-1 #7）— **强复发**

61 次 `claimRefs` / `duplicateAnalysis` 提及。固定模式：

> "T605 has claimRefs [C630-C639] and F604 has [C630, C631, C632] — 3 shared out of 3 = 100% → FAIL. Fix F604 claimRefs."

公司 × 章节几乎覆盖全表：T104↔F101、T201↔F201、T202↔F201、T203↔F203、T303、T501↔F501、T503↔F501、T601↔F602、T605↔F604、T703↔F703、T801↔F801、T801↔F804、T803↔F803。修复路径基本相同：缩减 figure 的 `claimRefs` 让 jaccard < 1.0。

**结论**：RUN-1 #7 的建议必须做。两个方向二选一：
- (a) 对 figure↔table 配对的 jaccard 阈值放宽到 1.0（即"必须 100% 重叠才报错"），或
- (b) 在 `failure.fix` 里直接生成"`F602.claimRefs` 改为 `[C601, C603]`（其余 unique to T601）"这样的可机器执行片段。

### B3. enum 校验失败仍要 grep 源码（RUN-1 #3）— **复发**

Ramp 第 587–606 行：`Find valid sourceType / independence / stance enum values` — 跟 RUN-1 一字不差的行为。

**结论**：RUN-1 #3 的建议（`failure.message` 内联合法集合）必须做。

### B4. JSON → python 桥接（RUN-1 #5）— **轻度复发但有改善**

RUN-2 的 `python3 -c "import sys,json; ..."` 桥接出现频率明显比 RUN-1 少（agent 学会了直接看 `failures[]`）。但 finalize 阶段仍出现 5 次 python 桥接去翻 `evidence.yaml`（A3 场景）。

**结论**：`check-chapter.mjs --brief` 仍值得做，但优先级可让位给 A1/A2/A3。

### B5. 跨章节 claim 引用（RUN-1 #2）— **未复发**

本次没有再批量 sed 重新编号，可能因为章数较多 / agent 学聪明 / 也可能只是侥幸。RUN-1 #2 的 `crossChapterRefLeak` dimension 仍建议加，作为防御性检测。

---

## C. 价值排序 / 建议先做

按"投入小 + 复利大 + 同时盖 RUN-1 复发项"排：

1. **A1（slug consistency）+ A2（adverse stance per chapter）+ B3（enum in failure.message）**
   都是给 `check-chapter.mjs` 加 dimension / 改 message，单点改动，砍掉每家公司 finalize 后 3–6 轮回头改。

2. **B1 / RUN-1 #4（`report-meta-example.yaml`）**
   一份带注释的范本文件，省掉 3 家公司各 1 轮 `grep schema + cat existing` 的开销。

3. **A3（canonical claim ID 反查）**
   首选方案：让 `report-meta.yaml` 直接接受章内 local ID（`Ch1.C101`），finalize 时自动转 canonical。一次性消除"先 finalize → 翻 evidence.yaml → 改 report-meta → 再 finalize"的循环。次选方案：finalize 输出 `.research-cache/<run>/canonical-claims.yaml`。

4. **B2 / RUN-1 #7（duplicateAnalysis 噪音）**
   选项 (a) 放宽阈值最简单：把 100%-重叠才算 duplicate，瞬间消掉本次 ~12 对的反复修复。

5. **A4 / B4 / RUN-1 #5**
   `--brief` 输出格式 + "修复脚本必须幂等" 写进 SKILL.md。

---

## D. 与 RUN-1 对比的趋势

| 维度                       | RUN-1                | RUN-2                  | 备注 |
|---|---|---|---|
| 公司                       | 3 跨行业              | 3 fintech              | |
| Wall-clock                 | 3h 49m               | 3h 27m                 | 略快 |
| Token ↑                    | 46.1M                | 53.6M                  | 反而更多 |
| Fetch loop 死循环          | Ch6 严重（30+ 次）    | 无                     | fintech 站点更友好 |
| 跨章节 C### 漏引            | 5 章重编号            | 无                     | |
| 表/图 duplicateAnalysis 战  | ~6 对                 | ~12 对                 | **加倍** |
| `report-meta` schema hunt  | 1 次                  | 3 次（每家一次）        | **未改善** |
| Slug 不一致                | 未触发                | Revolut 触发 1 次       | **新** |
| Adverse-stance 回头改      | 未触发                | Revolut+Monzo 各 1 次   | **新** |
| Canonical claim ID 反查    | 未触发                | Ramp 触发 1 次          | **新** |

净结论：RUN-1 提到的"错误信号晚到 / 缺范本"两类问题在 RUN-2 进一步放大，并暴露了 3 个新的"晚到信号"（slug、adverse、canonical claim）。**建议下一轮 skill 改动集中砍 check-chapter 的反馈完整性**（多 dimension + message 内联可执行 hint），而不是改 prompt 或 SKILL.md 文字。
