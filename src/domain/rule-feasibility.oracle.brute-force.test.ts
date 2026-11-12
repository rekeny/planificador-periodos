// The brute force of the oracle checked on its own (RF-067): it only fills empty cells, never reaches a sixth X
// in a period, counts its fillings right and refuses grids that are too large.
import { cellKey, type MatchGrid } from "@/domain/grid";
import { isRuleImpossible } from "@/domain/rule-feasibility";
import {
  countFillings,
  cyclicWindowGrid,
  isPossibleByBruteForce,
  MAX_FILLINGS,
  someFilling,
  withCircled,
  withoutX,
} from "../../tests/support/feasibility-oracle";

// Every filling of the grid, as the sets of cell keys that receive an X.
function allFillings(grid: MatchGrid): string[][] {
  const found: string[][] = [];
  someFilling(grid, (added) => {
    found.push([...added]);
    return false;
  });
  return found;
}

const keyOf = (grid: MatchGrid, period: number, row: number): string =>
  cellKey({
    entryId: grid.callUp[row]?.id ?? -1,
    column: { kind: "period", number: period + 1 },
  });

describe("the brute force of the oracle", () => {
  it("RF-067: never fills a circled X cell and never gives a period a sixth X", () => {
    // Format 4, 8 players, cyclic window: P1 rows 0-4, P2 rows 5, 6, 7, 0, 1, P3 rows 2-6.
    // P1 loses the X of rows 3 and 4, and both cells get a circled X: P1 has 3 X, 2 circled X and 3 empty
    // cells (rows 5, 6, 7) for the 2 X missing. P2 loses the X of row 7: 4 empty cells (rows 2, 3, 4, 7)
    // for 1 X missing. P3 is full.
    const grid = withCircled(
      withoutX(cyclicWindowGrid(4, 8, 0), [
        [0, 3],
        [0, 4],
        [1, 7],
      ]),
      [
        [0, 3],
        [0, 4],
      ],
    );
    const fillings = allFillings(grid);
    expect(countFillings(grid)).toBe(3 * 4);
    expect(fillings).toHaveLength(12);
    const circled = [keyOf(grid, 0, 3), keyOf(grid, 0, 4)];
    for (const added of fillings) {
      for (const key of circled) expect(added).not.toContain(key);
      for (const key of added) expect(grid.marks[key as never]).toBeUndefined();
      expect(new Set(added).size).toBe(added.length);
      // Each window period ends with exactly 5 X: the ones already there plus the ones added.
      for (let period = 0; period < 3; period += 1) {
        const there = grid.callUp.filter(
          (_, row) =>
            grid.marks[keyOf(grid, period, row) as never] === "starter",
        ).length;
        const put = grid.callUp.filter((_, row) =>
          added.includes(keyOf(grid, period, row)),
        ).length;
        expect(there + put).toBe(5);
      }
    }
  });

  it("RF-067: a window with no missing X has exactly one filling, the empty one", () => {
    expect(allFillings(cyclicWindowGrid(4, 8, 0))).toEqual([[]]);
  });

  it("RF-067: counts the fillings as a product of combinations per period", () => {
    // 8 players, format 4: removing 1 X from P1 and 2 from P2 leaves C(4,1) * C(5,2) = 40 fillings
    // (P1 has 3 empty cells plus the removed one, P2 has 3 empty plus 2 removed).
    const grid = withoutX(cyclicWindowGrid(4, 8, 0), [
      [0, 0],
      [1, 5],
      [1, 6],
    ]);
    expect(countFillings(grid)).toBe(4 * 10);
    expect(allFillings(grid)).toHaveLength(40);
  });

  it("RF-067: finds no filling when circled X leave fewer empty cells than X missing", () => {
    // P1 has no X and 4 of its 8 cells hold a circled X: 4 empty cells cannot take 5 X.
    let grid = withoutX(cyclicWindowGrid(4, 8, 0), [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ]);
    grid = withCircled(grid, [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    expect(countFillings(grid)).toBe(0);
    expect(allFillings(grid)).toEqual([]);
    expect(isPossibleByBruteForce(grid)).toBe(false);
    expect(isRuleImpossible(grid)).toBe(true);
  });

  it("RF-067: refuses a grid with too many fillings instead of hanging", () => {
    const grid = withoutX(cyclicWindowGrid(8, 13, 0), [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 5],
      [1, 6],
      [1, 7],
      [1, 8],
      [1, 9],
    ]);
    expect(countFillings(grid)).toBeGreaterThan(MAX_FILLINGS);
    expect(() => isPossibleByBruteForce(grid)).toThrow();
  });
});
