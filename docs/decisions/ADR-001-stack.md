# ADR-001 · App stack

- **Status:** Accepted
- **Date:** 2026-11-10
- **Decided by:** Fernando

## Context

The app is for iOS and Android, on phones and tablets, works offline, stores data only on the device and is in Spanish. It is developed by a single person who wants to learn TypeScript and React and who, later on, wants to publish it in the stores at the lowest cost.

## Decision

- **Platform:** Expo SDK 58 (React Native) with strict TypeScript and Expo Router.
- **Data:** expo-sqlite with Drizzle ORM and drizzle-kit for migrations.
- **State:** Zustand for the match session and undo.
- **Texts:** i18next and react-i18next, with Spanish as the only language.
- **Gestures:** react-native-gesture-handler.
- **Tests:** Jest with jest-expo, React Native Testing Library, fast-check, Stryker and Maestro.
- **Quality:** ESLint (eslint-config-expo, boundaries and i18next) and Prettier.
- **Security:** npm audit, OSV-Scanner, gitleaks, Semgrep and MobSF.
- **Publishing:** EAS Build and EAS Submit, free plan.

**Adjustments when creating the project (2026-11-10):**

- **Local development builds with `expo-dev-client` instead of Expo Go.** During the move to SDK 58, Expo Go on the phone is still on SDK 57, and Expo recommends development builds for real projects. Local builds also use no EAS quota.
- **Routes live in `src/app/`,** as in the current Expo template.
- **i18next arrives in phase 0,** because the first screen already shows a text and the texts rule applies from the first commit.
- **No web support:** the app is only for phones and tablets.

## Discarded alternatives

- **React Native without Expo:** more manual native configuration and no EAS.
- **Flutter:** uses Dart instead of TypeScript, so it does not serve the goal of learning TypeScript and React.
- **Native apps in Swift and Kotlin:** two code bases.
- **AsyncStorage as a database:** no queries or migrations.
- **WatermelonDB or Realm:** heavier than the app needs.
- **Redux Toolkit:** more ceremony than a single match session needs.
- **React Context alone:** makes undo and recalculation harder.

## Consequences

- Building locally needs Xcode, CocoaPods and Android Studio on the Mac.
- Each Expo SDK update is planned as a medium-level change.
- Library versions are pinned by Expo for each SDK.
