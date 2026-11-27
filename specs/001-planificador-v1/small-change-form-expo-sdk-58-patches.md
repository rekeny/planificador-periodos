# Small change form · Expo SDK 58 patch updates (second round)

- **Date:** 2026-11-27
- **Branch:** `fix/expo-sdk-58-patches`
- **Approved by:** Fernando, 2026-11-27 (chat)

## What

The Expo packages move to the patch versions that Expo SDK 58 now expects (`npx expo install --fix`). The dependency list does not change: no package is added or removed, only versions move.

| Package              | Before   | After    |
| -------------------- | -------- | -------- |
| `expo`               | ~58.0.26 | ~58.1.0  |
| `@expo/ui`           | ~58.0.29 | ~58.0.30 |
| `expo-dev-client`    | ~58.0.21 | ~58.0.22 |
| `expo-glass-effect`  | ~58.0.5  | ~58.0.6  |
| `expo-image`         | ~58.0.18 | ~58.0.19 |
| `expo-router`        | ~58.0.32 | ~58.0.33 |
| `expo-splash-screen` | ~58.0.14 | ~58.0.15 |
| `jest-expo`          | ~58.0.15 | ~58.0.16 |

## Why

Expo published new SDK 58 patch releases, so `npx expo-doctor` reports outdated packages and `scripts/verify.sh` fails on `main` with no change of ours. The SDK 58 reference page documents no breaking change for these patches; `expo` ~58.1.0 is the SDK's own patch line.

## How

`package.json` and `package-lock.json`, produced by `npx expo install --fix`. Nothing else is touched.

## Why it is small

It changes no behaviour of the app and does not touch `src/`. All bumps are patch releases within SDK 58, with no new dependency.

## Tests

No new test: the existing suite is the check. `npx expo-doctor` and `npx expo install --check` fail before the change and pass after; the full `npm run verify` passes.
