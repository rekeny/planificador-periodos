@AGENTS.md

## Claude Code

- La sesión principal es el orquestador del flujo de `AGENTS.md`. Lanza cada rol como subagente de `.claude/agents/`.
- El rol Revisor tiene dos subagentes: `reviewer` para la fase 4 y `codex-reviewer` para la fase 8. El de la fase 8 usa Haiku porque solo lanza `scripts/review.sh` y copia los hallazgos de Codex.
- La revisión del código no la hace Claude: se lanza con `scripts/review.sh`, que usa Codex.
