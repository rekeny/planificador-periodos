# ADR-003 · Mensajes de commit en inglés

- **Estado:** Aceptada
- **Fecha:** 2026-11-11
- **Decide:** Fernando

## Contexto

`AGENTS.md` pedía los commits en castellano, como la documentación. El repositorio es público y el código ya está en inglés. Un historial en castellano solo lo entiende quien lee castellano.

## Decisión

- Los mensajes de commit, título y cuerpo, se escriben en inglés, con el mismo formato: `T012 RF-018: highlight periods in light red`.
- La documentación, las especificaciones, las PR y las explicaciones al desarrollador siguen en castellano. La app sigue solo en castellano.
- Los commits ya hechos no se reescriben: `T001` está en `main`, que está protegida, y reescribir la rama de la PR obligaría a forzar el push.

## Consecuencias

- El historial de Git se puede leer sin saber castellano.
- Los commits de la fase 0 quedan en castellano. Desde el siguiente commit, todos van en inglés.
- Cambian `AGENTS.md`, el ejemplo de trazabilidad de `docs/architecture.md`, la plantilla `tasks.md` y el rol Implementador.
