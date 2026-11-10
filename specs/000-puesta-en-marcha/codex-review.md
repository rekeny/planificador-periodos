# Revisión de Codex

- Fecha: 2026-11-10 13:59
- Rama: 000-puesta-en-marcha contra main
- Commit: 224a834

**Veredicto: no cerrar todavía.** Revisión de `git diff main...HEAD`, hasta `224a834`.

1. **Requisitos y alcance — BLOQUEANTE.**  
   [review.md:5](/Users/rekeny/code/planificador-periodos/specs/000-puesta-en-marcha/review.md:5) omite el análisis previo por tratarse de la fase 0, pero no existe `spec.md` ni una excepción documentada que autorice esa omisión. Sin RF y E no se puede acreditar cobertura ni ausencia de alcance añadido. **Corrección:** incorporar la especificación aprobada y enlazar requisitos, ejemplos, tareas y pruebas.

2. **Arquitectura y convenciones — IMPORTANTE.**

   - [eslint.config.js:31](/Users/rekeny/code/planificador-periodos/eslint.config.js:31) permite paquetes externos en todas las capas y después restringe solo algunos. He comprobado que `src/data/` y `src/i18n/` pueden importar `react-native` sin errores, contradiciendo la tabla de capas. **Corrección:** definir permisos de paquetes por capa y comprobar también sus subrutas.
   - [eslint.config.js:142](/Users/rekeny/code/planificador-periodos/eslint.config.js:142) usa `jsx-text-only`: acepta `<Text>{"Texto fijo"}</Text>` y `accessibilityLabel="Texto fijo"`. **Corrección:** ampliar la regla para cubrir expresiones y atributos visibles, exceptuando explícitamente los valores técnicos.

3. **Pruebas y trazabilidad — IMPORTANTE.**

   - [check-traceability.mjs:46](/Users/rekeny/code/planificador-periodos/scripts/check-traceability.mjs:46) busca IDs en todo el contenido de las pruebas. Un comentario `// RF-001 E-01` basta para obtener «Traceability OK», aunque la prueba sea ajena al requisito. Lo he reproducido en memoria. **Corrección:** extraer los IDs de nombres de pruebas ejecutables y añadir casos negativos del comprobador.
   - [verify.sh:43](/Users/rekeny/code/planificador-periodos/scripts/verify.sh:43) no detecta `it.skip.each(...)` ni `it.only.each(...)`. **Corrección:** sustituir la expresión regular por una comprobación sintáctica que cubra las variantes parametrizadas y las pruebas pendientes.

   No se han eliminado ni debilitado pruebas existentes: `main` no contenía pruebas. La nueva aserción comprueba efectivamente el título accesible.

4. **Seguridad.**

   - **IMPORTANTE —** [eslint.config.js:109](/Users/rekeny/code/planificador-periodos/eslint.config.js:109) prohíbe `fetch(...)`, pero admite `globalThis.fetch(...)`; comprobado con ESLint. **Corrección:** activar `checkGlobalObject` y comprobar las variantes de acceso de las cuatro API prohibidas.
   - **IMPORTANTE —** [verify.yml:38](/Users/rekeny/code/planificador-periodos/.github/workflows/verify.yml:38) descarga herramientas ejecutables sin verificar su integridad. Ya figura como S-01 abierto. **Corrección:** verificar SHA-256 contra valores fijados y revisados antes de instalar.
   - **MENOR —** [package.json:23](/Users/rekeny/code/planificador-periodos/package.json:23) instala Jest y jest-expo como dependencias de producción; `@types/jest` también está allí. El plan las clasifica como desarrollo. **Corrección:** mover las tres a `devDependencies` y actualizar el lockfile.

   Sin hallazgos en el código actual de `src/` sobre llamadas de red, registros de jugadores o SQL. `android.allowBackup` está desactivado.

5. **Explicaciones — sin contradicciones adicionales detectadas.**  
   Falta `resumen.md`, pero T011 lo declara pendiente; no lo considero una entrega falsamente completada. Hasta incorporarlo no puede verificarse la explicación final exigida.

6. **Simplicidad y eficiencia — sin hallazgos.**  
   El código de la pantalla y de internacionalización es pequeño y directo.

**Validación:** tipos y lint pasan. Jest no pudo arrancar porque intenta escribir caché y la sesión solo permite lectura. Formato falla únicamente por `codex-review.md`, que está sin versionar. No he modificado archivos ni certificado la verificación completa.
