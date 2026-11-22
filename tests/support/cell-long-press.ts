// Long press on a grid cell in Jest (T065). This file holds no test calls. Jest cannot hold a finger
// down, so the gesture is driven with the test utility of react-native-gesture-handler 3
// (`createGestureController` of "react-native-gesture-handler/jest-utils"), which sends the same
// state events (BEGAN, ACTIVE, END, FAILED) that the native side sends to the cell's gesture.
// The utility finds a gesture by the `testID` of its config, so the seam is one fixed rule: every
// cell, empty or marked, registers its long-press gesture with
//   `cell-long-press:<entryId>:<columnKey>`   (the cell view's `key`, such as "12:P2" or "12:OT1").
// For the utility to work, "react-native-gesture-handler/jestSetup" must be loaded: the import of
// `expo-router/testing-library` below does it for the screens, and a component test imports it too.
import { act } from "@testing-library/react-native";
import { createGestureController } from "react-native-gesture-handler/jest-utils";

import type { ColumnKey } from "@/domain/column";
import "./gesture-environment";

/** The `testID` of the long-press gesture of the cell of an entry in a column ("P2", "OT1"). */
export function longPressId(entryId: number, column: ColumnKey): string {
  return `cell-long-press:${entryId}:${column}`;
}

/**
 * What the finger does: it stays and the gesture activates and ends (`completes`); it moves and the
 * handler fails, as it does when the grid scrolls (`fails`); the system takes it away (`isCancelled`);
 * or it is down but the half second has not passed yet (`isOnlyBegun`).
 */
export type Finger = "completes" | "fails" | "isCancelled" | "isOnlyBegun";

/** One finger on the cell whose gesture has this `testID`. */
export async function hold(
  id: string,
  finger: Finger = "completes",
): Promise<void> {
  const gesture = createGestureController(id);
  await act(async () => {
    try {
      gesture.begin();
    } catch (error) {
      throw new Error(
        `No long-press gesture with testID "${id}": every cell must register one (${String(error)})`,
      );
    }
    if (finger === "completes") {
      gesture.activate();
      gesture.end();
    } else if (finger === "fails") {
      gesture.fail();
    } else if (finger === "isCancelled") {
      gesture.cancel();
    }
  });
}

/** A long press on the cell of an entry in a column. */
export function longPress(
  entryId: number,
  column: ColumnKey,
  finger: Finger = "completes",
): Promise<void> {
  return hold(longPressId(entryId, column), finger);
}
