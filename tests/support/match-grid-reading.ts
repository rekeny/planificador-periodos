// What the grid tests read from the rendered grid (T083). This file holds no test calls. The
// assumed testIDs of src/ui/grid/match-grid.tsx are named here once: "grid-vertical-scroll" and
// "grid-horizontal-scroll" on the two ScrollViews, and "grid-header-row" on the view that holds
// the column headers (the one that gets `onLayout`).
import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

export const VERTICAL = "grid-vertical-scroll";
export const HORIZONTAL = "grid-horizontal-scroll";
export const HEADER_ROW = "grid-header-row";

/** Whether a ScrollView lets the user scroll: the `scrollEnabled` prop (true when it is not set). */
export function scrolls(testID: string): boolean {
  const flag: unknown = screen.getByTestId(testID).props.scrollEnabled;
  return flag !== false;
}

/** The width and height the first cell button was given. */
export function firstCellSize(): { width: number; height: number } {
  const [cell] = screen.getAllByRole("button");
  const style = StyleSheet.flatten(cell?.props.style) as {
    width: number;
    height: number;
  };
  return { width: style.width, height: style.height };
}

/** The header row reports the height it was measured at, as the device does after layout. */
export async function measureHeaderRow(height: number): Promise<void> {
  await fireEvent(screen.getByTestId(HEADER_ROW), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 500, height } },
  });
}
