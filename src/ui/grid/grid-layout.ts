// Pure size rules of the grid (RF-076 to RF-081). No React and no react-native: the screen passes
// the window size and the heights it measured, and gets back sizes and scroll flags.

/**
 * A window is a tablet when its shortest side reaches this many points (the same in both orientations).
 * 768 is where 12 rows of 44 fit: 768 - 74 chrome - 80 strip - 44 header = 570 >= 528. Windows of
 * 600 to 767 use the phone layout.
 */
export const TABLET_MIN_SHORT_SIDE = 768;

const MIN_CELL_WIDTH = 44;
const MIN_ROW_HEIGHT = 44;
const MAX_ROW_HEIGHT = 56;

export type GridLayoutInput = {
  windowWidth: number;
  windowHeight: number;
  periods: number;
  overtimes: number;
  players: number;
  playerColumnWidth: number;
  // Status bar plus navigation header.
  chromeHeight: number;
  bannersHeight: number;
  legendHeight: number;
  headerRowHeight: number;
};

export type GridLayout = {
  cellWidth: number;
  rowHeight: number;
  horizontalScroll: boolean;
  verticalScroll: boolean;
  buttonsInHeader: boolean;
};

/** Tablets (shortest side from 768) keep the buttons in the header; phones use a toolbar. */
export function buttonsInHeader(
  windowWidth: number,
  windowHeight: number,
): boolean {
  return Math.min(windowWidth, windowHeight) >= TABLET_MIN_SHORT_SIDE;
}

export function gridLayout(input: GridLayoutInput): GridLayout {
  const columns = input.periods + input.overtimes;
  const columnsSpace = input.windowWidth - input.playerColumnWidth;
  // Without columns there is nothing to divide: the cell keeps its minimum.
  const fittingWidth =
    columns > 0 ? Math.floor(columnsSpace / columns) : MIN_CELL_WIDTH;

  const rowsSpace =
    input.windowHeight -
    input.chromeHeight -
    input.bannersHeight -
    input.legendHeight -
    input.headerRowHeight;
  // With no players the rows space is not divided (it would be infinite): rows stay at the maximum.
  const spacePerRow =
    input.players > 0 ? rowsSpace / input.players : MAX_ROW_HEIGHT;
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    Math.min(MAX_ROW_HEIGHT, spacePerRow),
  );

  return {
    cellWidth: Math.max(MIN_CELL_WIDTH, fittingWidth),
    rowHeight,
    horizontalScroll: fittingWidth < MIN_CELL_WIDTH,
    verticalScroll: input.players * rowHeight > rowsSpace,
    buttonsInHeader: buttonsInHeader(input.windowWidth, input.windowHeight),
  };
}

export type ViewportLayoutInput = {
  viewportWidth: number;
  viewportHeight: number;
  periods: number;
  overtimes: number;
  players: number;
  playerColumnWidth: number;
  headerRowHeight: number;
};

export type ViewportLayout = Omit<GridLayout, "buttonsInHeader">;

/**
 * Same size rules as gridLayout, over the space the grid container really measured instead of the
 * window minus guessed chrome: rows are never clipped with scrolling disabled.
 */
export function viewportLayout(input: ViewportLayoutInput): ViewportLayout {
  const columns = input.periods + input.overtimes;
  const fittingWidth =
    columns > 0
      ? Math.floor((input.viewportWidth - input.playerColumnWidth) / columns)
      : MIN_CELL_WIDTH;
  const rowsSpace = input.viewportHeight - input.headerRowHeight;
  const rowHeight =
    input.players > 0
      ? Math.max(
          MIN_ROW_HEIGHT,
          Math.min(MAX_ROW_HEIGHT, rowsSpace / input.players),
        )
      : MAX_ROW_HEIGHT;
  return {
    cellWidth: Math.max(MIN_CELL_WIDTH, fittingWidth),
    rowHeight,
    horizontalScroll: fittingWidth < MIN_CELL_WIDTH,
    verticalScroll: input.players * rowHeight > rowsSpace,
  };
}
