// Performance budget of the warnings (RF-060). It lives in its own file so that
// mutation runs can leave it out: timing has no place under Stryker.
import { columnKey, gridColumns } from "@/domain/column";
import { MAX_STARTERS_PER_PERIOD, type Format } from "@/domain/format";
import {
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { evaluateWarnings } from "@/domain/warnings";

const CALLS = 500;
const BUDGET_MS = 2500;

const FORMAT: Format = 8;
const OVERTIMES = 3;
const PLAYERS = 13;

// Deterministic pseudo-random numbers (a linear congruential generator): the
// grid is the same on every run, so the test never depends on chance.
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Fisher-Yates shuffle driven by the deterministic sequence.
function shuffled<T>(values: readonly T[], next: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    const moved = result[index] as T;
    result[index] = result[other] as T;
    result[other] = moved;
  }
  return result;
}

function callUpOf(count: number): CallUpEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
}

// X per column: P1-P4 complete, P5 incomplete, P6 inconsistent (rule window of
// the 8-period format), then P7, P8 and the three overtimes with any count.
const STARTERS_PER_COLUMN = [5, 5, 5, 5, 3, 4, 2, 5, 1, 4, 0];
// Circled X per column: only where they make the column inconsistent or add noise.
const SUBS_PER_COLUMN = [0, 0, 0, 0, 0, 2, 1, 0, 3, 1, 2];

function worstGrid(): MatchGrid {
  const next = sequence(20240611);
  const callUp = callUpOf(PLAYERS);
  const marks: Partial<Record<CellKey, Mark>> = {};

  gridColumns(FORMAT, OVERTIMES).forEach((column, index) => {
    const key = columnKey(column);
    // Entries 1 and 2 play every complete period (rested 0, so in red); entry 3
    // never plays in the window (played 0). The rest of the X are random.
    const forced = index < 4 ? [1, 2] : [];
    const pool = shuffled(
      callUp
        .map((entry) => entry.id)
        .filter((id) => !forced.includes(id) && !(index < 6 && id === 3)),
      next,
    );
    const starters = [...forced, ...pool].slice(0, STARTERS_PER_COLUMN[index]);
    const subs = pool
      .filter((id) => !starters.includes(id))
      .slice(0, SUBS_PER_COLUMN[index]);
    for (const id of starters) marks[`${id}:${key}`] = "starter";
    for (const id of subs) marks[`${id}:${key}`] = "sub";
  });

  return { format: FORMAT, overtimeCount: OVERTIMES, callUp, marks };
}

describe("evaluateWarnings, performance budget", () => {
  it("RF-060: the worst planned grid is 8 periods, 3 overtimes and 13 players, with marks that break every rule", () => {
    const grid = worstGrid();
    const warnings = evaluateWarnings(grid);

    expect(grid.format).toBe(8);
    expect(grid.overtimeCount).toBe(3);
    expect(grid.callUp).toHaveLength(13);
    for (const column of gridColumns(grid.format, grid.overtimeCount)) {
      expect(starterCount(grid, column)).toBeLessThanOrEqual(
        MAX_STARTERS_PER_PERIOD,
      );
    }
    expect(warnings.lightRedCells.size).toBeGreaterThan(0);
    expect(warnings.playersInRed.size).toBeGreaterThan(0);
    expect(Object.values(warnings.periodWarnings)).toEqual(
      expect.arrayContaining(["incomplete", "inconsistent"]),
    );
    expect(warnings.ruleImpossible).toBe(true);
    expect(warnings.callUpRange).not.toBeNull();
  });

  it("RF-060: 500 calls of evaluateWarnings on the worst planned grid take under 2.5 seconds", () => {
    const grid = worstGrid();
    evaluateWarnings(grid); // warm-up, so the first compilation is not timed

    const start = performance.now();
    for (let call = 0; call < CALLS; call += 1) evaluateWarnings(grid);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
