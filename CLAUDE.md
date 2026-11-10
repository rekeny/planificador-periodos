@AGENTS.md

## Claude Code

- La sesión principal es el orquestador del flujo de `AGENTS.md`. Lanza cada rol como subagente de `.claude/agents/`.
- La revisión del código no la hace Claude: se lanza con `scripts/review.sh`, que usa Codex.
