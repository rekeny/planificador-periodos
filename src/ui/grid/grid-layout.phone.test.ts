// T053: grid layout on phones, as pure size functions. Expected API of src/ui/grid/grid-layout.ts,
// which the Implementer writes (names follow plan.md "Grid layout rules"; the plan gives no
// signature, so this one is assumed):
//   gridLayout(input: GridLayoutInput): GridLayout
//   GridLayoutInput = { windowWidth, windowHeight, periods, overtimes, players, playerColumnWidth,
//                       chromeHeight (status bar + navigation header), bannersHeight, legendHeight,
//                       headerRowHeight }, all numbers in points
//   GridLayout = { cellWidth, rowHeight, horizontalScroll, verticalScroll, buttonsInHeader }
import { assert, constantFrom, integer, property, record } from "fast-check";
import {
  buttonsInHeader,
  gridLayout,
  TABLET_MIN_SHORT_SIDE,
  type GridLayoutInput,
} from "@/ui/grid/grid-layout";

// Worst case of plan.md, landscape: 24 + 50 chrome, two banners of 36, legend 48, header row 44.
function inputFor(overrides: Partial<GridLayoutInput>): GridLayoutInput {
  return {
    windowWidth: 375,
    windowHeight: 667,
    periods: 6,
    overtimes: 0,
    players: 10,
    playerColumnWidth: 100,
    chromeHeight: 74,
    bannersHeight: 72,
    legendHeight: 48,
    headerRowHeight: 44,
    ...overrides,
  };
}

// Window height at which the rows space is exactly `space`, with the default 238 pt above the rows.
const heightForRowsSpace = (space: number): number => space + 238;

describe("grid layout on a phone", () => {
  it("RF-079: 6 periods at 375 pt fit across with no horizontal scroll and a cell of at least 44 pt", () => {
    const layout = gridLayout(inputFor({ windowWidth: 375, periods: 6 }));
    expect(layout.horizontalScroll).toBe(false);
    expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
  });

  it.each([[4], [6]])(
    "RF-078 RF-079: 4 and 6 periods fit at 375 pt, with the cell width at (375 - 100) / periods rounded down",
    (periods) => {
      const layout = gridLayout(inputFor({ windowWidth: 375, periods }));
      expect(layout.horizontalScroll).toBe(false);
      expect(layout.cellWidth).toBe(Math.floor(275 / periods));
    },
  );

  it("RF-078 RF-079: 8 periods at 375 pt scroll horizontally with cells of 44 pt", () => {
    const layout = gridLayout(inputFor({ windowWidth: 375, periods: 8 }));
    expect(layout.horizontalScroll).toBe(true);
    expect(layout.cellWidth).toBe(44);
  });

  it("RF-078: when the width leaves exactly 44 pt per cell there is no horizontal scroll", () => {
    const layout = gridLayout(inputFor({ windowWidth: 100 + 6 * 44 }));
    expect(layout.cellWidth).toBe(44);
    expect(layout.horizontalScroll).toBe(false);
  });

  it("RF-078: one point narrower than that, the cells stay at 44 pt and the grid scrolls horizontally", () => {
    const layout = gridLayout(inputFor({ windowWidth: 100 + 6 * 44 - 1 }));
    expect(layout.cellWidth).toBe(44);
    expect(layout.horizontalScroll).toBe(true);
  });

  it("RF-078 RF-079: a 320 pt window with 6 periods scrolls horizontally and the cells are still 44 pt", () => {
    const layout = gridLayout(inputFor({ windowWidth: 320, periods: 6 }));
    expect(layout.cellWidth).toBe(44);
    expect(layout.horizontalScroll).toBe(true);
  });

  it("RF-080: 8 periods in landscape (667 x 375) fit across with no horizontal scroll", () => {
    const layout = gridLayout(
      inputFor({ windowWidth: 667, windowHeight: 375, periods: 8 }),
    );
    expect(layout.horizontalScroll).toBe(false);
    expect(layout.cellWidth).toBe(Math.floor(567 / 8));
  });

  it.each([
    [6, 0, 375, false],
    [6, 3, 375, true],
    [8, 3, 667, false],
    [8, 4, 667, false],
    [8, 5, 667, true],
    [4, 2, 375, false],
    [4, 3, 375, true],
  ])(
    "RF-078 RF-080: with 0 to 5 overtimes the columns are periods + overtimes, and the grid scrolls only when they do not fit at 44 pt",
    (periods, overtimes, windowWidth, scrolls) => {
      const layout = gridLayout(inputFor({ windowWidth, periods, overtimes }));
      expect(layout.horizontalScroll).toBe(scrolls);
      expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
    },
  );

  it("RF-080: 15 players on a phone in landscape set vertical scroll with rows of 44 pt", () => {
    const layout = gridLayout(
      inputFor({ windowWidth: 667, windowHeight: 375, players: 15 }),
    );
    expect(layout.verticalScroll).toBe(true);
    expect(layout.rowHeight).toBe(44);
  });

  it("RF-080: 12 players that do not fit in 667 x 375 scroll vertically while every period still fits across", () => {
    const layout = gridLayout(
      inputFor({
        windowWidth: 667,
        windowHeight: 375,
        periods: 8,
        players: 12,
      }),
    );
    expect(layout.verticalScroll).toBe(true);
    expect(layout.horizontalScroll).toBe(false);
  });

  it("RF-081: 0 players give no vertical scroll and a finite row height between 44 and 56 pt", () => {
    const layout = gridLayout(inputFor({ players: 0 }));
    expect(layout.verticalScroll).toBe(false);
    expect(Number.isFinite(layout.rowHeight)).toBe(true);
    expect(layout.rowHeight).toBeGreaterThanOrEqual(44);
    expect(layout.rowHeight).toBeLessThanOrEqual(56);
  });

  it("RF-078: the row height is capped at 56 pt when the rows space allows exactly 56 pt per row", () => {
    const layout = gridLayout(
      inputFor({ players: 5, windowHeight: heightForRowsSpace(5 * 56) }),
    );
    expect(layout.rowHeight).toBe(56);
    expect(layout.verticalScroll).toBe(false);
  });

  it("RF-078: with more space than 56 pt per row the row height stays at 56 pt", () => {
    const layout = gridLayout(inputFor({ players: 3, windowHeight: 667 }));
    expect(layout.rowHeight).toBe(56);
    expect(layout.verticalScroll).toBe(false);
  });

  it("RF-078: when the rows space is exactly 44 pt per row the rows are 44 pt and there is no vertical scroll", () => {
    const layout = gridLayout(
      inputFor({ players: 5, windowHeight: heightForRowsSpace(5 * 44) }),
    );
    expect(layout.rowHeight).toBe(44);
    expect(layout.verticalScroll).toBe(false);
  });

  it("RF-078: one point less than that the rows stay at 44 pt and the grid scrolls vertically", () => {
    const layout = gridLayout(
      inputFor({ players: 5, windowHeight: heightForRowsSpace(5 * 44) - 1 }),
    );
    expect(layout.rowHeight).toBe(44);
    expect(layout.verticalScroll).toBe(true);
  });

  it("RF-078: banner and legend heights of 0 leave the whole window below the chrome for the rows", () => {
    const layout = gridLayout(
      inputFor({
        players: 12,
        windowHeight: 74 + 12 * 56,
        bannersHeight: 0,
        legendHeight: 0,
        headerRowHeight: 0,
      }),
    );
    expect(layout.rowHeight).toBe(56);
    expect(layout.verticalScroll).toBe(false);
  });

  it.each([
    [375, 667],
    [320, 568],
    [767, 900],
    [700, 700],
  ])(
    "RF-076: on a phone window in portrait or square (shortest side under 768 pt, width not above height) the grid buttons go in the toolbar under the grid",
    (windowWidth, windowHeight) => {
      const layout = gridLayout(inputFor({ windowWidth, windowHeight }));
      expect(layout.buttonsInHeader).toBe(false);
    },
  );

  it.each([
    [667, 375],
    [568, 320],
    [900, 767],
    [1024, 600],
  ])(
    "RF-076: on a phone window in landscape (width above height, shortest side under 768 pt) the grid buttons go in the header",
    (windowWidth, windowHeight) => {
      const layout = gridLayout(inputFor({ windowWidth, windowHeight }));
      expect(layout.buttonsInHeader).toBe(true);
    },
  );

  it.each([
    [375, 667, false],
    [667, 375, true],
    [767, 768, false],
    [768, 767, true],
    [768, 768, true],
    [1024, 768, true],
    [768, 1024, true],
  ])(
    "RF-076: buttonsInHeader(%s, %s) is %s: header on tablets and on phones in landscape, toolbar on phones in portrait",
    (windowWidth, windowHeight, expected) => {
      expect(buttonsInHeader(windowWidth, windowHeight)).toBe(expected);
    },
  );

  it("RF-076: rotating 375 x 667 to 667 x 375 and back gives the first result again", () => {
    const portrait = inputFor({ windowWidth: 375, windowHeight: 667 });
    const landscape = inputFor({ windowWidth: 667, windowHeight: 375 });
    const first = gridLayout(portrait);
    expect(gridLayout(landscape)).not.toEqual(first);
    expect(gridLayout(portrait)).toEqual(first);
  });

  it("RF-076 RF-078: the tablet threshold is 768 points", () => {
    expect(TABLET_MIN_SHORT_SIDE).toBe(768);
  });

  it("RF-078 RF-081: for any width from 320, any height, 4, 6 or 8 periods, 0 to 5 overtimes and 0 to 20 players, cells and rows are never below 44 pt, rows never above 56 pt, and no horizontal scroll means everything fits", () => {
    assert(
      property(
        record({
          windowWidth: integer({ min: 320, max: 2000 }),
          windowHeight: integer({ min: 200, max: 2000 }),
          periods: constantFrom(4, 6, 8),
          overtimes: integer({ min: 0, max: 5 }),
          players: integer({ min: 0, max: 20 }),
        }),
        (generated) => {
          const { windowWidth, windowHeight, periods, overtimes, players } =
            generated;
          const input = inputFor(generated);
          const layout = gridLayout(input);
          const columns = periods + overtimes;
          expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
          expect(layout.rowHeight).toBeGreaterThanOrEqual(44);
          expect(layout.rowHeight).toBeLessThanOrEqual(56);
          if (!layout.horizontalScroll) {
            expect(100 + layout.cellWidth * columns).toBeLessThanOrEqual(
              windowWidth,
            );
          }
          const rowsSpace = windowHeight - 238;
          if (!layout.verticalScroll) {
            expect(players * layout.rowHeight).toBeLessThanOrEqual(
              Math.max(rowsSpace, 0) + 1e-9,
            );
          }
          expect(layout.buttonsInHeader).toBe(
            Math.min(windowWidth, windowHeight) >= TABLET_MIN_SHORT_SIDE ||
              windowWidth > windowHeight,
          );
        },
      ),
    );
  });
});
