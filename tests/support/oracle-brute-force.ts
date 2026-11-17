// Brute force of the oracle of "rule impossible to meet" (RF-067, T022, T080): every filling of the rule
// window. It reads the minimums from the table written out from the spec (RULES in grid-reference.ts:
// RF-002 to RF-004), never from FORMAT_RULES, and never calls any rule code of src/domain/.
import { cellKey, type CellKey, type MatchGrid } from "@/domain/grid";
import { RULES } from "./grid-reference";
import { X_PER_PERIOD } from "./oracle-grid-tools";

// Brute force refuses a grid with more fillings than this, instead of hanging.
export const MAX_FILLINGS = 100_000;

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
