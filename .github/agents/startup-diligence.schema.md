# Startup Diligence v1 Schema

This schema defines a professional, claims-based startup diligence artifact set.
It includes team analysis, quantitative KPIs, comparables and valuation framing,
milestones to monitor, and a richer memo.

All report artifacts must use `schemaVersion: startup-diligence-v1`. Older
schema versions are not supported by the current agents or website.

## Research first principles

A professional startup researcher must collect and separate:

1. **Identity** — company, legal entity, website, product, aliases, stage, geography, leadership.
2. **Evidence** — fetched sources, source quality, independence, freshness, verbatim key quotes, duplicate handling.
3. **Claims** — what is known, claimed, estimated, inferred, contradicted, or unknown — each tied to fetched sources.
4. **Market and customers** — category boundaries, "why now" inflection drivers, demand drivers, top-down + bottom-up TAM/SAM/SOM, buyers, users, urgency, budget owner, adoption barriers.
5. **Product and technology** — product maturity, workflows, technical stack, data/platform dependencies, security and compliance posture, IP, roadmap, defensibility, product risks.
6. **Traction and GTM** — customers, usage, revenue, partnerships, hiring, developer signals, pricing, channels, retention/expansion evidence, **quantified KPI snapshot**, named **customer case studies with ROI**.
7. **Competition and positioning** — direct competitors, substitutes, market map, moat sources, durability, competitive threats.
8. **Business and financials** — revenue streams, **historical financials**, **quantified unit economics** (CAC, LTV, payback, NRR, GRR, gross margin, magic number, burn multiple, Rule of 40), capital efficiency, funding, capital needs, **cap-table summary**, scenario ranges.
9. **Risk and governance** — market, product, legal, regulatory, governance, platform, security, privacy, financing, financing-terms, execution, reputation, macro risks.
10. **Team and people** — founders deep-dive, key hires, advisors, board, hiring velocity, key-person risk, organizational gaps.
11. **Comparables and valuation** — public comparables, transaction comparables, valuation framework, valuation bridge, ownership sensitivity, recommended check-size and ownership, deal-term considerations, expected returns, and exit-path analysis.
12. **Milestones and catalysts** — leading indicators, milestones to monitor over the next 6/12/24 months, kill criteria, mind-changers.
13. **Decision memo** — recommendation, confidence, scorecard, thesis, **pre-mortem**, expected returns scenarios, **investment decision framework**, **mind-changers**, data-room requests, expert calls, and management questions.
14. **Summary card** — concise website/card-ready view including a numeric KPI snapshot.

## Artifact list

```text
00-research-plan.yaml
01-company-identity.yaml
02-source-ledger.yaml
03-market-customers.yaml
04-product-technology.yaml
05-traction-gtm.yaml
06-competition-positioning.yaml
07-business-financials.yaml
08-risk-governance.yaml
09-investment-memo.yaml
10-summary-card.yaml
11-team-people.yaml             # optional extended artifact
12-comparables-valuation.yaml   # optional extended artifact
13-milestones-catalysts.yaml    # optional extended artifact
```

Optional Simplified Chinese files use the same basename with `.zh.yaml`.

## Evidence model

- Source IDs: `S001`, `S002`, ...
- Claim IDs: `C001`, `C002`, ...
- Later artifacts cite claims via `claimRefs`.
- Claims cite fetched sources via `sourceRefs`.
- All source records must include `fetchVerified: true`.
- Sources may include `accessDate: YYYY-MM-DD` and `keyQuote: string` (verbatim snippet ≤ 240 chars from the fetched page that backs the most important related claims).

## Claim types

- `observed` — directly visible on the fetched source.
- `company-claimed` — asserted by the company in its own materials.
- `third-party-reported` — reported by an independent source.
- `estimated` — quantitative estimate; show the formula and inputs.
- `inferred` — analyst inference from other claims.
- `open-question` — important gap, no fetched evidence.

## Confidence levels

`high`, `medium`, `low`. Calibrate using source independence, credibility,
recency, corroboration, and presence of disconfirming evidence. `high` requires
multiple independent fetched sources.

## Recommendation levels

- `high-conviction`
- `track`
- `research-more`
- `avoid`

## Quantitative KPI conventions

Report numeric values under the structured `kpiSnapshot` in
`05-traction-gtm.yaml` and the structured `unitEconomicsQuant` /
`historicalFinancials` blocks in `07-business-financials.yaml`. Standard names:

- `arrUsdM` — annualized recurring revenue, USD millions.
- `revenueUsdM` — last full-year revenue, USD millions.
- `revenueGrowthYoYPct` — year-over-year revenue growth, percent.
- `grossMarginPct` — GAAP-style gross margin, percent.
- `nrrPct` — net revenue retention, percent.
- `grrPct` — gross revenue retention, percent.
- `magicNumber` — net new ARR / S&M spend, ratio.
- `burnMultiple` — net burn / net new ARR, ratio.
- `ruleOf40` — growth % + FCF margin %, integer.
- `cacPaybackMonths` — months to recover blended CAC.
- `ltvToCac` — LTV / CAC ratio.
- `runwayMonths` — months of cash at current burn.
- `headcount` — total FTE.
- `headcountGrowth90dPct` — 90-day headcount change, percent.

Always report `null` rather than guess. When a value is an estimate, set a
sibling `estimateBasis: string` describing the formula and inputs.

## Validation expectations

At minimum:

- YAML parses.
- `slug`, `runDate`, and `company.name` are consistent across files.
- Every `claimRefs` value exists in `02-source-ledger.yaml`.
- Every claim `sourceRefs` value exists in `sources` and has `fetchVerified: true`.
- High-confidence conclusions do not rely only on company-authored, stale, low-quality, or duplicate sources.
- Artifacts 11/12/13 are optional; if present they must parse and obey the same `claimRefs` rules.
- Numeric KPI fields, when set, must be numbers (not strings) so downstream tools can render charts.

## People media convention

Founder, executive, board, advisor, and key-hire records may include optional
`photoUrl` / `headshotUrl` fields only when the image is from an official,
licensed, or otherwise clearly reusable source and the image URL is fetched and
verifiable. Do not scrape or hotlink uncertain social-media images. If no
verified photo is available, leave the field null; the website renders an
initials-based placeholder and still shows role, status, and background.
