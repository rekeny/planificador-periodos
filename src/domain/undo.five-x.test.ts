import type { Column } from "@/domain/column";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { replaceStarter } from "@/domain/marking";
import { undoEntryFor, undoLast, type CellChange } from "@/domain/undo";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

// `marks` lists [column, entry id, mark] triples.
function gridWith(
  marks: readonly (readonly [Column, number, Mark])[],
): MatchGrid {
  const stored: Partial<Record<CellKey, Mark>> = {};
  for (const [column, entryId, mark] of marks) {
    stored[cellKey({ entryId, column })] = mark;
  }
  return { format: 6, overtimeCount: 1, callUp: CALL_UP, marks: stored };
}

const change = (
  entryId: number,
  column: Column,
  state: CellChange["state"],
): CellChange => ({ cell: { entryId, column }, state });
const starters = (column: Column, ids: readonly number[]) =>
  ids.map((id) => [column, id, "starter"] as const);

// RF-055: a period never has more than 5 X, also when Undo restores one.
describe("undoLast never makes a sixth X", () => {
  it.each([period(2), overtime(1)])(
    "RF-055 RF-057: restoring an X into the full column %o is skipped",
    (column) => {
      // Entry 5 had an X and was turned into a circled X; entry 6 then took the fifth X.
      const grid = gridWith([
        ...starters(column, [1, 2, 3, 4, 6]),
        [column, 5, "sub"],
      ]);
      const result = undoLast(grid, [[change(5, column, "starter")]]);
      expect(starterCount(result.grid, column)).toBe(5);
      expect(cellState(result.grid, { entryId: 5, column })).toBe("sub");
      expect(result.changes).toEqual([]);
    },
  );

  it("RF-055 RF-057: the skipped X does not stop the other cells of the entry", () => {
    const grid = gridWith([
      ...starters(period(2), [1, 2, 3, 4, 6]),
      [period(2), 5, "sub"],
      [period(1), 7, "sub"],
    ]);
    const result = undoLast(grid, [
      [change(5, period(2), "starter"), change(7, period(1), "empty")],
    ]);
    expect(cellState(result.grid, { entryId: 5, column: period(2) })).toBe(
      "sub",
    );
    expect(cellState(result.grid, { entryId: 7, column: period(1) })).toBe(
      "empty",
    );
    expect(result.changes).toEqual([change(7, period(1), "empty")]);
  });

  it("RF-055 RF-057: an entry restoring two X into a column with room for one restores one", () => {
    const grid = gridWith([
      ...starters(period(3), [3, 4, 5, 6]),
      [period(3), 1, "sub"],
      [period(3), 2, "sub"],
    ]);
    const result = undoLast(grid, [
      [change(1, period(3), "starter"), change(2, period(3), "starter")],
    ]);
    expect(starterCount(result.grid, period(3))).toBe(5);
    expect(result.changes).toHaveLength(1);
  });

  it("RF-055 RF-057: restoring a circled X into a full column is allowed", () => {
    const grid = gridWith(starters(period(2), [1, 2, 3, 4, 5]));
    const result = undoLast(grid, [[change(6, period(2), "sub")]]);
    expect(cellState(result.grid, { entryId: 6, column: period(2) })).toBe(
      "sub",
    );
    expect(starterCount(result.grid, period(2))).toBe(5);
  });

  it("RF-055 RF-057: restoring an empty cell is allowed whatever the column holds", () => {
    const grid = gridWith(starters(period(2), [1, 2, 3, 4, 5]));
    const result = undoLast(grid, [[change(5, period(2), "empty")]]);
    expect(starterCount(result.grid, period(2))).toBe(4);
  });

  it("RF-055 RF-057 RF-047: undoing a replacement in a full column restores both cells and ends with 5 X", () => {
    const before = gridWith(starters(period(2), [1, 2, 3, 4, 5]));
    const after = replaceStarter(before, { entryId: 6, column: period(2) }, 3);
    const result = undoLast(after, [undoEntryFor(before, after)]);
    expect(cellState(result.grid, { entryId: 3, column: period(2) })).toBe(
      "starter",
    );
    expect(cellState(result.grid, { entryId: 6, column: period(2) })).toBe(
      "empty",
    );
    expect(starterCount(result.grid, period(2))).toBe(5);
  });
});
