import type { Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { entryHasMarks } from "@/domain/call-up";

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

describe("entryHasMarks", () => {
  it("RF-033: an entry with no marks in any cell has none, so removing asks nothing", () => {
    expect(entryHasMarks(gridWith(), ANA)).toBe(false);
  });

  it("RF-033: marks of other entries do not count", () => {
    const grid = gridWith({ marks: [[EVA, period(1), "starter"]] });

    expect(entryHasMarks(grid, ANA)).toBe(false);
  });

  it.each<[string, Mark]>([
    ["an X", "starter"],
    ["a circled X", "sub"],
  ])("RF-034 E-017: an entry with only %s has marks", (_label, mark) => {
    const grid = gridWith({ marks: [[ANA, period(3), mark]] });

    expect(entryHasMarks(grid, ANA)).toBe(true);
  });

  it("RF-034: a mark in an overtime column counts", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [[ANA, overtime(1), "starter"]],
    });

    expect(entryHasMarks(grid, ANA)).toBe(true);
  });

  it("RF-034: a mark in the last period of the format counts", () => {
    const grid = gridWith({ format: 4, marks: [[ANA, period(4), "sub"]] });

    expect(entryHasMarks(grid, ANA)).toBe(true);
  });

  it("RF-034: an entry id that is a prefix of another one does not take its marks", () => {
    const callUp = [
      { id: 1, playerId: 10, name: "Ana", number: "4" },
      { id: 11, playerId: 20, name: "Eva", number: "5" },
    ];
    const grid = gridWith({ callUp, marks: [[11, period(1), "starter"]] });

    expect(entryHasMarks(grid, 1)).toBe(false);
    expect(entryHasMarks(grid, 11)).toBe(true);
  });

  it("RF-033: an id that is not in the call-up has no marks", () => {
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });

    expect(entryHasMarks(grid, 999)).toBe(false);
  });

  it("RF-033: it does not change the grid", () => {
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });
    const copy = structuredClone(grid);

    entryHasMarks(grid, ANA);

    expect(grid).toEqual(copy);
  });
});
