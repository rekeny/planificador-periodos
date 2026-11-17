// The oracle of "rule impossible to meet" (RF-067) and the two generators of realistic grids that the oracle
// test feeds it (T022). The brute force lives in oracle-brute-force.ts and the grid editors in
// oracle-grid-tools.ts (T080, 250-line limit); this file keeps the old path and the exported names.
import {
  array,
  constantFrom,
  integer,
  tuple,
  type Arbitrary,
} from "fast-check";
import type { Format } from "@/domain/format";
import type { MatchGrid } from "@/domain/grid";
import { RULES } from "./grid-reference";
import {
  X_PER_PERIOD,
  cyclicWindowGrid,
  emptyGrid,
  keyAt,
  rowsOfPeriod,
  withCircled,
  withMarks,
  withoutX,
  type Spot,
} from "./oracle-grid-tools";

export {
  MAX_FILLINGS,
  countFillings,
  isPossibleByBruteForce,
  someFilling,
} from "./oracle-brute-force";
export { cyclicWindowGrid, withCircled, withoutX } from "./oracle-grid-tools";

export const MAX_ORACLE_PLAYERS = 13; // the largest call-up of the oracle (RF-010, E-030)
export const MAX_MISSING_X = 4; // X missing in the window, so that brute force stays cheap

const FORMATS: readonly Format[] = [4, 6, 8];

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
