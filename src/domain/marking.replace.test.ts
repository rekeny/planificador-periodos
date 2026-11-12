import { assert, integer, property } from "fast-check";
import { type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { replaceableStarters, replaceStarter, tapCell } from "@/domain/marking";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

// Eight rows, ids 1..8: enough for 5 X, a sub and empty cells in one column.
const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

// `marks` lists [column, entry id, mark] triples.
function gridWith(
  options: {
    format?: Format;
    overtimeCount?: number;
    marks?: readonly (readonly [Column, number, Mark])[];
  } = {},
): MatchGrid {
  const marks: Partial<Record<CellKey, Mark>> = {};
  for (const [column, entryId, mark] of options.marks ?? []) {
    marks[cellKey({ entryId, column })] = mark;
  }
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: CALL_UP,
    marks,
  };
}

const marksOf = (
  column: Column,
  mark: Mark,
  entryIds: readonly number[],
): readonly (readonly [Column, number, Mark])[] =>
  entryIds.map((id) => [column, id, mark] as const);

describe("replaceStarter (answer starter, choose the replaced X)", () => {
  const FULL_P2 = marksOf(period(2), "starter", [1, 2, 3, 4, 5]);

  it("RF-047: choosing Eva puts an X in the tapped cell, empties Eva's and keeps 5 X", () => {
    // Eva is entry 3.
    const grid = gridWith({ marks: FULL_P2 });
    const next = replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    expect(cellState(next, { entryId: 6, column: period(2) })).toBe("starter");
    expect(cellState(next, { entryId: 3, column: period(2) })).toBe("empty");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-047: the replaced cell is empty, never a circled X, and has no stored mark", () => {
    const grid = gridWith({ marks: FULL_P2 });
    const next = replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    expect(cellState(next, { entryId: 3, column: period(2) })).not.toBe("sub");
    expect(cellKey({ entryId: 3, column: period(2) }) in next.marks).toBe(
      false,
    );
  });

  it("RF-047: the other four X stay and no circled X appears", () => {
    const grid = gridWith({ marks: FULL_P2 });
    const next = replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    for (const id of [1, 2, 4, 5]) {
      expect(cellState(next, { entryId: id, column: period(2) })).toBe(
        "starter",
      );
    }
    expect(Object.keys(next.marks)).toHaveLength(5);
  });

  it("RF-047: marks in other columns are not touched", () => {
    const grid = gridWith({
      marks: [
        ...FULL_P2,
        [period(1), 3, "starter"],
        [period(3), 6, "sub"],
        [period(3), 7, "starter"],
      ],
    });
    const next = replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    expect(cellState(next, { entryId: 3, column: period(1) })).toBe("starter");
    expect(cellState(next, { entryId: 6, column: period(3) })).toBe("sub");
    expect(cellState(next, { entryId: 7, column: period(3) })).toBe("starter");
    expect(Object.keys(next.marks)).toHaveLength(8);
  });

  it("RF-047 RF-054: a sub in the column stays circled", () => {
    const grid = gridWith({ marks: [...FULL_P2, [period(2), 7, "sub"]] });
    const next = replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    expect(cellState(next, { entryId: 7, column: period(2) })).toBe("sub");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-047: it is allowed even when the replacement breaks a rest rule (6 periods, P1 to P4 played, then P5)", () => {
    // Player 6 plays P1..P4 and now replaces entry 3 in P5: no rest left in the window.
    const grid = gridWith({
      marks: [
        ...marksOf(period(5), "starter", [1, 2, 3, 4, 5]),
        ...[1, 2, 3, 4].map((n) => [period(n), 6, "starter"] as const),
      ],
    });
    const next = replaceStarter(grid, { entryId: 6, column: period(5) }, 3);
    expect(cellState(next, { entryId: 6, column: period(5) })).toBe("starter");
    expect(cellState(next, { entryId: 3, column: period(5) })).toBe("empty");
    expect(starterCount(next, period(5))).toBe(5);
  });

  it("RF-047 RF-053: a circled X turned into a starter takes the place of the chosen X", () => {
    const grid = gridWith({ marks: [...FULL_P2, [period(2), 6, "sub"]] });
    const next = replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    expect(cellState(next, { entryId: 6, column: period(2) })).toBe("starter");
    expect(cellState(next, { entryId: 3, column: period(2) })).toBe("empty");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-047: it works in a free period and in an overtime", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        ...marksOf(period(6), "starter", [1, 2, 3, 4, 5]),
        ...marksOf(overtime(1), "starter", [1, 2, 3, 4, 5]),
      ],
    });
    for (const column of [period(6), overtime(1)]) {
      const next = replaceStarter(grid, { entryId: 7, column }, 2);
      expect(cellState(next, { entryId: 7, column })).toBe("starter");
      expect(cellState(next, { entryId: 2, column })).toBe("empty");
      expect(starterCount(next, column)).toBe(5);
    }
  });

  it("RF-047: the replaced entry has no mark in that column, so the grid is unchanged", () => {
    const grid = gridWith({ marks: FULL_P2 });
    expect(replaceStarter(grid, { entryId: 6, column: period(2) }, 7)).toEqual(
      grid,
    );
  });

  it("RF-047: the replaced entry has only a circled X in that column, so the grid is unchanged", () => {
    const grid = gridWith({ marks: [...FULL_P2, [period(2), 7, "sub"]] });
    expect(replaceStarter(grid, { entryId: 6, column: period(2) }, 7)).toEqual(
      grid,
    );
  });

  it("RF-047: the replaced entry has an X only in another column, so the grid is unchanged", () => {
    const grid = gridWith({ marks: [...FULL_P2, [period(3), 7, "starter"]] });
    expect(replaceStarter(grid, { entryId: 6, column: period(2) }, 7)).toEqual(
      grid,
    );
  });

  it("RF-047: an entry that is not in the call-up leaves the grid unchanged", () => {
    const grid = gridWith({ marks: FULL_P2 });
    expect(replaceStarter(grid, { entryId: 6, column: period(2) }, 99)).toEqual(
      grid,
    );
  });

  it("RF-047: a tapped cell that is not in the grid leaves the grid unchanged", () => {
    const grid = gridWith({ marks: FULL_P2 });
    expect(replaceStarter(grid, { entryId: 99, column: period(2) }, 3)).toEqual(
      grid,
    );
    expect(replaceStarter(grid, { entryId: 6, column: period(7) }, 3)).toEqual(
      grid,
    );
  });

  it("RF-047: it does not change the grid it receives", () => {
    const grid = gridWith({ marks: FULL_P2 });
    const before = structuredClone(grid);
    replaceStarter(grid, { entryId: 6, column: period(2) }, 3);
    expect(grid).toEqual(before);
  });

  it("RF-047 RF-055: starting in place of any listed X always leaves exactly 5 X (property)", () => {
    assert(
      property(
        integer({ min: 1, max: 3 }), // P1..P3: rule-window periods, so the tap asks
        integer({ min: 6, max: 8 }),
        integer({ min: 0, max: 4 }),
        (periodNumber, entryId, replacedIndex) => {
          const column = period(periodNumber);
          const grid = gridWith({
            marks: marksOf(column, "starter", [1, 2, 3, 4, 5]),
          });
          const cell = { entryId, column };
          expect(tapCell(grid, cell).kind).toBe("askSubOrStarter");
          const replaced = replaceableStarters(grid, column)[replacedIndex];
          expect(replaced).toBeDefined();
          const next = replaceStarter(grid, cell, replaced as number);
          expect(starterCount(next, column)).toBe(5);
          expect(cellState(next, cell)).toBe("starter");
          expect(cellState(next, { entryId: replaced as number, column })).toBe(
            "empty",
          );
        },
      ),
    );
  });
});
