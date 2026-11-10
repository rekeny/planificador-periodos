# ADR-001 · Stack de la app

- **Estado:** Aceptada
- **Fecha:** 2026-11-10
- **Decide:** Fernando

## Contexto

La app es para iOS y Android, en móvil y tablet, funciona sin conexión, guarda los datos solo en el dispositivo y está en castellano. La desarrolla una sola persona que quiere aprender TypeScript y React y que, más adelante, quiere publicarla en las tiendas con el mínimo coste.

## Decisión

- **Plataforma:** Expo SDK 58 (React Native) con TypeScript estricto y Expo Router.
- **Datos:** expo-sqlite con Drizzle ORM y drizzle-kit para las migraciones.
- **Estado:** Zustand para la sesión del partido y el deshacer.
- **Textos:** i18next y react-i18next, con el castellano como único idioma.
- **Gestos:** react-native-gesture-handler.
- **Pruebas:** Jest con jest-expo, React Native Testing Library, fast-check, Stryker y Maestro.
- **Calidad:** ESLint (eslint-config-expo, boundaries e i18next) y Prettier.
- **Seguridad:** npm audit, OSV-Scanner, gitleaks, Semgrep y MobSF.
- **Publicación:** EAS Build y EAS Submit, plan gratuito.

**Ajustes al crear el proyecto (2026-11-10):**

- **Development builds locales con `expo-dev-client` en vez de Expo Go.** Durante la transición a SDK 58, Expo Go en el móvil sigue en SDK 57, y Expo recomienda development builds para proyectos reales. Además, las compilaciones locales no gastan cuota de EAS.
- **Las rutas viven en `src/app/`,** como en la plantilla actual de Expo.
- **i18next entra en la fase 0,** porque la primera pantalla ya muestra un texto y la regla de los textos se aplica desde el primer commit.
- **Sin soporte web:** la app es solo para móvil y tablet.

## Alternativas descartadas

- **React Native sin Expo:** más configuración nativa a mano y sin EAS.
- **Flutter:** usa Dart en vez de TypeScript, y no sirve al objetivo de aprender TypeScript y React.
- **Apps nativas en Swift y Kotlin:** serían dos bases de código.
- **AsyncStorage como base de datos:** no tiene consultas ni migraciones.
- **WatermelonDB o Realm:** son más pesadas de lo que necesita la app.
- **Redux Toolkit:** más ceremonia de la necesaria para una sola sesión de partido.
- **Solo el Context de React:** complica el deshacer y los recálculos.

## Consecuencias

- Para compilar en local hacen falta Xcode, CocoaPods y Android Studio en el Mac.
- Cada actualización del SDK de Expo se planifica como un cambio de nivel medio.
- Las versiones de las librerías las fija Expo para cada SDK.
