import { assert, constantFrom, dictionary, property } from "fast-check";
import { columnKey, gridColumns, type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  type CallUpEntry,
  type CellKey,
  type MatchGrid,
  type CellState,
  type Mark,
} from "@/domain/grid";
const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const entry = (id: number, name: string, number: string): CallUpEntry => ({
  id,
  playerId: id,
  name,
  number,
});

function makeGrid(
  options: {
    format?: Format;
    overtimeCount?: number;
    callUp?: readonly CallUpEntry[];
    marks?: Readonly<Partial<Record<CellKey, Mark>>>;
  } = {},
): MatchGrid {
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: options.callUp ?? [entry(1, "Ana", "4"), entry(2, "Bea", "7")],
    marks: options.marks ?? {},
  };
}

describe("cellState", () => {
  it("RF-043: a cell with no mark is empty", () => {
    expect(cellState(makeGrid(), { entryId: 1, column: period(1) })).toBe(
      "empty",
    );
  });

  it("RF-043: a cell marked starter is an X", () => {
    const grid = makeGrid({ marks: { "1:P1": "starter" } });
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("starter");
  });

  it("RF-043: a cell marked sub is a circled X", () => {
    const grid = makeGrid({ marks: { "1:P1": "sub" } });
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("sub");
  });

  it("RF-043: a mark changes only its own cell, not the rest of its row or column", () => {
    const grid = makeGrid({ overtimeCount: 1, marks: { "1:P2": "starter" } });
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("empty");
    expect(cellState(grid, { entryId: 1, column: period(3) })).toBe("empty");
    expect(cellState(grid, { entryId: 1, column: overtime(1) })).toBe("empty");
    expect(cellState(grid, { entryId: 2, column: period(2) })).toBe("empty");
  });

  it("RF-043: a mark in P1 and a mark in OT1 of the same entry are independent", () => {
    const grid = makeGrid({
      overtimeCount: 1,
      marks: { "1:P1": "starter", "1:OT1": "sub" },
    });
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("starter");
    expect(cellState(grid, { entryId: 1, column: overtime(1) })).toBe("sub");
  });

  it("RF-043: entry 1 in P11 and entry 11 in P1 do not share a mark", () => {
    const callUp = [entry(1, "Ana", "4"), entry(11, "Bea", "7")];
    const grid = makeGrid({ format: 8, callUp, marks: { "11:P1": "starter" } });
    expect(cellState(grid, { entryId: 11, column: period(1) })).toBe("starter");
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("empty");
  });

  it("RF-043: a cell of an entry that is not in the call-up is empty, not an error", () => {
    expect(cellState(makeGrid(), { entryId: 99, column: period(1) })).toBe(
      "empty",
    );
  });

  it("RF-043: a grid with no players has nothing to read and no cell throws", () => {
    const grid = makeGrid({ callUp: [] });
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("empty");
  });

  // Rows are keyed by call-up entry, not by player (review P-18).
  it("RF-043 RF-042: two entries of the same player in different stays keep separate marks", () => {
    const firstStay: CallUpEntry = {
      id: 5,
      playerId: 3,
      name: "Eva",
      number: "10",
    };
    const secondStay: CallUpEntry = {
      id: 9,
      playerId: 3,
      name: "Eva",
      number: "10",
    };
    expect(cellKey({ entryId: firstStay.id, column: period(1) })).not.toBe(
      cellKey({ entryId: secondStay.id, column: period(1) }),
    );
    const grid = makeGrid({
      callUp: [secondStay],
      marks: { "5:P1": "starter", "9:P2": "sub" },
    });
    expect(cellState(grid, { entryId: 9, column: period(1) })).toBe("empty");
    expect(cellState(grid, { entryId: 9, column: period(2) })).toBe("sub");
  });

  it("RF-043: every cell of a random grid is in exactly one of the three states", () => {
    const states: readonly CellState[] = ["empty", "starter", "sub"];
    const markKeys = constantFrom<CellKey>(
      "1:P1",
      "1:P2",
      "1:OT1",
      "2:P1",
      "2:P6",
      "2:OT1",
    );
    assert(
      property(
        dictionary(markKeys, constantFrom<Mark>("starter", "sub")),
        (marks) => {
          const grid = makeGrid({ overtimeCount: 1, marks });
          for (const row of grid.callUp) {
            for (const column of gridColumns(6, 1)) {
              const state = cellState(grid, { entryId: row.id, column });
              expect(
                states.filter((candidate) => candidate === state),
              ).toHaveLength(1);
              expect(state).toBe(
                marks[`${row.id}:${columnKey(column)}` as CellKey] ?? "empty",
              );
            }
          }
        },
      ),
    );
  });
});
