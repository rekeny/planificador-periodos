# Small change form · The US2 flow types the notes in pieces so it finishes on Android (T048)

- **Date:** 2026-11-21
- **Branch:** `fix/maestro-us2-android-notes`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

The Maestro flow `e2e/us2-match-and-call-up.yaml` (T048) types the 501 characters of the notes of the match form in three consecutive pieces of 167 characters, instead of one, so that it runs on Android. It checks the same things as before: the field keeps its first 500 characters and the 501st is not shown (E-022). After that step the flow has never run on Android, so whatever the next Android run shows is fixed in the flow the same way, and recorded.

## Why

After the Android keyboard fix (PR 12), `us2-match-and-call-up` on Android went past the score fields and stopped when it typed the notes: `inputText` of 501 characters failed with `DEADLINE_EXCEEDED` after 120 s ("Device server died during inputText"). Maestro gives each command 120 s. On the emulator typing took about 0.6 s per character in that run, so 501 characters needed about 5 minutes. Measured again on a freshly started emulator, 100 characters took 17.6 s (0.18 s per character), so 501 characters would take about 90 s: too close to 120 s to rely on, and slower on a busier machine. Three pieces of 167 characters take about 30 s each. It is a limit of the flow on Android, not of the app. iOS types faster and is not affected, but the flow has no platform branch for this: the same three steps run on both.

## How

- `e2e/us2-match-and-call-up.yaml`: the `inputText` of 501 characters becomes three `inputText` steps with the same text split in pieces; the checks that follow are unchanged (the first 500 characters visible, the 501-character text not visible). If the run shows that Gboard's suggestion strip keeps the long word on screen, as it did for the 41-character names, the subflow `commit-typed-text.yaml` is called before the «not visible» check, as already done for the other fields.
- `tests/e2e/us2-flow.test.ts` (and `tests/support/` if needed): the check of the field limits reads the notes as the join of the consecutive `inputText` steps (501 characters, each piece short enough for Maestro's 120 s), and still requires the 500-character text to be visible and the 501-character text not to be.
- The run of the flow on the Android emulator and on the iPhone 17 simulator, recorded in `review.md`.

No change in `src/`, in `es.json`, in dependencies or in the spec. T048 is ticked only if the flow passes on both platforms.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/` or any code of the app: only the end-to-end flow and the test that reads it.

## Tests

The static test fails when the flow types the notes in one step too long for Maestro, or loses the checks of the 500th and 501st characters. The real proof is the run: `us2-match-and-call-up` finishes with no failed step on the Android emulator and on the iPhone 17 simulator. Not run: the Android tablet, a real device, a device in Spanish (the date dialog shows English names on the emulator).
