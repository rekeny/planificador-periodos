import {
  assert,
  array,
  constantFrom,
  integer,
  property,
  record,
} from "fast-check";
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
import {
  addToCallUp,
  callUpEntryFor,
  entryHasMarks,
  playersToAdd,
  removeFromCallUp,
} from "@/domain/call-up";
import type { Player } from "@/domain/squad";

const period = (number: number): Column => ({ kind: "period", number });

const player = (id: number, name: string, number: string): Player => ({
  id,
  teamId: 1,
  name,
  number,
  isActive: true,
});

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

describe("removeFromCallUp in sequences", () => {
  it("RF-032 RF-034 E-017: remove Ana and add her again with a new entry gives an empty row, and she is offered in between", () => {
    const ana = player(10, "Ana", "4");
    const grid = gridWith({ marks: [[ANA, period(1), "starter"]] });

    const removed = removeFromCallUp(grid, ANA);
    const offered = playersToAdd([ana], removed.callUp);
    const newEntry: CallUpEntry = { id: 50, ...callUpEntryFor(ana) };
    const readded = addToCallUp(removed, newEntry);

    expect(offered).toEqual([ana]);
    expect(readded.callUp.map((entry) => entry.id)).toEqual([50, EVA, LUIS]);
    for (const column of gridColumns(6, 0)) {
      expect(cellState(readded, { entryId: 50, column })).toBe("empty");
    }
    expect(entryHasMarks(readded, 50)).toBe(false);
  });

  it("RF-019 E-018: Juan with 7 is removed and added again after becoming 9: the new entry says 9", () => {
    const juan7 = player(7, "Juan", "7");
    const first: CallUpEntry = { id: 1, ...callUpEntryFor(juan7) };
    const grid = gridWith({ callUp: [first] });

    const removed = removeFromCallUp(grid, 1);
    const second: CallUpEntry = {
      id: 2,
      ...callUpEntryFor(player(7, "Juan", "9")),
    };
    const readded = addToCallUp(removed, second);

    expect(first.number).toBe("7");
    expect(removed.callUp).toEqual([]);
    expect(readded.callUp).toEqual([
      { id: 2, playerId: 7, name: "Juan", number: "9" },
    ]);
    expect(entryHasMarks(readded, 1)).toBe(false);
  });

  it("RF-034 E-017: for any marks, removing an entry deletes exactly its marks and no other", () => {
    const cellMark = record({
      entry: constantFrom(ANA, EVA, LUIS),
      number: integer({ min: 1, max: 6 }),
      mark: constantFrom<Mark>("starter", "sub"),
    });
    assert(
      property(
        array(cellMark, { maxLength: 30 }),
        constantFrom(ANA, EVA, LUIS),
        (cells, removedId) => {
          const grid = gridWith({
            marks: cells.map((cell) => [
              cell.entry,
              period(cell.number),
              cell.mark,
            ]),
          });

          const result = removeFromCallUp(grid, removedId);

          const expected = Object.fromEntries(
            Object.entries(grid.marks).filter(
              ([key]) => !key.startsWith(`${removedId}:`),
            ),
          );
          expect(result.marks).toEqual(expected);
          expect(result.callUp.map((entry) => entry.id)).toEqual(
            CALL_UP.map((entry) => entry.id).filter((id) => id !== removedId),
          );
          expect(entryHasMarks(result, removedId)).toBe(false);
        },
      ),
    );
  });
});
