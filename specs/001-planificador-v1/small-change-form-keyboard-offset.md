# Small change form · The keyboard no longer hides the focused field of a form (F-01)

- **Date:** 2026-11-20
- **Branch:** `fix/form-keyboard-offset`
- **Approved by:** Fernando, 2026-11-20 (chat)

## What

On iOS, when a text field of a form (new match, new team, new player) gets the focus, the form scrolls so the field stays above the keyboard. Today the keyboard covers the focused field and everything below it, «Guardar» included. The change is in `src/ui/form-scroll.tsx`, the one component the three forms share.

## Why

Finding F-01 of the Codex review of 2026-11-18, accepted by Fernando as pending for its own `fix/` branch (`review.md`). First seen on an iPhone in landscape; on 2026-11-20 it was also reproduced in portrait, on the Release build installed on the iPhone 17 simulator (iOS 27.2): in the new-match form, tapping «Notas» opens the keyboard and the form stays at the top, with «Visitante», the score, «Notas» and «Guardar» under the keyboard. The coach types without seeing what they type. RF-076 asks that no field, message or «Guardar» is out of reach with the keyboard open; the structure tests of RF-076 pass because they only check that everything is inside the scroll, not where the keyboard leaves it.

Cause: `KeyboardAvoidingView` is the only avoidance. It computes the overlap from its own position on the screen, and these forms sit under a native header (and, on iOS, inside a modal sheet that does not start at the top of the screen), so its estimate is wrong (`keyboardVerticalOffset` is 0 by default).

Approach, and what is discarded:

- **Chosen:** on iOS, `automaticallyAdjustKeyboardInsets` on the `ScrollView` (the system adjusts the insets and keeps the focused field visible, wherever the sheet sits) and no `KeyboardAvoidingView` padding on iOS, which would adjust twice. On Android the `KeyboardAvoidingView` with `behavior="height"` stays as it is. The React Native docs say the prop is iOS only and say nothing about modals, so it is **checked on the simulator before it is accepted**.
- **Fallback if the simulator shows it does not work inside the sheet:** keep the `KeyboardAvoidingView` and give it a `keyboardVerticalOffset` that equals the distance from the top of the screen to the form (header and sheet), as the Expo keyboard guide describes. I would come back to you before choosing it, because it depends on the sheet's position.
- **Discarded:** `react-native-keyboard-controller`, which Expo recommends for complex forms. It is a new dependency with native code (a new development build, a root provider, `react-native-reanimated`) and rule 10 of `AGENTS.md` asks for it in `plan.md` first. That is a medium change, not this one.

## How

- `src/ui/form-scroll.tsx`: the `ScrollView` takes `automaticallyAdjustKeyboardInsets` (iOS), and the `KeyboardAvoidingView` takes its `behavior` only on Android.
- `tests/app/form-scroll.components.test.tsx`, `tests/support/form-scroll.ts` and, if needed, `tests/app/form-scroll.routes.test.tsx`: the structure tests keep passing and new ones check the keyboard behaviour on each platform.
- A Maestro check of the real behaviour, written in scratchpad and run on the simulator, not added to `e2e/` unless you ask for it.

No change in `src/domain/`, in `es.json`, in dependencies, in the spec or in what any form saves or validates.

## Why it is small

It changes no specified behaviour (RF-076 already asks for it) and does not touch `src/domain/`. One shared component of the interface changes, and the three forms keep the same fields, messages and buttons.

## Tests

Jest cannot show a real keyboard, so its tests fail before the change only on what they can see: on iOS the form's `ScrollView` has `automaticallyAdjustKeyboardInsets` and the `KeyboardAvoidingView` does not add padding; on Android the `KeyboardAvoidingView` keeps `behavior="height"` and the prop is not set. The real proof is the simulator: before the change, «Notas» of the new-match form ends up under the keyboard (reproduced on 2026-11-20); after it, «Notas», its text and «Guardar» can be reached with the keyboard open. Run on 2026-11-20 on the iPhone 17 in portrait and in landscape: it passed (`review.md`). **Not covered:** Android (no emulator here yet), the iPad, and a real device.
