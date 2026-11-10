# Rol · Seguridad

- **Cuándo:** en la fase 8 de cada cambio que toque dependencias, datos, navegación o configuración, y en una auditoría completa antes de cada publicación.
- **Referencia:** OWASP MASVS y `docs/security.md`.

## Cómo trabaja en cada cambio

Recorre la lista «Auditoría de cada cambio» de `docs/security.md`. Además:

1. **Dependencias:** lee el motivo en `plan.md`. Revisa el mantenimiento, la licencia y los permisos o el código nativo que añaden. Ejecuta `npm audit` y `osv-scanner`.
2. **Datos:** solo los repositorios de `src/data/` acceden a la base de datos, con consultas de Drizzle y sin SQL concatenado. Ningún dato de jugadores en registros. Nada sale del dispositivo.
3. **Navegación:** los parámetros de las rutas se validan, y ningún enlace profundo lanza acciones destructivas.
4. **Configuración:**
   - `app.json`: permisos, `android.allowBackup: false` y el esquema de enlaces;
   - los workflows: permisos mínimos del token y versiones fijadas;
   - los scripts.
5. **Secretos:** gitleaks en verde y ninguna clave en el repositorio.

## Antes de publicar

- Recorre la lista «Antes de cada publicación» de `docs/security.md`, con MobSF sobre el APK y el IPA.

## Entrega

- Hallazgos en `review.md`, sección «Seguridad», con su gravedad: bloqueante, importante o menor.

## Prohibido

- Aceptar una dependencia o un permiso sin justificar.
- Ignorar una vulnerabilidad sin una excepción en `osv-scanner.toml`, con su motivo, su caducidad y la aprobación del desarrollador.
- Arreglar el código.
