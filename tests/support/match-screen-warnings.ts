// Steps of the match screen tests with the warnings (T059). This file holds no test calls. It adds
// to match-screen-grid.ts and warning-reading.ts without changing them. The marks of the grids of
// match-view-warnings.ts (entry ids 100..) become seeds by position of the call-up (id - 100), so a
// grid of the spec examples can be written into the database and opened on the real screen.
import { fireEvent, screen } from "expo-router/testing-library";

import type { ColumnKey } from "@/domain/column";
import type { MatchGrid } from "@/domain/grid";
import type { SeedMark } from "./match-session-marks";
import { calmGrid } from "./match-view-warnings";

export function seedsOf(marks: MatchGrid["marks"]): SeedMark[] {
  return Object.entries(marks).flatMap(([key, mark]) => {
    const [id, column] = key.split(":");
    return mark === undefined
      ? []
      : [[Number(id) - 100, column as ColumnKey, mark]];
  });
}

/** 12 players, 8 periods, P1-P6 with 5 X each: nothing to warn about (see `calmGrid`). */
export const CALM_SEEDS = seedsOf(calmGrid().marks);

/** The view with this testID reports its height, as the device does after layout. */
export async function reportHeight(
  testID: string,
  height: number,
): Promise<void> {
  await fireEvent(screen.getByTestId(testID), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height } },
  });
}

/** The coach scrolls the columns of the grid sideways. */
export async function scrollSideways(testID: string, x: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId(testID), {
    nativeEvent: {
      contentOffset: { x, y: 0 },
      contentSize: { width: 800, height: 400 },
      layoutMeasurement: { width: 275, height: 400 },
    },
  });
}
