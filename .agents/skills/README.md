# Skills

This folder holds the workflow skills the coding agent invokes. Each skill's `SKILL.md` is its entry point.

## Available skills

- **`startup-research/`** — end-to-end report-v2 diligence pipeline. Owns the chapter loop, per-chapter and report-level checks, ledger consolidation, and final artifact assembly.
- **`fetch-url/`** — fetch one URL and return readable HTML text or PDF-extracted text. Includes identity-profile retries (curl-impersonate), a per-host strategy map, reader/wayback fallbacks, and an on-disk cache.
- **`translate-zh/`** — translate finalized report artifacts into Simplified Chinese overlays (`summary-card.zh.yaml` and `full-report.zh.yaml`) using the sparse-bundle workflow.

## Conventions

- Skill scripts live under `<skill>/scripts/`. Validation logic that must run both during chapter generation and at report-build time (e.g. figure shape contracts) is shared via `website/src/lib/` modules imported by the skill validators.
- Invoke skill scripts directly: `node .agents/skills/<skill>/scripts/<name>.mjs`. Do not add npm aliases for skill internals.
