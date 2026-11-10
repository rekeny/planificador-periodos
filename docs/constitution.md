# Constitución

Principios que no se negocian. Toda especificación, plan o cambio de código los respeta. Solo se cambian con un ADR aprobado por el desarrollador (ver `docs/decisions/`).

## Producto

1. **Informa, nunca bloquea.** Se puede marcar cualquier combinación aunque incumpla la normativa. El único límite es que un periodo nunca tiene más de 5 X. La decisión es siempre del entrenador.
2. **Nada cambia solo.** La app no modifica marcas por su cuenta. Solo se borran marcas cuando el entrenador lo confirma.
3. **Sin conexión y sin salida de datos.** Todo se guarda en el dispositivo. No hay cuentas, sincronización, analítica, SDK de terceros ni llamadas de red.
4. **Cada toque se guarda al momento.** Si la app se cierra a mitad de partido, al volver todo está como estaba.
5. **Datos de menores.** La app guarda nombres de niños. Nunca salen del dispositivo ni aparecen en los registros, y la copia automática de Android está desactivada.
6. **Simple.** Pocos datos y pocos toques. Nada «por si acaso»: se generaliza cuando aparece un segundo caso real.
7. **En castellano.** La interfaz solo está en castellano y sus textos viven en `src/i18n/es.json`.

## Ingeniería

8. **El repositorio es la única fuente de verdad.** Reglas, especificaciones, planes y decisiones viven en Markdown, versionados junto al código. Lo que solo está en un chat no existe.
9. **Un solo fichero de reglas para todos:** `AGENTS.md`.
10. **Las máquinas comprueban y las personas deciden.** Lo que puede verificar un script no se deja a la opinión de un agente. El desarrollador aprueba la especificación, el plan y el resultado.
11. **Quien escribe no se revisa.** La revisión la hace otro agente con el contexto limpio. La del código la hace Codex, que es otro modelo.
12. **Nada se inventa.** Si falta un dato, se pregunta y la respuesta queda anotada en la especificación.
13. **Proceso proporcional al cambio,** según los niveles de `AGENTS.md`.
14. **Pasos pequeños y comprobables:** una tarea, un commit y la verificación en verde.
15. **Nada se programa sin aprobación** de la especificación y del plan.
16. **Las reglas de la normativa viven solo en `src/domain/`,** como funciones puras y probadas.
17. **Un solo estilo de código.** Las mismas capas, convenciones y glosario desde el primer día, y ESLint lo hace cumplir.
18. **Las pruebas buscan fallos.** Cubren todo lo que el usuario puede hacer, no solo el camino que hace pasar el código. Umbrales: 90 % de cobertura en `src/domain/` y al menos 80 % de mutantes detectados por Stryker.
19. **Se explica antes y después,** para que la app se entienda y no solo se use.

## Registro de cambios

| Fecha      | ADR              | Cambio          |
| ---------- | ---------------- | --------------- |
| 2026-11-10 | ADR-001, ADR-002 | Versión inicial |
