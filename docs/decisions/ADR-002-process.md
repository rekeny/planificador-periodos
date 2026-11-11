# ADR-002 · Development process with agents

- **Status:** Accepted
- **Date:** 2026-11-10
- **Decided by:** Fernando

## Context

A single person develops the app with AI agents. They want every change to follow the same rules, whichever model or person makes it, and they want to learn from each step.

## Decision

- **Process:** spec-driven, inspired by GitHub Spec Kit but lighter, with three change levels, nine phases and eight roles (see `AGENTS.md`).
- **Rules:** all in `AGENTS.md`. `CLAUDE.md` only imports it with `@AGENTS.md`, because Claude Code reads `CLAUDE.md` and not `AGENTS.md`, while Codex and other tools read `AGENTS.md`.
- **Roles:** Markdown files in `.agents/roles/`. The subagents in `.claude/agents/` only point to them.
- **Code review:** done by Codex, a different model, with `scripts/review.sh`. The developer can also use the Codex plugin for Claude Code.
- **Tests before code, task by task.** The tests of each task are written and seen failing right before its code, and go in the same commit. This keeps the verification always green and every commit stable.
- **Verification:** a single command, `scripts/verify.sh`, locally and in GitHub Actions.

## Discarded alternatives

- **Full Spec Kit:** too much ceremony for a one-person app.
- **Working without a process:** the rules would depend on each conversation.
- **Review by the same model that implements:** it tends to agree with itself.
- **Writing all tests before the first task:** the verification would be red until the last task.

## Consequences

- Each feature takes a little longer to start, because it is specified and approved first, but it needs fewer rounds of rework.
- Codex reviews use quota of the ChatGPT account.
- Knowledge of the app lives in `specs/*/summary.md`, not only in the code.
