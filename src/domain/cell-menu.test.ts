import { type Column } from "@/domain/column";
import { canOpenCellMenu } from "@/domain/cell-menu";
import type { Format } from "@/domain/format";
import {
  cellKey,
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

describe("canOpenCellMenu", () => {
  it.each([
    ["an X", "starter" as const, true],
    ["a circled X", "sub" as const, true],
  ])("RF-052: the menu opens on %s", (_name, mark, expected) => {
    const grid = gridWith({ marks: [[period(2), 1, mark]] });
    expect(canOpenCellMenu(grid, { entryId: 1, column: period(2) })).toBe(
      expected,
    );
  });

  it("RF-052: a long press on an empty cell opens no menu", () => {
    const grid = gridWith({ marks: [[period(2), 1, "starter"]] });
    expect(canOpenCellMenu(grid, { entryId: 2, column: period(2) })).toBe(
      false,
    );
  });

  it("RF-052: an empty cell opens no menu even when its period has 5 X", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    expect(canOpenCellMenu(grid, { entryId: 6, column: period(2) })).toBe(
      false,
    );
  });

  it("RF-052: the menu opens on marked cells in a free period and an overtime", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        [period(6), 1, "starter"],
        [overtime(1), 2, "sub"],
      ],
    });
    expect(canOpenCellMenu(grid, { entryId: 1, column: period(6) })).toBe(true);
    expect(canOpenCellMenu(grid, { entryId: 2, column: overtime(1) })).toBe(
      true,
    );
  });

  it("RF-052: a cell that is not in the grid opens no menu", () => {
    const grid = gridWith({ marks: [[period(2), 1, "starter"]] });
    expect(canOpenCellMenu(grid, { entryId: 99, column: period(2) })).toBe(
      false,
    );
    expect(canOpenCellMenu(grid, { entryId: 1, column: period(7) })).toBe(
      false,
    );
    expect(canOpenCellMenu(grid, { entryId: 1, column: overtime(1) })).toBe(
      false,
    );
  });
});
