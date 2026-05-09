# Round-2 审查：12 个问题的最优解决方案

## 高严重度

### #1 `gate.minArtifacts` 运行时与实际执行不一致

**问题**: check-chapter 用 `Math.max(gate.minArtifacts, plannedTotal)` 执行，但 runtime context 只暴露原始 `gate.minArtifacts=6`。valuation 章节有 10 个 planned artifacts，Agent 看到 6 但实际门槛是 10。

**最优方案**: 在 `normalizeWorkflowConfig()` 中将 `gate.minArtifacts` 提前设为 effective 值。

```js
// workflow-config.schema.mjs → normalizeWorkflowConfig()
// 在 adverseDistribution 注入之后追加：
for (const chapter of chapters) {
  const plannedTotal = (chapter.plannedTables?.length ?? 0) + (chapter.plannedFigures?.length ?? 0);
  chapter.gate.minArtifacts = Math.max(chapter.gate.minArtifacts, plannedTotal);
}
```

同时删除 check-chapter.mjs 中的 `Math.max` 重复计算（约 L725），直接用 `gate.minArtifacts`：

```js
// check-chapter.mjs — 删除 plannedTotal 和 minArtifacts 的重新计算
// before:
const plannedTotal = spec.plannedTables.length + spec.plannedFigures.length;
const minArtifacts = Math.max(gate.minArtifacts, plannedTotal);
// after:
const minArtifacts = gate.minArtifacts;  // already effective from normalizeWorkflowConfig
```

**验证**: `npm run validate` 通过；runtime context JSON 输出中 `gate.minArtifacts` 与 check-chapter 执行门槛一致。

---

### #2 `researchQuestionClosure` 的 topic fallback 匹配几乎不可能命中

**问题**: `gapTopics.has(question.question.toLowerCase().slice(0,80))` 拿完整问句比较短 topic 标签，永远不等。错误消息说 "via relatedQuestionRefs[] or matching topic" 误导 Agent 以为 topic 路径可行。

**最优方案**: 删除 topic fallback，只保留 `relatedQuestionRefs[]` 路径。这是最简洁且最准确的方案——topic matching 在实践中不可靠且无法稳定定义，不如让机制单一明确。

```js
// check-chapter.mjs → checkResearchQuestions() 内
// before:
} else if (!gapTopics.has(String(question.question).toLowerCase().slice(0, 80)) && !(doc.localEvidence?.evidenceGaps ?? []).some((gap) => (gap?.relatedQuestionRefs ?? []).includes(question.id))) {
  fail('researchQuestionClosure', `${file}: ${question.id} status=${question.status} but no evidenceGap entry references it via relatedQuestionRefs[] or matching topic`, { id: question.id });
}

// after:
} else if (!(doc.localEvidence?.evidenceGaps ?? []).some((gap) => (gap?.relatedQuestionRefs ?? []).includes(question.id))) {
  fail('researchQuestionClosure', `${file}: ${question.id} status=${question.status} but no evidenceGap entry references it via relatedQuestionRefs[]`, { id: question.id });
}
```

同步删除函数顶部的 `gapTopics` 构建（如果 `gapTopics` 不再被其他地方使用）。注意：`gapTopics` 也被 `checkEnumerationTables` 使用，所以只删 `checkResearchQuestions` 内的那个。实际上 `checkResearchQuestions` 内的 `gapTopics` 是函数内局部构建的，直接删除即可。

同步更新 FIX_HINTS：

```js
// validation-catalog.mjs
// before:
researchQuestionClosure: ({ id } = {}) =>
  `Add an evidenceGap whose relatedQuestionRefs[] includes ${id ?? 'the still-open question'}.`,
// (no change needed — the hint already only mentions relatedQuestionRefs[])
```

**验证**: `npm run validate` 通过；`npm run build:rules` 重新生成 rules.md。

---

### #3 `enumerationRowCorroboration` 按 table 级别检查而非 per-row

**问题**: 代码注释和 dimension name 都说 per-row corroboration，但逻辑是收集整个 `table.claimRefs[]` 的 domains 做 table-level 检查。

**最优方案**: 将 dimension 语义改为 table-level（而非重写为 per-row），因为当前 YAML schema 的 `claimRefs` 在 table 级别而非 row 级别，per-row 检查缺乏数据结构支撑。修正注释、error message 和 fix hint 使其与实际逻辑一致。

```js
// check-chapter.mjs → checkEnumerationTables() 内
// before:
// Per-row corroboration: each row must be supported by claims pointing to >= minSourcesPerEnumerationRow distinct registrable domains.
// after:
// Table-level corroboration: the enumeration table's claimRefs must point to sources spanning >= minSourcesPerEnumerationRow distinct registrable domains.
```

```js
// before:
fail('enumerationRowCorroboration', `${file}: table ${table.id} backed by sources from only ${tableDomains.size} distinct domains (need >= ${gate.minSourcesPerEnumerationRow}); enumeration tables must be cross-checked across independent sources`, ...);
// after:
fail('enumerationRowCorroboration', `${file}: table ${table.id} backed by sources from only ${tableDomains.size} distinct registrable domains (need >= ${gate.minSourcesPerEnumerationRow}); enumeration table claimRefs must reference sources from multiple independent domains`, ...);
```

同步更新 validation-catalog.mjs 中的 FIX_HINTS：

```js
// before:
enumerationRowCorroboration: ... "Add sources from additional registrable domains backing the table's claimRefs."
// after:
enumerationRowCorroboration: ... "Add sources from additional registrable domains backing the enumeration table's claimRefs (table-level, not per-row)."
```

同步更新 workflow-config.yaml 中的 `minSourcesPerEnumerationRow` 注释：

```yaml
# before:
minSourcesPerEnumerationRow: 2
# after:
# Enumeration table corroboration: the table's claimRefs must reference
# sources spanning at least N distinct registrable domains.
minSourcesPerEnumerationRow: 2
```

**验证**: `npm run validate` 通过；`npm run build:rules` 重新生成 rules.md（dimension table 的 defaultFix 同步更新）。

---

## 中严重度

### #4 `VOCABULARIES` key 命名与 YAML field 名不一致

**问题**: VOCABULARIES key 如 `sourceStance`/`sourceAccessStatus` 与 YAML field 名 `stance`/`accessStatus` 不匹配。

**最优方案**: 不修改 VOCABULARIES key（它们已在外部使用且语义清晰），而是在 contracts.md 的 build-contract-docs.mjs 输出中为每个 enum field 旁注 VOCABULARIES key。但考虑到 contracts.md 是生成文件且已经 inline 了 enum 值，**最简单方案是保持现状**——Agent 从 contracts.md 的 inline enum 值获取可选项，不需要查 VOCABULARIES。

**实际修改**: 无代码修改。在 SKILL.md 的 reading conventions 中已经注明 "Vocabularies (enum value sets) are listed inline below at each enum field"，Agent 不需要用 VOCABULARIES key 做映射。这个问题实际上不影响 Agent 行为。

---

### #5 `check-report-meta` 不验证 `coverFacts[].claimRefs` 有效性

**问题**: claimRef 错误要到 `build-report` 才发现，且 build-report 用 `abort()` 硬退出。

**最优方案**: 在 SKILL.md finalization section 增加一行提醒。不修改 `check-report-meta` 的逻辑——因为 claimRef 的 target（evidence.yaml）在 report-meta 验证时还不存在（ledger 在后面才 build），检查时机决定了这个设计是正确的。

```markdown
<!-- SKILL.md → Finalization step 2 下方追加 note -->
   - Note: `coverFacts[].claimRefs` are NOT validated here — they are resolved by `build-report` against the consolidated `evidence.yaml` built in step 3. If `build-report` aborts on a dangling claimRef, fix the ref in `report-meta.yaml` and rerun `finalize-report` (the strict sweep is cached).
```

等等，SKILL.md 已经写了 "Cross-references such as `coverFacts[].claimRefs` are resolved later by `build-report` against the consolidated `evidence.yaml`; dangling refs surface there, not here." 所以这其实已经有文档了。

**实际修改**: 无。现有文档已覆盖。

---

### #6 `finalize-report` strict sweep 使用 `--format compact` 而非 `--format json`

**问题**: finalize 内部用 compact 格式，Agent 失败后需手动重跑 JSON 格式获得结构化修复指引。

**最优方案**: 在 SKILL.md 的 finalization triage table 下方增加一个 tip：

```markdown
<!-- SKILL.md → Finalization table 后追加 -->
> **Tip:** When `finalize-report` fails at `check-chapter:<key>:strict`, rerun the check directly with `--format json` to get structured `retryOrder[]` and per-issue `fix` hints:
> `node .agents/skills/startup-research/scripts/check-chapter.mjs <reportFolder> <chapter.file> --strict --format json`
```

**验证**: 文档修改，无需 npm run validate。

---

### #7 `create-report-run.mjs --resume` 时会重写 `refresh-context.yaml`

**问题**: resume 路径无条件调用 `writeRefreshContext()`，可能用不同参数覆盖已有的 refresh-context。

**最优方案**: 在 resume 路径中跳过 `writeRefreshContext()` 如果文件已存在。

```js
// create-report-run.mjs → resume 分支内（约 L224-226）
// before:
writeRefreshContext({ base, companyName, website: args.website, refreshTarget, refreshReason: args.refreshReason });

// after:
const refreshCtxPath = join(researchCacheDir(base), 'refresh-context.yaml');
if (!existsSync(refreshCtxPath)) {
  writeRefreshContext({ base, companyName, website: args.website, refreshTarget, refreshReason: args.refreshReason });
}
```

同时保留 non-refresh runs（refreshTarget 是 null）的调用——`writeRefreshContext` 在 refreshTarget 为 null 时直接 return。

**验证**: `npm run validate` 通过；手动测试 `--resume` 不覆盖已有 refresh-context。

---

### #8 `--strict` 不会移除过期的 `acknowledgedWarnings`

**问题**: 如果 Agent 修好了所有 tableNotes 问题但忘删 acknowledge 条目，条目会残留。

**最优方案**: 在 check-chapter 的 acknowledged warnings 处理中增加一个 info-level warning：如果 acknowledge 的 dimension 在当前 warnings 中不存在（即 warning 已修好），发出一个非阻塞提示让 Agent 清理。

```js
// check-chapter.mjs → acknowledgedWarnings 处理循环后追加
const activeWarningDims = new Set(warnings.map((w) => w.dimension));
for (const [dim] of ackByDim) {
  if (!activeWarningDims.has(dim)) {
    warn('acknowledgedWarnings', `acknowledgedWarnings entry for dimension "${dim}" is no longer needed (no ${dim} warnings found); consider removing it to keep the YAML clean.`, { ackDimension: dim });
  }
}
```

注意：这里的 warn 在 `--strict` 下会成为 failure（因为 `acknowledgedWarnings` 不在 WARNING_DIMENSIONS 中……等一下，`acknowledgedWarnings` dimension 确实不在 WARNING_DIMENSIONS 中，所以 Agent 无法 acknowledge 它。但 `acknowledgedWarnings` dimension 的 warning 不在 `unackedWarningDims` 的计算中吗？

重新看代码：`unackedWarningDims = [...new Set(warnings.map((w) => w.dimension))].filter((d) => !ackByDim.has(d))` — 如果新增的 warning 用的是 `acknowledgedWarnings` dimension，它不在 `ackByDim` 中（因为 Agent 没有也不能 acknowledge `acknowledgedWarnings`），所以会出现在 `unackedWarningDims` 中。

但看 `ok` 的判定：`ok = failures.length === 0 && (!args.strict || unackedWarningDims.length === 0)`。所以 strict 模式下，这个新 warning 会导致 fail。

这太激进了。**更好的方案是用一个不进入 `unackedWarningDims` 判定的 info 通道。** 但目前代码只有 fail 和 warn 两个级别。

**实际最优方案**: 不修改代码。这是极低影响的残留，不值得增加复杂度。如果要做，可以在 warn 之后将这个 dimension 加入 `ackByDim` 自动豁免：

```js
// 不推荐修改。保持现状。
```

**实际修改**: 无。成本高于收益。

---

## 低严重度

### #9 SKILL.md 第 4 步的 `STARTUP_FETCH_LOG_PATH` 指引过于复杂

**最优方案**: 简化 SKILL.md step 4 的叙述，将 `source env.sh` 作为推荐一行操作，CI 作为备注。

```markdown
<!-- SKILL.md → Runtime bootstrap step 4 — 替换现有文本 -->
4. Export `STARTUP_FETCH_LOG_PATH` before any `fetch-url` invocation:
   ```sh
   source .research-cache/<runId>/env.sh
   ```
   `create-report-run.mjs` writes this file automatically. If the env var is already set (e.g. CI exports a workflow-wide trail), keep that value — `check-chapter` only needs each cited URL to appear in the trail at least once.
   - `fetch-url` appends one JSON line per fetch; `check-chapter` emits `unverifiedSource` warnings for cited URLs not in the trail.
   - `--strict` promotes these warnings to failures. When the env var is unset and no trail exists, `check-chapter` emits a single `fetchTrailMissing` warning.
```

**验证**: 文档修改，无需 npm run validate。

---

### #10 `contracts.md` 中 `sources[].id` 标记为 "Schema-optional" 但实际必须

**最优方案**: 修改 build-contract-docs.mjs 中 SourceSchema 的 `id` 字段 `.describe()` 注释，使生成的 contracts.md 更清晰。

```js
// report-artifacts.schema.mjs → SourceSchema
// 将 id 的 describe 改为：
id: z.string().optional().describe('S<ChapterLetter>### (e.g. SO001). Schema-optional but effectively required: omitting it causes all downstream sourceRefs/claimRefs to dangle.')
```

**验证**: `npm run build:contracts` 重新生成 contracts.md；`npm run validate` 通过。

---

### #11 `product-tech` 章节的 `requiredSourceTypes: [official, technical-docs, developer-signal]` 对非软件公司过于严格

**问题**: 硬件/能源公司可能没有 developer-signal 源。

**最优方案**: 不修改 gate——`developer-signal` 对 product-tech 章节是有意义的 diversification 要求（即使是硬件公司也可以有 GitHub repos, patents, technical papers, job postings on Stack Overflow 等）。但在 workflow-config.yaml 的 product-tech evidenceStrategy 中增加一个 clarification：

```yaml
# workflow-config.yaml → product-tech → evidenceStrategy 末尾追加：
- "For non-software companies, developer-signal covers patents, clinical-trial databases, technical papers, engineering job posts, open-source tooling repos, or manufacturing-tech forums — not only traditional OSS/npm/GitHub signals."
```

这样 Agent 知道 developer-signal 不限于 GitHub。

**验证**: `npm run check:workflow-config` 通过。

---

### #12 `check-cross-chapter` 修复后需要重跑 finalize 的流程文档不明确

**最优方案**: 在 SKILL.md finalization triage table 的 `check-cross-chapter` 行的 "Fix target" 列中补充：

当前写的是：
> metric drift, key-fact overlap, or duplicate analysis across chapter YAMLs

改为：
> metric drift, key-fact overlap, or duplicate analysis across chapter YAMLs; after fixing, rerun `finalize-report` (it re-runs the strict sweep automatically)

**验证**: 文档修改，无需 npm run validate。

---

## 实施优先级

| 优先级 | 问题 | 类型 | 成本 |
|--------|------|------|------|
| P0 | #1 minArtifacts 不一致 | 代码 | 小 — 两个文件各改几行 |
| P0 | #2 topic fallback 虚设 | 代码 | 小 — 删几行代码 |
| P0 | #3 corroboration 语义不符 | 代码+注释 | 小 — 改注释和 message |
| P1 | #7 resume 覆盖 refresh-context | 代码 | 小 — 加一个 existsSync 判断 |
| P1 | #6 finalize compact 格式提示 | 文档 | 小 — SKILL.md 追加一行 |
| P1 | #9 env.sh 指引简化 | 文档 | 小 — 重写一段 |
| P2 | #11 developer-signal 适用性 | 配置 | 小 — evidenceStrategy 追加一行 |
| P2 | #12 cross-chapter 重跑提示 | 文档 | 小 — 表格追加半句 |
| P2 | #10 id 注释不清 | 代码 | 小 — 改一行 describe |
| Skip | #4 VOCABULARIES key 命名 | 无 | 0 — 不影响 Agent |
| Skip | #5 claimRefs 验证时机 | 无 | 0 — 已有文档 |
| Skip | #8 过期 acknowledge 残留 | 无 | 0 — 成本 > 收益 |
