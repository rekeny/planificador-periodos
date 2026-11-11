@AGENTS.md

## Claude Code

- The main session is the orchestrator of the `AGENTS.md` flow. It launches each role as a subagent from `.claude/agents/`.
- Each subagent sets its model and effort in `model` and `effort`. They are not changed when launching it, unless the developer asks.
- The Reviewer role has two subagents: `reviewer` for phase 4 and `codex-reviewer` for phase 8. The phase 8 one uses Haiku because it only runs `scripts/review.sh` and copies Codex's findings.
- The code review is not done by Claude: it is launched with `scripts/review.sh`, which uses Codex.
