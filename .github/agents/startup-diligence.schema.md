# Startup Diligence v2 Schema

This schema is designed for professional startup research using a claims-based diligence artifact model.

## Research first principles

A professional startup researcher needs to collect and separate:

1. **Identity** — company, legal entity, website, product, aliases, stage, geography, leadership.
2. **Evidence** — fetched sources, source quality, independence, freshness, duplicate handling.
3. **Claims** — what is known, claimed, estimated, inferred, contradicted, or unknown.
4. **Market and customers** — category boundaries, demand drivers, TAM/SAM/SOM, buyers, users, urgency, budget owner, adoption barriers.
5. **Product and technology** — product maturity, workflows, technical stack, data/platform dependencies, defensibility, product risks.
6. **Traction and GTM** — customers, usage, revenue, partnerships, hiring, developer signals, pricing, channels, retention/expansion evidence.
7. **Competition and positioning** — direct competitors, substitutes, market map, moat sources, durability, competitive threats.
8. **Business and financials** — revenue streams, unit economics, funding, capital needs, margin profile, scenario ranges.
9. **Risk and governance** — market, product, legal, regulatory, governance, platform, security, privacy, financing, execution, reputation, macro risks.
10. **Decision memo** — recommendation, confidence, scorecard, thesis, positives, concerns, next diligence.
11. **Summary card** — concise website/card-ready view for discovery and review.

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
```

Optional Simplified Chinese files use the same basename with `.zh.yaml`.

## Evidence model

- Source IDs: `S001`, `S002`, ...
- Claim IDs: `C001`, `C002`, ...
- Later artifacts cite claims with `claimRefs`.
- Claims cite fetched sources with `sourceRefs`.
- All source records must include `fetchVerified: true`.

## Claim types

- `observed`
- `company-claimed`
- `third-party-reported`
- `estimated`
- `inferred`
- `open-question`

## Confidence levels

Use `high`, `medium`, or `low` based on source independence, credibility, recency, corroboration, and whether disconfirming evidence was found.

## Recommendation levels

- `high-conviction`
- `track`
- `research-more`
- `avoid`

## Validation expectations

At minimum:

- YAML parses.
- `slug`, `runDate`, and `company.name` are consistent.
- Every `claimRefs` value exists in `02-source-ledger.yaml`.
- Every claim `sourceRefs` value exists in `sources` and has `fetchVerified: true`.
- High-confidence conclusions do not rely only on company-authored, stale, low-quality, or duplicate sources.
