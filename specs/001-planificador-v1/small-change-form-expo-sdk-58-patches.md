# Small change form · Expo SDK 58 updates (second round)

- **Date:** 2026-11-27
- **Branch:** `fix/expo-sdk-58-patches`
- **Approved by:** Fernando, 2026-11-27 (chat)

## What

The Expo packages move to the versions within SDK 58 that Expo now expects (`npx expo install --fix`). The dependency list does not change: no package is added or removed, only versions move. Most are patch releases, but some are minor releases within SDK 58 (see below).

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

### Minor releases among the updates

Codex (2026-11-28) and the Security audit (2026-11-28) noted that not every bump is a patch release:

- `expo` 58.0.26 to 58.1.0 (direct).
- Transitive, in `package-lock.json`: `expo-dev-launcher` 58.0.21 to 58.1.0, `expo-modules-core` 58.1.0 to 58.2.0, `@expo/fingerprint` 0.21.10 to 0.22.0 and `@expo/ws-tunnel` 2.0.1 to 2.1.1.

The wording of this form was corrected on 2026-11-28 (it first called every bump a "patch release"): they are updates within SDK 58. Compatibility is covered by `npx expo-doctor` (18/18) and the full `npm run verify`.

## Why

Expo published new SDK 58 releases, so `npx expo-doctor` reports outdated packages and `scripts/verify.sh` fails on `main` with no change of ours. The SDK 58 reference page documents no breaking change for these updates; `expo` ~58.1.0 is the SDK's own line.

## How

`package.json` and `package-lock.json`, produced by `npx expo install --fix`. Nothing else is touched.

## Why it is small

It changes no behaviour of the app and does not touch `src/`. These are updates within SDK 58; some are minor releases (listed below), none is a major one, and there is no new dependency.

## Tests

No new test: the existing suite is the check. `npx expo-doctor` and `npx expo install --check` fail before the change and pass after; the full `npm run verify` passes.
