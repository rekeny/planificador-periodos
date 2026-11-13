// What the viewport tests read and do (D2 review F2). This file holds no test calls.
// CONTRACT the Implementer must meet (tests pin behaviour, not mechanism):
//   1. src/ui/grid/grid-layout.ts exports a pure
//        viewportLayout({ viewportWidth, viewportHeight, periods, overtimes, players,
//                         playerColumnWidth, headerRowHeight }): GridLayout-without-buttonsInHeader
//      = { cellWidth, rowHeight, horizontalScroll, verticalScroll } with the SAME rules as gridLayout
//      but over the measured viewport instead of window minus guessed chrome:
//        fitting = columns > 0 ? floor((viewportWidth - playerColumnWidth) / columns) : 44
//        cellWidth = max(44, fitting); horizontalScroll = fitting < 44
//        space = viewportHeight - headerRowHeight
//        rowHeight = players > 0 ? clamp(space / players, 44, 56) : 56
//        verticalScroll = players * rowHeight > space   (rows never clipped with scroll disabled)
//   2. MatchGrid wraps its vertical ScrollView in a View with testID "grid-viewport" that fills the
//      space the screen gives the grid and has `onLayout`. Once that view has reported a size,
//      MatchGrid derives width/height sizes and both scroll flags ONLY from it (plus the header row
//      height measured on "grid-header-row"), ignoring window size and the chromeHeight /
//      bannersHeight / legendHeight props. Before the first report it keeps today's window-based
//      sizes (the T083 and T059 tests never report a viewport and must stay green).
//   3. On the match screen the call-up button, the phone toolbar, banners and legend are laid out
//      outside that view, so what it measures is what the grid really has.
import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

export const VIEWPORT = "grid-viewport";
export const HEADER_ROW_HEIGHT = 44;
export const MIN_ROW = 44;
export const MAX_ROW = 56;

/** The container of the grid reports the size it was given, as the device does after layout. */
export async function measureViewport(
  width: number,
  height: number,
): Promise<void> {
  await fireEvent(screen.getByTestId(VIEWPORT), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

/** Reference row height: the space shared by the players, kept between 44 and 56 pt. */
export function rowHeightFor(space: number, players: number): number {
  return Math.max(MIN_ROW, Math.min(MAX_ROW, space / players));
}

/** The size of the first cell of the grid (not the call-up button of the screen). */
export function cellSize(): { width: number; height: number } {
  const [cell] = screen.getAllByRole("button", { name: /, (P|PR)\d+: / });
  const style = StyleSheet.flatten(cell?.props.style) as {
    width: number;
    height: number;
  };
  return { width: style.width, height: style.height };
}
