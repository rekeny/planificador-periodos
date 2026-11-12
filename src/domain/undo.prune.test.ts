import type { Column } from "@/domain/column";
import { changeFormat } from "@/domain/format-change";
import type { Format } from "@/domain/format";
import { removeFromCallUp } from "@/domain/call-up";
import type { CallUpEntry, CellState, MatchGrid } from "@/domain/grid";
import { removeLastOvertime } from "@/domain/overtime";
import { pruneHistory, type CellChange, type UndoEntry } from "@/domain/undo";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const CALL_UP: readonly CallUpEntry[] = [1, 2, 3].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

const gridWith = (format: Format, overtimeCount: number): MatchGrid => ({
  format,
  overtimeCount,
  callUp: CALL_UP,
  marks: {},
});

const change = (
  entryId: number,
  column: Column,
  state: CellState = "empty",
): CellChange => ({ cell: { entryId, column }, state });

describe("pruneHistory", () => {
  it("RF-086: an empty history stays empty", () => {
    expect(pruneHistory([], gridWith(6, 0))).toEqual([]);
  });

  it("RF-086: entries whose cells all exist are kept as they are, in order", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(1))],
      [change(2, period(6), "sub"), change(3, period(2), "starter")],
    ];
    expect(pruneHistory(history, gridWith(6, 0))).toEqual(history);
  });

  it("RF-086: only the cells that no longer exist are dropped from an entry", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(1)), change(2, overtime(1), "starter")],
    ];
    expect(pruneHistory(history, gridWith(6, 0))).toEqual([
      [change(1, period(1))],
    ]);
  });

  it("RF-086: an entry with no cell left is dropped and the others keep their order", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(1))],
      [change(2, overtime(1), "starter")],
      [change(3, period(2), "sub")],
    ];
    expect(pruneHistory(history, gridWith(6, 0))).toEqual([
      [change(1, period(1))],
      [change(3, period(2), "sub")],
    ]);
  });

  it("RF-086: an entry that was already empty is dropped", () => {
    expect(pruneHistory([[], [change(1, period(1))]], gridWith(6, 0))).toEqual([
      [change(1, period(1))],
    ]);
  });

  it("RF-086: running it twice gives the same history", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(1)), change(9, period(1))],
      [change(2, overtime(2))],
    ];
    const once = pruneHistory(history, gridWith(6, 1));
    expect(pruneHistory(once, gridWith(6, 1))).toEqual(once);
  });

  it("RF-086: the history it receives is not modified", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(1)), change(9, period(1))],
    ];
    const copy = JSON.stringify(history);
    pruneHistory(history, gridWith(6, 0));
    expect(JSON.stringify(history)).toBe(copy);
  });

  it("RF-086 E-026: after removing a player from the call-up, only that row's cells are dropped", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(2)), change(3, period(2), "starter")],
    ];
    const grid = removeFromCallUp(gridWith(6, 0), 3);
    expect(pruneHistory(history, grid)).toEqual([[change(1, period(2))]]);
  });

  it("RF-086 E-026: removing a player drops the entries that only had that row", () => {
    const history: readonly UndoEntry[] = [
      [change(1, period(1))],
      [change(3, period(1), "starter"), change(3, period(4), "sub")],
    ];
    const grid = removeFromCallUp(gridWith(6, 0), 3);
    expect(pruneHistory(history, grid)).toEqual([[change(1, period(1))]]);
  });

  it("RF-086 E-031: after removing the last overtime, its cells are dropped and earlier overtimes stay", () => {
    const history: readonly UndoEntry[] = [
      [change(1, overtime(1))],
      [change(2, overtime(2), "starter")],
      [change(1, period(1))],
    ];
    const grid = removeLastOvertime(gridWith(6, 2));
    expect(pruneHistory(history, grid)).toEqual([
      [change(1, overtime(1))],
      [change(1, period(1))],
    ]);
  });

  it.each([
    [1, true],
    [4, true],
    [5, false],
    [6, false],
    [8, false],
  ] as const)(
    "RF-086 RF-040: after changing 8 to 4 periods, a cell in P%i survives: %s",
    (number, survives) => {
      const history: readonly UndoEntry[] = [[change(2, period(number))]];
      const grid = changeFormat(gridWith(8, 0), 4);
      expect(pruneHistory(history, grid)).toEqual(survives ? history : []);
    },
  );

  it("RF-086 RF-041: a format change keeps the cells of the overtimes", () => {
    const history: readonly UndoEntry[] = [
      [change(2, overtime(1), "starter"), change(2, period(7), "sub")],
    ];
    const grid = changeFormat(gridWith(8, 1), 4);
    expect(pruneHistory(history, grid)).toEqual([
      [change(2, overtime(1), "starter")],
    ]);
  });
});
