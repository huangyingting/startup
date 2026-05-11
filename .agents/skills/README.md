# Skills

This folder holds the workflow skills the coding agent invokes. Each skill's `SKILL.md` is its entry point.

## Available skills

- **`startup-research/`** — end-to-end report-v2 diligence pipeline. Owns the chapter loop, per-chapter and report-level checks, ledger consolidation, and final artifact assembly.
- **`fetch-url/`** — fetch one URL and return readable HTML text or PDF-extracted text. Includes identity-profile retries (curl-impersonate), a per-host strategy map, reader/wayback fallbacks, and an on-disk cache.
- **`translate-zh/`** — translate finalized report artifacts into Simplified Chinese overlays (`summary-card.zh.yaml` and `full-report.zh.yaml`) using the sparse-bundle workflow.

## Conventions

- Skill scripts live under `<skill>/scripts/`. Validation logic that must run both during chapter generation and at report-build time (e.g. figure shape contracts) is shared via `website/src/lib/` modules imported by the skill validators.
- Invoke skill scripts directly: `node .agents/skills/<skill>/scripts/<name>.mjs`. Keep root npm aliases limited to repository-level checks and user-facing runners such as `translate:zh`.
- For startup report contract maintenance, use `npm run check:reports-contract`. If finalized reports have orphan exhibits, anchor the affected table/figure ids in the source chapter's `tableRefs`/`figureRefs`, rebuild with `node .agents/skills/startup-research/scripts/build-report.mjs reports/<run-id>`, then rerun the contract check.
- For Simplified Chinese overlay maintenance, use `npm run check:translations-zh` for all overlays or `npm run translate:zh -- verify <run-id>` for one report.
