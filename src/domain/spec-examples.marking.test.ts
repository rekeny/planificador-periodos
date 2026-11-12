// The marking and undo examples of the spec, through the public domain functions (T019).
import type { Column } from "@/domain/column";
import {
  cellState,
  starterCount,
  type CallUpEntry,
  type Cell,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { removeFromCallUp } from "@/domain/call-up";
import { chooseCellMenuOption } from "@/domain/cell-menu";
import {
  removeMark,
  replaceStarter,
  tapCell,
  type MarkingResult,
} from "@/domain/marking";
import { removeLastOvertime } from "@/domain/overtime";
import { evaluateWarnings } from "@/domain/warnings";
import {
  pruneHistory,
  undoEntryFor,
  undoLast,
  type UndoEntry,
} from "@/domain/undo";

type Marks = Partial<Record<CellKey, Mark>>;

interface Row {
  readonly name: string;
  readonly check: () => void;
}

const ANA = 1;
const BEA = 2;
const EVA = 3;
const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });
const cell = (entryId: number, column: Column): Cell => ({ entryId, column });

// Ana 1, Bea 2, Eva 3 and four more.
const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

function gridOf(overtimeCount: number, marks: Marks): MatchGrid {
  return { format: 6, overtimeCount, callUp: CALL_UP, marks };
}

// 5 X in the period, for the entries given.
function fiveStarters(periodNumber: number, ids: readonly number[]): Marks {
  const marks: Marks = {};
  for (const id of ids) marks[`${id}:P${periodNumber}`] = "starter";
  return marks;
}

function changedGrid(result: MarkingResult): MatchGrid {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed grid, got ${result.kind}`);
  }
  return result.grid;
}

const ROWS: readonly Row[] = [
  {
    name: "E-011 RF-045: 6 periods, P2 has 5 X and tapping Ana's empty cell asks sub or starter",
    check: () => {
      const grid = gridOf(0, fiveStarters(2, [2, 3, 4, 5, 6]));
      expect(tapCell(grid, cell(ANA, period(2)))).toEqual({
        kind: "askSubOrStarter",
      });
    },
  },
  {
    name: "E-012 RF-006 RF-048: 6 periods, P6 has 5 X and tapping Ana's empty cell marks a sub without asking",
    check: () => {
      const grid = gridOf(0, fiveStarters(6, [2, 3, 4, 5, 6]));
      const after = changedGrid(tapCell(grid, cell(ANA, period(6))));
      expect(cellState(after, cell(ANA, period(6)))).toBe("sub");
      expect(starterCount(after, period(6))).toBe(5);
    },
  },
  {
    // P3 has 5 X and a sub (entry 7); Eva (entry 3) is one of the 5 X.
    name: "E-013 RF-050 RF-054 RF-066: 6 periods, tapping Eva's X in P3 with a sub shows the reminder and removing anyway leaves P3 inconsistent",
    check: () => {
      const grid = gridOf(0, {
        ...fiveStarters(3, [2, 3, 4, 5, 6]),
        "7:P3": "sub",
      });
      const evaCell = cell(EVA, period(3));
      expect(tapCell(grid, evaCell)).toEqual({ kind: "confirmRemoveStarter" });
      expect(chooseCellMenuOption(grid, evaCell, "remove")).toEqual({
        kind: "confirmRemoveStarter",
      });

      const after = removeMark(grid, evaCell);
      expect(cellState(after, evaCell)).toBe("empty");
      expect(evaluateWarnings(after).periodWarnings.P3).toBe("inconsistent");
    },
  },
  {
    // Eva has no marks left once Ana's X replaces hers, so removing her needs no more than the row.
    name: "E-026 RF-057 RF-086: 6 periods, undo after replacing Eva's X and then removing Eva empties Ana's P2 and skips Eva's cell",
    check: () => {
      const start = gridOf(0, fiveStarters(2, [2, 3, 4, 5, 6]));
      const anaCell = cell(ANA, period(2));
      expect(tapCell(start, anaCell)).toEqual({ kind: "askSubOrStarter" });

      const replaced = replaceStarter(start, anaCell, EVA);
      const history: readonly UndoEntry[] = [undoEntryFor(start, replaced)];
      const withoutEva = removeFromCallUp(replaced, EVA);
      const prunedHistory = pruneHistory(history, withoutEva);

      const undone = undoLast(withoutEva, prunedHistory);
      expect(cellState(undone.grid, anaCell)).toBe("empty");
      expect(starterCount(undone.grid, period(2))).toBe(4);
      expect(undone.grid.callUp.map((entry) => entry.id)).not.toContain(EVA);
      expect(undone.changes).toEqual([{ cell: anaCell, state: "empty" }]);
      expect(undone.history).toEqual([]);
    },
  },
  {
    name: "E-031 RF-057 RF-086: 6 periods and 1 overtime, removing the overtime discards Bea's action and one undo empties Ana's P1",
    check: () => {
      const start = gridOf(1, {});
      const anaCell = cell(ANA, period(1));
      const beaCell = cell(BEA, overtime(1));

      const afterAna = changedGrid(tapCell(start, anaCell));
      const afterBea = changedGrid(tapCell(afterAna, beaCell));
      const history: readonly UndoEntry[] = [
        undoEntryFor(start, afterAna),
        undoEntryFor(afterAna, afterBea),
      ];

      const withoutOvertime = removeLastOvertime(afterBea);
      const prunedHistory = pruneHistory(history, withoutOvertime);
      const undone = undoLast(withoutOvertime, prunedHistory);
      expect(cellState(undone.grid, anaCell)).toBe("empty");
      expect(undone.grid.overtimeCount).toBe(0);
      expect(undone.changes).toEqual([{ cell: anaCell, state: "empty" }]);

      const again = undoLast(undone.grid, undone.history);
      expect(again.changes).toEqual([]);
      expect(again.grid).toEqual(undone.grid);
      expect(again.grid.overtimeCount).toBe(0);
    },
  },
];

describe("spec examples, marking and undo", () => {
  it.each(ROWS)(
    "E-011 E-012 E-013 E-026 E-031 (spec example): $name",
    ({ check }) => {
      check();
    },
  );
});
