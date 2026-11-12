import type { Column } from "@/domain/column";
import { removeFromCallUp } from "@/domain/call-up";
import { changeFormat } from "@/domain/format-change";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  type Cell,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { tapCell } from "@/domain/marking";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";
import {
  pruneHistory,
  undoEntryFor,
  undoLast,
  type UndoEntry,
} from "@/domain/undo";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });
const cell = (entryId: number, column: Column): Cell => ({ entryId, column });

// Ana 1, Bea 2, Eva 3, then four more.
const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));
const ANA = 1;
const BEA = 2;
const EVA = 3;

function gridWith(
  format: Format,
  overtimeCount: number,
  marks: readonly (readonly [Column, number, Mark])[] = [],
): MatchGrid {
  const stored: Partial<Record<CellKey, Mark>> = {};
  for (const [column, entryId, mark] of marks) {
    stored[cellKey({ entryId, column })] = mark;
  }
  return { format, overtimeCount, callUp: CALL_UP, marks: stored };
}

// What the store does after a tap: apply it and push the undo entry.
interface Session {
  readonly grid: MatchGrid;
  readonly history: readonly UndoEntry[];
}
function tap({ grid, history }: Session, target: Cell): Session {
  const result = tapCell(grid, target);
  if (result.kind !== "changed") throw new Error("expected a change");
  return {
    grid: result.grid,
    history: [...history, undoEntryFor(grid, result.grid)],
  };
}
// The store prunes after a structural change, once.
const afterChange = (
  grid: MatchGrid,
  history: readonly UndoEntry[],
  prune: boolean,
): Session => ({
  grid,
  history: prune ? pruneHistory(history, grid) : history,
});

// Rows and columns that are removed and created again are new ones for Undo (RF-086).
describe("undo never writes into re-created rows or columns", () => {
  it("RF-057 RF-086 E-031: the overtime removed and added again never receives the old marks", () => {
    let session: Session = { grid: gridWith(6, 1), history: [] };
    session = tap(session, cell(ANA, period(1)));
    session = tap(session, cell(BEA, overtime(1)));
    session = afterChange(
      removeLastOvertime(session.grid),
      session.history,
      true,
    );
    session = afterChange(addOvertime(session.grid), session.history, true);

    const result = undoLast(session.grid, session.history);
    expect(cellState(result.grid, cell(BEA, overtime(1)))).toBe("empty");
    expect(result.grid.overtimeCount).toBe(1);
    expect(result.changes).toEqual([
      { cell: cell(ANA, period(1)), state: "empty" },
    ]);
  });

  it("RF-086 E-031: an overtime action made after the overtime was added again is undone alone", () => {
    let session: Session = { grid: gridWith(6, 1), history: [] };
    session = tap(session, cell(ANA, overtime(1)));
    session = afterChange(
      removeLastOvertime(session.grid),
      session.history,
      true,
    );
    session = afterChange(addOvertime(session.grid), session.history, true);
    session = tap(session, cell(BEA, overtime(1)));

    const first = undoLast(session.grid, session.history);
    expect(first.changes).toEqual([
      { cell: cell(BEA, overtime(1)), state: "empty" },
    ]);
    const second = undoLast(first.grid, first.history);
    expect(second.changes).toEqual([]);
    expect(cellState(second.grid, cell(ANA, overtime(1)))).toBe("empty");
  });

  it("RF-086 RF-040 RF-041: format 8 to 4 to 8 never gives P5-P8 their old marks back, and P1 is still undone", () => {
    let session: Session = { grid: gridWith(8, 1), history: [] };
    session = tap(session, cell(ANA, period(1)));
    session = tap(session, cell(BEA, period(6)));
    session = tap(session, cell(EVA, overtime(1)));
    session = afterChange(changeFormat(session.grid, 4), session.history, true);
    session = afterChange(changeFormat(session.grid, 8), session.history, true);
    expect(cellState(session.grid, cell(BEA, period(6)))).toBe("empty");

    const first = undoLast(session.grid, session.history);
    expect(first.changes).toEqual([
      { cell: cell(EVA, overtime(1)), state: "empty" },
    ]);
    const second = undoLast(first.grid, first.history);
    expect(second.changes).toEqual([
      { cell: cell(ANA, period(1)), state: "empty" },
    ]);
    expect(cellState(second.grid, cell(BEA, period(6)))).toBe("empty");
    expect(undoLast(second.grid, second.history).changes).toEqual([]);
  });

  it("RF-086 RF-040: after 8 to 4 to 8, a new mark in P6 is undone and the old P6 entry is not", () => {
    let session: Session = { grid: gridWith(8, 0), history: [] };
    session = tap(session, cell(BEA, period(6)));
    session = afterChange(changeFormat(session.grid, 4), session.history, true);
    session = afterChange(changeFormat(session.grid, 8), session.history, true);
    session = tap(session, cell(EVA, period(6)));

    const first = undoLast(session.grid, session.history);
    expect(first.changes).toEqual([
      { cell: cell(EVA, period(6)), state: "empty" },
    ]);
    expect(undoLast(first.grid, first.history).changes).toEqual([]);
  });

  it.each([true, false])(
    "RF-086 E-026: a player removed and added again gets a new row that never receives old marks (pruned: %s)",
    (prune) => {
      let session: Session = { grid: gridWith(6, 0), history: [] };
      session = tap(session, cell(EVA, period(1)));
      session = afterChange(
        removeFromCallUp(session.grid, EVA),
        session.history,
        prune,
      );
      const reAdded: CallUpEntry = {
        id: 9,
        playerId: EVA,
        name: "Player 3",
        number: "3",
      };
      const grid = {
        ...session.grid,
        callUp: [...session.grid.callUp, reAdded],
      };

      const result = undoLast(grid, session.history);
      expect(result.changes).toEqual([]);
      expect(result.grid.marks).toEqual({});
      expect(cellState(result.grid, cell(9, period(1)))).toBe("empty");
    },
  );

  it("RF-057 RF-086: Undo of a mark made before another player was removed still works after the removal", () => {
    let session: Session = { grid: gridWith(6, 0), history: [] };
    session = tap(session, cell(ANA, period(1)));
    session = tap(session, cell(EVA, period(1)));
    session = afterChange(
      removeFromCallUp(session.grid, EVA),
      session.history,
      true,
    );
    const result = undoLast(session.grid, session.history);
    expect(result.changes).toEqual([
      { cell: cell(ANA, period(1)), state: "empty" },
    ]);
    expect(result.history).toEqual([]);
  });
});
