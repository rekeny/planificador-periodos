# Small change form · The grid no longer stays scrolled after the last overtime is removed (F-A2)

- **Date:** 2026-11-21
- **Branch:** `fix/android-grid-scroll`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

On an Android phone, when the last overtime of a match is removed («Quitar prórroga»), the grid goes back to the offset it had to be, with every period column in reach. Today the grid stays scrolled to the right and the first columns (P1, P2) sit behind the player column, where a swipe does not bring them back. The change is in `src/ui/grid/match-grid.tsx`.

## Why

Finding F-A2 of the first Maestro run on Android (`review.md`, 2026-11-21); it stops the flow `us3-planning` on Android. Reproduced twice on an Android 17 emulator, Release build, in a 6-period match with 6 players: add overtimes, mark a cell in PR1 (the grid scrolls to the right to show it), remove the overtime, and the grid shows P3 to P6 shifted about 220 px to the left; «Ana, P1: casilla vacía» is in the accessibility tree but off screen. The coach cannot reach P1 and P2 until the match is reopened, so a mark cannot be made there. RF-076 asks that every cell is within reach.

Cause: with overtimes, the columns do not fit (9 columns of at least 44 pt on a 411 pt wide phone) and the horizontal scroll is on; the grid is scrolled to its right end. Once the overtime is removed the columns fit, `layout.horizontalScroll` becomes false and the horizontal `ScrollView` gets `scrollEnabled={false}`, but the offset it had stays: Android does not bring the offset back into range when the content shrinks, and with scrolling disabled the coach cannot do it either. (iOS does not show it: the iPhone run of `us3-planning` passes.)

Approach, and what is discarded:

- **Chosen:** the grid keeps the horizontal offset it is at (`onScroll`) and, when the content width or the viewport changes, it brings the offset back into range: the largest offset is `max(0, columns × cell width − (viewport width − player column))`, and if the current offset is beyond it the grid scrolls to that value, without animation. With the columns fitting, that value is 0. If the coach removes an overtime while still within range, nothing moves. It is plain React Native, with no new dependency, and the code is the same on both platforms (it does nothing when the offset is already in range).
- **Discarded:** giving the `ScrollView` a `key` that changes with the number of columns. It remounts the scroll and sends it back to 0 every time an overtime is added or removed, even when the coach was looking at the right place. Also discarded: leaving `scrollEnabled` always on, which would not bring back an offset that is already out of range.

## How

- `src/ui/grid/match-grid.tsx`: a ref and the current offset for the horizontal `ScrollView` (`onScroll`, `scrollEventThrottle`), and an effect that clamps the offset as described above when the number of columns, the cell width or the measured viewport change.
- `tests/…` (the grid tests that exist in `src/ui/grid/`): new tests.
- A Maestro check of the real behaviour: the flow `us3-planning` is the proof on Android. No new flow in `e2e/`.

No change in `src/domain/`, in `es.json`, in dependencies, in the spec or in what the grid shows or saves.

## Why it is small

It changes no specified behaviour (RF-076 already asks that every cell is in reach) and does not touch `src/domain/`. One component of the interface changes, and the grid keeps its columns, cells, headers and scroll rules (`grid-layout.ts` is not touched).

## Tests

Jest has no real scroll offsets, so its tests give the grid a scroll event and a measured viewport and read the `scrollTo` it asks for. They fail before the change on what they can see: with 3 overtimes and the offset at the right end, removing all of them makes the grid scroll to 0; removing one of three scrolls only as far as the new end; with the offset already in range, or with no overtime removed, it does not scroll; and before the viewport is measured it does nothing. The real proof is the emulator: before the change P1 and P2 are out of reach after removing the overtime (reproduced on 2026-11-21); after it, `us3-planning` goes past the tap on «Ana, P1: casilla vacía» on Android. **Not covered:** the Android tablet, a real device, and landscape. iOS is checked by running the same flow again on the iPhone 17 simulator.
