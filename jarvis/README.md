# Jarvis — DoWeo Developer Command (v0.1)

A private, local-only developer dashboard for DoWeo. This is separate from the public Weo assistant and is not a Cloudflare Pages asset.

## Requirements
- Node.js 20+
- Local checkout of this repository
- OpenAI Codex CLI installed and authenticated (run: codex login)
- A clean branch named feature/jarvis-* or jarvis/*

## Run
From the cloned repository:

    git switch feature/jarvis-developer-dashboard
    node jarvis/server.mjs

Open http://127.0.0.1:4177 on the same computer.

## How it works
1. Enter a feature or bug request and queue it.
2. Examine the task and explicitly approve or reject the coding run.
3. After approval, Codex CLI runs in workspace-write sandbox and may change files in the local clone. It is instructed never to push, commit, merge, or deploy.
4. View changes in the dashboard, review the complete diff using git diff, and run relevant project tests.
5. If satisfied, manually commit and create a draft PR. Do not merge before checks pass.

## Developer tools
- Active Git branch and worktree status
- Codex CLI version detection
- Literal repository text search
- Read-only diff viewer
- Jarvis policy tests
- In-memory task approval queue and logs

## Security
- Server binds only to 127.0.0.1 and checks request Host and POST Origin.
- No API keys are provided to browser JavaScript.
- Only designated Jarvis development branches are allowed for agent runs.
- Agent runs require a clean working tree and a separate explicit approval.
- Codex runs with the workspace-write sandbox, never with full-access flags.
- No automatic push, PR creation, merge, or deployment.
- Do not keep production secrets or real customer data in the development workspace. A coding agent's access to a local working directory carries risk.
- The existing deployment workflow copies only explicitly selected assets, excluding jarvis.

## Run checks

    node --check jarvis/server.mjs
    node --check jarvis/app.js
    node --test jarvis/tests/policy.test.mjs

GitHub Actions runs these checks when a pull request changes Jarvis files.

## Next steps
- Persist approved task history securely
- Stream progress instead of polling
- Add optional draft PR creation after another approval
- Add richer test integration and independent human review
- Add voice controls later

## Limitations
This first version cannot inspect live Supabase or Cloudflare account state, does not support voice, and does not automatically publish code. It also cannot guarantee that a coding agent will follow instructions in its prompt. Run only in a disposable development checkout without credentials.
