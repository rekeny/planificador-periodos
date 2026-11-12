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
import { entryHasMarks, removeFromCallUp } from "@/domain/call-up";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const ANA = 1;
const EVA = 2;
const LUIS = 3;

const CALL_UP: readonly CallUpEntry[] = [
  { id: ANA, playerId: 10, name: "Ana", number: "4" },
  { id: EVA, playerId: 20, name: "Eva", number: "5" },
  { id: LUIS, playerId: 30, name: "Luis", number: "6" },
];

// `marks` lists [entry id, column, mark] triples.
function gridWith(
  options: {
    format?: Format;
    overtimeCount?: number;
    callUp?: readonly CallUpEntry[];
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
    callUp: options.callUp ?? CALL_UP,
    marks,
  };
}

describe("removeFromCallUp", () => {
  it("RF-033: removing Ana, who has no marks, takes her row out and leaves the rest as it was", () => {
    const grid = gridWith({ marks: [[EVA, period(2), "starter"]] });

    const result = removeFromCallUp(grid, ANA);

    expect(result.callUp.map((entry) => entry.name)).toEqual(["Eva", "Luis"]);
    expect(result.marks).toEqual(grid.marks);
  });

  it("RF-034 E-017: removing Ana, who has marks, deletes her row and all her marks", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        [ANA, period(1), "starter"],
        [ANA, period(2), "sub"],
        [ANA, overtime(1), "starter"],
      ],
    });

    const result = removeFromCallUp(grid, ANA);

    expect(result.callUp.some((entry) => entry.id === ANA)).toBe(false);
    for (const column of gridColumns(6, 1)) {
      expect(cellState(result, { entryId: ANA, column })).toBe("empty");
    }
    expect(Object.keys(result.marks)).toEqual([]);
  });

  it("RF-034 E-017: after removal no key of the marks table starts with Ana's entry id", () => {
    const grid = gridWith({
      marks: [
        [ANA, period(1), "starter"],
        [EVA, period(1), "starter"],
      ],
    });

    const result = removeFromCallUp(grid, ANA);

    expect(
      Object.keys(result.marks).filter((key) => key.startsWith(`${ANA}:`)),
    ).toEqual([]);
  });

  it("RF-034 E-017: the marks of the other players stay as they were", () => {
    const grid = gridWith({
      marks: [
        [ANA, period(1), "starter"],
        [EVA, period(1), "sub"],
        [LUIS, period(4), "starter"],
      ],
    });

    const result = removeFromCallUp(grid, ANA);

    expect(cellState(result, { entryId: EVA, column: period(1) })).toBe("sub");
    expect(cellState(result, { entryId: LUIS, column: period(4) })).toBe(
      "starter",
    );
    expect(Object.keys(result.marks)).toHaveLength(2);
  });

  it("RF-034: removing entry 1 does not touch the marks of entry 11", () => {
    const callUp = [
      { id: 1, playerId: 10, name: "Ana", number: "4" },
      { id: 11, playerId: 20, name: "Eva", number: "5" },
    ];
    const grid = gridWith({
      callUp,
      marks: [
        [1, period(1), "starter"],
        [11, period(1), "starter"],
      ],
    });

    const result = removeFromCallUp(grid, 1);

    expect(cellState(result, { entryId: 11, column: period(1) })).toBe(
      "starter",
    );
  });

  it("RF-033: the other rows keep their order, name, number and ids", () => {
    const result = removeFromCallUp(gridWith(), EVA);

    expect(result.callUp).toEqual([CALL_UP[0], CALL_UP[2]]);
  });

  it("RF-033: the format and the overtimes of the match do not change", () => {
    const grid = gridWith({ format: 8, overtimeCount: 2 });

    const result = removeFromCallUp(grid, ANA);

    expect(result.format).toBe(8);
    expect(result.overtimeCount).toBe(2);
  });

  it("RF-033: an id that is not in the call-up changes nothing", () => {
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });

    expect(removeFromCallUp(grid, 999)).toEqual(grid);
  });

  it("RF-033: removing the only player leaves an empty call-up with no marks", () => {
    const only = [CALL_UP[0]!];
    const grid = gridWith({
      callUp: only,
      marks: [[ANA, period(1), "starter"]],
    });

    const result = removeFromCallUp(grid, ANA);

    expect(result.callUp).toEqual([]);
    expect(result.marks).toEqual({});
  });

  it("RF-034: it does not change the grid it receives", () => {
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });
    const copy = structuredClone(grid);

    removeFromCallUp(grid, ANA);

    expect(grid).toEqual(copy);
  });

  it("RF-033: removing the same entry twice gives the same grid as removing it once", () => {
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });

    const once = removeFromCallUp(grid, ANA);

    expect(removeFromCallUp(once, ANA)).toEqual(once);
  });

  it("RF-033: after removing a player, entryHasMarks on her old id is false", () => {
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });

    expect(entryHasMarks(removeFromCallUp(grid, ANA), ANA)).toBe(false);
  });
});
