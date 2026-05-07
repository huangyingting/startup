# AGENTS.md

This repository generates startup diligence reports as structured YAML and renders them with an Astro static website.

## Project map

- `reports/` — generated report runs, one folder per finalized run.
- `.agents/skills/startup-research/` — end-to-end report-generation skill, including private references and skill-owned scripts. Owns chapter checks, report validation, ledger consolidation, and final assembly.
- `.agents/skills/fetch-url/` — direct URL fetch helper skill (HTML / PDF, with curl-impersonate, host-strategy map, reader/wayback fallbacks, on-disk cache).
- `website/` — Astro site and rendering contracts (no validators live here; `website/src/lib/figures.mjs` is shared with the skill validators).

## Setup commands

- Install root dependencies: `npm install`
- Install website dependencies: `npm --prefix website install`
- Run full validation: `npm run validate`
- Run website locally: `npm --prefix website run dev`

## Testing instructions

- Before finishing code, schema, report, loader, renderer, or script changes, run `npm run validate` unless the user asked for a narrower edit.
- For workflow config/revision-graph checks only, run `npm run check:workflow-config` and `npm run check:revision-graph`.

## Working conventions

- Keep skill-owned scripts under `.agents/skills/*/scripts/`. Validation logic that needs to run both during chapter generation and at report-build time (e.g. figure shape contracts) is shared via `website/src/lib/` modules imported by the skill validators.
- Use `node .agents/skills/.../scripts/*.mjs` directly for skill workflow scripts; do not add npm aliases for skill internals.

## Skill documentation responsibility

Each file in a skill answers exactly one question. Other files referencing the same topic degrade to a one-line pointer.

| File | Owns | Does **not** own |
|---|---|---|
| `SKILL.md` | Process: steps, CLI invocations, decisions, retry policy, research/evidence rules | Field definitions, enum values, checker algorithms |
| `references/<topic>-schema-v<N>.md` | Schema: field shapes, enums, IDs, cross-schema pointers | CLI, process advice, checker internals |
| `references/yaml-rules.md` | YAML syntax constraints (indentation, quoting, anchors, numeric/null) | Schema, process |
| `references/<config>.yaml` | Configuration data | — |
| `scripts/<name>.mjs --help` | CLI usage: argument list, mutual-exclusion rules | Field semantics, process |
| `scripts/check-dimensions.mjs` (and similar source modules) | Source of truth for vocab values + checker algorithms | Documentation duplication |

**Total rule.** Schema docs describe "what this field is in the data". Anything about "what command produced it", "what the checker does with it", or "what another schema looks like" degrades to a one-line pointer to the file that owns it. Cross-schema pointers are one-directional: schema → schema is allowed; schema → SKILL.md is not (process docs read schemas; schemas don't loop back to describe process).

**Common violations to watch for in schema docs:**

- CLI flags or invocation commands inline (belongs in SKILL.md or `--help`).
- "The agent should ..." / "Use this to ..." advice (belongs in SKILL.md).
- Re-listing enum values whose source of truth is a `.mjs` module (point to it; don't restate).
- Inlining another schema's fields when a `see references/<other>.md` pointer would do.
- Field comments that describe checker algorithms instead of field semantics.

## Core philosophy

> ⚠️ **These rules govern repo development only — they have NO bearing on report generation.**
>
> - **Applies to:** code, schemas, scripts, workflows, docs.
> - **Does NOT apply to:** anything under `reports/`. Diligence reports are produced by skill orchestration (driven end-to-end by `.agents/skills/startup-research/`, with `.agents/skills/fetch-url/` as a helper). That pipeline owns its own rules and prioritizes thoroughness and source coverage.

- **Think before acting.** State assumptions explicitly. If something is unclear or has multiple reasonable interpretations, ask instead of guessing. Push back when a simpler approach exists.
- **Simplicity first.** Do the minimum that solves the problem. No speculative scope, extra options, or handling for situations that won't happen.
- **Surgical changes.** Touch only what the request requires. Don't reformat or "improve" adjacent content. Match existing style. Mention unrelated issues you notice rather than silently fixing them.
- **Goal-driven execution.** Turn each task into a verifiable success criterion (e.g. specific files written, a check now passing, a question answered). For multi-step work, state a brief plan with a verification step per item before executing.