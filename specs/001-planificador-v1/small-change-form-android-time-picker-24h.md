# Small change form · The Android time dialog keeps the 24-hour clock

- **Date:** 2026-11-28
- **Branch:** `fix/android-time-picker-24h`
- **Approved by:** Fernando, 2026-11-28 (chat)

## What

The time dialog of the match form on Android is told explicitly to use the 24-hour clock (`is24Hour` set to `true` on the `DateTimePicker` of `PickerDialog`). On an Android device set to 12-hour time it keeps showing 24 hours, as RF-083 asks.

## Why

Found on 2026-11-28 by the Codex review of PR 28 (the Expo SDK 58 patch bump, merged on 2026-11-27), finding BLOCKING, and confirmed by hand. The `@expo/ui` 58.0.30 changelog says: when `is24Hour` is not set, the community `DateTimePicker` now follows the device's 12-hour or 24-hour setting, and `is24Hour: true` keeps the 24-hour clock. `PickerDialog` in `src/ui/date-time-field-android.tsx` does not set it, so since PR 28 an Android phone or tablet set to 12-hour time shows a 12-hour dialog. RF-083 says the time is shown in 24-hour format «wherever a match date or time appears». Nothing caught it before: the tests use a double of the native module, which cannot tell a 12-hour dialog from a 24-hour one. This component is the Android one only; the iOS field is a different file (`date-time-field.tsx`) and is not part of this change.

The change brings the behaviour back to what the spec already says. It adds nothing.

## How

- `src/ui/date-time-field-android.tsx`: one prop, `is24Hour`, on the `DateTimePicker` of `PickerDialog`.
- `src/ui/date-time-field-android.test.tsx`, and if the double in `tests/support/` does not yet expose the props it receives, a small addition there: a case named after RF-083 and E-032 that opens the time dialog and checks that `is24Hour` is `true`.
- `specs/001-planificador-v1/review.md` and `summary.md`: the finding recorded as fixed, with the checks below.

No change in `src/domain/`, `es.json`, dependencies or `package-lock.json`.

## Why it is small

It changes no specified behaviour (it restores RF-083) and does not touch `src/domain/`: it is one prop on one component.

## Tests

- **Red first:** the time dialog is opened and the double receives no `is24Hour`, so the new case fails.
- **Green after:** the double receives `is24Hour === true`; the other cases of the file and `npm run verify` stay green.
- **Not covered by Jest (said plainly):** that a real Android in 12-hour mode shows the 24-hour clock. It is checked on the Android emulator with the system clock set to 12-hour (`adb shell settings put system time_12_24 12`): open «Añadir hora» and look at the dialog before and after the change, recording both in `review.md`.
