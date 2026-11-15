// Vertical budget of the match screen on a phone in landscape (Codex round 6, finding 1). This file
// holds no test calls. Jest has no layout engine, so the budget is computed from what the rendered
// tree shows and from the fixed heights of the pieces that do not shrink, set once here:
//   - the window is 667 × 375 (a phone in landscape: since 2026-11-15 the buttons go in the header);
//   - CHROME: status bar plus navigation header (74, the same as the tablet table);
//   - CALL_UP: the «Convocatoria» button when it is in the body of the screen (16 + 12 + 20 + 12 + 16);
//   - TOOLBAR: «Deshacer / Añadir prórroga» when it is under the grid, not in the header;
//   - SAVE_BANNER: the save-error banner in normal flow, one line (12 + 20 + 12).
// CONTRACT the Implementer must meet (tests pin behaviour, not mechanism):
//   1. On every phone window the warnings are inside the same bounded scroll container as on a tablet:
//      `warning-strip` has a numeric flattened `maxHeight` and holds a vertical ScrollView
//      `warning-strip-scroll` with `warning-banners` and `warning-legend` inside it (see
//      tests/support/warning-strip.ts); its `scrollEnabled` is true exactly when the measured banners
//      plus legend heights are greater than that `maxHeight`.
//   2. The Implementer chooses the bound and where the call-up button and the toolbar go (header or
//      body, as the tablet does) but what is left for the grid must be at least MIN_GRID:
//      window height - CHROME - (call-up if not in the header) - (toolbar if not in the header)
//      - (save banner if drawn) - the strip's `maxHeight`  >=  MIN_GRID (header row + two rows).
import { StyleSheet } from "react-native";
import { screen } from "@testing-library/react-native";

import { inHeader } from "./match-screen-grid";
import { STRIP, STRIP_SCROLL } from "./warning-strip";

export const LANDSCAPE = { width: 667, height: 375 };
export const CHROME = 74;
export const CALL_UP = 76;
export const TOOLBAR = 56;
export const SAVE_BANNER = 44;
/** The header row of the grid (44) and two rows of 44: the least that keeps the grid usable. */
export const MIN_GRID = 44 + 2 * 44;

/** The bound of the strip, failing with a clear reason when the phone has no bounded strip yet. */
export function stripBound(): number {
  const strip = screen.queryByTestId(STRIP);
  expect(strip).not.toBeNull();
  expect(screen.queryByTestId(STRIP_SCROLL)).not.toBeNull();
  const bound: unknown = StyleSheet.flatten(strip?.props.style)?.maxHeight;
  expect(typeof bound).toBe("number");
  return bound as number;
}

/** The height the grid keeps on the landscape phone, given what the rendered screen draws. */
export function gridHeight(saveFailed: boolean): number {
  const callUp = screen.getByRole("button", { name: "Convocatoria" });
  const undo = screen.getByRole("button", { name: "Deshacer" });
  return (
    LANDSCAPE.height -
    CHROME -
    (inHeader(callUp) ? 0 : CALL_UP) -
    (inHeader(undo) ? 0 : TOOLBAR) -
    (saveFailed ? SAVE_BANNER : 0) -
    stripBound()
  );
}
