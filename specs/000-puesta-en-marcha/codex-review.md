# Revisión de Codex

- Fecha: 2026-11-10 14:06
- Rama: 000-puesta-en-marcha contra main
- Commit: becffa9

Revisión de `git diff main...HEAD`, hasta `becffa9`: **3 hallazgos IMPORTANTES y 1 MENOR. Sin BLOQUEANTES detectados.**

1. **Requisitos y alcance: sin hallazgos.** El plan aprobado exceptúa expresamente esta fase de tener `spec.md`, RF y E. La implementación coincide con la puesta en marcha descrita.

2. **Constitución, capas y convenciones: sin hallazgos adicionales.** Los casos comprobados confirman que ESLint rechaza imports entre capas no permitidos y textos literales en JSX.

3. **Pruebas y controles:**

   - **IMPORTANTE — La trazabilidad acepta pruebas comentadas y suites vacías.** En [check-traceability.mjs:48](/Users/rekeny/code/planificador-periodos/scripts/check-traceability.mjs:48), la expresión regular sigue leyendo comentarios y considera `describe` una prueba. Reproducido en memoria: tanto `// it("RF-001 E-01: …", …)` como `describe("RF-001 E-01: …", () => {})` producen `Traceability OK` sin probar ese comportamiento. **Corrección:** analizar llamadas ejecutables mediante un parser, excluir comentarios y exigir pruebas `it`/`test`; añadir casos negativos para ambos ejemplos.

   - **IMPORTANTE — Una especificación puede acreditar la cobertura de otra.** En [check-traceability.mjs:58](/Users/rekeny/code/planificador-periodos/scripts/check-traceability.mjs:58), todos los identificadores se agregan a un único conjunto global. Cuando dos especificaciones reutilicen `E-01` o `RF-001`, una prueba de la primera satisfará también la segunda. **Corrección:** asociar las pruebas a su especificación y comprobar pares «especificación, ID», con un caso que repita identificadores entre dos especificaciones.

   - **IMPORTANTE — La detección de cambios puede omitir las mutaciones.** En [verify.sh:23](/Users/rekeny/code/planificador-periodos/scripts/verify.sh:23), si falta `origin/main`, el error se transforma en una base vacía y los cambios ya confirmados no se comprueban. En el workflow de `push` a `main`, `origin/main` también puede coincidir con `HEAD`, dejando el diff vacío. **Corrección:** proporcionar explícitamente la base según el evento y usar una alternativa conservadora que ejecute mutaciones cuando no pueda determinarla.

   No se han eliminado ni debilitado pruebas existentes: `main` no contenía pruebas. La nueva aserción comprueba el título accesible.

4. **Seguridad:**

   - **MENOR — Acciones fijadas por etiquetas mutables.** [verify.yml:27](/Users/rekeny/code/planificador-periodos/.github/workflows/verify.yml:27) y la línea 31 usan `actions/checkout@v7` y `actions/setup-node@v7`. **Corrección:** fijar ambas por SHA de commit y conservar la versión como comentario.

   Sin hallazgos adicionales en `src/` sobre llamadas de red, registros de jugadores o SQL. `android.allowBackup` está desactivado.

5. **Explicaciones: sin contradicciones adicionales detectadas.** Falta `resumen.md`, pero T011 sigue pendiente. La salida de verificación corresponde a `b2c3db9`, anterior a los últimos arreglos; queda pendiente verificar y documentar el estado final.

6. **Simplicidad, claridad y eficiencia: sin hallazgos.**

**Validación:** tipos, lint, formato de los scripts y documentos comprobados, y trazabilidad pasan. Jest no pudo arrancar por una escritura de caché denegada en esta sesión de solo lectura. No certifico la verificación completa ni he modificado archivos.
