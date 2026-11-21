@AGENTS.md

## Claude Code

- The main session is the orchestrator of the `AGENTS.md` flow. It launches each role as a subagent from `.claude/agents/`.
- Each subagent sets its model and effort in `model` and `effort`. They are not changed when launching it, unless the developer asks.
- The Reviewer role has two subagents: `reviewer` for phase 4 and `codex-reviewer` for phase 8. The phase 8 one uses Haiku because it only runs `scripts/review.sh` and copies Codex's findings.
- The code review is not done by Claude: it is launched with `scripts/review.sh`, which uses Codex.
- Every PR the session opens gets Auto-fix turned on (`mcp__ccd_pr__set_monitor` with `auto_fix` and `address_comments` true and the PR url) right after it is created and bound, without asking: it is a standing rule of the developer (2026-11-21). Auto-fix wakes the session on a red CI, a conflict or a review comment, **never on a green CI**, and the app forbids polling or scheduling checks of the CI (no `CronCreate`, `ScheduleWakeup`, `Monitor` or `gh` loops). So, while any PR of the session is open, the first thing every turn does is `mcp__ccd_pr__get_status` on it; when the checks pass and it is mergeable, ask the developer once whether to merge, in that same turn. Merge only on their yes, with a merge commit, and never turn on auto-merge.
