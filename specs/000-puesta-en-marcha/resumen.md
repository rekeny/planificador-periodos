# Resumen · 000 Puesta en marcha

Lo que se ha hecho, explicado para entender la app y no solo usarla.

## Qué se ha hecho y qué cambia para el usuario

Se ha dejado el repositorio [rekeny/planificador-periodos](https://github.com/rekeny/planificador-periodos) listo para trabajar con el proceso guiado por especificaciones. **No se ha implementado ninguna funcionalidad**: para el usuario, la app solo muestra el título «Planificador de periodos». Se ha comprobado en un iPhone 18 Pro, un iPad Pro 11-inch (M5) y el emulador de Android `Medium_Phone_API_37.0`, también en horizontal.

Lo que sí existe ahora:

- el proyecto Expo SDK 58 con TypeScript estricto y Expo Router;
- las reglas y los documentos del proceso (`AGENTS.md`, constitución, arquitectura, seguridad y dos ADR);
- ocho roles de agentes, siete plantillas y ocho subagentes;
- calidad (ESLint con límites entre capas y Prettier), pruebas (Jest, Testing Library, fast-check y Stryker) y seguridad (npm audit, OSV-Scanner, gitleaks y Semgrep);
- un único comando, `npm run verify`, que ejecuta todo en local y en GitHub Actions, y `main` protegida: solo se fusiona por PR con el check `verify` en verde.

## Cómo: ficheros y piezas nuevas

| Pieza                    | Ficheros                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Proyecto y configuración | `app.json`, `package.json`, `tsconfig.json`, `.nvmrc`, `.gitignore`                                       |
| Reglas y documentos      | `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/`, `specs/000-puesta-en-marcha/`                             |
| Agentes                  | `.agents/roles/` (8), `.agents/templates/` (7), `.claude/agents/` (8), `.github/pull_request_template.md` |
| Capas                    | `src/{app,ui,state,data,domain,i18n}`, con un `README.md` por capa vacía                                  |
| Textos y pantalla        | `src/i18n/{es.json,index.ts,i18next.d.ts}`, `src/app/{_layout,index}.tsx`                                 |
| Calidad                  | `eslint.config.js`                                                                                        |
| Pruebas                  | `jest.config.js`, `stryker.config.json`, `tests/app/index.test.tsx`                                       |
| Verificación y revisión  | `scripts/verify.sh`, `scripts/check-traceability.mjs`, `scripts/review.sh`, `osv-scanner.toml`            |
| Integración continua     | `.github/workflows/verify.yml`                                                                            |

Once tareas, un commit por tarea (`T001` a `T011`), en la rama `000-puesta-en-marcha`, y una PR a `main`.

## Por qué: decisiones tomadas

- **Development builds locales, sin Expo Go.** Expo Go en el móvil sigue en SDK 57 y las compilaciones locales no gastan cuota de EAS.
- **`master` renombrada a `main` y `LICENSE` borrado** (T001): la plantilla ya traía un repositorio Git y una licencia MIT de Expo; el repositorio es público y sin licencia.
- **Dependencias de la plantilla que el plan no lista** (T004): `react-native-gesture-handler`, `reanimated`, `worklets`, `@expo/ui`, `expo-glass-effect` y otras. Se dejan porque las instala Expo y quitarlas puede romper el arranque.
- **Ajustes por versiones nuevas** (T006 y T007): la opción de `eslint-plugin-boundaries` 7.4 se llama `policies`; Testing Library 14 hace `render` asíncrono; TypeScript 6 ya no carga `@types/*` solo (`"types": ["jest"]`); y el patrón de `jest.config.js` ignoraba todas las pruebas dentro del sandbox de Stryker.
- **Excepciones de OSV-Scanner con caducidad** (T008): 9 vulnerabilidades medias en dependencias indirectas de Expo, Jest y Stryker, sin corrección sin subir versiones mayores ajenas. Caducan el 2027-02-08.
- **`codex exec` en vez de `codex review --base`** (T011): con Codex 0.167.0 `--base` no admite instrucciones personalizadas. Además, el modelo `gpt-5.2` fijado en `~/.codex/config.toml` no lo admite una cuenta de ChatGPT; se quitó esa línea.
- **Arreglos tras la revisión** (T011): paquetes por capa en ESLint, `jsx-only` con atributos visibles, `checkGlobalObject`, trazabilidad que solo lee nombres de pruebas, `verify.sh` que detecta `it.skip.each` y SHA-256 fijados en el workflow.

Todas las desviaciones están en la tabla «Desviaciones» de `plan.md`, con su aprobación.

## Para aprender

### Expo, `package.json` y `package-lock.json`

Expo es una capa sobre React Native: aporta el CLI, el enrutado por ficheros, los módulos nativos ya compilados y la configuración en `app.json`. Cada SDK de Expo fija las versiones de las librerías compatibles; por eso se instala con `npx expo install` y no con `npm install`. `package.json` equivale al `Gemfile` y `package-lock.json` al `Gemfile.lock`.

### Rutas por ficheros con Expo Router

Cada fichero de `src/app/` es una pantalla; `_layout.tsx` define cómo se navega entre ellas (`src/app/_layout.tsx`):

```tsx
export default function RootLayout(): ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`index.tsx` es la ruta `/`. La exportación por defecto solo se permite en `src/app/` porque Expo Router la exige.

### Continuous Native Generation y development builds

`ios/` y `android/` no se versionan: `npx expo run:ios` y `npx expo run:android` los generan a partir de `app.json` (prebuild), compilan con Xcode o Gradle, instalan la app y Metro sirve el JavaScript. Un development build es tu propia app con `expo-dev-client`, a diferencia de Expo Go, que es una app genérica con un conjunto fijo de módulos nativos. El simulador de iOS es una simulación del sistema; el emulador de Android es una máquina virtual completa, y por eso consume mucha memoria.

### Componentes, hooks y texto tipado (`src/app/index.tsx`, `src/i18n/`)

```tsx
const { t } = useTranslation();
// ...
<Text accessibilityRole="header">{t("app.title")}</Text>;
```

`HomeScreen` es un componente de función que devuelve JSX. `useTranslation` es un hook: una función que engancha el componente al estado de i18next. El texto vive solo en `es.json`, y `i18next.d.ts` amplía los tipos de la librería para que `t("app.title")` compile y `t("app.titel")` no:

```ts
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof es };
  }
}
```

### TypeScript estricto

`tsconfig.json` añade `noUncheckedIndexedAccess`: `players[0]` pasa a ser `Player | undefined` y obliga a comprobarlo antes de usarlo, como un `first` que puede ser `nil` en Ruby.

### ESLint y capas con `boundaries` (`eslint.config.js`)

La configuración plana es una lista de bloques que se aplican por ficheros, en orden. `boundaries` clasifica cada carpeta de `src/` como una capa y solo deja pasar los imports de la tabla de `docs/architecture.md`:

```js
layerPolicy("app", ["ui", "state", "i18n"], ["domain"]),
layerPolicy("state", ["domain", "data"]),
layerPolicy("data", [], ["domain"]),
```

El tercer argumento son importaciones solo de tipos (`import type`). Se prohíben los comentarios `eslint-disable` con `noInlineConfig: true`, para que nadie desactive una regla sin que se vea en la configuración.

### Pruebas: Jest, Testing Library, fast-check y Stryker

- Un _preset_ de Jest (`jest-expo`) trae transformadores y mocks de React Native ya configurados.
- Testing Library busca por rol, como lo haría un usuario (`tests/app/index.test.tsx`):

  ```tsx
  await render(<HomeScreen />);
  expect(screen.getByRole("header", { name: es.app.title })).toBeTruthy();
  ```

- fast-check genera datos al azar para comprobar propiedades que siempre se cumplen.
- Un mutante es una copia del código con un cambio pequeño (por ejemplo `>=` por `>`). Si las pruebas siguen pasando, el cambio sobrevive y las pruebas no vigilaban esa línea. La cobertura solo dice qué líneas se ejecutan; la mutación dice si las pruebas las vigilan. En el ensayo, Stryker eliminó 9 mutantes de 9 (100 %).

### Un solo comando: `scripts/verify.sh`

```bash
set -euo pipefail
```

`-e` para al primer fallo, `-u` falla con variables sin definir y `pipefail` hace que una tubería falle si falla cualquiera de sus pasos. Sin ello, un script de verificación podría dar «todo bien» con pasos rotos. La trazabilidad sigue un requisito desde `spec.md` hasta el nombre de una prueba, y falla si hay un RF o un E sin prueba.

### GitHub Actions y protección de `main` (`.github/workflows/verify.yml`)

Un workflow se lee de arriba abajo: cuándo se dispara (`on`), con qué permisos (`permissions: contents: read`, el mínimo), y los pasos de un job. Las herramientas de seguridad se descargan con versión fija y su SHA-256 se comprueba antes de ejecutarlas. La protección de rama impide fusionar en `main` sin una PR y sin el check `verify` en verde, incluso a ti como administrador.

## Para comprobarlo

```bash
npm run verify                 # tipos, lint, formato, pruebas, trazabilidad, Expo Doctor, dependencias, secretos y análisis estático
npm run ios                    # simulador de iPhone
npm run android                # emulador de Android
gh pr checks                   # el check verify de la PR
gh api repos/rekeny/planificador-periodos/branches/main/protection   # protección de main
```

## Pendiente

- **C-10 (importante, aceptado como pendiente):** los ID de RF y E son globales; cuando dos especificaciones reutilicen `RF-001`, una prueba puede acreditar a ambas. La convención de ID por especificación se decide al empezar la 001.
- **S-02 / C-12 (menor):** `actions/checkout` y `actions/setup-node` están fijadas por etiqueta y no por SHA de commit.
- **S-04 (menor):** detallar o quitar las dependencias de la plantilla que no se usan antes de la 001.
- **S-05 (menor, antes de publicar):** bloquear permisos sobrantes de Android (`INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, almacenamiento) y comprobar que `expo-dev-client` no entra en la compilación de producción.
- **S-06 (menor):** anotar en `docs/security.md` el umbral de `npm audit` (solo falla con nivel alto).
- **Excepciones de OSV-Scanner:** caducan el 2027-02-08; hay que revisarlas antes.
- La mutación no se ha ejecutado sobre código real, porque `src/domain/` aún no tiene ninguno.
- Siguiente paso: tras fusionar la PR, cerrar esta sesión y abrir Claude Code **dentro** de `planificador-periodos`, para que cargue `CLAUDE.md` y los subagentes, y empezar la especificación 001.
