import { gridColumns, type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import {
  addToCallUp,
  callUpEntryFor,
  entryHasMarks,
  removeFromCallUp,
} from "@/domain/call-up";
import type { Player } from "@/domain/squad";

const period = (number: number): Column => ({ kind: "period", number });

const entry = (id: number, name: string, number: string): CallUpEntry => ({
  id,
  playerId: id + 100,
  name,
  number,
});

// `marks` lists [entry id, column, mark] triples.
function gridWith(
  callUp: readonly CallUpEntry[],
  options: {
    format?: Format;
    overtimeCount?: number;
    marks?: readonly (readonly [number, Column, Mark])[];
  } = {},
): MatchGrid {
  const marks: Partial<Record<CellKey, Mark>> = {};
  for (const [entryId, column, mark] of options.marks ?? []) {
    marks[cellKey({ entryId, column })] = mark;
  }
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp,
    marks,
  };
}

// "Name number" per row, in grid order: easy to read in a failure.
const rows = (grid: MatchGrid): string[] =>
  grid.callUp.map((row) => `${row.name} ${row.number}`);

const ANA = entry(1, "Ana", "4");
const EVA = entry(2, "Eva", "5");
const LUIS = entry(3, "Luis", "9");

describe("addToCallUp", () => {
  it("RF-032 RF-042: a player with a number between two rows goes between them", () => {
    const grid = gridWith([ANA, EVA, LUIS]);

    const result = addToCallUp(grid, entry(10, "Bea", "7"));

    expect(rows(result)).toEqual(["Ana 4", "Eva 5", "Bea 7", "Luis 9"]);
  });

  it("RF-032 RF-042: a player with the lowest number goes first", () => {
    const result = addToCallUp(
      gridWith([ANA, EVA, LUIS]),
      entry(10, "Bea", "1"),
    );

    expect(rows(result)).toEqual(["Bea 1", "Ana 4", "Eva 5", "Luis 9"]);
  });

  it("RF-032 RF-042: a player with the highest number goes last", () => {
    const result = addToCallUp(
      gridWith([ANA, EVA, LUIS]),
      entry(10, "Bea", "10"),
    );

    expect(rows(result)).toEqual(["Ana 4", "Eva 5", "Luis 9", "Bea 10"]);
  });

  it("RF-032 RF-042: the numbers are compared as numbers, not as text: 10 goes after 9", () => {
    const result = addToCallUp(
      gridWith([entry(1, "Ana", "9"), entry(2, "Eva", "11")]),
      entry(10, "Bea", "10"),
    );

    expect(rows(result)).toEqual(["Ana 9", "Bea 10", "Eva 11"]);
  });

  it("RF-032 RF-042: into an empty call-up the new player is the only row", () => {
    const result = addToCallUp(gridWith([]), entry(10, "Bea", "7"));

    expect(result.callUp).toEqual([entry(10, "Bea", "7")]);
  });

  it("RF-042 E-020: 0 goes before 00, and both before the other numbers", () => {
    const grid = gridWith([entry(1, "Luis", "00"), entry(2, "Bea", "7")]);

    expect(rows(addToCallUp(grid, entry(10, "Carla", "0")))).toEqual([
      "Carla 0",
      "Luis 00",
      "Bea 7",
    ]);
    expect(rows(addToCallUp(grid, entry(11, "Ana", "00")))).toEqual([
      "Ana 00",
      "Luis 00",
      "Bea 7",
    ]);
  });

  it("RF-042 E-020: Carla 0 joins Ana 0, Luis 00, Bea 7 and Eva 10: Ana, Carla, Luis, Bea, Eva", () => {
    const grid = gridWith([
      entry(1, "Ana", "0"),
      entry(2, "Luis", "00"),
      entry(3, "Bea", "7"),
      entry(4, "Eva", "10"),
    ]);

    const result = addToCallUp(grid, entry(5, "Carla", "0"));

    expect(rows(result)).toEqual([
      "Ana 0",
      "Carla 0",
      "Luis 00",
      "Bea 7",
      "Eva 10",
    ]);
  });

  it("RF-042: with the same number as other rows, the name decides: before, between and after", () => {
    const grid = gridWith([entry(1, "Ana", "7"), entry(2, "Luis", "7")]);

    expect(rows(addToCallUp(grid, entry(10, "Aaron", "7")))).toEqual([
      "Aaron 7",
      "Ana 7",
      "Luis 7",
    ]);
    expect(rows(addToCallUp(grid, entry(11, "Eva", "7")))).toEqual([
      "Ana 7",
      "Eva 7",
      "Luis 7",
    ]);
    expect(rows(addToCallUp(grid, entry(12, "Zoe", "7")))).toEqual([
      "Ana 7",
      "Luis 7",
      "Zoe 7",
    ]);
  });

  it("RF-042: names are compared in Spanish order: Ñ goes after N and before O", () => {
    const grid = gridWith([entry(1, "Nora", "7"), entry(2, "Olga", "7")]);

    const result = addToCallUp(grid, entry(10, "Ñusta", "7"));

    expect(rows(result)).toEqual(["Nora 7", "Ñusta 7", "Olga 7"]);
  });

  it("RF-042: a player with the same name and number as an existing row goes after it, and the existing rows keep their order", () => {
    const grid = gridWith([
      entry(1, "Ana", "3"),
      entry(2, "Juan", "7"),
      entry(3, "Juan", "7"),
      entry(4, "Luis", "9"),
    ]);

    const result = addToCallUp(grid, entry(10, "Juan", "7"));

    expect(result.callUp.map((row) => row.id)).toEqual([1, 2, 3, 10, 4]);
  });

  it("RF-032 RF-042: the existing rows keep their ids and marks, and the new row has none", () => {
    const grid = gridWith([ANA, EVA, LUIS], {
      overtimeCount: 1,
      marks: [
        [1, period(1), "starter"],
        [2, period(2), "sub"],
        [3, { kind: "overtime", number: 1 }, "starter"],
      ],
    });

    const result = addToCallUp(grid, entry(10, "Bea", "7"));

    expect(result.callUp.filter((row) => row.id !== 10)).toEqual([
      ANA,
      EVA,
      LUIS,
    ]);
    expect(result.marks).toEqual(grid.marks);
    expect(entryHasMarks(result, 10)).toBe(false);
    for (const column of gridColumns(6, 1)) {
      expect(cellState(result, { entryId: 10, column })).toBe("empty");
    }
  });

  it("RF-032 RF-042: the added row is the entry that was given, with its id, player, name and number", () => {
    const added = entry(10, "Bea", "7");

    const result = addToCallUp(gridWith([ANA, EVA]), added);

    expect(result.callUp.find((row) => row.id === 10)).toEqual(added);
  });

  it("RF-032 RF-019: re-adding a removed player with a new entry id gives an empty row, in its place by number", () => {
    const ana = { id: 10, teamId: 1, name: "Ana", number: "4", isActive: true };
    const grid = gridWith([ANA, EVA, LUIS], {
      marks: [
        [1, period(1), "starter"],
        [1, period(3), "sub"],
        [2, period(1), "starter"],
      ],
    });
    const removed = removeFromCallUp(grid, ANA.id);

    const result = addToCallUp(removed, { id: 50, ...callUpEntryFor(ana) });

    expect(rows(result)).toEqual(["Ana 4", "Eva 5", "Luis 9"]);
    expect(result.callUp.map((row) => row.id)).toEqual([50, 2, 3]);
    expect(entryHasMarks(result, 50)).toBe(false);
    expect(entryHasMarks(result, 1)).toBe(false);
    for (const column of gridColumns(6, 0)) {
      expect(cellState(result, { entryId: 50, column })).toBe("empty");
    }
    expect(result.marks).toEqual(removed.marks);
  });

  it("RF-019 RF-032 E-018: Juan removed with 7 and added again after becoming 9: the new row says 9 and goes by 9", () => {
    const grid = gridWith([entry(1, "Juan", "7"), entry(2, "Eva", "8")]);
    const juan9: Player = {
      id: 101,
      teamId: 1,
      name: "Juan",
      number: "9",
      isActive: true,
    };
    const removed = removeFromCallUp(grid, 1);

    const result = addToCallUp(removed, { id: 3, ...callUpEntryFor(juan9) });

    expect(rows(result)).toEqual(["Eva 8", "Juan 9"]);
  });

  it("RF-010 RF-032: a 13th player is added (Bea 5 goes before Player 5 by name): nothing is blocked and the call-up has 13 rows", () => {
    const twelve = Array.from({ length: 12 }, (_, index) =>
      entry(index + 1, `Player ${index + 1}`, String(index + 1)),
    );

    const result = addToCallUp(gridWith(twelve), entry(20, "Bea", "5"));

    expect(result.callUp).toHaveLength(13);
    expect(result.callUp.map((row) => row.id)).toEqual([
      1, 2, 3, 4, 20, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it.each<Format>([4, 6, 8])(
    "RF-032: the format %s and the overtimes of the match stay as they were",
    (format) => {
      const grid = gridWith([ANA, EVA], { format, overtimeCount: 2 });

      const result = addToCallUp(grid, entry(10, "Bea", "7"));

      expect(result.format).toBe(format);
      expect(result.overtimeCount).toBe(2);
      expect(cellState(result, { entryId: 10, column: period(format) })).toBe(
        "empty",
      );
      expect(
        cellState(result, {
          entryId: 10,
          column: { kind: "overtime", number: 2 },
        }),
      ).toBe("empty");
    },
  );

  it("RF-032: the grid that came in is not changed, and a new grid comes out", () => {
    const grid = gridWith([ANA, EVA], {
      marks: [[1, period(1), "starter"]],
    });
    const snapshot = structuredClone(grid);
    Object.freeze(grid.callUp);
    Object.freeze(grid.marks);
    Object.freeze(grid);

    const result = addToCallUp(grid, entry(10, "Bea", "1"));

    expect(grid).toEqual(snapshot);
    expect(result).not.toBe(grid);
    expect(result.callUp).not.toBe(grid.callUp);
  });
});
