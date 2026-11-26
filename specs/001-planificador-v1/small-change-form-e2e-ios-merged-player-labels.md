# Small change form · The Maestro flows of US1 to US5 read a player row on iOS as one label

- **Date:** 2026-11-26
- **Branch:** `fix/e2e-ios-merged-player-labels`
- **Approved by:** Fernando, 2026-11-26 (chat)

## What

The Maestro flows `us1`, `us2`, `us3-planning`, `us5-subs` and `us5-undo-after-call-up` look for a player on the team screen with the bare name (`assertVisible: "Fran"`). On iOS they fail. The checks are changed to a pattern that matches the row on iOS (the merged label «6, Fran») and on Android (the bare name): `Fran|.*, Fran.*`.

## Why

Since D3 (T074) the rows of the team screen are pressable, so iOS reads each row as one element, «6, Fran», and the bare name no longer matches. Found on 2026-11-26 on the Release build of the merged `main` (iPhone 17, iOS 27.2): `us1`, `us2`, `us3-planning`, `us5-subs` and `us5-undo-after-call-up` failed at the first check of a player right after «Guardar»; the screenshot of the failure shows the row on screen. The app is right, the flows are stale. `us7` and `us6` already use the form and pass. Android is not affected (it exposes the text of the children), and must keep passing with the new form.

Discarded: giving the row an accessibility label that is only the name. It would change what a screen reader says for every row (RF-076 asks for number and name together) to please a test tool.

## How

- `e2e/us1-teams-and-players.yaml`, `e2e/us2-match-and-call-up.yaml`, `e2e/us3-planning.yaml`, `e2e/us5-subs.yaml`, `e2e/us5-undo-after-call-up.yaml`: only the checks of a player name on the team screen (and, if a later check fails the same way on the iPhone, that one too).
- The pattern is `Name|.*, Name.*` (bare name for Android, merged label «6, Fran» for iOS) and not `N|.*N, Name.*` as in `us7`, because `N|...` would also accept the bare number alone on Android and weaken the check.
- The static tests in `tests/e2e/` that read these flows: the four that check every text against `es.json` or the typed values accept exactly the pattern `Name|.*, Name.*` of a typed name (new helper in `tests/support/e2e-flows.ts`), and a new test, `tests/e2e/merged-row-labels.test.ts`, checks that each flow uses the pattern for its players, in the same commit.
- Nothing in `src/`, `es.json`, dependencies or the spec.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/` or the app: it only changes how a test tool finds a text on iOS.

## Tests

The Maestro flows themselves are the check. Before: the five flows fail on the iPhone 17 simulator at the first check of a player. After: they pass on the iPhone 17 simulator and on the Android phone emulator (Release builds), and `STRYKER_INCREMENTAL=1 npm run verify` stays green (the static tests of `tests/e2e/`). The tablet-only problems (Android tablet keyboard, the swipes of `us6` on the iPad, the cut of `us4-warnings` on the iPad) are not part of this change and stay recorded as known limits in `review.md`.
