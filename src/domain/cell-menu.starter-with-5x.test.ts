import { assert, constantFrom, integer, property } from "fast-check";
import { type Column } from "@/domain/column";
import { chooseCellMenuOption, type CellMenuChoice } from "@/domain/cell-menu";
import type { Format } from "@/domain/format";
import {
  cellKey,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

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

const CHOICES: readonly CellMenuChoice[] = ["starter", "sub", "remove"];

describe("«Titular» with 5 X (RF-053)", () => {
  it("RF-053: circled X to «Titular» in a period with 5 X asks which X it replaces", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(2), 6, "sub"],
      ],
    });
    expect(
      chooseCellMenuOption(grid, { entryId: 6, column: period(2) }, "starter"),
    ).toEqual({ kind: "chooseReplacedStarter" });
  });

  it.each([
    ["a rule-window period", period(2), undefined],
    ["a free period", period(6), undefined],
    ["an overtime", overtime(1), 1],
  ])(
    "RF-053: the question to choose the replaced X is also asked in %s",
    (_name, column, overtimeCount) => {
      const grid = gridWith({
        overtimeCount: overtimeCount ?? 0,
        marks: [
          ...marksOf(column, "starter", [1, 2, 3, 4, 5]),
          [column, 6, "sub"],
        ],
      });
      expect(
        chooseCellMenuOption(grid, { entryId: 6, column }, "starter"),
      ).toEqual({ kind: "chooseReplacedStarter" });
    },
  );

  it.each([
    [4, "changed"],
    [5, "chooseReplacedStarter"],
  ])(
    "RF-053 RF-055: circled X to «Titular» with %i X gives %s",
    (xCount, kind) => {
      const starters = [1, 2, 3, 4, 5].slice(0, xCount);
      const grid = gridWith({
        marks: [
          ...marksOf(period(2), "starter", starters),
          [period(2), 6, "sub"],
        ],
      });
      const result = chooseCellMenuOption(
        grid,
        { entryId: 6, column: period(2) },
        "starter",
      );
      expect(result.kind).toBe(kind);
    },
  );

  it("RF-053: the question does not change the grid", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(2), 6, "sub"],
      ],
    });
    const before = structuredClone(grid);
    chooseCellMenuOption(grid, { entryId: 6, column: period(2) }, "starter");
    expect(grid).toEqual(before);
  });

  it("RF-053 RF-055: a period never ends with 6 X after any choice on a marked cell (property)", () => {
    assert(
      property(
        integer({ min: 1, max: 6 }),
        integer({ min: 0, max: 5 }),
        integer({ min: 1, max: 8 }),
        constantFrom(...CHOICES),
        (periodNumber, xCount, entryId, choice) => {
          const column = period(periodNumber);
          const grid = gridWith({
            marks: [
              ...marksOf(column, "starter", [1, 2, 3, 4, 5].slice(0, xCount)),
              ...marksOf(column, "sub", [6, 7, 8]),
            ],
          });
          const result = chooseCellMenuOption(
            grid,
            { entryId, column },
            choice,
          );
          const next = result.kind === "changed" ? result.grid : grid;
          expect(starterCount(next, column)).toBeLessThanOrEqual(5);
        },
      ),
    );
  });
});

describe("Formats (RF-052, RF-053)", () => {
  it.each([4, 6, 8] as const)(
    "RF-052 RF-053: circled X to «Titular» with 5 X asks which X it replaces in a format of %i periods",
    (format) => {
      const grid = gridWith({
        format,
        marks: [
          ...marksOf(period(1), "starter", [1, 2, 3, 4, 5]),
          [period(1), 6, "sub"],
        ],
      });
      expect(
        chooseCellMenuOption(
          grid,
          { entryId: 6, column: period(1) },
          "starter",
        ),
      ).toEqual({ kind: "chooseReplacedStarter" });
    },
  );
});
