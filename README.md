# Planificador de periodos

App para iOS y Android que ayuda a entrenadores de baloncesto de formación a planificar en qué periodos juega cada jugador. Avisa cuando la planificación incumple la normativa de la variante (4, 6 u 8 periodos), sin bloquear nunca. Funciona sin conexión y todos los datos se quedan en el dispositivo.

**Estado:** en desarrollo. La fase 0 deja preparado el proyecto; la primera funcionalidad llega con la especificación 001.

## Cómo está hecho

- **Tecnología:** Expo (React Native) con TypeScript estricto y Expo Router. El stack y las capas están en [`docs/architecture.md`](docs/architecture.md).
- **Proceso:** desarrollo guiado por especificaciones con agentes de IA. Las reglas están en [`AGENTS.md`](AGENTS.md), los principios en [`docs/constitution.md`](docs/constitution.md) y cada funcionalidad en [`specs/`](specs/).
- **Revisión:** la del código la hace Codex; la verificación automática, [`scripts/verify.sh`](scripts/verify.sh).

## Puesta en marcha en local

Requisitos:

- macOS con Xcode y un simulador de iOS;
- Android Studio con un emulador;
- Node, en la versión de `.nvmrc`;
- CocoaPods;
- gitleaks, osv-scanner y semgrep (`brew install cocoapods gitleaks osv-scanner semgrep`).

```bash
npm install
npm run ios       # simulador de iOS
npm run android   # emulador de Android
npm run verify    # verificación completa
```

## Estructura

```text
src/app/      pantallas y navegación
src/ui/       componentes que pintan
src/state/    sesión del partido y deshacer
src/data/     base de datos y repositorios
src/domain/   reglas de la normativa, puras
src/i18n/     textos en castellano
specs/        una carpeta por especificación
docs/         constitución, arquitectura, seguridad y decisiones
.agents/      roles y plantillas de los agentes
```

## Licencia

Sin licencia: el código es público para consulta, pero todos los derechos están reservados.
