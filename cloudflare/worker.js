/**
 * Startup Scheduler - Cloudflare Worker
 *
 * One Cron Trigger (`30 *\/4 * * *`) fires every four hours at :30 UTC,
 * matching the previous GitHub Actions schedule for unicorn discovery.
 *
 * Required secrets (set via `wrangler secret put`):
 *   GITHUB_TOKEN - Fine-grained PAT with Actions: Read & Write on the target repo
 *   GITHUB_REPO  - Owner/repo string, e.g. "vibewatch/startup"
 *
 * Optional vars:
 *   GITHUB_REF   - Dispatch target ref; defaults to "main"
 *
 * Schedule reference:
 *   unicorns.yml 30 *\/4 * * * inputs: industry=Any, unicornCount=3, model=claude-sonnet-4.6
 */

const WORKFLOW_DISPATCHES = [
  {
    workflow: "unicorns.yml",
    inputs: {
      industry: "Any",
      unicornCount: "3",
      model: "claude-sonnet-4.6",
    },
  },
];

export default {
  async scheduled(event, env, _ctx) {
    const now = new Date(event.scheduledTime);
    const ref = env.GITHUB_REF || "main";

    if (!env.GITHUB_TOKEN) {
      throw new Error("Missing GITHUB_TOKEN secret.");
    }
    if (!env.GITHUB_REPO) {
      throw new Error("Missing GITHUB_REPO secret.");
    }

    console.log(
      `[${now.toISOString()}] Dispatching on ${ref}: ${WORKFLOW_DISPATCHES.map((dispatch) => dispatch.workflow).join(", ")}`,
    );

    const results = await Promise.allSettled(
      WORKFLOW_DISPATCHES.map((dispatch) => dispatchWorkflow(env.GITHUB_TOKEN, env.GITHUB_REPO, ref, dispatch)),
    );

    let failureCount = 0;
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      const workflow = WORKFLOW_DISPATCHES[index].workflow;
      if (result.status === "rejected") {
        failureCount += 1;
        console.error(`Failed to dispatch ${workflow}: ${result.reason}`);
      } else {
        console.log(`Dispatched ${workflow} OK`);
      }
    }

    if (failureCount > 0) {
      throw new Error(`${failureCount} workflow dispatch(es) failed.`);
    }
  },
};

async function dispatchWorkflow(token, repo, ref, dispatch) {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${dispatch.workflow}/dispatches`;
  const payload = { ref };
  if (dispatch.inputs && Object.keys(dispatch.inputs).length > 0) {
    payload.inputs = dispatch.inputs;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "startup-cloudflare-scheduler",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
}