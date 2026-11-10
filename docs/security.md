# Seguridad

La referencia es el estándar OWASP MASVS para apps móviles. Como la app funciona sin conexión, la superficie de ataque es pequeña, pero no nula. El rol de Seguridad (`.agents/roles/security.md`) audita cada cambio que toque dependencias, datos, navegación o configuración, y hace una auditoría completa antes de cada publicación.

## Controles

| Qué puede salir mal                        | Control                                                                                                | Cómo se comprueba                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Una dependencia maliciosa o vulnerable     | Pocas dependencias, versiones fijadas en `package-lock.json` y revisión antes de añadir una            | `npm audit` y OSV-Scanner en `verify.sh`                       |
| Que los datos salgan del dispositivo       | Sin analítica ni SDK de terceros; el permiso de Internet se bloquea en la versión publicada de Android | ESLint prohíbe las llamadas de red; MobSF revisa el manifiesto |
| Inyección en la base de datos              | Solo consultas de Drizzle con parámetros                                                               | Semgrep y revisión de Codex                                    |
| Un enlace externo que abre una pantalla    | Ningún enlace puede lanzar una acción destructiva, y los parámetros se validan                         | Pruebas y auditoría                                            |
| Secretos en el repositorio                 | No hay claves, pero se escanea igualmente                                                              | gitleaks en `verify.sh`                                        |
| Datos en registros o en copias del sistema | Copia automática de Android desactivada; sin `console` en `src/`                                       | ESLint, auditoría y MobSF                                      |
| Permisos innecesarios                      | Solo los imprescindibles                                                                               | MobSF sobre el APK y el IPA antes de publicar                  |
| Un workflow de CI comprometido             | Permisos mínimos del token y versiones de las acciones y herramientas fijadas                          | Auditoría de cada cambio en `.github/`                         |

**Datos de menores.** La app guarda nombres de niños. Nunca salen del dispositivo, y en las tiendas se declara que la app no recoge datos.

## Auditoría de cada cambio

- [ ] Cada dependencia nueva o actualizada está justificada en `plan.md`, se mantiene y tiene una licencia compatible.
- [ ] Ningún permiso nuevo en iOS ni en Android sin justificar.
- [ ] Ninguna llamada de red ni dato de jugadores en registros.
- [ ] Consultas a la base de datos solo con Drizzle y parámetros.
- [ ] Parámetros de rutas validados; ningún enlace lanza acciones destructivas.
- [ ] `app.json` sigue con `android.allowBackup: false`.
- [ ] Workflows con permisos mínimos y versiones fijadas.
- [ ] `npm audit`, OSV-Scanner, gitleaks y Semgrep en verde.

## Antes de cada publicación

- [ ] Bloquear el permiso de Internet en la compilación de producción de Android y comprobar que la app funciona sin él.
- [ ] MobSF sobre el APK y el IPA, sin hallazgos altos abiertos.
- [ ] Revisar `AndroidManifest.xml` e `Info.plist` generados: solo los permisos imprescindibles.
- [ ] Declarar en App Store y Google Play que la app no recoge datos.
- [ ] Revisar las obligaciones de privacidad del RGPD, porque hay datos de menores en el dispositivo.
- [ ] Auditoría completa de dependencias, incluidas las de desarrollo.

## Excepciones

Si una vulnerabilidad no se puede corregir, se registra en `osv-scanner.toml` con:

- el motivo;
- una fecha de caducidad, de 90 días como máximo;
- la aprobación del desarrollador.

Sin esos tres datos, no hay excepción.
