# Small change form · The warning strip of a phone in portrait shows its banners (F-A4)

- **Date:** 2026-11-21
- **Branch:** `fix/maestro-us2-android-notes` (the branch of T048, where the problem was found)
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

On a phone held in portrait, the strip of warnings above the grid may be 160 pt high instead of 60 pt, so that the two banners («Con las casillas vacías…» and «Convocatoria fuera del rango…») can be read without scrolling the strip. The legend lines below them still scroll inside the strip. Phones in landscape (60 pt) and tablets (80 pt) do not change. The change is in `src/ui/grid/tablet-budget.ts` and `src/ui/warnings/warning-strip.tsx`.

## Why

Finding F-A4 of the run of `us2-match-and-call-up` on Android (2026-11-21). On an Android 17 phone emulator (411 × 914 pt, portrait), with 8 players in a 6-period match, the grid screen shows a 60 pt strip: about one line and a half of the first banner. The second banner, «Convocatoria fuera del rango: con 6 periodos deben ser de 9 a 12 jugadores, y hay 8.», is in the strip but out of view, so the coach does not see it unless they scroll a strip of 60 pt, and Maestro does not see it either, which stops the flow. A warning that the app exists to show is hidden on the device most coaches use, in the orientation with the most room.

Cause: `PHONE_STRIP_MAX_HEIGHT = 60` is documented as the bound for "a phone (any orientation)". It was chosen for a landscape phone (375 pt high), which keeps `375 − 74 − 60 − 44 = 197` pt for the grid (Codex round 6, 2026-11-15). In portrait the bound was never revisited: a phone is at least about 640 pt high, and the grid scrolls vertically if the players do not fit.

The budget in portrait, for the shortest common phone (640 pt high): chrome 74, call-up button 76, toolbar 56, the strip 160 and the header row 44 leave 230 pt for the grid, more than a header row and two rows (132), and the grid scrolls vertically for the rest, as it does today when 12 players do not fit (RF-076, RF-081 is about tablets).

Approach, and what is discarded:

- **Chosen:** a second constant, `PHONE_PORTRAIT_STRIP_MAX_HEIGHT = 160`, used when the window is a phone and is not wider than tall (the same test the screen already uses to put the buttons in the body: `compact` is false). 160 holds the two banners of about 75 pt each; the strip still scrolls when its content is taller.
- **Discarded:** a bound that is a fraction of the window height. It needs a rule for the minimum and for every window size, and one fixed number is easier to test and to read. Also discarded: removing the bound in portrait, because with three banners, a save-error banner and a long legend the grid would be left without room on a short phone.

## How

- `src/ui/grid/tablet-budget.ts`: the new constant `PHONE_PORTRAIT_STRIP_MAX_HEIGHT = 160`, with the budget in its comment; the comment of `PHONE_STRIP_MAX_HEIGHT` says it is the bound of a phone in landscape.
- `src/ui/warnings/warning-strip.tsx`: the strip chooses 80 on a tablet, 60 on a phone with `compact` (landscape), 160 on a phone in portrait; `scrollEnabled` still follows the measured content against the bound in use.
- `tests/app/…` (the strip and phone budget tests that exist): new tests for the portrait phone; the existing landscape and tablet ones stay as they are.
- On the way, the Maestro flow `us2-match-and-call-up` is run again on the Android emulator to see that it goes past the banners. T048 is ticked only if it passes on both platforms, as in `small-change-maestro-us2-android-notes.md`.

No change in `src/domain/`, in `es.json`, in dependencies, in the spec or in what the banners say.

## Why it is small

It changes no specified behaviour (no requirement gives a height for the strip on a phone in portrait) and does not touch `src/domain/`. It is a number and the line that picks it, and the grid keeps its sizes (`grid-layout.ts` is not touched: it reads the measured heights).

## Tests

Jest has no layout engine, so the tests read the bound the strip is given and what is left for the grid, like the landscape ones: in a 411 × 914 window the strip's `maxHeight` is 160; with the measured banners at 150 and the legend at 0 it does not scroll, and with 170 it does; in a 360 × 640 window the grid keeps at least a header row and two rows; in 667 × 375 (landscape) and on a tablet the bound is still 60 and 80. The real proof is the emulator: before the change the second banner is hidden (reproduced on 2026-11-21); after it, both banners are in view and `us2-match-and-call-up` goes past the checks of the banners. **Not covered:** a real phone, an iPhone in portrait (the simulator runs the same flow afterwards), tablets in portrait (unchanged), fonts scaled up by the system (the banners may need scrolling there).
