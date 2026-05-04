# Workflow Improvement Notes

Observations and actionable improvement suggestions drawn from generating three unicorn
diligence reports in parallel:
- **Thinking Machines** (`20260504115542`) — stealth AI lab, $10 B valuation, pre-revenue
- **Abridge** (`20260504115543`) — healthcare AI, $2.8 B valuation, private company
- **Celestial AI** (`20260504115544`) — silicon photonics, $2.5 B valuation, acquired mid-research

---

## 1. Adverse-source floor is not enforced at the source level

**Observation.** The gate enforces a minimum number of `type: adverse` *research questions*
but places no floor on sources with `stance: adverse`. Results across the three runs:

| Report | Total sources | Adverse sources | Adverse % |
|---|---|---|---|
| Thinking Machines | 207 | 3 | 1.4 % |
| Abridge | 194 | 21 | 10.8 % |
| Celestial AI | 218 | 39 | 17.9 % |

A report with only 3 adverse sources (Thinking Machines) can still pass every gate, producing
a structurally confirming evidence base for a company whose co-founders are already departing.

**Suggested fix.** Add a `minAdverseSourcesPct` (e.g. 5 %) or `minAdverseSources` (e.g. 5)
per-chapter gate dimension, parallel to the existing `minAdverseQuestions` check.  Consider
requiring at least one adverse source per chapter in `requiredSourceTypes` for `risks` and
`valuation` chapters.

---

## 2. Paywall-rate risk surfaces only after the full report is assembled

**Observation.** The report-level gate fails when more than 30 % of sources have
`accessStatus: paywall | js-only | broken | rate-limited`.  Celestial AI finished at
28.9 %—one unlucky chapter away from a post-finalization failure.  There is no per-chapter
warning to flag the approaching threshold while chapters are still writable.

**Suggested fix.** Emit a `--strict` warning (dimension: `paywallRisk`) in `gate.mjs` when a
single chapter's restricted-access sources exceed 25 % locally, giving the researcher a chance
to swap sources before the threshold becomes unreachable.  Also add a running total to the
chapter packet so each chapter can see the cumulative paywall count from earlier chapters.

---

## 3. No workflow guidance for stealth / pre-revenue companies

**Observation.** Both Thinking Machines and Celestial AI are pre-revenue.  The workflow
produced large `private-evidence-only` gap counts (9 and 0 respectively after post-acquisition
reframe) and `missing-source` gaps for standard financial metrics that simply do not exist in
the public domain for stealth companies.

| Report | `private-evidence-only` gaps | `missing-source` gaps |
|---|---|---|
| Thinking Machines | 9 | 10 |
| Abridge | 18 | 22 |
| Celestial AI | 0 | 0 |

Abridge, while not stealth, is a private company with undisclosed financials, yielding the
highest blocking gap count (8) of the three.

**Suggested fix.** Add a **stealth / pre-revenue mode** flag to `new.mjs` (e.g.
`--stage stealth`) that relaxes financial-section floor requirements and pre-populates
canonical evidence gaps for ARR, revenue, and headcount, rather than forcing the researcher
to rediscover and re-document these unavailable data points in every report.

---

## 4. Acquired-company scenario is unmodeled

**Observation.** Celestial AI was acquired by Marvell during research (announced March 2025).
The schema has no `companyStatus` or `acquisitionStatus` field, so the agent had to encode
the M&A context inside narrative sections and `report-meta.yaml`'s `subtitle`.  The
`summary-card.yaml` `stage` field was left as `growth` even though the company no longer
exists as an independent entity.

**Suggested fix.**
- Add `companyStatus: active | acquired | merged | public | bankrupt` to the `companyProfile`
  object in `report-schema-v2.md`.
- When `companyStatus: acquired`, allow (or require) an `acquisition` block with
  `acquirer`, `announcedDate`, `closedDate`, and `dealValueUsdM`.
- Add a pre-research screening note to `SKILL.md`: check for acquisition announcements before
  scaffolding chapters, and if found, set the report framing to M&A-analysis mode rather than
  standalone-company mode.

---

## 5. `developer-signal` and `customer-proof` source types are systematically underused

**Observation.** Both source types are listed in `requiredSourceTypes` for certain chapters but
remain near-zero across all three reports:

| Report | `developer-signal` | `customer-proof` |
|---|---|---|
| Thinking Machines | 1 | 0 |
| Abridge | 0 | 5 |
| Celestial AI | 0 | 0 |

The gate enforces presence when listed in `requiredSourceTypes`, but no chapter appears to
require both types, so neither is pursued with depth.

**Suggested fix.**
- Expand `requiredSourceTypes` in `chapters.yaml` for `05-product-tech` to include
  `developer-signal` (GitHub stars, Hacker News threads, API forums, Stack Overflow) and for
  `06-customers` to include `customer-proof` (G2/Capterra reviews, case studies, press
  release quotes, LinkedIn testimonials).
- Add concrete sourcing strategies to the chapter's `evidenceStrategy` field so the
  researcher knows *where* to look for these harder-to-find types.

---

## 6. Agents target the source-count floor rather than genuine depth

**Observation.** Chapters 1–6 in Thinking Machines and Abridge show exactly 25 sources;
chapters 7–8 show exactly 30–35.  This pattern suggests agents stop adding sources once the
floor is satisfied, regardless of remaining unresolved questions.

**Suggested fix.** Replace (or supplement) the absolute `minSources` floor with a
**sources-per-unresolved-question** ratio check: if any research question remains `partial` or
`unresolved`, the gate should require at least one additional source attempt before the gap can
be closed.  This would turn source count from a ceiling into a function of actual evidence
needs.

---

## 7. Unresolved questions left open in mid-report chapters propagate quietly

**Observation.** Abridge carried 39 total unresolved questions across 8 chapters (all legally
closed by evidenceGaps), but the per-chapter gate does not surface the *cumulative* unresolved
count to the researcher, so later chapters can't easily detect when the overall report is
losing coherence.

| Chapter | Abridge unresolved RQs |
|---|---|
| 01 company-overview | 4 |
| 02 market-analysis | 5 |
| 03 competitors | 6 |
| 04 financials | 6 |
| 05 product-tech | 5 |
| 06 customers | 5 |
| 07 risks | 6 |
| 08 valuation | 2 |

**Suggested fix.** Add a running `cumulativeUnresolvedQuestions` field to the chapter packet
(from `chapter.mjs --include-context`) and emit a warning if the cumulative count exceeds a
configurable threshold (e.g. 20 across the report so far) before the researcher writes the
current chapter.

---

## 8. `comparison` and `conflicting` claim types are almost never used

**Observation.** Across 860 total claims:

| Claim type | TM | Abridge | Celestial AI |
|---|---|---|---|
| `conflicting` | 1 | 0 | 0 |
| `comparison` | 5 | 0 | 0 |

These are the two most analytically valuable types (surfacing disagreements and benchmarks),
yet they are structurally absent from most reports.  The schema defines them, but nothing in
the gate or workflow encourages their use.

**Suggested fix.** Add gate dimensions `minConflictingClaimsInRisks` (e.g. 1) and
`minComparisonClaimsInCompetitors` (e.g. 2) to the respective chapters in `chapters.yaml`.
For `conflicting`, enforce `contradictsClaimRefs` is non-empty before the claim passes schema
validation.

---

## 9. Product-Tech chapter (05) consistently produces the fewest distinct domains

**Observation.**

| Report | Ch-05 distinct domains |
|---|---|
| Thinking Machines | 16 |
| Abridge | 18 |
| Celestial AI | 22 |

All chapters have the same nominal `minSourceDomains` floor, yet Product-Tech reliably falls
short relative to other chapters.  Technical documentation concentrates on fewer publishers
(company blog, GitHub, arXiv, a handful of tech media outlets).

**Suggested fix.** Reduce `minSourceDomains` for `05-product-tech` to reflect the realistic
publisher landscape for technical content, or expand the `evidenceStrategy` to point
researchers toward additional domain classes: patent filings, developer forums, benchmark
databases, and conference proceedings.

---

## 10. No execution time-box guidance

**Observation.** Execution times varied by 3×:
- Thinking Machines: ~91 minutes
- Abridge: ~118 minutes
- Celestial AI: ~298 minutes

The Celestial AI agent spent a disproportionate amount of time on deep-tech sourcing and
likely gate retries for the paywall threshold.  There is no guidance on when to declare a
chapter "done enough" vs. when to keep iterating.

**Suggested fix.** Add a **research time-box** recommendation to `SKILL.md`: if a chapter
fails its gate 3 times on the same dimensions and evidence is simply not publicly available,
accept the chapter with `acknowledgedWarnings` rather than re-running indefinitely.  Document
the specific dimensions that are acceptable to waive (e.g. `netNewSources` for deep-tech
semiconductor chapters with limited public disclosure).

---

## Summary of suggested file changes

| File | Change |
|---|---|
| `references/chapters.yaml` | Add `minAdverseSourcesPct`, expand `requiredSourceTypes` for ch-05 and ch-06, add `minConflictingClaimsInRisks` / `minComparisonClaimsInCompetitors`, adjust `minSourceDomains` for ch-05 |
| `references/report-schema-v2.md` | Add `companyStatus` + `acquisition` block to `companyProfile`; document `developer-signal` and `customer-proof` sourcing strategies |
| `scripts/gate.mjs` | Add `paywallRisk` warning dimension; add `minAdverseSources` check; add `conflictingClaimsMin` / `comparisonClaimsMin` checks |
| `scripts/chapter.mjs` | Emit cumulative unresolved question count in packet when `--include-context` is set |
| `scripts/new.mjs` | Add `--stage stealth` flag to pre-populate canonical private-company evidence gaps |
| `SKILL.md` | Add pre-research screening step (acquisition / stealth check); add time-box guidance; document sourcing strategies for `developer-signal` and `customer-proof` |
