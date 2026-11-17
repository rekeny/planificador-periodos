// D2 review (Codex re-run, "the tablet's 12-row guarantee remains broken"): RF-081 must hold BY
// CONSTRUCTION. CONTRACT the Implementer must meet (src/ui/grid/tablet-budget.ts, pure, no React):
//   - TABLET_CHROME_HEIGHT = 74: status bar (24) + navigation header (50) of the plan's table.
//   - TABLET_STRIP_MAX_HEIGHT: the maximum height of the single strip above the grid (banners and
//     legend), a number of points, at least 36 (one chip line) and at most 122.
//   - tabletGridViewportHeight(windowHeight) = windowHeight - TABLET_CHROME_HEIGHT -
//     TABLET_STRIP_MAX_HEIGHT: the least height the grid container has on a tablet.
import { viewportLayout } from "./grid-layout";
import {
  TABLET_CHROME_HEIGHT,
  TABLET_STRIP_MAX_HEIGHT,
  tabletGridViewportHeight,
} from "./tablet-budget";

const HEADER_ROW = 44;
const ROW = 44;
const PLAYER_COLUMN = 100;
// The most the strip may take on 1024 × 768: 768 - 74 - strip - 44 >= 12 * 44.
const MOST_STRIP = 768 - 74 - HEADER_ROW - 12 * ROW;

function layoutAt(width: number, height: number, players: number) {
  return viewportLayout({
    viewportWidth: width,
    viewportHeight: tabletGridViewportHeight(height),
    periods: 8,
    overtimes: 3,
    players,
    playerColumnWidth: PLAYER_COLUMN,
    headerRowHeight: HEADER_ROW,
  });
}

describe("tablet height budget", () => {
  it("RF-081: the chrome is the plan's 24 pt status bar and 50 pt header", () => {
    expect(TABLET_CHROME_HEIGHT).toBe(74);
  });

  it("RF-081: the strip above the grid is bounded: from one line of chips up to what leaves 12 rows on a 1024 × 768 tablet", () => {
    expect(TABLET_STRIP_MAX_HEIGHT).toBeGreaterThanOrEqual(36);
    expect(TABLET_STRIP_MAX_HEIGHT).toBeLessThanOrEqual(MOST_STRIP);
  });

  it.each([768, 1024])(
    "RF-081: the viewport the tablet guarantees at window height %s is the window minus the chrome and the strip",
    (height) => {
      expect(tabletGridViewportHeight(height)).toBe(
        height - TABLET_CHROME_HEIGHT - TABLET_STRIP_MAX_HEIGHT,
      );
    },
  );

  it.each([
    [1024, 768],
    [768, 1024],
  ])(
    "RF-081 RF-076: at %s × %s with the worst-case strip, 12 players fit with rows of at least 44 pt and no vertical or horizontal scroll",
    (width, height) => {
      const layout = layoutAt(width, height, 12);
      expect(layout.verticalScroll).toBe(false);
      expect(layout.rowHeight).toBeGreaterThanOrEqual(ROW);
      expect(layout.horizontalScroll).toBe(false);
    },
  );

  it.each([
    [1024, 768, true],
    [768, 1024, false],
  ])(
    "RF-081: at %s × %s with the worst-case strip, 13 players scroll vertically: %s",
    (width, height, scrolls) => {
      expect(layoutAt(width, height, 13).verticalScroll).toBe(scrolls);
    },
  );
});
