import { type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { replaceableStarters } from "@/domain/marking";

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

describe("replaceableStarters", () => {
  it("RF-047: lists exactly the 5 entries with an X in that column, in call-up order", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [2, 3, 5, 6, 8]),
        [period(2), 1, "sub"],
        [period(1), 4, "starter"],
        [period(3), 7, "starter"],
      ],
    });
    expect(replaceableStarters(grid, period(2))).toEqual([2, 3, 5, 6, 8]);
  });

  it("RF-047: circled Xs and empty cells are never listed", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(2), 6, "sub"],
      ],
    });
    const listed = replaceableStarters(grid, period(2));
    expect(listed).not.toContain(6);
    expect(listed).not.toContain(7);
    expect(listed).toHaveLength(5);
  });

  it.each([
    ["a rule-window period", period(1)],
    ["a free period", period(6)],
    ["an overtime", overtime(1)],
  ] as const)("RF-047: works in %s", (_name, column) => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: marksOf(column, "starter", [1, 3, 4, 7, 8]),
    });
    expect(replaceableStarters(grid, column)).toEqual([1, 3, 4, 7, 8]);
  });

  it("RF-047: a column with no X lists nobody", () => {
    const grid = gridWith({ marks: marksOf(period(1), "starter", [1, 2]) });
    expect(replaceableStarters(grid, period(2))).toEqual([]);
  });

  it("RF-047: a column that is not in the grid lists nobody", () => {
    const grid = gridWith({ marks: marksOf(period(1), "starter", [1, 2]) });
    expect(replaceableStarters(grid, period(7))).toEqual([]);
    expect(replaceableStarters(grid, overtime(1))).toEqual([]);
  });
});
