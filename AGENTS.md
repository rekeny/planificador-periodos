# AGENTS.md · Planificador de periodos

Reglas para cualquier agente o persona que trabaje en este repositorio, con cualquier herramienta o modelo. Si una herramienta necesita su propio fichero de instrucciones, como `CLAUDE.md`, ese fichero solo importa este: aquí no hay reglas exclusivas de ninguna herramienta.

## El proyecto

App para iOS y Android, en móvil y tablet, que ayuda a entrenadores de baloncesto de formación a planificar en qué periodos juega cada jugador. Avisa de los incumplimientos de la normativa de cada variante (4, 6 u 8 periodos). Funciona sin conexión, guarda todo en el dispositivo, está en castellano y nunca bloquea al entrenador, salvo el límite de 5 X por periodo.

## Antes de nada, lee

1. Este fichero.
2. `docs/constitution.md`: los principios que no se negocian.
3. `docs/architecture.md`: el stack, las capas, las convenciones y el glosario.
4. La especificación afectada, en `specs/NNN-nombre/`.
5. Tu rol en `.agents/roles/`, si actúas como uno.

## Idiomas

- **Código en inglés:** identificadores, comentarios, nombres de pruebas, mensajes de los scripts y nombres de ficheros de código.
- **Castellano en todo lo demás:** documentación, especificaciones, commits, PR y explicaciones al desarrollador.
- **Textos de la interfaz:** solo en `src/i18n/es.json`, nunca escritos en el código.
- Los nombres del dominio salen siempre del glosario de `docs/architecture.md`.

## Cómo pedir trabajo

- **Grande:** «Nueva especificación: <petición>». El orquestador lanza el Especificador.
- **Medio:** «Cambio en specs/NNN: <petición>». El orquestador actualiza la especificación con el Especificador y sigue desde la fase 3.
- **Pequeño:** «Cambio pequeño: <petición>». El orquestador rellena la ficha breve y espera la aprobación.

## Niveles de cambio

Antes de tocar nada, declara el nivel. En caso de duda, sube un nivel. Ningún nivel toca código sin la aprobación del desarrollador.

| Nivel | Ejemplos | Fases obligatorias |
| --- | --- | --- |
| Pequeño | Corregir un texto, un color o un fallo sin cambiar el comportamiento especificado | Ficha breve aprobada (`.agents/templates/small-change.md`) → Pruebas → Implementar → Verificar → Revisión de Codex |
| Medio | Cambiar algo que ya existe | Actualizar la especificación y seguir el flujo desde la fase 3 |
| Grande | Funcionalidad nueva | Flujo completo, con una carpeta nueva en `specs/` |

- Todo lo que toque `src/domain/` es, como mínimo, de nivel medio.
- El revisor puede reclasificar el nivel.

## Flujo de trabajo

| # | Fase | Rol | Entrega | Control para avanzar |
| --- | --- | --- | --- | --- |
| 1 | Especificar | Especificador | `spec.md` con historias, requisitos RF y ejemplos E; cada hueco marcado `[DUDA]` | — |
| 2 | Aclarar | Aclarador | `spec.md` sin `[DUDA]`, con las respuestas anotadas y fechadas | El desarrollador ha respondido todas las dudas |
| 3 | Planificar | Planificador | `plan.md`, que empieza con la explicación «antes», y `tasks.md` | — |
| 4 | Analizar y aprobar | Revisor y desarrollador | Análisis de consistencia en `review.md`; aprobación anotada en `spec.md` y `plan.md` | **El desarrollador aprueba la especificación y el plan. Hasta aquí no se toca el código.** |
| 5 | Diseñar pruebas | Diseñador de pruebas | Escenarios de cada tarea en `tasks.md` | Cada criterio de aceptación tiene escenarios |
| 6 | Implementar | Diseñador de pruebas e Implementador, tarea a tarea | Por cada tarea: pruebas en rojo, código, verificación en verde y commit | `scripts/verify.sh` en verde |
| 7 | Verificar | Verificador | Salida de la verificación en `review.md` | Todo en verde |
| 8 | Revisar | Revisor (Codex) y Seguridad | Hallazgos en `review.md` | Ningún hallazgo bloqueante |
| 9 | Cerrar | Desarrollador | Prueba en el dispositivo, `resumen.md` y PR fusionada | El desarrollador acepta el resultado |

**Vueltas atrás.** Si el desarrollador no aprueba en la fase 4, se corrige el plan (fase 3). Si la verificación falla o hay un hallazgo bloqueante en la fase 8, se vuelve a implementar (fase 6). Un cambio pequeño entra en la fase 5 con su ficha aprobada; uno medio entra en la 3.

**Ciclo de cada tarea en la fase 6.**

1. El Diseñador de pruebas escribe las pruebas de la tarea a partir de sus escenarios y comprueba que fallan por el motivo correcto.
2. El Implementador escribe el código mínimo para que pasen y ejecuta `scripts/verify.sh`.
3. Un solo commit recoge las pruebas y el código.

Así las pruebas siempre van antes que el código y la rama nunca acumula pruebas en rojo.

## Roles

| Rol | Fichero | Fases |
| --- | --- | --- |
| Especificador | `.agents/roles/specifier.md` | 1 |
| Aclarador | `.agents/roles/clarifier.md` | 2 |
| Planificador | `.agents/roles/planner.md` | 3 |
| Diseñador de pruebas | `.agents/roles/test-designer.md` | 5 y 6 |
| Implementador | `.agents/roles/implementer.md` | 6 |
| Verificador | `.agents/roles/verifier.md` | 7 |
| Revisor | `.agents/roles/reviewer.md` | 4 y 8 |
| Seguridad | `.agents/roles/security.md` | 8 y antes de publicar |

- La sesión principal hace de **orquestador**: lanza cada rol en su fase, le pasa solo lo que necesita y no avanza si el control de la fase no está superado.
- Los roles no hablan con el desarrollador: devuelven sus preguntas al orquestador, que es quien pregunta.
- En Claude Code, cada rol es un subagente de `.claude/agents/`. En otras herramientas, se pega el fichero del rol como prompt.
- Quien escribe algo no lo revisa.

## Las 17 reglas de cada prompt

**Al empezar**

1. Leer `AGENTS.md`, `docs/constitution.md` y la especificación afectada antes de proponer nada.
2. Declarar el nivel del cambio y qué especificación y tareas toca.
3. Si la petición contradice la especificación, parar y preguntar. La especificación manda hasta que se cambie.
4. Explicar qué se va a hacer, cómo y por qué. No tocar código hasta que el desarrollador apruebe la especificación y el plan.

**Mientras se trabaja**

5. Una tarea cada vez, en el orden de `tasks.md`.
6. No inventar requisitos, datos ni comportamientos. Lo que no está escrito se pregunta y se marca `[DUDA]`.
7. Las pruebas se escriben antes del código y cubren todo lo que puede hacer el usuario. Nadie las borra ni las debilita. Su nombre lleva el ID del requisito y del ejemplo.
8. Las reglas de la normativa solo viven en `src/domain/`. La interfaz no calcula reglas.
9. Los textos que ve el usuario van en `src/i18n/es.json`, nunca en el código.
10. Ninguna dependencia nueva sin anotarla en `plan.md` con su motivo.
11. No cambiar la constitución ni la arquitectura sin un ADR aprobado.
12. Respetar las capas, las convenciones y el glosario de `docs/architecture.md`.

**Al terminar**

13. `scripts/verify.sh` en verde, con la salida adjunta. Sin esa salida, la tarea no está hecha.
14. Un commit por tarea, con el formato `T012 RF-018: descripción`.
15. Marcar la tarea en `tasks.md` y anotar lo que quede pendiente.
16. Quien implementó no revisa. La revisión del código la hace Codex con `scripts/review.sh`, y el rol de Seguridad audita si el cambio toca dependencias, datos, navegación o configuración.
17. Terminar con el informe de qué se ha hecho, cómo y por qué, y guardarlo también en `resumen.md`.

## Explicaciones antes y después

El desarrollador usa este proyecto para aprender. Cada implementación se explica dos veces, en lenguaje claro.

| | Antes de ejecutar | Después de ejecutar |
| --- | --- | --- |
| Dónde | Al principio de `plan.md` y en el chat, junto a la petición de aprobación | En el chat y en `resumen.md` |
| Qué | Qué se va a hacer, en dos o tres frases | Qué se ha hecho y qué cambia para el usuario |
| Cómo | Pasos y ficheros que se van a tocar | Ficheros tocados y piezas nuevas |
| Por qué | Por qué de esta forma y qué alternativas se descartan | Decisiones tomadas por el camino y su motivo |
| Para aprender | Conceptos de TypeScript, React o Expo que van a aparecer | Esos conceptos explicados con el código real |
| Para comprobarlo | Qué tendrá que probar el desarrollador | Pasos o comandos para verlo funcionando |
| Pendiente | Dudas que necesitan respuesta | Riesgos o tareas que quedan |

Codex comprueba en la revisión que las explicaciones coinciden con lo que de verdad se ha hecho.

## Ramas, commits y PR

- **Ramas:** una por especificación, con el nombre de su carpeta, como `001-planificador-v1`. Los cambios pequeños usan `fix/descripcion-corta`.
- **Commits:** uno por tarea, como `T012 RF-018: evaluación de casillas en rojo`. Si la tarea no tiene requisito asociado: `T001: descripción`.
- **`main` está protegida:** solo se fusiona por PR y con la verificación de GitHub Actions en verde. Cada PR usa la plantilla `.github/pull_request_template.md`.
- **Fusión:** las PR se fusionan con merge commit, para conservar los commits de cada tarea.

## Verificación y revisión

- **`scripts/verify.sh`** (o `npm run verify`) comprueba:
  - tipos, lint y formato;
  - que no quedan pruebas aisladas ni saltadas;
  - pruebas con cobertura y trazabilidad;
  - la base de datos, cuando exista;
  - Expo Doctor;
  - pruebas de mutación, si cambia `src/domain/`;
  - dependencias, secretos y análisis estático.

  Lo ejecuta el agente al terminar cada tarea y GitHub Actions en cada PR. Con `FORCE_MUTATION=1`, las pruebas de mutación se ejecutan aunque no cambie el dominio.
- **`scripts/review.sh specs/NNN-nombre`** lanza la revisión de Codex de la rama contra `main` y guarda la salida en `specs/NNN-nombre/codex-review.md`. Tarda varios minutos: lánzalo con un tiempo de espera largo o en segundo plano.
- **El desarrollador** también puede usar el plugin de Codex en Claude Code: `/codex:review --base main` y `/codex:adversarial-review --base main <enfoque>`.

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run ios` / `npm run android` | Compilar e instalar la app en el simulador o el emulador, y arrancar el servidor de desarrollo |
| `npm start` | Solo el servidor de desarrollo, con la app ya instalada |
| `npm test` | Pruebas |
| `npm run test:coverage` | Pruebas con cobertura |
| `npm run test:mutation` | Pruebas de mutación de `src/domain/` |
| `npm run verify` | Verificación completa |
| `npm run typecheck` / `npm run lint` / `npm run format` | Comprobaciones sueltas y formato |

## Expo

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

### Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

### Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

### Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

### Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
