// D2 review F2: grid sizes from the MEASURED viewport. Expected new API of
// src/ui/grid/grid-layout.ts (contract in tests/support/grid-viewport.ts):
//   viewportLayout({ viewportWidth, viewportHeight, periods, overtimes, players,
//                    playerColumnWidth, headerRowHeight }) => { cellWidth, rowHeight,
//                    horizontalScroll, verticalScroll }   (no buttonsInHeader)
import { assert, integer, property } from "fast-check";
import { viewportLayout } from "@/ui/grid/grid-layout";
import { rowHeightFor } from "../../../tests/support/grid-viewport";

type Input = Parameters<typeof viewportLayout>[0];

const inputFor = (overrides: Partial<Input>): Input => ({
  viewportWidth: 1024,
  viewportHeight: 596,
  periods: 8,
  overtimes: 0,
  players: 12,
  playerColumnWidth: 100,
  headerRowHeight: 44,
  ...overrides,
});

describe("viewport layout, rows", () => {
  // [viewport height, players, row height, vertical scroll]; header row 44, so space = height - 44.
  it.each([
    [596, 12, 46, false],
    [572, 12, 44, false],
    [571, 12, 44, true],
    [400, 12, 44, true],
    [716, 12, 56, false],
    [900, 12, 56, false],
    [596, 13, 44, true],
    [700, 16, 44, true],
    [437, 8, 49.125, false],
    [437, 10, 44, true],
    [44, 3, 44, true],
    [10, 3, 44, true],
  ])(
    "RF-076 RF-081: a measured viewport of %s pt with %s players gives rows of %s pt and vertical scroll %s, never clipped rows without scroll",
    (viewportHeight, players, rowHeight, verticalScroll) => {
      const layout = viewportLayout(inputFor({ viewportHeight, players }));
      expect(layout.rowHeight).toBeCloseTo(rowHeight, 5);
      expect(layout.verticalScroll).toBe(verticalScroll);
    },
  );

  it("RF-076: with no players the rows stay at the maximum and nothing scrolls", () => {
    const layout = viewportLayout(
      inputFor({ players: 0, viewportHeight: 300 }),
    );
    expect(layout.rowHeight).toBe(56);
    expect(layout.verticalScroll).toBe(false);
  });

  it("RF-076: the result has the four sizes and no buttonsInHeader, which stays a window decision", () => {
    const layout = viewportLayout(inputFor({}));
    expect(Object.keys(layout).sort()).toEqual([
      "cellWidth",
      "horizontalScroll",
      "rowHeight",
      "verticalScroll",
    ]);
  });
});

describe("viewport layout, columns", () => {
  // [viewport width, periods, overtimes, cell width, horizontal scroll]
  const CASES: [number, number, number, number, boolean][] = [
    [1024, 8, 0, 115, false],
    [452, 8, 0, 44, false],
    [451, 8, 0, 44, true],
    [375, 8, 0, 44, true],
    [375, 4, 0, 68, false],
    [375, 6, 3, 44, true],
    [375, 0, 0, 44, false],
  ];
  it.each(CASES)(
    "RF-076: a measured viewport of %s pt wide with %s periods and %s overtimes gives cells of %s pt and horizontal scroll %s",
    (...row) => {
      const [viewportWidth, periods, overtimes, cellWidth, horizontal] = row;
      const layout = viewportLayout(
        inputFor({ viewportWidth, periods, overtimes }),
      );
      expect(layout.cellWidth).toBe(cellWidth);
      expect(layout.horizontalScroll).toBe(horizontal);
    },
  );
});

describe("viewport layout, properties", () => {
  it("RF-076 RF-081: whenever the rows do not fit the measured viewport the vertical scroll is enabled, and cells are never below 44 pt", () => {
    assert(
      property(
        integer({ min: 0, max: 1200 }),
        integer({ min: 1, max: 30 }),
        integer({ min: 0, max: 40 }),
        integer({ min: 100, max: 1400 }),
        (viewportHeight, players, headerRowHeight, viewportWidth) => {
          const space = viewportHeight - headerRowHeight;
          const layout = viewportLayout(
            inputFor({
              viewportHeight,
              players,
              headerRowHeight,
              viewportWidth,
            }),
          );
          expect(layout.rowHeight).toBe(rowHeightFor(space, players));
          expect(layout.verticalScroll).toBe(
            players * layout.rowHeight > space,
          );
          if (players * 44 > space) expect(layout.verticalScroll).toBe(true);
          expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
        },
      ),
    );
  });
});
