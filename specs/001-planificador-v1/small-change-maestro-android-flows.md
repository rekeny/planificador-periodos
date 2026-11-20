# Small change form · Maestro flows that run on Android

- **Date:** 2026-11-20
- **Branch:** `fix/maestro-android-flows`
- **Approved by:** Fernando, 2026-11-20 (chat)

## What

The Maestro flows in `e2e/` (T036, T048, T056, T060) are adjusted so that they run to the end on an Android phone emulator, as they already do on the iPhone and iPad simulators. They check the same things as before. Only the steps that differ on Android change, and `us4-warnings` is run on a tablet emulator, because it is written for a tablet.

## Why

First real run of the six flows on Android, on 2026-11-20: Release build (arm64) on the emulator `Medium_Phone_API_37.0` (Android 17, 1080x2400, device language English). Only `us1-form-interruption` passed. The other five stopped at the first Android-specific step, for reasons of the flow and not (apart from one note) of the app:

- **`us1-teams-and-players`:** after typing 41 characters in «Nombre», `assertNotVisible` of the 41-character text fails. The field holds 40 characters (read in the hierarchy), but for an instant the keyboard's suggestion strip shows what was typed, and Maestro counts it. A moment later the same assertion passes.
- **`us2-match-and-call-up`:** the Android branch of the date never opens the dialog. On Android the date is a button «Fecha» that opens a Material calendar, and the flow only swipes the form and then taps «1». The dialog has to be opened, moved back to March 2026 with its «previous month» button, a day chosen and closed with «Aceptar». Its month and day names follow the device language (English here), which is the known limit of RF-012 recorded in `summary.md`.
- **`us3-planning`:** `tapOn "Ana, P1: casilla vacía"` was not found right after removing the overtime. The button is in the hierarchy and the same tap works when run alone on the same screen a minute later, so it looks like a timing problem. It has to be run again to tell.
- **`us3-interruption`:** `stopApp`, `launchApp` and then `openLink` of `planificadorperiodos://matches/99` ends on the list of teams, with no «No se ha encontrado». The link works when the app is already running and when it is the launch intent itself (`am start` on a stopped app). Only a link that arrives about a second after the launch is lost. A coach opening a link from another app is the second case, so this is a note about the app, not a blocker (see "Not changed").
- **`us4-warnings`:** it declares itself a tablet flow («on a phone in portrait the lower rows would need a vertical swipe»). On the phone emulator the warning strip is bounded and shows only the first banner, so the other messages are not on screen. It needs a tablet emulator.

## How

- `e2e/us1-teams-and-players.yaml`: the «not visible» check of the 41st character waits for it (`extendedWaitUntil` with `notVisible`, a few seconds) instead of asserting at once. It still fails if the field really holds 41 characters.
- `e2e/us2-match-and-call-up.yaml`: the Android branch taps «Fecha», goes back with the dialog's «previous month» button (matched in English and Spanish) until March 2026, taps March 1 by its label and taps «Aceptar». «1» moves into the iOS branch. The iOS steps do not change.
- `e2e/us3-interruption.yaml` (and any other flow that opens a link right after a launch): wait for «Equipos» before each `openLink`.
- `e2e/us3-planning.yaml`: only what the next run shows (probably a wait before the first cell tap).
- Whatever the next Android runs show after these steps: each flow is run again, and anything that fails later is fixed the same way, in scratch copies first and then here.
- `tests/support/e2e-flows.ts` (`NATIVE_PICKER_TEXTS`) and the static tests in `tests/e2e/`: the new native picker texts, and the checks that follow the new steps (the Android date branch, the wait before every `openLink`).
- `us4-warnings`: run on a tablet emulator made from the system image already installed (a new AVD, no download). If the disk does not allow it, it stays recorded as not run on Android.

No change in `src/`, in `src/i18n/es.json`, in dependencies or in the spec. T036, T048, T056 and T060 are ticked only if all their flows pass on both platforms.

## Not changed (to be decided apart)

- The link that arrives right after the launch is dropped on Android. It does not block the flows (they wait), and it is not a use a person makes. It is recorded in `review.md` as a finding of the app, for its own branch if you want it.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/` or any code of the app: only the end-to-end flows and the tests that read them.

## Tests

The static tests in `tests/e2e` fail when a flow loses one of these steps, and `npm run verify` stays green. The real proof is the run: the six flows on the phone emulator (`us4-warnings` on the tablet one) finish with no failed step. Not run: Android in landscape, a real Android device, other Android versions, a device in Spanish (the emulator is in English).
