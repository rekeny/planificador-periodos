import { type Column } from "@/domain/column";
import { chooseCellMenuOption, type CellMenuChoice } from "@/domain/cell-menu";
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
import { type MarkingResult } from "@/domain/marking";

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

// The grid of a "changed" result; fails the test for any other kind.
function changedGrid(result: MarkingResult): MatchGrid {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed result, got ${result.kind}`);
  }
  return result.grid;
}

const CHOICES: readonly CellMenuChoice[] = ["starter", "sub", "remove"];

describe("chooseCellMenuOption (RF-052)", () => {
  it("RF-052: circled X to «Titular» in a period with 4 X leaves an X", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4]),
        [period(2), 6, "sub"],
      ],
    });
    const cell = { entryId: 6, column: period(2) };
    const next = changedGrid(chooseCellMenuOption(grid, cell, "starter"));
    expect(cellState(next, cell)).toBe("starter");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-052: X to «Entró de cambio» leaves a circled X", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const cell = { entryId: 3, column: period(2) };
    const next = changedGrid(chooseCellMenuOption(grid, cell, "sub"));
    expect(cellState(next, cell)).toBe("sub");
  });

  it("RF-052: X to «Entró de cambio» lowers the period to 4 X and is allowed in a rule-window period", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 3, column: period(2) }, "sub"),
    );
    expect(starterCount(next, period(2))).toBe(4);
  });

  it.each([
    ["an X in a period without a sub", "starter" as const],
    ["a circled X", "sub" as const],
  ])("RF-052: «Quitar» on %s leaves the cell empty", (_name, mark) => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4]),
        [period(2), 5, mark],
      ],
    });
    const cell = { entryId: 5, column: period(2) };
    const next = changedGrid(chooseCellMenuOption(grid, cell, "remove"));
    expect(cellState(next, cell)).toBe("empty");
  });

  it("RF-052: «Quitar» on a circled X in a period with an X and another sub removes only that cell", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(2), 6, "sub"],
        [period(2), 7, "sub"],
      ],
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 6, column: period(2) }, "remove"),
    );
    expect(cellState(next, { entryId: 6, column: period(2) })).toBe("empty");
    expect(cellState(next, { entryId: 7, column: period(2) })).toBe("sub");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it.each([
    ["starter" as const, "starter" as const],
    ["sub" as const, "sub" as const],
  ])(
    "RF-052: choosing the current state (%s) returns unchanged",
    (choice, mark) => {
      const grid = gridWith({
        marks: [
          ...marksOf(period(2), "starter", [1, 2, 3, 4]),
          [period(2), 6, "sub"],
        ],
      });
      const cell = { entryId: mark === "starter" ? 1 : 6, column: period(2) };
      expect(chooseCellMenuOption(grid, cell, choice)).toEqual({
        kind: "unchanged",
      });
    },
  );

  it("RF-052: «Titular» on an X in a period with 5 X is unchanged, not a question", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    expect(
      chooseCellMenuOption(grid, { entryId: 1, column: period(2) }, "starter"),
    ).toEqual({ kind: "unchanged" });
  });

  it("RF-052: «Entró de cambio» on a circled X is unchanged", () => {
    const grid = gridWith({ marks: [[period(2), 6, "sub"]] });
    expect(
      chooseCellMenuOption(grid, { entryId: 6, column: period(2) }, "sub"),
    ).toEqual({ kind: "unchanged" });
  });

  it("RF-052: the options work the same in a free period and in an overtime", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        ...marksOf(period(6), "starter", [1, 2, 3, 4]),
        [period(6), 6, "sub"],
        ...marksOf(overtime(1), "starter", [1, 2, 3, 4]),
        [overtime(1), 6, "sub"],
      ],
    });
    for (const column of [period(6), overtime(1)]) {
      const starterToSub = changedGrid(
        chooseCellMenuOption(grid, { entryId: 1, column }, "sub"),
      );
      expect(cellState(starterToSub, { entryId: 1, column })).toBe("sub");
      const subToStarter = changedGrid(
        chooseCellMenuOption(grid, { entryId: 6, column }, "starter"),
      );
      expect(cellState(subToStarter, { entryId: 6, column })).toBe("starter");
      const removed = changedGrid(
        chooseCellMenuOption(grid, { entryId: 6, column }, "remove"),
      );
      expect(cellState(removed, { entryId: 6, column })).toBe("empty");
    }
  });

  it("RF-052: a cell that is not in the grid leaves the grid unchanged, whatever the choice", () => {
    const grid = gridWith({ marks: [[period(2), 1, "starter"]] });
    for (const choice of CHOICES) {
      expect(
        chooseCellMenuOption(grid, { entryId: 99, column: period(2) }, choice),
      ).toEqual({ kind: "unchanged" });
      expect(
        chooseCellMenuOption(grid, { entryId: 1, column: period(7) }, choice),
      ).toEqual({ kind: "unchanged" });
    }
  });

  it("RF-052: an empty cell, which has no menu, is unchanged whatever the choice", () => {
    const grid = gridWith({ marks: [[period(2), 1, "starter"]] });
    for (const choice of CHOICES) {
      expect(
        chooseCellMenuOption(grid, { entryId: 2, column: period(2) }, choice),
      ).toEqual({ kind: "unchanged" });
    }
  });

  it("RF-052: it does not change the grid it receives", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4]),
        [period(2), 6, "sub"],
      ],
    });
    const before = structuredClone(grid);
    for (const choice of CHOICES) {
      chooseCellMenuOption(grid, { entryId: 6, column: period(2) }, choice);
      chooseCellMenuOption(grid, { entryId: 1, column: period(2) }, choice);
    }
    expect(grid).toEqual(before);
  });

  it("RF-052: marks in other columns are not touched by a change", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4]),
        [period(2), 6, "sub"],
        [period(1), 7, "starter"],
        [period(3), 8, "sub"],
      ],
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 6, column: period(2) }, "starter"),
    );
    expect(cellState(next, { entryId: 7, column: period(1) })).toBe("starter");
    expect(cellState(next, { entryId: 8, column: period(3) })).toBe("sub");
    expect(Object.keys(next.marks)).toHaveLength(7);
  });
});
