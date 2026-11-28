# Small change form · Remove three unused Expo packages

- **Date:** 2026-11-27
- **Branch:** `fix/remove-unused-expo-packages`
- **Approved by:** Fernando, 2026-11-27 (chat: "Quita solo los tres")

## What

`expo-web-browser`, `expo-image` and `expo-device` are removed from `package.json` (and from `package-lock.json`), and `expo-web-browser` is removed from the `plugins` array of `app.json`. `expo-glass-effect` stays.

## Why

SEC-T061-3 (`review.md`) found four template packages that nothing in the repository uses. A new grep on 2026-11-27 confirms it for these three: no file in `src/`, `tests/`, `e2e/`, `scripts/`, `plugins/` or the config files imports them, and no other direct dependency needs them (`npm ls` shows them only as direct dependencies). They are autolinked native code and `expo-image` can load images from URLs, so they are surface with no use (principle 6, nothing just in case).

`expo-glass-effect` is kept on purpose: `expo-router@58` depends on it, so removing it from `package.json` would change nothing that gets installed.

## How

- `npm uninstall expo-web-browser expo-image expo-device`: `package.json` and `package-lock.json` lose those three entries and `ua-parser-js`, a transitive dependency only `expo-device` used. No other lock entry changes.
- `app.json`: delete `"expo-web-browser"` from `plugins`.
- No change in `ios/` or `android/` (they are generated), `src/`, tests or the spec. `plan.md` and `review.md` keep their history as written.

## Why it is small

It changes no behaviour of the app and does not touch `src/domain/`: it removes code that nothing calls.

## Tests

No new behaviour, so no new test. The existing suite and `npm run verify` must stay green, and `npx expo-doctor` and `npx expo install --check` must pass without the three packages.
