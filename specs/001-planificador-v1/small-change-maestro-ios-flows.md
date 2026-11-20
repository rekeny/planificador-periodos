# Small change form · Maestro flows that run on iOS and iPad

- **Date:** 2026-11-20
- **Branch:** `fix/maestro-ios-flows`
- **Approved by:** Fernando, 2026-11-20 (chat)

## What

The six Maestro flows in `e2e/` (T036, T048, T056, T060) are adjusted so that they run to the end on an iPhone 17 simulator (iOS 27.2) and, for `us4-warnings`, on an iPad Pro 11-inch (M5) in landscape. They check the same things as before, with one exception: on iOS the time of the match form is only checked up to «12:00» after «Añadir hora» and then removed; the choice of 18:30 stays on Android. Two small subflows for closing the keyboard are added in `e2e/subflows/`.

## Why

The flows were written on 2026-11-13 without Maestro installed (decision of Fernando) and had never been run. The first real run, on 2026-11-20, showed that none of them passed on iOS, for reasons of the tool and the platform and not of the app:

- A label and its field share the same text («Nombre», «Local»…), so a plain `tapOn` hits the label: the taps now use `below:`.
- `hideKeyboard` can close the whole modal form on iOS: the flows tap the iPad «Hide keyboard» key or the label above the field instead.
- iOS asks «¿Abrir en…?» before a deep link, and reads some rows as one text («1, Ana», «Alevín A, 2015»): the flows tap the question when it shows and use patterns for those rows.
- A «not visible» check on the score message passed without proving anything, because the message was out of view.
- Some fields stayed behind the header of the sheet, where Maestro still counts them as visible, so the scroll goes up to the first label.
- The time wheels of iOS are not in Maestro's view of the screen: choosing 18:30 by position landed on 21:45, 15:15 and 18:10 in three runs. Decision of Fernando, 2026-11-20 (chat): on iOS only «12:00» is checked here, and changing the time is left to the Jest tests and to a check by hand on the device.
- On iOS the strip under the header does not take touches and the first «Quitar de la convocatoria» button sits half inside it, so the call-up removal taps the second row (Fran). This is also a possible problem of the app, reported separately.

Discarded: tapping the wheels with a loop that reads the field (the field updates late and the result changed from run to run), and fixed positions for the wheels (they depend on where the popup opens).

## How

- `e2e/us1-teams-and-players.yaml`, `e2e/us1-form-interruption.yaml`, `e2e/us2-match-and-call-up.yaml`, `e2e/us3-planning.yaml`, `e2e/us3-interruption.yaml`, `e2e/us4-warnings.yaml`: the adjustments above.
- `e2e/subflows/close-keyboard.yaml` and `e2e/subflows/close-number-keyboard.yaml` (new): close the keyboard without `hideKeyboard`.
- `tests/e2e/*.test.ts` and `tests/support/e2e-flows.ts`, `tests/support/us2-flow.ts`: the static checks of the flows follow them (for example the removal of Fran, the «Abrir» step after every deep link, and that the iOS time wheel is not driven).

No change in `src/`, in `src/i18n/es.json`, in dependencies or in the spec. The tasks T036, T048, T056, T060 and T061 are not ticked: they wait for the Android run.

## Why it is small

It changes no specified behaviour and does not touch `src/domain/` or any code of the app: only the end-to-end flows and the tests that read them.

## Tests

The static tests in `tests/e2e` (76) fail when a flow loses one of these steps, and the full `npm run verify` is green on the commit. The real proof is the run: the five flows on the iPhone 17 simulator and `us4-warnings` on the iPad Pro 11-inch in landscape all finish with no failed step (2026-11-20). Not run: Android (emulator), iPad in portrait, iPhone in landscape.
