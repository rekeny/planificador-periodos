# Revisión · 000 Puesta en marcha

## Análisis previo (fase 4)

No aplica: es la fase 0, el plan lo aprobó el desarrollador.

## Verificación (fase 7)

- Fecha y commit: 2026-11-10, b2c3db9
- Resultado: verde (`npm run verify`, salida 0, «All checks passed»). Sin flujos de Maestro todavía.

```text
> planificador-periodos@1.0.0 verify
> scripts/verify.sh


▶ Types

▶ Lint

▶ Format
Checking formatting...
All matched files use Prettier code style!

▶ Focused or skipped tests

▶ Tests and coverage

=============================== Coverage summary ===============================
Statements   : 80% ( 4/5 )
Branches     : 100% ( 0/0 )
Functions    : 50% ( 1/2 )
Lines        : 80% ( 4/5 )
================================================================================
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.587 s, estimated 1 s
Ran all test suites.

▶ Traceability
Traceability OK (1 specs checked).

▶ Expo Doctor
Running 20 checks on your project...
20/20 checks passed. No issues detected!

▶ Mutation testing (skipped: no domain changes)

▶ Dependencies
# npm audit report (omitido: 24 vulnerabilidades, 1 baja y 23 moderadas, todas indirectas y de desarrollo; el detalle completo se reproduce con `npm audit`)
Starting filesystem walk for root: /
Scanned /Users/rekeny/code/planificador-periodos/package-lock.json file and found 1190 packages
End status: 0 dirs visited, 1 inodes visited, 1 Extract calls, 301.824333ms elapsed, 301.827ms wall time
Loaded filter from: /Users/rekeny/code/planificador-periodos/osv-scanner.toml
GHSA-gcqx-w48m-w2h4 and 1 alias have been filtered out because: deepmerge 4.3.1, indirecta de jest-config (solo desarrollo); sin versión corregida. Aprobada por Fernando el 2026-11-10.
GHSA-3g3m-2fjr-6pw4 and 1 alias have been filtered out because: glob 10.5.0 y 13.0.7, indirectas de Expo CLI y Jest; la corrección exige glob 14, una versión mayor ajena. Aprobada por Fernando el 2026-11-10.
GHSA-3g3m-2fjr-6pw4 and 1 alias have been filtered out because: glob 10.5.0 y 13.0.7, indirectas de Expo CLI y Jest; la corrección exige glob 14, una versión mayor ajena. Aprobada por Fernando el 2026-11-10.
GHSA-g3hv-75wg-m249 and 1 alias have been filtered out because: minimatch 9.0.9 y 10.2.6, indirectas de ESLint, Expo y Stryker; la corrección exige minimatch 11, una versión mayor ajena. Aprobada por Fernando el 2026-11-10.
GHSA-g3hv-75wg-m249 and 1 alias have been filtered out because: minimatch 9.0.9 y 10.2.6, indirectas de ESLint, Expo y Stryker; la corrección exige minimatch 11, una versión mayor ajena. Aprobada por Fernando el 2026-11-10.
GHSA-4mjr-xmp4-gh2g and 1 alias have been filtered out because: qs 6.15.1, indirecta de Stryker (solo desarrollo). Aprobada por Fernando el 2026-11-10.
GHSA-6pq8-jhm2-2vcw and 1 alias have been filtered out because: qs 6.15.1, indirecta de Stryker (solo desarrollo). Aprobada por Fernando el 2026-11-10.
GHSA-q8mj-m7cp-5q26 and 1 alias have been filtered out because: qs 6.15.1, indirecta de Stryker (solo desarrollo). Aprobada por Fernando el 2026-11-10.
GHSA-x5fp-wj9c-mxmx and 1 alias have been filtered out because: qs 6.15.1, indirecta de Stryker (solo desarrollo). Aprobada por Fernando el 2026-11-10.
Filtered 9 vulnerabilities from output

No issues found

▶ Secrets
1:55PM INF 11 commits scanned.
1:55PM INF scanned ~1227638 bytes (1.23 MB) in 97.2ms
1:55PM INF no leaks found

▶ Static analysis

✔ All checks passed
```

## Revisión de Codex (fase 8)

Fichero completo: [codex-review.md](codex-review.md)

| #   | Hallazgo | Fichero | Gravedad | Estado |
| --- | -------- | ------- | -------- | ------ |

## Seguridad (fase 8)

| #    | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Gravedad   | Estado                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------- |
| S-01 | `.github/workflows/verify.yml`: gitleaks y osv-scanner se descargan con `curl` de GitHub Releases y se ejecutan sin comprobar su suma SHA-256. Las versiones están fijadas, pero la integridad no se verifica; un binario manipulado correría en CI con acceso al repositorio. Corrección: comprobar el checksum publicado (`checksums.txt`) antes de instalar.                                                                                                                                                                                                                 | importante | Abierto                     |
| S-02 | `.github/workflows/verify.yml`: `actions/checkout@v7` y `actions/setup-node@v7` se fijan por etiqueta, que es mutable. Corrección: fijarlas por SHA de commit, con la versión en un comentario.                                                                                                                                                                                                                                                                                                                                                                                 | menor      | Abierto                     |
| S-03 | `package.json`: `jest`, `jest-expo` y `@types/jest` están en `dependencies`, y el plan los declara como «Desarrollo». Por eso `npm audit --omit=dev` (el control de `verify.sh`) cuenta 24 vulnerabilidades, no solo las de producción, y el control pierde sentido. Corrección: moverlos a `devDependencies`.                                                                                                                                                                                                                                                                  | menor      | Abierto                     |
| S-04 | Dependencias de la plantilla sin justificar una a una en `plan.md` (la desviación de la T004 dice «entre otras») y sin uso en `src/`: `expo-web-browser`, `expo-linking`, `expo-device`, `expo-constants`, `expo-font`, `expo-image`, `expo-symbols`, `expo-glass-effect`, `@expo/ui`, `react-native-reanimated` y `react-native-worklets`. `expo-web-browser` puede abrir enlaces externos, y ESLint no prohíbe esos módulos. La aprobación del desarrollador existe, pero no está detallada. Corrección: enumerarlas en el plan o quitar las que no se usen antes de la 001.  | menor      | Abierto                     |
| S-05 | El manifiesto de Android generado declara `INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` (las dos últimas hasta SDK 32), y `app.json` no tiene `android.blockedPermissions`. La mayoría viene de `expo-dev-client` y de la plantilla. En iOS, `Info.plist` incluye `NSLocalNetworkUsageDescription` del lanzador de desarrollo. No bloquea la fase 0, pero debe resolverse en «Antes de cada publicación»: bloquear los permisos sobrantes y comprobar que el cliente de desarrollo no entra en la compilación de producción. | menor      | Pendiente antes de publicar |
| S-06 | `npm audit` completo reporta 36 vulnerabilidades (1 baja, 35 moderadas, ninguna alta). `verify.sh` solo falla con nivel alto, y las moderadas no tienen excepción en `osv-scanner.toml`, salvo las 9 que sí filtra OSV-Scanner. La salida de verificación de este `review.md` habla de 24 porque usa `--omit=dev` (ver S-03). Conviene que el desarrollador acepte de forma explícita ese umbral o que `docs/security.md` lo anote.                                                                                                                                             | menor      | Abierto                     |

Sin hallazgos bloqueantes. Comprobado y correcto: `permissions: contents: read` y sin secretos ni `pull_request_target` en el workflow; `android.allowBackup: false` en `app.json` y en el manifiesto generado; esquema de enlaces `planificadorperiodos` sin rutas destructivas; `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` y `console` prohibidos por ESLint; `src/` sin red, sin registros ni SQL; lockfile solo con `registry.npmjs.org`, con integridad y sin dependencias de Git; solo 2 paquetes con script de instalación (`fsevents`, `@parcel/watcher`); `npm audit --omit=dev --audit-level=high` y OSV-Scanner sin hallazgos altos; las 7 excepciones de `osv-scanner.toml` tienen motivo, caducan el 2027-02-08 (90 días exactos) y citan la aprobación de Fernando, y las 9 vulnerabilidades son de gravedad media y coinciden con la salida de OSV-Scanner; los scripts de `scripts/` no ejecutan código descargado ni envían datos de jugadores.

## Veredicto

- [ ] Ningún hallazgo bloqueante abierto
- [ ] Hallazgos importantes arreglados o aceptados como pendientes por el desarrollador
