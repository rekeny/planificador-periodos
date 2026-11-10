# Tareas · 000 Puesta en marcha

Leyenda: `[ ]` pendiente · `[x]` hecha. Cada tarea es un commit `T00N: descripción`.

- [x] **T001** · Proyecto Expo SDK 58 y repositorio en GitHub
  - Hecho cuando: el repositorio existe en GitHub con `main` y en local estamos en `000-puesta-en-marcha`.
- [x] **T002** · Reglas y documentos del proceso
  - Hecho cuando: existen `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/` y este plan con la fecha de aprobación.
- [x] **T003** · Roles, plantillas y subagentes
  - Hecho cuando: existen los 8 roles, las 7 plantillas, los 8 subagentes y la plantilla de PR.
- [x] **T004** · Configuración de la app y estructura de carpetas
  - Hecho cuando: `app.json` tiene los datos del proyecto y `expo-doctor` y `tsc` están en verde.
- [x] **T005** · Textos en castellano y pantalla inicial
  - Hecho cuando: el título solo está en `es.json` y `tsc` está en verde.
- [x] **T006** · Calidad del código: TypeScript, ESLint y Prettier
  - Hecho cuando: `typecheck`, `lint` y `format:check` están en verde, y los ficheros de prueba han fallado con la regla esperada.
- [x] **T007** · Pruebas: Jest, Testing Library, fast-check y Stryker
  - Hecho cuando: `npm test` está en verde y el ensayo de cobertura y mutación ha funcionado.
- [ ] **T008** · Scripts de verificación, trazabilidad y revisión
  - Hecho cuando: `npm run verify` está en verde y el ensayo de trazabilidad ha fallado como se esperaba.
- [ ] **T009** · Integración continua y protección de `main`
  - Hecho cuando: la PR tiene la verificación en verde y `main` está protegida.
- [ ] **T010** · Arranque en iPhone, iPad y Android
  - Hecho cuando: Fernando confirma que ve el título en los tres dispositivos, también en horizontal.
- [ ] **T011** · Revisión, informe y cierre
  - Hecho cuando: no queda ningún hallazgo bloqueante, `resumen.md` está escrito y la PR está lista para fusionar.
