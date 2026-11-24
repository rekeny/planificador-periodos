// D2 review F2: the assembled grid sizes itself from the viewport its container measured, not from
// the window (contract in tests/support/grid-viewport.ts: testID "grid-viewport" with `onLayout`).
import "@/i18n";
import { render } from "@testing-library/react-native";
import { assert, asyncProperty, integer } from "fast-check";

import { MatchGrid } from "@/ui/grid/match-grid";
import {
  HORIZONTAL,
  measureHeaderRow,
  scrolls,
  VERTICAL,
} from "../../../tests/support/match-grid-reading";
import {
  cellSize,
  HEADER_ROW_HEIGHT,
  measureViewport,
  rowHeightFor,
} from "../../../tests/support/grid-viewport";
import { gridWith, viewOf } from "../../../tests/support/match-view-grid";
import { restoreWindow, setWindow } from "../../../tests/support/window-size";

const gridOf = (players: number, format: 4 | 6 | 8 = 8) => (
  <MatchGrid
    view={viewOf(gridWith({ players, format }))}
    onTapCell={jest.fn()}
    onLongPressCell={jest.fn()}
  />
);

afterEach(async () => restoreWindow());

describe("match grid, sizes from the measured viewport", () => {
  it.each([
    [596, 12, 46, false],
    [572, 12, 44, false],
    [571, 12, 44, true],
    [400, 12, 44, true],
    [700, 16, 44, true],
    [437, 8, 49.125, false],
  ])(
    "RF-076 RF-081: on a 1024 × 768 window a measured viewport of %s pt with %s players gives rows of %s pt and vertical scroll %s",
    async (height, players, rowHeight, vertical) => {
      await setWindow(1024, 768);
      await render(gridOf(players));
      await measureHeaderRow(HEADER_ROW_HEIGHT);
      await measureViewport(1024, height);
      expect(cellSize().height).toBeCloseTo(rowHeight, 5);
      expect(scrolls(VERTICAL)).toBe(vertical);
    },
  );

  it("RF-076: the viewport width, not the window width, decides the horizontal scroll", async () => {
    await setWindow(1024, 768);
    await render(gridOf(3));
    await measureViewport(452, 600);
    expect(scrolls(HORIZONTAL)).toBe(false);
    await measureViewport(451, 600);
    expect(scrolls(HORIZONTAL)).toBe(true);
    expect(cellSize().width).toBe(44);
  });

  it("RF-076: measuring the viewport again updates the sizes, as when the banners or the legend appear and go", async () => {
    await setWindow(1024, 768);
    await render(gridOf(12));
    await measureHeaderRow(HEADER_ROW_HEIGHT);
    await measureViewport(1024, 596);
    expect(scrolls(VERTICAL)).toBe(false);
    await measureViewport(1024, 560);
    expect(scrolls(VERTICAL)).toBe(true);
    expect(cellSize().height).toBe(44);
    await measureViewport(1024, 596);
    expect(scrolls(VERTICAL)).toBe(false);
    expect(cellSize().height).toBe(46);
  });
});

describe("match grid, the rows are never clipped", () => {
  it("RF-076 RF-081: for any measured viewport, if the rows do not fit the vertical scroll is enabled", async () => {
    await setWindow(1024, 768);
    await assert(
      asyncProperty(
        integer({ min: 1, max: 24 }),
        integer({ min: 100, max: 1000 }),
        async (players, height) => {
          const { unmount } = await render(gridOf(players));
          await measureHeaderRow(HEADER_ROW_HEIGHT);
          await measureViewport(1024, height);
          const space = height - HEADER_ROW_HEIGHT;
          const rowHeight = cellSize().height;
          expect(rowHeight).toBe(rowHeightFor(space, players));
          expect(scrolls(VERTICAL)).toBe(players * rowHeight > space);
          await unmount();
        },
      ),
      { numRuns: 25 },
    );
  });
});
