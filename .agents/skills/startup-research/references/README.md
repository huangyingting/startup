# startup-research documentation responsibility

Rules for the documentation files inside this skill (`SKILL.md`, files in `references/`, and the `--help` / source modules under `scripts/`). Each file answers exactly one question; other files referencing the same topic degrade to a one-line pointer.

| File | Owns | Does **not** own |
|---|---|---|
| `SKILL.md` | Process: steps, CLI, decisions, retry policy, research/evidence rules | Field definitions, enum values, checker algorithms |
| `references/<topic>-schema-v<N>.md` | Schema: field shapes, enums, IDs, cross-schema pointers | CLI, process advice, checker internals |
| `references/yaml-rules.md` | YAML syntax constraints (indentation, quoting, anchors, numeric/null) | Schema, process |
| `references/<config>.yaml` | Configuration data (e.g. `chapters.yaml`) | — |
| `scripts/<name>.mjs --help` | CLI usage: arguments, mutual-exclusion rules | Field semantics, process |
| Source modules (e.g. `scripts/check-dimensions.mjs`) | Vocab values and checker algorithms (runtime source of truth) | Documentation duplication |

**Total rule.** Schema docs describe "what this field is in the data". Anything about what command produced it, what the checker does with it, or what another schema looks like degrades to a one-line pointer to the file that owns it. Cross-schema pointers are one-directional: schema → schema is allowed; schema → SKILL.md is not — process docs read schemas, schemas don't loop back to describe process.

**Common violations to watch for in schema docs:**

- Inline CLI flags or invocation commands (belongs in SKILL.md or `--help`).
- "The agent should …" / "Use this to …" advice (belongs in SKILL.md).
- Re-listing enum values whose source of truth is a `.mjs` module.
- Inlining another schema's fields when a `see references/<other>.md` pointer would do.
- Field comments that describe checker algorithms instead of field semantics.
