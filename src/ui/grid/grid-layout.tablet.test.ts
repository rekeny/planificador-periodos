// T053: grid layout on tablets, with the height budget of plan.md "Tablet height". Expected API of
// src/ui/grid/grid-layout.ts, which the Implementer writes (see grid-layout.phone.test.ts):
//   gridLayout(input: GridLayoutInput): GridLayout, and TABLET_MIN_SHORT_SIDE = 768
import { assert, integer, property } from "fast-check";
import {
  gridLayout,
  TABLET_MIN_SHORT_SIDE,
  type GridLayoutInput,
} from "@/ui/grid/grid-layout";

// Worst case, landscape (plan.md): chrome 24 + 50, banners 36 + 36, legend 48, header row 44 = 238.
const LANDSCAPE_WORST = {
  chromeHeight: 74,
  bannersHeight: 72,
  legendHeight: 48,
  headerRowHeight: 44,
} as const;

// Portrait: the banners may wrap to two lines, about 300 pt in total (74 + 144 + 48 + 44 = 310).
const PORTRAIT_WORST = { ...LANDSCAPE_WORST, bannersHeight: 144 } as const;

function inputFor(overrides: Partial<GridLayoutInput>): GridLayoutInput {
  return {
    windowWidth: 1024,
    windowHeight: 768,
    periods: 8,
    overtimes: 0,
    players: 12,
    playerColumnWidth: 100,
    ...LANDSCAPE_WORST,
    ...overrides,
  };
}

const landscape = (overrides: Partial<GridLayoutInput>): GridLayoutInput =>
  inputFor({ windowWidth: 1024, windowHeight: 768, ...overrides });
const portrait = (overrides: Partial<GridLayoutInput>): GridLayoutInput =>
  inputFor({
    windowWidth: 768,
    windowHeight: 1024,
    ...PORTRAIT_WORST,
    ...overrides,
  });

describe("grid layout on a tablet", () => {
  it.each([
    [768, 1024, true],
    [1024, 768, true],
    [768, 900, true],
    [900, 768, true],
    [767, 900, false],
    [900, 767, false],
    [768, 768, true],
    [767, 767, false],
  ])(
    "RF-076: the grid buttons go in the header when the shortest side is at least 768 pt (767 is a phone, 768 a tablet), in both orientations",
    (windowWidth, windowHeight, inHeader) => {
      const layout = gridLayout(inputFor({ windowWidth, windowHeight }));
      expect(layout.buttonsInHeader).toBe(inHeader);
    },
  );

  it("RF-076: the tablet threshold is 768 points", () => {
    expect(TABLET_MIN_SHORT_SIDE).toBe(768);
  });

  it.each([
    [1024, 768],
    [768, 1024],
  ])(
    "RF-079 RF-080 RF-081: 8 periods fit across on a tablet in both orientations with cells of at least 44 pt",
    (windowWidth, windowHeight) => {
      const layout = gridLayout(
        inputFor({ windowWidth, windowHeight, ...PORTRAIT_WORST }),
      );
      expect(layout.horizontalScroll).toBe(false);
      expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
    },
  );

  it("RF-081: 12 rows fit in 1024 x 768 with every banner and the legend (530 pt for 12 x 44 = 528 pt), with no vertical scroll", () => {
    const layout = gridLayout(landscape({ players: 12 }));
    expect(layout.verticalScroll).toBe(false);
    expect(layout.rowHeight).toBeGreaterThanOrEqual(44);
    expect(layout.rowHeight).toBeLessThan(45);
  });

  it("RF-081: 12 rows fit in 768 x 1024 with the banners wrapped to two lines, with no vertical scroll", () => {
    const layout = gridLayout(portrait({ players: 12 }));
    expect(layout.verticalScroll).toBe(false);
    expect(layout.rowHeight).toBeGreaterThanOrEqual(44);
    expect(layout.rowHeight).toBeLessThanOrEqual(56);
  });

  it("RF-081: with 4 players the row height is capped at 56 pt, in both orientations", () => {
    expect(gridLayout(landscape({ players: 4 })).rowHeight).toBe(56);
    expect(gridLayout(portrait({ players: 4 })).rowHeight).toBe(56);
  });

  it("RF-081: 13 players in 1024 x 768 keep 8 periods across and set vertical scroll (13 x 44 = 572 > 530 pt)", () => {
    const layout = gridLayout(landscape({ players: 13 }));
    expect(layout.horizontalScroll).toBe(false);
    expect(layout.verticalScroll).toBe(true);
    expect(layout.rowHeight).toBe(44);
  });

  it("RF-081: 13 players in 768 x 1024 keep 8 periods across and need no vertical scroll", () => {
    const layout = gridLayout(portrait({ players: 13 }));
    expect(layout.horizontalScroll).toBe(false);
    expect(layout.verticalScroll).toBe(false);
  });

  it.each([
    [15, false],
    [16, false],
    [17, true],
  ])(
    "RF-081: in 768 x 1024 with the worst-case banners (714 pt for the rows) vertical scroll starts above 16 players",
    (players, scrolls) => {
      expect(gridLayout(portrait({ players })).verticalScroll).toBe(scrolls);
    },
  );

  it("RF-081: 0 players on a tablet give no vertical scroll", () => {
    expect(gridLayout(landscape({ players: 0 })).verticalScroll).toBe(false);
    expect(gridLayout(portrait({ players: 0 })).verticalScroll).toBe(false);
  });

  it("RF-081: banner and legend heights of 0 give each of 12 rows 54 pt or more, capped at 56 pt", () => {
    const layout = gridLayout(
      landscape({ bannersHeight: 0, legendHeight: 0, headerRowHeight: 0 }),
    );
    expect(layout.rowHeight).toBeGreaterThanOrEqual(54);
    expect(layout.rowHeight).toBeLessThanOrEqual(56);
  });

  it("RF-078: 3 overtimes on a tablet whose width leaves less than 44 pt per column set horizontal scroll with cells of 44 pt", () => {
    // 768 x 1024, player column 290 pt: (768 - 290) / 11 columns = 43 pt.
    const layout = gridLayout(
      portrait({
        windowWidth: 768,
        windowHeight: 1024,
        overtimes: 3,
        playerColumnWidth: 290,
      }),
    );
    expect(layout.buttonsInHeader).toBe(true);
    expect(layout.horizontalScroll).toBe(true);
    expect(layout.cellWidth).toBe(44);
  });

  it.each([
    [0, 8],
    [3, 8],
    [5, 8],
  ])(
    "RF-078 RF-081: at 768 pt with a 100 pt player column, 8 periods and 0, 3 or 5 overtimes (13 columns at most) still fit with no horizontal scroll",
    (overtimes) => {
      const layout = gridLayout(portrait({ overtimes }));
      expect(layout.horizontalScroll).toBe(false);
      expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
    },
  );

  it("RF-076: rotating 768 x 1024 to 1024 x 768 and back gives the first result again, and the answer on the buttons never changes", () => {
    const first = gridLayout(portrait({ players: 13 }));
    const rotated = gridLayout(landscape({ players: 13 }));
    expect(rotated.verticalScroll).not.toBe(first.verticalScroll);
    expect(rotated.buttonsInHeader).toBe(first.buttonsInHeader);
    expect(gridLayout(portrait({ players: 13 }))).toEqual(first);
  });

  it("RF-076: for any window, rotating it never changes whether the buttons go in the header, and rotating twice gives the same result", () => {
    assert(
      property(
        integer({ min: 320, max: 2000 }),
        integer({ min: 320, max: 2000 }),
        (width, height) => {
          const upright = gridLayout(
            inputFor({ windowWidth: width, windowHeight: height }),
          );
          const turned = gridLayout(
            inputFor({ windowWidth: height, windowHeight: width }),
          );
          const back = gridLayout(
            inputFor({ windowWidth: width, windowHeight: height }),
          );
          expect(turned.buttonsInHeader).toBe(upright.buttonsInHeader);
          expect(back).toEqual(upright);
        },
      ),
    );
  });
});
