---
on:
  # workflow_run definitions must live on the default branch to fire.
  workflow_run:
    workflows: ["Research unicorns"]
    types: [completed]
    branches: [main]
  workflow_dispatch:
    inputs:
      run_id:
        description: "Run id to analyze (omit = most recent)."
        required: false
        type: string

permissions:
  contents: read
  actions: read
  issues: read
  pull-requests: read

engine:
  id: copilot
  model: gpt-5.5
strict: true
timeout-minutes: 25

network:
  allowed: [defaults, github]

tools:
  github:
    mode: gh-proxy
    toolsets: [default, actions]
  bash: [cat, grep, jq, head, tail, wc, find, ls, sed, awk, node, npm, npx, mkdir, cp, mv, diff, git]
  edit:

safe-outputs:
  create-pull-request:
    title-prefix: "[skill-review] "
    labels: [skill-improvement, automation]
    draft: true
    max: 1

concurrency:
  group: skill-review-${{ github.event.workflow_run.id || github.event.inputs.run_id || 'manual' }}
  cancel-in-progress: false
---

# Review the startup-research skill against the latest Research unicorns run

## Run to analyze

- `workflow_run`: id `${{ github.event.workflow_run.id }}` · conclusion `${{ github.event.workflow_run.conclusion }}` · ${{ github.event.workflow_run.html_url }}
- `workflow_dispatch`: `${{ github.event.inputs.run_id }}` if set, else the most recent — `gh run list --workflow="Research unicorns" --limit 1 --json databaseId,conclusion,htmlUrl --repo ${{ github.repository }}`.

## Goal

Decide whether `.agents/skills/startup-research/` needs **exactly one** focused improvement based on this run. Apply it and open a draft PR via safe-outputs, OR output `NO_ACTIONABLE_FINDING` and stop. Silent exit is the expected outcome most runs.

## Early exit

- If `${{ github.event.workflow_run.conclusion }}` is `cancelled` or `skipped`, output `NO_ACTIONABLE_FINDING` and stop — incomplete logs are not worth analyzing.

## What to read

First resolve `RUN_ID` from §Run to analyze (`workflow_run.id` or `inputs.run_id`); use it everywhere `<RUN_ID>` appears below.

1. **`Run startup research` step log** — failed checks, blind retries, prompt instructions Copilot ignored, vague errors, runaway tokens.
   ```bash
   gh run view <RUN_ID> --log --repo ${{ github.repository }} \
     | sed -n '/Run startup research/,/##\[group\]Run /p'
   ```
2. **`::warning::` / `::error::` markers** elsewhere (e.g. "Drop partial report folders"):
   ```bash
   gh run view <RUN_ID> --log --repo ${{ github.repository }} | grep -E '::(warning|error)::' | head -50
   ```
3. **`npm run validate` failure output** — concrete schema/contract gaps the skill should have prevented earlier.
4. **Skill state**: `.agents/skills/startup-research/SKILL.md`, `scripts/*.mjs`, `references/*.md`.
5. **Repo conventions**: `AGENTS.md`, `CLAUDE.md`.

## What counts as a finding

✓ **Concrete, log-supported:**
- Repeated failure mode a SKILL/script change would have prevented.
- Vague check error that triggered blind retries (token waste).
- Finalize step that should short-circuit earlier on the observed failure.
- SKILL.md instruction contradicting what a script actually enforces.
- A `unicorns.yml` prompt the agent demonstrably could not follow.

✗ **Skip silently:**
- Anything inside `reports/` (owned by the report pipeline per `AGENTS.md`).
- Speculative refactors with no log trigger.
- Style / wording polish with no behavioral effect.
- Defensive code for situations that did not occur.
- "Could be cleaner" suggestions.

No finding → output exactly `NO_ACTIONABLE_FINDING` and stop. No safe-output.

## Applying the finding

**Scope** (touch one, by priority): `.agents/skills/startup-research/` → `.github/workflows/unicorns.yml` (only if prompt/env is root cause) → `.agents/skills/fetch-url/` (only if fetch-url is root cause). **Never** `reports/`, other workflows, or unrelated files. If the fix needs ~5+ files, it's too big — emit `NO_ACTIONABLE_FINDING`.

**Style** (per `AGENTS.md`): match existing style; no docstrings on untouched code; no defensive code for impossible situations.

**Validate** before opening the PR:
```bash
npm install --no-audit --no-fund
npm run validate
```
Both must exit 0. If you can't run npm, say so in the PR body and lower confidence — do not skip silently. If validate fails after your edit, revert the edit and emit `NO_ACTIONABLE_FINDING` — never open a PR with a red `npm run validate`.

**PR body** (sections in this order):
- `## Trigger run` — `${{ github.event.workflow_run.html_url }}` if set, else `https://github.com/${{ github.repository }}/actions/runs/${{ github.event.inputs.run_id }}`.
- `## Symptom` — one paragraph; quote 3–10 log lines in a fenced block.
- `## Fix` — one paragraph: what changed, why it addresses the symptom.
- `## Validation` — `npm run validate` exit + one-line summary, or note it could not run.
- `## Files touched` — bullet list.

Title: imperative, ≤ 72 chars, no period. PR is `draft`, a human reviews before merge.
