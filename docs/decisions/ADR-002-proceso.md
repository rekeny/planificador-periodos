# ADR-002 · Proceso de desarrollo con agentes

- **Estado:** Aceptada
- **Fecha:** 2026-11-10
- **Decide:** Fernando

## Contexto

Una sola persona desarrolla la app con agentes de IA. Quiere que cualquier cambio siga las mismas reglas, lo haga el modelo o la persona que lo haga, y quiere aprender de cada paso.

## Decisión

- **Proceso:** guiado por especificaciones, inspirado en GitHub Spec Kit pero más ligero, con tres niveles de cambio, nueve fases y ocho roles (ver `AGENTS.md`).
- **Reglas:** todas en `AGENTS.md`. `CLAUDE.md` solo lo importa con `@AGENTS.md`, porque Claude Code lee `CLAUDE.md` y no `AGENTS.md`, mientras que Codex y otras herramientas leen `AGENTS.md`.
- **Roles:** son ficheros Markdown en `.agents/roles/`. Los subagentes de `.claude/agents/` solo remiten a ellos.
- **Revisión del código:** la hace Codex, que es otro modelo, con `scripts/review.sh` (`codex review`). El desarrollador también puede usar el plugin de Codex para Claude Code.
- **Pruebas antes del código, tarea a tarea.** Las pruebas de cada tarea se escriben y se ven fallar justo antes de su código, y van en el mismo commit. Así la verificación está siempre en verde y cada commit es estable.
- **Verificación:** un solo comando, `scripts/verify.sh`, en local y en GitHub Actions.

## Alternativas descartadas

- **Spec Kit completo:** demasiada ceremonia para una app de una persona.
- **Trabajar sin proceso:** las reglas dependerían de cada conversación.
- **Revisión por el mismo modelo que implementa:** tiende a darse la razón a sí mismo.
- **Escribir todas las pruebas antes de la primera tarea:** la verificación estaría en rojo hasta la última tarea.

## Consecuencias

- Cada funcionalidad tarda algo más en empezar, porque se especifica y se aprueba primero, pero tiene menos vueltas atrás.
- Las revisiones de Codex consumen uso de la cuenta de ChatGPT.
- El conocimiento de la app queda en `specs/*/resumen.md`, y no solo en el código.
