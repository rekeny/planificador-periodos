// The oracle of "rule impossible to meet" (RF-067): brute force over every filling of the rule window, and the
// two generators of realistic grids that the oracle test feeds it (T022). The brute force reads the minimums
// from the table written out from the spec (RULES in grid-reference.ts: RF-002 to RF-004), never from
// FORMAT_RULES, and never calls any rule code of src/domain/. It only reads the marks of the grid.
import {
  array,
  constantFrom,
  integer,
  tuple,
  type Arbitrary,
} from "fast-check";
import type { Format } from "@/domain/format";
import {
  cellKey,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { callUpOf } from "./grid-arbitraries";
import { RULES } from "./grid-reference";

const X_PER_PERIOD = 5; // RF-055
export const MAX_ORACLE_PLAYERS = 13; // the largest call-up of the oracle (RF-010, E-030)
export const MAX_MISSING_X = 4; // X missing in the window, so that brute force stays cheap
// Brute force refuses a grid with more fillings than this, instead of hanging.
export const MAX_FILLINGS = 100_000;

const FORMATS: readonly Format[] = [4, 6, 8];

// ---- Brute force ----

function periodKeys(grid: MatchGrid, period: number): string[] {
  return grid.callUp.map((entry) =>
    cellKey({ entryId: entry.id, column: { kind: "period", number: period } }),
  );
}

// One window period of the grid, as the oracle sees it: which rows are empty, and how many X it still needs.
interface WindowPeriod {
  readonly keys: readonly string[]; // one cell key per row
  readonly empty: readonly number[]; // rows whose cell is empty (not X, not circled X)
  readonly missing: number; // X needed to reach exactly 5; negative when the period is already above
}

function windowOf(grid: MatchGrid): WindowPeriod[] {
  return Array.from({ length: RULES[grid.format].window }, (_, index) => {
    const keys = periodKeys(grid, index + 1);
    const state = keys.map((key) => grid.marks[key as CellKey]);
    const starters = state.filter((mark) => mark === "starter").length;
    const empty = state.flatMap((mark, row) =>
      mark === undefined ? [row] : [],
    );
    return { keys, empty, missing: X_PER_PERIOD - starters };
  });
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return result;
}

// How many fillings the window has: every way to put the missing X of each period in its empty cells.
export function countFillings(grid: MatchGrid): number {
  return windowOf(grid).reduce(
    (total, period) => total * choose(period.empty.length, period.missing),
    1,
  );
}

// Calls `visit` with each filling, as the list of cell keys that receive an X. A filling only uses empty cells
// (never a circled X, never an existing X) and gives every window period exactly 5 X. Stops when `visit`
// returns true. Returns whether it stopped.
export function someFilling(
  grid: MatchGrid,
  visit: (added: readonly string[]) => boolean,
): boolean {
  if (countFillings(grid) > MAX_FILLINGS) {
    throw new Error("The oracle refuses a grid with too many fillings");
  }
  const window = windowOf(grid);
  const added: string[] = [];

  const fillPeriod = (index: number): boolean => {
    const period = window[index];
    if (period === undefined) return visit(added);
    if (period.missing < 0) return false;
    return pick(index, period, 0, period.missing);
  };

  // Chooses `left` more rows of the period among empty[from..], in increasing order.
  const pick = (
    index: number,
    period: WindowPeriod,
    from: number,
    left: number,
  ): boolean => {
    if (left === 0) return fillPeriod(index + 1);
    for (let at = from; at <= period.empty.length - left; at += 1) {
      const row = period.empty[at] as number;
      added.push(period.keys[row] as string);
      const found = pick(index, period, at + 1, left - 1);
      added.pop();
      if (found) return true;
    }
    return false;
  };

  return fillPeriod(0);
}

// Possible exactly when some filling leaves every player with the minimum played and the minimum rested.
export function isPossibleByBruteForce(grid: MatchGrid): boolean {
  const { window, minPlayed, minRested } = RULES[grid.format];
  const windowKeys = Array.from({ length: window }, (_, index) =>
    periodKeys(grid, index + 1),
  );
  return someFilling(grid, (added) => {
    const filled = new Set(added);
    return grid.callUp.every((_, row) => {
      let played = 0;
      let rested = 0;
      for (const keys of windowKeys) {
        const key = keys[row] as string;
        const mark = grid.marks[key as CellKey];
        if (mark === "starter" || filled.has(key)) played += 1;
        else if (mark === undefined) rested += 1;
      }
      return played >= minPlayed && rested >= minRested;
    });
  });
}

// ---- Grids ----

type Spot = readonly [period: number, row: number]; // period index from 0, row of the call-up

function keyAt(grid: MatchGrid, [period, row]: Spot): CellKey | undefined {
  const entry = grid.callUp[row];
  if (!entry) return undefined;
  return cellKey({
    entryId: entry.id,
    column: { kind: "period", number: period + 1 },
  });
}

function withMarks(
  grid: MatchGrid,
  spots: readonly Spot[],
  mark: Mark | undefined,
): MatchGrid {
  const marks = { ...grid.marks };
  for (const spot of spots) {
    const key = keyAt(grid, spot);
    if (key === undefined) continue;
    if (mark === undefined) delete marks[key];
    else marks[key] = mark;
  }
  return { ...grid, marks };
}

function emptyGrid(format: Format, players: number): MatchGrid {
  return { format, overtimeCount: 0, callUp: callUpOf(players), marks: {} };
}

function rowsOfPeriod(
  players: number,
  start: number,
  period: number,
): number[] {
  return Array.from(
    { length: X_PER_PERIOD },
    (_, slot) => (start + period * X_PER_PERIOD + slot) % players,
  );
}

// The cyclic window of the plan: 5 X per window period, handed out in turn from `start`. It is complete, and
// every player meets both minimums for 8 to 12 players (4 and 8 periods: up to 13; 6 periods: 9 to 12).
export function cyclicWindowGrid(
  format: Format,
  players: number,
  start = 0,
): MatchGrid {
  const spots: Spot[] = [];
  for (let period = 0; period < RULES[format].window; period += 1) {
    for (const row of rowsOfPeriod(players, start, period)) {
      spots.push([period, row]);
    }
  }
  return withMarks(emptyGrid(format, players), spots, "starter");
}

export const withoutX = (grid: MatchGrid, spots: readonly Spot[]): MatchGrid =>
  withMarks(grid, spots, undefined);

export const withCircled = (
  grid: MatchGrid,
  spots: readonly Spot[],
): MatchGrid => withMarks(grid, spots, "sub");

const MAX_WINDOW = 6;
const formatArbitrary = constantFrom<Format>(...FORMATS);
const roll = integer({ min: 0, max: 99 });
const rolls = (length: number): Arbitrary<number[]> =>
  array(roll, { minLength: length, maxLength: length });
const windowRolls = rolls(MAX_WINDOW * MAX_ORACLE_PLAYERS);
const at = (all: readonly number[], [period, row]: Spot): number =>
  all[period * MAX_ORACLE_PLAYERS + row] ?? 0;

// Call-ups from the format minimum (RF-005) up to `largest`.
function playersFor(format: Format, value: number, largest: number): number {
  const [min] = RULES[format].callUp;
  return min + (value % (largest - min + 1));
}

// Takes away `count` of the X, the ones with the lowest scores: they become empty cells.
function removeSome(
  grid: MatchGrid,
  count: number,
  scores: readonly number[],
): MatchGrid {
  const spots: Spot[] = [];
  for (let period = 0; period < RULES[grid.format].window; period += 1) {
    grid.callUp.forEach((_, row) => {
      const key = keyAt(grid, [period, row]);
      if (key !== undefined && grid.marks[key] === "starter")
        spots.push([period, row]);
    });
  }
  spots.sort(
    (a, b) => at(scores, a) - at(scores, b) || a[0] - b[0] || a[1] - b[1],
  );
  return withoutX(grid, spots.slice(0, count));
}

// Mixed generator: each window period gets either the cyclic players or 5 random ones, then circled X in any
// empty cell with any density, then up to 4 X removed. Nothing keeps the minimums, so both outcomes appear
// (a fixed-seed test in the oracle test asserts at least 20 % of each).
export const mixedFeasibilityGridArbitrary: Arbitrary<MatchGrid> = tuple(
  formatArbitrary,
  integer({ min: 0, max: 99 }),
  integer({ min: 0, max: MAX_ORACLE_PLAYERS }),
  rolls(MAX_WINDOW),
  windowRolls,
  windowRolls,
  integer({ min: 0, max: 4 }),
  integer({ min: 0, max: MAX_MISSING_X }),
  windowRolls,
).map(
  ([
    format,
    value,
    start,
    randomPeriods,
    scores,
    circleRolls,
    circles,
    missing,
    removal,
  ]) => {
    const players = playersFor(format, value, MAX_ORACLE_PLAYERS);
    const spots: Spot[] = [];
    const rows = Array.from({ length: players }, (_, row) => row);
    for (let period = 0; period < RULES[format].window; period += 1) {
      const chosen =
        (randomPeriods[period] ?? 0) < 4
          ? [...rows]
              .sort(
                (a, b) =>
                  at(scores, [period, a]) - at(scores, [period, b]) || a - b,
              )
              .slice(0, X_PER_PERIOD)
          : rowsOfPeriod(players, start, period);
      for (const row of chosen) spots.push([period, row]);
    }
    const withX = withMarks(emptyGrid(format, players), spots, "starter");
    const circled: Spot[] = [];
    for (let period = 0; period < RULES[format].window; period += 1) {
      for (const row of rows) {
        const key = keyAt(withX, [period, row]);
        if (
          key !== undefined &&
          withX.marks[key] === undefined &&
          at(circleRolls, [period, row]) < circles
        ) {
          circled.push([period, row]);
        }
      }
    }
    return removeSome(withCircled(withX, circled), missing, removal);
  },
);

// Possible by construction: the cyclic window, circled X only where the valid window has an empty cell and the
// player keeps the minimum of rested periods, then up to 4 X removed. Putting the removed X back is a valid
// filling, so the answer must be "possible". Format 6 stops at 12 players: 13 players need 26 played periods
// and the window of 5 periods has only 25 X (E-030), so no valid window exists.
export const possibleFeasibilityGridArbitrary: Arbitrary<MatchGrid> = tuple(
  formatArbitrary,
  integer({ min: 0, max: 99 }),
  integer({ min: 0, max: MAX_ORACLE_PLAYERS }),
  windowRolls,
  integer({ min: 0, max: 100 }),
  integer({ min: 0, max: MAX_MISSING_X }),
  windowRolls,
).map(([format, value, start, circleRolls, circles, missing, removal]) => {
  const players = playersFor(
    format,
    value,
    format === 6 ? 12 : MAX_ORACLE_PLAYERS,
  );
  const valid = cyclicWindowGrid(format, players, start);
  const { window, minRested } = RULES[format];
  const circled: Spot[] = [];
  valid.callUp.forEach((_, row) => {
    const empty: number[] = [];
    for (let period = 0; period < window; period += 1) {
      const key = keyAt(valid, [period, row]);
      if (key !== undefined && valid.marks[key] === undefined)
        empty.push(period);
    }
    // Every circled X takes one rested period away, so only as many as the player can spare.
    let spare = empty.length - minRested;
    for (const period of empty) {
      if (spare > 0 && at(circleRolls, [period, row]) < circles) {
        circled.push([period, row]);
        spare -= 1;
      }
    }
  });
  return removeSome(withCircled(valid, circled), missing, removal);
});
