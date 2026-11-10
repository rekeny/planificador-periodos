# Arquitectura

## Stack

| Pieza         | Elección                                                                      | Para qué                                                                 | Entra en               |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------- |
| Plataforma    | Expo SDK 58 (React Native)                                                    | Una sola base de código para iOS y Android                               | Fase 0                 |
| Lenguaje      | TypeScript en modo estricto                                                   | Detectar errores al escribir                                             | Fase 0                 |
| Navegación    | Expo Router                                                                   | Rutas a partir de los ficheros de `src/app/`                             | Fase 0                 |
| Textos        | i18next y react-i18next                                                       | Textos de la interfaz en `es.json`, con claves tipadas                   | Fase 0                 |
| Desarrollo    | expo-dev-client                                                               | Development builds locales en vez de Expo Go                             | Fase 0                 |
| Base de datos | expo-sqlite, Drizzle ORM y drizzle-kit                                        | Guardar equipos, jugadores y partidos en el dispositivo, con migraciones | 001                    |
| Estado        | Zustand                                                                       | Sesión del partido abierto y deshacer                                    | 001                    |
| Gestos        | react-native-gesture-handler                                                  | Pulsación larga en las casillas                                          | 001                    |
| Pruebas       | Jest (jest-expo), React Native Testing Library, fast-check, Stryker y Maestro | Ver «Pruebas»                                                            | Fase 0; Maestro en 001 |
| Calidad       | ESLint (eslint-config-expo, boundaries, i18next) y Prettier                   | Estilo y límites entre capas                                             | Fase 0                 |
| Seguridad     | npm audit, OSV-Scanner, gitleaks y Semgrep; MobSF antes de publicar           | Ver `docs/security.md`                                                   | Fase 0                 |
| Publicación   | EAS Build y EAS Submit, plan gratuito                                         | Compilar y subir a las tiendas                                           | Antes de publicar      |

Las versiones exactas son las de `package-lock.json`. Expo elige las compatibles con el SDK al instalar con `npx expo install`.

## Cómo se ejecuta

- **Development builds locales.** `npm run ios` y `npm run android` compilan la app con Xcode o Android Studio, la instalan en el simulador o el emulador y arrancan Metro, el servidor que sirve el código JavaScript. Las compilaciones locales no gastan cuota de EAS.
- **No se usa Expo Go.** Durante la transición a SDK 58, Expo Go en el móvil sigue en SDK 57, y Expo lo recomienda solo para aprender.
- **`ios/` y `android/` no se versionan.** Expo las genera a partir de `app.json` (Continuous Native Generation). Cualquier ajuste nativo se hace en `app.json` o con un config plugin, nunca a mano en esas carpetas.

## Estructura

```text
src/
  app/            pantallas y navegación (Expo Router)
  ui/             componentes que pintan
  state/          sesión del partido y deshacer
  data/           esquema, migraciones y repositorios
  domain/         reglas puras y tipos
  i18n/           configuración del idioma y es.json
tests/app/        pruebas de las pantallas de src/app
specs/            una carpeta por especificación
docs/             constitución, arquitectura, seguridad y decisiones
.agents/          roles y plantillas de los agentes
.claude/agents/   subagentes de Claude Code, que remiten a .agents/roles
scripts/          verify.sh, review.sh y check-traceability.mjs
```

## Capas

| Carpeta       | Contiene                            | Puede importar                                           | No puede importar                                       |
| ------------- | ----------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `src/app/`    | Pantallas y navegación              | `src/ui`, `src/state`, `src/i18n`, tipos de `src/domain` | `src/data`, la base de datos                            |
| `src/ui/`     | Componentes que pintan              | `src/state`, `src/i18n`, tipos de `src/domain`           | `src/data`, funciones de `src/domain`, la base de datos |
| `src/state/`  | Sesión del partido y deshacer       | `src/domain`, `src/data`                                 | `src/app`, `src/ui`, `react-native`                     |
| `src/data/`   | Esquema, migraciones y repositorios | Drizzle, expo-sqlite, tipos de `src/domain`              | `src/app`, `src/ui`, `src/state`                        |
| `src/domain/` | Reglas puras y tipos                | Nada externo                                             | Cualquier paquete y cualquier otra capa                 |
| `src/i18n/`   | Textos e idioma                     | i18next, react-i18next                                   | Cualquier otra capa                                     |

- Si una capa importa algo que no le toca, ESLint falla (regla `boundaries`).
- Las pruebas pueden importar lo que prueban.

**Flujo de datos.**

1. El usuario toca y el componente de `ui` llama a una acción de `state`.
2. `state` pide el nuevo estado y los avisos a una función pura de `domain`.
3. `state` guarda el resultado con un repositorio de `data` y lo publica.
4. `ui` lo pinta.

La interfaz nunca calcula reglas.

## Convenciones

- **TypeScript estricto:** sin `any`, con tipos explícitos en todo lo exportado y con `noUncheckedIndexedAccess`.
- **Dominio puro:** funciones sin efectos ni estado, que reciben datos y devuelven datos nuevos. Para los casos previstos no lanzan excepciones: devuelven el resultado.
- **Una responsabilidad** por fichero y por función. Límites de ESLint:
  - complejidad 10 como máximo;
  - 250 líneas por fichero;
  - 60 líneas por función (no se aplica a las pruebas);
  - 4 parámetros;
  - 3 niveles de anidamiento.
- **Componentes de función con hooks,** con las props tipadas y sin lógica de negocio dentro.
- **Datos solo a través de repositorios.** Nunca SQL montado concatenando texto.
- **Nada «por si acaso»:** se generaliza cuando aparece un segundo caso real.
- **Comentarios** para el porqué, no para el qué.
- **Formato** con Prettier, sin configuración propia.
- **Nombres:**
  - ficheros en kebab-case, como `rule-window.ts`;
  - componentes y tipos en PascalCase;
  - funciones y variables en camelCase;
  - imports con el alias `@/`, que equivale a `src/`.
- **Exportaciones con nombre.** La exportación por defecto solo se usa en las rutas de `src/app/`, porque Expo Router la exige.
- **Sin `console` en `src/`,** porque los registros podrían contener datos de jugadores.
- **Sin llamadas de red:** `fetch`, `XMLHttpRequest`, `WebSocket` y `EventSource` están prohibidos.
- **Sin comentarios que desactiven reglas:** ni `eslint-disable` ni `@ts-ignore`.
- **Textos de la interfaz** solo en `src/i18n/es.json`. ESLint prohíbe el texto suelto en JSX.

## Glosario

| En la app                                   | En el código                   |
| ------------------------------------------- | ------------------------------ |
| Equipo                                      | `Team`                         |
| Jugador, dorsal, activo                     | `Player`, `number`, `isActive` |
| Partido, convocatoria                       | `Match`, `CallUp`              |
| Variante (4, 6 u 8 periodos)                | `Format`                       |
| Periodo, prórroga                           | `Period`, `Overtime`           |
| Tramo con regla                             | `RuleWindow`                   |
| Marca: titular (X) o cambio (X con círculo) | `Mark`: `starter` o `sub`      |
| Jugado, descansado                          | `played`, `rested`             |
| Aviso                                       | `Warning`                      |

Un concepto nuevo se añade aquí antes de usarlo en el código.

## Pruebas

- **Dónde:** junto al fichero que prueban, como `rule-window.test.ts`. Las pruebas de las pantallas de `src/app/` van en `tests/app/`, porque Expo Router trataría como ruta cualquier fichero de `src/app/`.
- **Nombre:** empieza por los ID que cubre, como `it('RF-018 E-01: highlights P4 and P5 when the player has 3 X in the window', …)`. Así funciona la trazabilidad.
- **Umbrales:** 90 % de cobertura en `src/domain/` y al menos 80 % de mutantes detectados por Stryker.

| Nivel                    | Herramienta                  | Para qué                                                                       |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| Reglas                   | Jest, con tablas `it.each`   | Cada requisito (RF) y cada ejemplo (E)                                         |
| Reglas con datos al azar | fast-check                   | Propiedades que siempre se cumplen, como no tener nunca más de 5 X por periodo |
| Componentes y pantallas  | React Native Testing Library | Lo que el usuario ve y toca                                                    |
| Flujos completos         | Maestro, en `e2e/`           | Recorridos reales en el simulador                                              |

| Escenario         | Qué cubre                                          | Ejemplo                                                    |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| Camino normal     | Lo que se espera que haga el usuario               | Marcar 5 titulares en un periodo                           |
| Límites           | Justo en el borde de una regla                     | La tercera X en el tramo de 6 periodos: aparecen los rojos |
| Fuera de la norma | Lo que la normativa no permite y la app no bloquea | Cuarta X: el jugador sale en rojo                          |
| Datos raros       | Vacíos, repetidos o extremos                       | Dos jugadores con el dorsal 7, o un nombre vacío           |
| Secuencias        | Varias acciones seguidas                           | Marcar, cambiar de variante y deshacer tres veces          |
| Interrupciones    | La app se cierra a mitad                           | Cerrar con el partido a medias y volver a abrir            |
| Equivocaciones    | Errores típicos del usuario                        | Quitar la X del que sale en un cambio                      |

## Trazabilidad

Cada requisito se sigue desde la especificación hasta el commit con el mismo identificador. `scripts/check-traceability.mjs` falla si hay un requisito o un ejemplo sin prueba.

| Dónde               | Cómo aparece                                                                   |
| ------------------- | ------------------------------------------------------------------------------ |
| `spec.md`           | `- **RF-018** · Casilla que no se debería marcar en rojo clarito`              |
| `spec.md`, ejemplos | `\| E-01 \| Juan con X en P1, P2 y P3 \| P4 y P5 en rojo clarito \| RF-018 \|` |
| `tasks.md`          | `- [ ] **T012** · Evaluar casillas en rojo (RF-018, E-01, E-02)`               |
| Prueba              | `it('RF-018 E-01: highlights P4 and P5 …')`                                    |
| Commit              | `T012 RF-018: evaluación de casillas en rojo`                                  |
| `review.md`         | Hallazgos y salida de la verificación de T012                                  |

El script comprueba los ID de las tareas marcadas como hechas y, cuando la especificación está «Cerrada», todos sus ID.

## Diseño visual

Por ahora solo hay componentes básicos y un fichero mínimo con los colores de los avisos. Hacer la app más bonita y más fácil de usar será una especificación propia más adelante.
