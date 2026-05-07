---
on:
  # Fires after every "Research unicorns" run regardless of conclusion.
  # workflow_run only triggers from the workflow definition on the default
  # branch — this file must be merged to main before the trigger goes live.
  workflow_run:
    workflows: ["Research unicorns"]
    types: [completed]
    branches: [main]
  # Manual escape hatch for testing on a known run id without waiting for
  # the next scheduled cron.
  workflow_dispatch:
    inputs:
      run_id:
        description: "Specific 'Research unicorns' run id to analyze (omit to use the most recent)."
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
  group: review-startup-research-skill-${{ github.event.workflow_run.id || github.event.inputs.run_id || 'manual' }}
  cancel-in-progress: false
---

# Review the startup-research skill against the latest Research unicorns run

## Trigger context

- Parent workflow: **Research unicorns** (`.github/workflows/unicorns.yml`).
- Run id to analyze:
  - When triggered by `workflow_run`: `${{ github.event.workflow_run.id }}` (conclusion: `${{ github.event.workflow_run.conclusion }}`, html_url: ${{ github.event.workflow_run.html_url }}).
  - When triggered manually: `${{ github.event.inputs.run_id }}` if set, otherwise the most recent `Research unicorns` run on the default branch (use `gh run list --workflow="Research unicorns" --limit 1 --json databaseId,conclusion,htmlUrl --repo ${{ github.repository }}`).

## Goal

Decide whether the `.agents/skills/startup-research/` skill needs **exactly one** focused improvement based on what that run actually did. If yes, make the change and open a draft PR via the safe-outputs channel. If nothing actionable, exit cleanly without producing any output.

## What to read (in this order)

1. **The "Run startup research" step output** from the parent run:
   ```bash
   gh run view <RUN_ID> --log --repo ${{ github.repository }} \
     | sed -n '/Run startup research/,/^[0-9-T:Z]* .* ##\[group\]Run /p'
   ```
   Look for: failed checks, retried chapters, vague error messages the agent had to guess on, prompt instructions Copilot ignored, runaway token usage.

2. **The job summary** of that run (it carries the Copilot stats line and the fetch-url trail count we added):
   ```bash
   gh api repos/${{ github.repository }}/actions/runs/<RUN_ID>/jobs --jq '.jobs[].steps[] | select(.name=="Run startup research") | {conclusion, started_at, completed_at}'
   gh api repos/${{ github.repository }}/actions/runs/<RUN_ID> --jq '{conclusion, html_url, run_started_at}'
   ```

3. **`::warning::` / `::error::` markers** elsewhere in the run (the "Drop partial report folders" step prints those when the agent left junk behind):
   ```bash
   gh run view <RUN_ID> --log --repo ${{ github.repository }} | grep -E '^[0-9-T:Z]+ \S+ ::(warning|error)::' | head -50
   ```

4. **The validate step output** — `npm run validate` failures point at concrete schema/contract gaps the skill should have prevented earlier.

5. **Current state of the skill before suggesting any edit**:
   - `.agents/skills/startup-research/SKILL.md`
   - `.agents/skills/startup-research/scripts/*.mjs` (especially `check-chapter.mjs`, `validate-report-meta.mjs`, `finalize-report.mjs`, `validation-catalog.mjs`)
   - `.agents/skills/startup-research/references/*.md`

6. **The repo conventions** before touching anything:
   - `AGENTS.md` and `CLAUDE.md` at the repo root.

## Decide: improvement or NO_ACTIONABLE_FINDING

A finding **counts** when it is concretely supported by the log. Examples:

- A failure mode the run hit repeatedly that a SKILL instruction or script change would have prevented.
- A check whose error message was vague enough that the agent retried blindly (token waste).
- A finalize step that should short-circuit earlier given the failure mode observed.
- A SKILL.md instruction that contradicted what a script actually enforces.
- A workflow prompt instruction in `unicorns.yml` that the agent demonstrably could not follow.

A finding does **NOT** count (skip silently):

- Anything inside `reports/` — per `AGENTS.md`, that directory is owned by the report-generation pipeline, not by repo development.
- Speculative refactors with no concrete trigger in the log.
- Style / wording polish with no behavioral effect.
- Adding error handling for situations that did not actually occur.
- "Could be cleaner" suggestions.

If you find nothing concrete, output exactly the line `NO_ACTIONABLE_FINDING` and stop. Do not produce any safe-output. The workflow will end cleanly and that is the expected outcome most of the time.

## If you find one improvement: how to apply it

1. **Touch only one of these scopes** (in priority order):
   - `.agents/skills/startup-research/` (preferred — most learnings live here)
   - `.github/workflows/unicorns.yml` (only when the prompt or env wiring is the root cause)
   - `.agents/skills/fetch-url/` (only when the trigger is fetch-url behavior, not skill behavior)
   - **Never** edit anything under `reports/`.
   - **Never** edit other workflows or unrelated repo files.

2. **One change per run.** If you see multiple problems, pick the highest-ROI one and ignore the rest.

3. **Match the existing code style.** Do not reformat adjacent code. Do not add docstrings/comments to code you did not change. Do not add validation for situations that cannot happen. (These are direct quotes from `AGENTS.md`; honor them.)

4. **Validate before submitting.**
   ```bash
   npm install --no-audit --no-fund
   npm run validate
   ```
   Both must exit 0. If validate fails, fix it or revert your edit. If you cannot run npm in the sandbox, state that explicitly in the PR body and DOWNGRADE your confidence — do not silently skip.

5. **Open the PR via safe-outputs**, with:
   - **Title:** short imperative summary (≤ 72 chars), no period.
   - **Body** sections (in this order):
     - `## Trigger run` — if `${{ github.event.workflow_run.html_url }}` is non-empty, link to it; otherwise construct `https://github.com/${{ github.repository }}/actions/runs/<run_id>` where `<run_id>` is `${{ github.event.inputs.run_id }}`.
     - `## Symptom in log` — one paragraph, may quote 3–10 log lines verbatim in a fenced block.
     - `## Fix` — one paragraph describing what changed and why it addresses the symptom.
     - `## Validation` — `npm run validate` exit code and a one-line summary, OR a clear note that it could not be run.
     - `## Files touched` — bullet list of the files changed.

## Hard rules (re-stated for emphasis)

- ONE change per run. PR is `draft: true` so a human will review before merge.
- Never delete or rename existing report folders.
- Never push to `main` or any branch directly — only via the safe-outputs PR channel.
- Never add new GitHub secrets, workflows, or actions.
- If a single improvement would require touching more than ~5 files, it is too big for this workflow — emit `NO_ACTIONABLE_FINDING` and let a human design it instead.
