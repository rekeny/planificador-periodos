import { assert, constantFrom, integer, property } from "fast-check";
import { type Column } from "@/domain/column";
import { chooseCellMenuOption, type CellMenuChoice } from "@/domain/cell-menu";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type CellState,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { type MarkingResult } from "@/domain/marking";

const period = (number: number): Column => ({ kind: "period", number });

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
const STATE_OF_CHOICE: Record<CellMenuChoice, CellState> = {
  starter: "starter",
  sub: "sub",
  remove: "empty",
};

describe("Nothing changes on its own (RF-054)", () => {
  it("RF-054: «Quitar» on an X leaves the circled X in the period as a circled X, with 4 X", () => {
    // Remove anyway after the reminder is not this function; here the period has no sub for the cell removed.
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(4), 6, "sub"],
      ],
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 3, column: period(3) }, "remove"),
    );
    expect(cellState(next, { entryId: 6, column: period(4) })).toBe("sub");
    expect(starterCount(next, period(3))).toBe(4);
  });

  it("RF-054: «Entró de cambio» on an X changes only that cell; the other circled X stay circled", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(3), 6, "sub"],
        [period(3), 7, "sub"],
      ],
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 3, column: period(3) }, "sub"),
    );
    expect(next.marks).toEqual({
      ...grid.marks,
      [cellKey({ entryId: 3, column: period(3) })]: "sub",
    });
    expect(starterCount(next, period(3))).toBe(4);
  });

  it("RF-054: «Quitar» on a circled X changes only that cell; no circled X becomes an X", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4]),
        [period(3), 6, "sub"],
        [period(3), 7, "sub"],
      ],
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 6, column: period(3) }, "remove"),
    );
    const removedKey = cellKey({ entryId: 6, column: period(3) });
    expect(Object.keys(next.marks)).not.toContain(removedKey);
    expect(cellState(next, { entryId: 7, column: period(3) })).toBe("sub");
    expect(starterCount(next, period(3))).toBe(4);
  });

  it("RF-054: «Titular» on a circled X with 4 X changes only that cell; the other circled X stay circled", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4]),
        [period(3), 6, "sub"],
        [period(3), 7, "sub"],
      ],
    });
    const next = changedGrid(
      chooseCellMenuOption(grid, { entryId: 6, column: period(3) }, "starter"),
    );
    expect(next.marks).toEqual({
      ...grid.marks,
      [cellKey({ entryId: 6, column: period(3) })]: "starter",
    });
  });

  it("RF-054: after every choice, every other cell of the grid keeps its state (property)", () => {
    assert(
      property(
        integer({ min: 1, max: 5 }),
        integer({ min: 0, max: 4 }),
        integer({ min: 1, max: 8 }),
        constantFrom(...CHOICES),
        (periodNumber, xCount, entryId, choice) => {
          const column = period(periodNumber);
          const grid = gridWith({
            marks: [
              ...marksOf(column, "starter", [1, 2, 3, 4, 5].slice(0, xCount)),
              ...marksOf(column, "sub", [6, 7]),
              [period(6), 8, "starter"],
            ],
          });
          const cell = { entryId, column };
          const result = chooseCellMenuOption(grid, cell, choice);
          if (result.kind !== "changed") return;
          for (const other of CALL_UP) {
            for (const otherColumn of [
              period(1),
              period(2),
              period(3),
              period(4),
              period(5),
              period(6),
            ]) {
              if (other.id === entryId && otherColumn.number === periodNumber)
                continue;
              const otherCell = { entryId: other.id, column: otherColumn };
              expect(cellState(result.grid, otherCell)).toBe(
                cellState(grid, otherCell),
              );
            }
          }
          expect(cellState(result.grid, cell)).toBe(STATE_OF_CHOICE[choice]);
        },
      ),
    );
  });
});
