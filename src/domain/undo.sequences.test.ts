import type { Column } from "@/domain/column";
import { removeFromCallUp } from "@/domain/call-up";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  starterCount,
  type Cell,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { replaceStarter, tapCell } from "@/domain/marking";
import { removeLastOvertime } from "@/domain/overtime";
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

describe("undo after the grid changes shape (sequences)", () => {
  it.each([true, false])(
    "RF-057 RF-086 E-026: Eva removed from the call-up; Undo empties Ana's P2, skips Eva and Eva does not come back (pruned: %s)",
    (prune) => {
      // P2 has 5 X, Eva's among them.
      const full = gridWith(
        6,
        0,
        [1, 2, 3, 4, 5].map((id) => [period(2), id, "starter"] as const),
      );
      const ana = 6;
      expect(tapCell(full, cell(ana, period(2))).kind).toBe("askSubOrStarter");
      const replaced = replaceStarter(full, cell(ana, period(2)), EVA);
      const history = [undoEntryFor(full, replaced)];
      expect(starterCount(replaced, period(2))).toBe(5);

      const removed = afterChange(
        removeFromCallUp(replaced, EVA),
        history,
        prune,
      );
      const result = undoLast(removed.grid, removed.history);

      expect(cellState(result.grid, cell(ana, period(2)))).toBe("empty");
      expect(starterCount(result.grid, period(2))).toBe(4);
      expect(result.grid.callUp.some((entry) => entry.id === EVA)).toBe(false);
      expect(
        Object.keys(result.grid.marks).some((key) => key.startsWith(`${EVA}:`)),
      ).toBe(false);
      expect(result.changes).toEqual([
        { cell: cell(ana, period(2)), state: "empty" },
      ]);
      expect(result.history).toEqual([]);
    },
  );

  it.each([true, false])(
    "RF-057 RF-086 E-031: Bea's overtime action is discarded and the same press empties Ana's P1; nothing is left to undo (pruned: %s)",
    (prune) => {
      let session: Session = { grid: gridWith(6, 1), history: [] };
      session = tap(session, cell(ANA, period(1)));
      session = tap(session, cell(BEA, overtime(1)));
      expect(session.history).toHaveLength(2);

      session = afterChange(
        removeLastOvertime(session.grid),
        session.history,
        prune,
      );
      const first = undoLast(session.grid, session.history);

      expect(cellState(first.grid, cell(ANA, period(1)))).toBe("empty");
      expect(first.grid.overtimeCount).toBe(0);
      expect(first.changes).toEqual([
        { cell: cell(ANA, period(1)), state: "empty" },
      ]);
      expect(first.history).toEqual([]);

      const second = undoLast(first.grid, first.history);
      expect(second.changes).toEqual([]);
      expect(second.grid).toEqual(first.grid);
    },
  );
});
