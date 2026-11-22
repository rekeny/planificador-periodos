// F-A2 (Maestro run on Android, 2026-11-21), RF-076: when the columns shrink (the last overtime is
// removed) the horizontal offset of the grid is brought back into range. Android leaves a stale
// offset when the content gets narrower, and with the columns fitting the scroll is off, so P1 and
// P2 stayed behind the player column with no way back (small-change-form-android-grid-scroll.md).
//
// The numbers: a 411 pt wide viewport, 100 pt for the player column, so 311 pt for the columns.
// 9 columns (6 periods and 3 overtimes) do not fit: cells of 44 pt, 396 pt of content, the grid
// can be scrolled by 85 pt. 8 columns: 352 pt, 41 pt. 6 columns: cells of 51 pt, 306 pt, they fit.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { MatchGrid } from "@/ui/grid/match-grid";
import {
  HORIZONTAL,
  measureHeaderRow,
} from "../../../tests/support/match-grid-reading";
import {
  HEADER_ROW_HEIGHT,
  measureViewport,
} from "../../../tests/support/grid-viewport";
import { gridWith, viewOf } from "../../../tests/support/match-view-grid";

const gridWithOvertimes = (overtimeCount: number) => (
  <MatchGrid
    view={viewOf(gridWith({ players: 6, format: 6, overtimeCount }))}
    onTapCell={jest.fn()}
    onLongPressCell={jest.fn()}
  />
);

/** The scroll the grid asks for. The ScrollView mock shares one `scrollTo` between tests. */
function watchScroll(): jest.SpyInstance {
  const spy = jest.spyOn(ScrollView.prototype, "scrollTo");
  spy.mockClear();
  return spy;
}

async function scrolledTo(x: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId(HORIZONTAL), {
    nativeEvent: { contentOffset: { x, y: 0 } },
  });
}

async function renderMeasured(overtimeCount: number): Promise<void> {
  await render(gridWithOvertimes(overtimeCount));
  await measureHeaderRow(HEADER_ROW_HEIGHT);
  await measureViewport(411, 600);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("match grid, the horizontal offset stays in range (F-A2, RF-076)", () => {
  it("RF-076 F-A2: removing every overtime while scrolled to the right end brings the grid back to 0", async () => {
    const scrollTo = watchScroll();
    await renderMeasured(3);
    await scrolledTo(85);
    await screen.rerender(gridWithOvertimes(0));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: false });
  });

  it("RF-076 F-A2: removing one of three overtimes while scrolled to the right end scrolls only as far as the new end", async () => {
    const scrollTo = watchScroll();
    await renderMeasured(3);
    await scrolledTo(85);
    await screen.rerender(gridWithOvertimes(2));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ x: 41, animated: false });
  });

  it("RF-076 F-A2: an offset that is still in range after the overtime is removed does not move", async () => {
    const scrollTo = watchScroll();
    await renderMeasured(3);
    await scrolledTo(20);
    await screen.rerender(gridWithOvertimes(2));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("RF-076 F-A2: a grid that was never scrolled does not scroll when an overtime is removed", async () => {
    const scrollTo = watchScroll();
    await renderMeasured(3);
    await screen.rerender(gridWithOvertimes(0));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("RF-076 F-A2: adding an overtime does not move the grid", async () => {
    const scrollTo = watchScroll();
    await renderMeasured(2);
    await scrolledTo(41);
    await screen.rerender(gridWithOvertimes(3));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("RF-076 F-A2: before the container has measured its size the grid does not scroll by itself", async () => {
    const scrollTo = watchScroll();
    await render(gridWithOvertimes(3));
    await scrolledTo(85);
    await screen.rerender(gridWithOvertimes(0));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
