// The counter, format change, call-up, order and legend examples of the spec (T019).
import {
  callUpEntryFor,
  initialCallUp,
  removeFromCallUp,
} from "@/domain/call-up";
import { changeFormat } from "@/domain/format-change";
import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import { legendItems } from "@/domain/legend";
import { playerCounter } from "@/domain/counter";
import { comparePlayers } from "@/domain/player-order";
import type { Player } from "@/domain/squad";
import { evaluateWarnings } from "@/domain/warnings";

type Marks = Partial<Record<CellKey, Mark>>;

interface Row {
  readonly name: string;
  readonly check: () => void;
}

function callUpOf(ids: readonly number[]): CallUpEntry[] {
  return ids.map((id) => ({
    id,
    playerId: id,
    name: `Player ${id}`,
    number: String(id),
  }));
}

function gridOf(
  format: Format,
  overtimeCount: number,
  ids: readonly number[],
  marks: Marks,
): MatchGrid {
  return { format, overtimeCount, callUp: callUpOf(ids), marks };
}

function playerOf(id: number, name: string, number: string): Player {
  return { id, teamId: 1, name, number, isActive: true };
}

const TEN_PLAYERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const ROWS: readonly Row[] = [
  {
    name: "E-014 RF-007 RF-008 RF-009 RF-070 RF-071 RF-072: 6 periods and 1 overtime, Juan with X in P1, P3 and P6, a sub in P5 and P2, P4 and the overtime empty has 3 played and 3 rested",
    check: () => {
      const grid = gridOf(6, 1, [1], {
        "1:P1": "starter",
        "1:P3": "starter",
        "1:P6": "starter",
        "1:P5": "sub",
      });
      expect(playerCounter(grid, 1)).toEqual({ played: 3, rested: 3 });
    },
  },
  {
    name: "E-016 RF-039 RF-040: changing 8 to 4 periods deletes the marks in P5-P8 and keeps the rest",
    check: () => {
      const grid = gridOf(8, 0, [1, 2], {
        "1:P1": "starter",
        "2:P4": "sub",
        "1:P5": "starter",
        "2:P6": "starter",
        "1:P7": "sub",
        "2:P8": "starter",
      });
      expect(changeFormat(grid, 4)).toEqual({
        ...grid,
        format: 4,
        marks: { "1:P1": "starter", "2:P4": "sub" },
      });
    },
  },
  {
    // Entry 11 shares the digit 1 with Ana: only her marks may go.
    name: "E-017 RF-034: removing Ana, who has marks, from the call-up deletes her marks and keeps the others",
    check: () => {
      const grid = gridOf(6, 0, [1, 2, 11], {
        "1:P1": "starter",
        "1:P2": "sub",
        "2:P1": "starter",
        "11:P1": "starter",
      });
      const after = removeFromCallUp(grid, 1);
      expect(after.callUp.map((entry) => entry.id)).toEqual([2, 11]);
      expect(after.marks).toEqual({ "2:P1": "starter", "11:P1": "starter" });
    },
  },
  {
    name: "E-018 RF-018 RF-019: after Juan's number changes from 7 to 9 the old match keeps 7 and a new one shows 9",
    check: () => {
      const juan = playerOf(1, "Juan", "7");
      const existing = callUpEntryFor(juan);
      const changed = { ...juan, number: "9" };
      const created = callUpEntryFor(changed);
      expect(existing.number).toBe("7");
      expect(created.number).toBe("9");
      expect(existing.name).toBe("Juan");
    },
  },
  {
    name: "E-020 RF-016 RF-042: Luis 00, Ana 0, Eva 10, Bea 7 and Carla 0 are shown as Ana 0, Carla 0, Luis 00, Bea 7, Eva 10",
    check: () => {
      const players = [
        playerOf(1, "Luis", "00"),
        playerOf(2, "Ana", "0"),
        playerOf(3, "Eva", "10"),
        playerOf(4, "Bea", "7"),
        playerOf(5, "Carla", "0"),
      ];
      const expected = ["Ana 0", "Carla 0", "Luis 00", "Bea 7", "Eva 10"];
      const label = (player: Pick<Player, "name" | "number">): string =>
        `${player.name} ${player.number}`;
      expect([...players].sort(comparePlayers).map(label)).toEqual(expected);
      expect(initialCallUp(players).map(label)).toEqual(expected);
    },
  },
  {
    // The situation of E-002: Juan with X in P1 and P2 and a sub in P3, 10 players, 6 periods.
    name: "E-027 RF-087: the legend of E-002 explains the light red cell, the incomplete and inconsistent periods but not the player in red",
    check: () => {
      const grid = gridOf(6, 0, TEN_PLAYERS, {
        "1:P1": "starter",
        "1:P2": "starter",
        "1:P3": "sub",
      });
      expect(legendItems(evaluateWarnings(grid))).toEqual([
        "lightRedCell",
        "incompletePeriod",
        "inconsistentPeriod",
      ]);
    },
  },
];

describe("spec examples, counter, format, call-up, order and legend", () => {
  it.each(ROWS)(
    "E-014 E-016 E-017 E-018 E-020 E-027 (spec example): $name",
    ({ check }) => {
      check();
    },
  );
});
