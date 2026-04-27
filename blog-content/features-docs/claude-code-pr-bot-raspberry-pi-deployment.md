# Claude Code PR Bot — Raspberry Pi Deployment

## One command to install everything on the Pi from any machine

With a token, custom Pi host, and custom feature docs folder:

```bash
curl -fsSL https://raw.githubusercontent.com/vvasylkovskyi/claude-pr-bot/main/install.sh | \
  CLAUDE_TOKEN=sk-ant-... \
  PI_HOST=192.168.1.42 \
  FEATURE_DOCS_DIR=/home/pi/my-docs \
  bash
```

### To uninstall and clean up everything

```bash
curl -fsSL https://raw.githubusercontent.com/vvasylkovskyi/claude-pr-bot/main/uninstall.sh | bash
```

Or from the cloned repo:

```bash
./scripts/uninstall.sh
```

## Getting Your Claude Token

Claude Code on the Pi can’t complete the browser-based OAuth flow headlessly, so you generate the token on your main machine and ship it over.

### Step 1 — Generate the token on your laptop

```bash
claude setup-token
```

This prints a token string starting with `sk-ant-...`. Copy it.

### Step 2 — Pass it to the install script

Pass it as shown above, or let the script prompt you interactively.

### What happens with it

The token is written to `.claude-env` on the Pi with `chmod 600` (readable only by the pi user), and loaded into the systemd service as `CLAUDE_CODE_OAUTH_TOKEN`. It never touches the service unit file itself, which is world-readable.

### Token expiry

`claude setup-token` issues a one-year token designed for headless/CI use. Regular `/login` tokens expire after 8–12 hours — don’t use those.

If the service fails with a 401, re-run `claude setup-token` on your laptop and re-run the install script, or invoke `scripts/deploy.sh` directly from the cloned repo:

```bash
cd ~/claude-pr-bot
CLAUDE_TOKEN=sk-ant-<new-token> ./scripts/deploy.sh
```

The playbook is idempotent — it will only update the env file and restart the service.

`StartLimitIntervalSec=0` in the systemd unit means systemd retries indefinitely on failure, so a mid-session 401 auto-recovers once you redeploy the token.

Never commit `inventory.ini` or `.claude-env` to version control. Add both to `.gitignore`.

## Permission Modes: `--dangerously-skip-permissions` vs `--permission-mode auto`

Claude Code has two main headless-friendly permission modes. This setup uses `--dangerously-skip-permissions`.

### `--dangerously-skip-permissions`

Bypasses all permission prompts and safety checks entirely. Claude executes every tool call — file writes, shell commands, git operations — without pausing. There is no classifier running in the background.

What you get is pure autonomy with no guardrails beyond what the OS user account restricts. This is appropriate here because the Pi is an isolated, single-purpose machine running a known, trusted pipeline against your own repository.

### `--permission-mode auto`

Runs a background safety classifier on every action. Claude still proceeds without prompts, but the classifier can block individual tool calls it deems dangerous (destructive shell commands, credential exfiltration attempts, etc.). If Claude hits 3 consecutive blocks or 20 total in a session, it terminates the process. In headless mode with `-p` there is no UI to recover from — the process just exits.

This makes auto mode better suited to shared machines or CI pipelines where you can’t fully trust every input that triggers the pipeline.

### When to use which

| Mode | Safety classifier | Prompting | Risk of blocked mid-session | Best for |
|---|---|---|---|---|
| `--dangerously-skip-permissions` | Off | None | None | Isolated, trusted machines |
| `--permission-mode auto` | Running | Partial | Yes (on 3 consecutive denials) | Shared machines, CI/CD |

For this Pi setup — single-purpose, air-gapped from sensitive infrastructure, running your own feature docs — `--dangerously-skip-permissions` is the pragmatic choice.

## How Skills and Agents Replace Prompt Concatenation

Earlier versions of this pipeline assembled the orchestrator prompt by concatenating markdown files at shell invocation time (`cat orchestrator.md writer.md reviewer.md`). That works but it’s brittle: you’re managing prompt assembly in bash, outside of Claude’s awareness.

The cleaner approach uses Claude Code’s native skills and agents system:

- **Agents** (`.claude/agents/`) are subagent definitions stored as markdown files in the repository itself. Each agent has its own system prompt, tool restrictions, and optionally a different model. Your writer and reviewer are defined here and Claude Code discovers them automatically when it starts in that repo’s directory.
- **Skills** (`.claude/skills/`) are invocable workflows. A skill becomes a slash command — so your orchestrator skill becomes `/orchestrator`. When invoked, it loads into Claude’s context and can dispatch work to the writer and reviewer agents by name. No shell-level prompt assembly needed.

### How it fits together

```text
repo/
└── .claude/
    ├── agents/
    │   ├── writer.md    ← subagent: owns the writing step
    │   └── reviewer.md  ← subagent: owns the review step
    └── skills/
        └── orchestrator/
            └── SKILL.md  ← invoked via /orchestrator, coordinates writer + reviewer
```

### Pipeline command

```bash
claude --dangerously-skip-permissions -p \
  "/orchestrator Process this feature doc: @${path}${file}"
```

Claude starts in the repo directory, discovers `.claude/agents/` and `.claude/skills/` automatically, loads the orchestrator skill, and dispatches to the writer and reviewer agents as the skill instructs. Everything lives in version control alongside the code.

## On `--allowedTools`

Not needed here. Since `--dangerously-skip-permissions` bypasses all permission checks entirely, specifying tools on top of that is redundant.

## On `--output-format`

The default is text — plain prose to stdout. `--output-format json` wraps the response in a JSON envelope with `result`, `session_id`, and token metadata, useful if you’re piping to `jq` or capturing session IDs for multi-turn workflows.

Since this pipeline logs to journald, plain text is more readable in `journalctl -f`.

## Project Structure

```text
claude-pr-bot/
├── install.sh              ← hosted entry point (curl | bash)
├── uninstall.sh            ← hosted cleanup (curl | bash)
├── inventory.ini
├── playbook.yml
├── agents/
│   ├── writer.md           ← shipped to repo/.claude/agents/
│   └── reviewer.md
├── skills/
│   ├── init/
│   │   └── SKILL.md        ← shipped to repo/.claude/skills/init/
│   └── orchestrator/
│       └── SKILL.md        ← shipped to repo/.claude/skills/orchestrator/
├── scripts/
│   ├── deploy.sh           ← invoked by install.sh, wraps ansible
│   ├── uninstall.sh        ← invoked by uninstall.sh, tears everything down
│   └── start.sh            ← invoked by systemd, runs the watcher loop
└── ...
```

## Why this exists

The goal is simple: turn a Raspberry Pi into a reliable Claude Code PR bot with a clean install story, strong token handling, and a worker model that doesn’t rely on brittle prompt concatenation.
