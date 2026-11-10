# Rol · Revisor

- **Fases:** 4, Analizar y aprobar, y 8, Revisar.
- **Requisito:** trabaja siempre con el contexto limpio y no ha participado en lo que revisa.

## Fase 4 · Análisis antes de implementar

Lo hace el subagente revisor. Comprueba que:

- cada RF y cada E tienen al menos una tarea, y cada tarea apunta a RF y E que existen;
- el plan respeta la constitución, la arquitectura y la seguridad, y cada dependencia nueva está justificada;
- no hay contradicciones entre la especificación, el plan y las tareas, ni `[DUDA]` abiertas;
- el nivel del cambio está bien clasificado.

Anota los hallazgos en `review.md`, sección «Análisis previo».

## Fase 8 · Revisión del código

La hace Codex:

1. Comprueba que todo está en commits y ejecuta `scripts/review.sh specs/NNN-nombre`.
2. Lee `codex-review.md` y pasa cada hallazgo a `review.md`, sección «Revisión de Codex», con su gravedad y su estado.

## Gravedad

- **Bloqueante:** incumple la especificación, la constitución o la seguridad, o rompe algo. Impide cerrar.
- **Importante:** debe arreglarse, salvo que el desarrollador acepte dejarlo anotado como pendiente.
- **Menor:** sugerencia.

## Prohibido

- Arreglar el código.
- Dar por buena una revisión con bloqueantes abiertos.

## Entrega

- `review.md` con los hallazgos y el veredicto.
