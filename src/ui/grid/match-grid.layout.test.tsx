// T083: the assembled grid, how it is laid out (RF-076, RF-077; sizes come from grid-layout.ts).
// Assumed testIDs of src/ui/grid/match-grid.tsx (named in tests/support/match-grid-reading.ts):
// "grid-vertical-scroll" and "grid-horizontal-scroll" on the two ScrollViews (the horizontal one
// has `horizontal`, and each has `scrollEnabled` set to whether gridLayout says it scrolls) and
// "grid-header-row" on the view with the column headers, which gets `onLayout`. The player column
// has no testID: it is found by its texts. The heights the screen measures come as optional props
// chromeHeight, bannersHeight and legendHeight; the window comes from useWindowDimensions.
import "@/i18n";
import { render, screen, within } from "@testing-library/react-native";

import type { MatchView } from "@/state/match-view";
import { MatchGrid } from "@/ui/grid/match-grid";
import {
  firstCellSize,
  HEADER_ROW,
  HORIZONTAL,
  measureHeaderRow,
  scrolls,
  VERTICAL,
} from "../../../tests/support/match-grid-reading";
import {
  gridWith,
  viewOf,
  type GridOptions,
} from "../../../tests/support/match-view-grid";
import { restoreWindow, setWindow } from "../../../tests/support/window-size";

const viewWith = (options: GridOptions = {}) => viewOf(gridWith(options));

// Status bar and header (74), two banners (120), the legend (48): the worst case of plan.md.
const ABOVE = { chromeHeight: 74, bannersHeight: 120, legendHeight: 48 };

function gridElement(view: MatchView, heights: object = {}) {
  return (
    <MatchGrid
      view={view}
      onTapCell={jest.fn()}
      onLongPressCell={jest.fn()}
      {...heights}
    />
  );
}

afterEach(async () => restoreWindow());

describe("match grid, the two scroll areas", () => {
  it("RF-077: the player column is outside the horizontal scroll and inside the vertical one, with number, name and counter", async () => {
    await setWindow(1024, 768);
    await render(gridElement(viewWith({ players: 3 })));
    const horizontal = within(screen.getByTestId(HORIZONTAL));
    const vertical = within(screen.getByTestId(VERTICAL));
    for (const text of ["Jugador 2", "2", "J 0 · D 6"]) {
      expect(horizontal.queryByText(text)).toBeNull();
      expect(vertical.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it("RF-042 RF-077: the header row and every cell are inside the horizontal scroll, so the headers scroll with the columns", async () => {
    await setWindow(1024, 768);
    await render(gridElement(viewWith({ players: 3, overtimeCount: 1 })));
    const horizontal = within(screen.getByTestId(HORIZONTAL));
    expect(
      within(horizontal.getByTestId(HEADER_ROW)).getByText("PR1"),
    ).toBeOnTheScreen();
    for (const header of ["P1", "P6", "PR1"]) {
      expect(horizontal.getByText(header)).toBeOnTheScreen();
    }
    expect(horizontal.getAllByRole("button")).toHaveLength(21);
    expect(
      within(screen.getByTestId(VERTICAL)).getByTestId(HORIZONTAL),
    ).toBeOnTheScreen();
  });

  it("RF-076 RF-077: the horizontal scroll is horizontal and the vertical one is not", async () => {
    await setWindow(375, 667);
    await render(gridElement(viewWith({ players: 3 })));
    expect(screen.getByTestId(HORIZONTAL).props.horizontal).toBe(true);
    expect(screen.getByTestId(VERTICAL).props.horizontal).not.toBe(true);
  });
});

describe("match grid, sizes from the window", () => {
  it("RF-076 RF-081: 13 players with 8 periods on a 1024 × 768 tablet fit across and scroll vertically", async () => {
    await setWindow(1024, 768);
    await render(gridElement(viewWith({ players: 13, format: 8 }), ABOVE));
    expect(scrolls(HORIZONTAL)).toBe(false);
    expect(scrolls(VERTICAL)).toBe(true);
    expect(firstCellSize().height).toBe(44);
  });

  it("RF-076 RF-081: 13 players with 8 periods on a 375 × 667 phone scroll both ways, with cells of 44 pt", async () => {
    await setWindow(375, 667);
    await render(gridElement(viewWith({ players: 13, format: 8 }), ABOVE));
    expect(scrolls(HORIZONTAL)).toBe(true);
    expect(scrolls(VERTICAL)).toBe(true);
    expect(firstCellSize()).toEqual({ width: 44, height: 44 });
  });

  it("RF-076: one player with 4 periods on a 375 × 667 phone needs no scroll and keeps cells of at least 44 pt", async () => {
    await setWindow(375, 667);
    await render(gridElement(viewWith({ players: 1, format: 4 })));
    expect(scrolls(HORIZONTAL)).toBe(false);
    expect(scrolls(VERTICAL)).toBe(false);
    const { width, height } = firstCellSize();
    expect(width).toBeGreaterThanOrEqual(44);
    expect(width).toBeLessThanOrEqual(Math.floor(375 / 4));
    expect(height).toBeGreaterThanOrEqual(44);
    expect(height).toBeLessThanOrEqual(56);
  });

  it("RF-076: 6 periods and 3 overtimes on a 375 × 667 phone set the horizontal scroll with cells of 44 pt", async () => {
    await setWindow(375, 667);
    await render(gridElement(viewWith({ players: 5, overtimeCount: 3 })));
    expect(scrolls(HORIZONTAL)).toBe(true);
    expect(firstCellSize().width).toBe(44);
    expect(screen.getByText("PR3")).toBeOnTheScreen();
  });

  it("RF-076: the banners height that the screen passes takes rows space, so 10 players scroll with it and not without it", async () => {
    await setWindow(1024, 768);
    const { rerender } = await render(gridElement(viewWith({ players: 10 })));
    expect(scrolls(VERTICAL)).toBe(false);
    await rerender(
      gridElement(viewWith({ players: 10 }), { bannersHeight: 600 }),
    );
    expect(scrolls(VERTICAL)).toBe(true);
  });

  it("RF-076: the header row height measured with onLayout takes rows space too", async () => {
    await setWindow(1024, 768);
    await render(gridElement(viewWith({ players: 10 })));
    expect(scrolls(VERTICAL)).toBe(false);
    await measureHeaderRow(700);
    expect(scrolls(VERTICAL)).toBe(true);
  });
});

describe("match grid, rotation", () => {
  it("RF-076: rotating a phone from portrait to landscape recomputes the cell width, the row height and both scroll flags", async () => {
    await setWindow(375, 667);
    await render(gridElement(viewWith({ players: 10, format: 8 })));
    const portrait = firstCellSize();
    expect(portrait).toEqual({ width: 44, height: 56 });
    expect(scrolls(HORIZONTAL)).toBe(true);
    expect(scrolls(VERTICAL)).toBe(false);
    await setWindow(667, 375);
    const landscape = firstCellSize();
    expect(landscape.width).toBeGreaterThanOrEqual(44);
    expect(landscape.width).toBeLessThanOrEqual(Math.floor(667 / 8));
    expect(landscape.height).toBe(44);
    expect(scrolls(HORIZONTAL)).toBe(false);
    expect(scrolls(VERTICAL)).toBe(true);
  });

  it("RF-076 RF-077: rotating keeps the same rows and the player column outside the horizontal scroll", async () => {
    await setWindow(375, 667);
    await render(gridElement(viewWith({ players: 4 })));
    await setWindow(667, 375);
    expect(screen.getAllByRole("button")).toHaveLength(24);
    expect(screen.getByText("Jugador 4")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId(HORIZONTAL)).queryByText("Jugador 4"),
    ).toBeNull();
  });
});
