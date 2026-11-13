// Helpers of the warning part of the match view tests (T058). This file holds no test calls. It
// builds grids by hand and the view through the real buildMatchView (via viewOf of
// match-view-grid.ts, with evaluateWarnings of the real domain), which the Implementer extends with
// the fields of plan.md "State": `ColumnView.headerMark: PeriodWarning | null`,
// `CellView.isLightRed: boolean`, `RowView.isInRed: boolean`, `MatchView.ruleImpossible: boolean`
// and `MatchView.legend: readonly LegendItem[]`. It adds to match-view-grid.ts without changing it.
import type { ColumnKey } from "@/domain/column";
import type { Mark, MatchGrid } from "@/domain/grid";
import type { LegendItem } from "@/domain/legend";
import type { PeriodWarning } from "@/domain/period-warnings";
import type { MatchView } from "@/state/match-view";
import { entriesOf, gridWith, viewOf } from "./match-view-grid";

export type Marks = MatchGrid["marks"];
export type HeaderMarks = Partial<Record<ColumnKey, PeriodWarning>>;

/** The first entry of `entriesOf`: Juan in E-001, E-002, E-003, E-008, E-009 and E-010. */
export const JUAN = 100;

/** The same mark for one entry in each of the given columns, such as `["P1", "P2"]`. */
export function marksIn(
  entryId: number,
  columns: readonly ColumnKey[],
  mark: Mark = "starter",
): Marks {
  return Object.fromEntries(
    columns.map((key) => [`${entryId}:${key}`, mark]),
  ) as Marks;
}

/** The entry ids of `count` players of `entriesOf`, from the one at position `from` (0 = Juan). */
export function poolOf(count: number, from = 0): number[] {
  return entriesOf(from + count)
    .slice(from)
    .map((entry) => entry.id);
}

/**
 * Gives `counts[n]` X to period n + 1, taking players from `pool` one after the other and starting
 * over at the end. With a pool of at least 5 ids no player is taken twice in the same period.
 */
export function fillPeriods(
  counts: readonly number[],
  pool: readonly number[],
): Marks {
  const marks: Record<string, Mark> = {};
  let next = 0;
  counts.forEach((count, period) => {
    for (let taken = 0; taken < count; taken += 1) {
      marks[`${pool[next % pool.length]}:P${period + 1}`] = "starter";
      next += 1;
    }
  });
  return marks as Marks;
}

/**
 * E-005 with `p5Count` = 3 (12 players, no subs, P1-P4 with 5 X, Pedro (100) only in P1, each of the
 * other 11 with exactly 2 X in P1-P5, P6 empty), and E-004's complete window with 5. The first 19
 * places go round the 11 others, so the last three (positions 8, 9 and 10) fill P5; two more X in P5
 * go to the first two others, who are not in P5 yet.
 */
export function pedroGrid(p5Count: number): MatchGrid {
  const others = poolOf(11, 1);
  const p5Pool = [...others.slice(8), ...others.slice(0, 2)];
  const marks = {
    "100:P1": "starter",
    ...fillPeriods([4, 5, 5, 5], others),
    ...fillPeriods([0, 0, 0, 0, p5Count], p5Pool),
  } as Marks;
  return gridWith({ players: 12, format: 6, marks });
}

/**
 * 8 periods, 12 players, P1-P6 with 5 X each (six players with 3 X, six with 2) and everything else
 * empty. The rule window is complete and met by everyone, so no light red cell, no player in red and
 * no period mark. (With 6 periods, 25 X cannot be spread so that nobody has 3: a light red cell
 * would always appear, so the "no warning" grid has to be an 8-period one.)
 */
export function calmGrid(extra: Marks = {}, overtimeCount = 0): MatchGrid {
  const marks = { ...fillPeriods([5, 5, 5, 5, 5, 5], poolOf(12)), ...extra };
  return gridWith({ players: 12, format: 8, overtimeCount, marks });
}

export interface WarningReading {
  readonly lightRed: readonly string[]; // keys of the cells with isLightRed, sorted
  readonly inRed: readonly number[]; // entry ids of the rows with isInRed, sorted
  readonly headerMarks: HeaderMarks; // only the columns that have a mark
  readonly ruleImpossible: boolean;
  readonly legend: readonly LegendItem[];
}

/** What a view with nothing to warn about reads as (RF-061, RF-087). */
export const NOTHING: WarningReading = {
  lightRed: [],
  inRed: [],
  headerMarks: {},
  ruleImpossible: false,
  legend: [],
};

/** Every colour, mark and general warning of a view, as plain data to compare. */
export function readWarnings(view: MatchView): WarningReading {
  const headerMarks: HeaderMarks = {};
  for (const { key, headerMark } of view.columns) {
    if (headerMark !== null) headerMarks[key] = headerMark;
  }
  return {
    lightRed: view.rows
      .flatMap((row) => row.cells)
      .filter((cell) => cell.isLightRed)
      .map((cell) => cell.key)
      .sort(),
    inRed: view.rows
      .filter((row) => row.isInRed)
      .map((row) => row.entryId)
      .sort((a, b) => a - b),
    headerMarks,
    ruleImpossible: view.ruleImpossible,
    legend: view.legend,
  };
}

/** The reading of the view that `buildMatchView` makes of a grid. */
export function warningsOf(grid: MatchGrid): WarningReading {
  return readWarnings(viewOf(grid));
}

/** The marks of P1..P`last` as `"incomplete"`, then the overrides (such as P3 → "inconsistent"). */
export function incompleteUpTo(
  last: number,
  overrides: HeaderMarks = {},
): HeaderMarks {
  const marks: HeaderMarks = {};
  for (let period = 1; period <= last; period += 1) {
    marks[`P${period}`] = "incomplete";
  }
  return { ...marks, ...overrides };
}
