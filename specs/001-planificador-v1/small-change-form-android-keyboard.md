# Small change form · The Android keyboard no longer hides the focused field of a form (F-A1)

- **Date:** 2026-11-21
- **Branch:** `fix/android-keyboard-offset`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

On Android, when a text field of a form (new match, new team, new player) gets the focus, the form scrolls so the field stays above the keyboard. Today the keyboard covers the focused field and what is typed in it. The change is in `src/ui/form-scroll.tsx`, the one component the three forms share. iOS is not touched: F-01 (PR 10) already fixed it there.

## Why

Finding F-A1 of the first Maestro run on Android (`review.md`, 2026-11-21), and the half of F-01 that PR 10 left open («Not checked: Android»). Seen on an Android 17 emulator, Release build: in the new-match form, scrolling to «Notas» and tapping it opens the keyboard and the form does not move. The field, and what is typed in it («hola notas»), are under the keyboard. The same happens with the score fields, which stops the Maestro flow `us2-match-and-call-up` on Android. RF-076 asks that no field, message or «Guardar» is out of reach with the keyboard open.

Cause: the form already sits inside a `KeyboardAvoidingView` with `behavior="height"`, which does shrink the visible area above the keyboard (the screenshot shows the form ending where the keyboard starts). But the field that was tapped was in view _before_ the keyboard opened, and nothing scrolls it into view _after_ the area shrinks. Expo apps are edge-to-edge on Android, so the window does not resize and scroll the field by itself (Expo keyboard guide), and the `ScrollView` prop that does this on iOS, `automaticallyAdjustKeyboardInsets`, is iOS only (React Native 0.88 source).

Approach, and what is discarded:

- **Chosen:** on Android, when the keyboard has shown (`keyboardDidShow`), measure the focused field (`TextInput.State.currentlyFocusedInput()` and `measureInWindow`), compare its bottom with the top of the keyboard (`endCoordinates.screenY` of the event) and, if it is covered, scroll the form by the difference plus a small margin. The `KeyboardAvoidingView` stays as it is. It needs no new dependency and no native code. It is **checked on the emulator before it is accepted**, including moving from one field to another with the keyboard open, because Jest cannot show a real keyboard.
- **Fallback if the emulator shows it is not reliable:** `react-native-keyboard-controller` (`KeyboardAwareScrollView`), which the Expo guide recommends for forms with several inputs. It is a new dependency with native code (a new development build, a root provider, `react-native-reanimated`) and rule 10 of `AGENTS.md` asks for it in `plan.md` first. That would be a medium change, and I would come back to you before choosing it.
- **Discarded:** `behavior="padding"` on Android. It also shrinks the area but scrolls nothing, so the field stays hidden the same way.

## How

- `src/ui/form-scroll.tsx`: the `ScrollView` gets a ref and keeps its current offset; an effect, only on Android, listens to `keyboardDidShow` and scrolls as described above, and removes the listener when the form goes away.
- `tests/app/form-scroll.keyboard.test.tsx` (exists, from F-01): new tests for Android.
- A Maestro check of the real behaviour: the flow `us2-match-and-call-up` is the proof on Android (it types in the score fields). No new flow in `e2e/`.

No change in `src/domain/`, in `es.json`, in dependencies, in the spec or in what any form saves or validates.

## Why it is small

It changes no specified behaviour (RF-076 already asks for it) and does not touch `src/domain/`. One shared component of the interface changes, and the three forms keep the same fields, messages and buttons.

## Tests

Jest cannot show a real keyboard, so its tests fail before the change only on what they can see: on Android, with the focused field under the keyboard (a mocked measure and a `keyboardDidShow` event), the form scrolls by the right amount; with the field already above the keyboard it does not scroll; on iOS the listener is not set and nothing scrolls by hand; and the listener is removed when the form unmounts. The real proof is the emulator: before the change «Notas» ends up under the keyboard (reproduced on 2026-11-21); after it (run on 2026-11-21, `review.md`), «Notas» and its text stay above the keyboard in portrait and in landscape, and `us2-match-and-call-up` goes past the score fields and reaches «Guardar» in portrait. «Guardar» in landscape was not checked. **Not covered:** the Android tablet, a real Android device, other Android versions and a different keyboard than Gboard.
