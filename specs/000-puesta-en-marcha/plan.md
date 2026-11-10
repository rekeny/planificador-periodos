# Plan · 000 Puesta en marcha

- **Nivel:** Grande (primera configuración del repositorio)
- **Estado:** Aprobado
- **Aprobado por:** Fernando, el 2026-11-10

## Explicación antes de ejecutar

- **Qué:** dejar el repositorio listo para trabajar con el proceso guiado por especificaciones. Incluye el proyecto Expo SDK 58, las reglas, los roles, las herramientas de calidad, pruebas y seguridad, la verificación automática y la integración continua. No se implementa ninguna funcionalidad: la única pantalla muestra el título.
- **Cómo:** once tareas (T001–T011) en la rama `000-puesta-en-marcha`, con un commit por tarea y una PR a `main`.
- **Por qué:** las reglas, las capas y las comprobaciones existen desde el primer commit, así que todo el código de la especificación 001 nace cumpliéndolas, lo escriba quien lo escriba.
- **Para aprender:**
  - Expo y su configuración;
  - development builds;
  - Expo Router;
  - TypeScript estricto;
  - ESLint y sus límites entre capas;
  - Jest, Testing Library, fast-check y Stryker;
  - i18next con claves tipadas;
  - scripts de bash;
  - GitHub Actions y la protección de ramas.
- **Para comprobarlo:**
  - `npm run verify` en verde en local;
  - la verificación en verde en la PR;
  - el título visible en iPhone, iPad y Android.
- **Pendiente:** nada.

## Decisiones

| Decisión | Motivo |
| --- | --- |
| Development builds locales con `expo-dev-client` | Expo Go en el móvil sigue en SDK 57; las compilaciones locales no gastan cuota de EAS |
| Rutas en `src/app/` | Es la estructura de la plantilla actual |
| `CLAUDE.md` importa `AGENTS.md` | Claude Code lee `CLAUDE.md`; así las reglas viven en un solo fichero |
| i18next desde la fase 0 | La primera pantalla ya muestra un texto |
| Sin soporte web | La app es solo para móvil y tablet |
| Pruebas antes del código, tarea a tarea | La verificación está siempre en verde |
| Orientación `default` | La especificación pide vertical y horizontal |

## Dependencias nuevas

| Paquete | Motivo | Tipo |
| --- | --- | --- |
| `expo-dev-client` | Development builds en vez de Expo Go | App (solo en desarrollo) |
| `i18next`, `react-i18next` | Textos de la interfaz en `es.json` | App |
| `eslint`, `eslint-config-expo` (con `npx expo lint`) | Lint | Desarrollo |
| `prettier`, `eslint-config-prettier` | Formato | Desarrollo |
| `eslint-plugin-boundaries` (y el resolver de TypeScript, solo si hace falta) | Límites entre capas | Desarrollo |
| `eslint-plugin-i18next` | Prohibir texto suelto en JSX | Desarrollo |
| `jest`, `jest-expo`, `@types/jest` | Pruebas | Desarrollo |
| `@testing-library/react-native` | Pruebas de componentes y pantallas | Desarrollo |
| `fast-check` | Pruebas de propiedades | Desarrollo |
| `@stryker-mutator/core`, `@stryker-mutator/jest-runner`, `@stryker-mutator/typescript-checker` | Pruebas de mutación | Desarrollo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una herramienta ha cambiado sus opciones desde que se escribió este plan | Comprobar con `--help` o con su documentación y anotar la desviación |
| Stryker no funciona con `jest-expo` | Ensayo con un fichero temporal en la T007 |
| La verificación de CI es lenta | Caché de npm; las pruebas de mutación solo se ejecutan si cambia `src/domain/` |

## Desviaciones

| Fecha | Qué cambia respecto al plan | Motivo | Aprobado por |
| --- | --- | --- | --- |
| 2026-11-10 | T001: la plantilla de Expo ya traía un repositorio Git en `master` y un fichero `LICENSE` (MIT de Expo). Se renombra `master` a `main` y se borra `LICENSE`, porque el repositorio es público y sin licencia. El commit `T001` va encima del commit inicial de Expo. | El prompt daba por hecho que `create-expo-app` no iniciaba Git y que no había licencia | Fernando, 2026-11-10 |
| 2026-11-10 | T004: la plantilla `default@sdk-58` trae dependencias que el plan no lista (`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `@expo/ui`, `expo-glass-effect`, entre otras). Se dejan tal cual. | Las instala Expo con la plantilla y quitarlas puede romper el arranque; gesture handler entraba de todos modos en la 001 | Pendiente de Fernando |
