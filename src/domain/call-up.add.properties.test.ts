import { array, assert, constantFrom, property, record } from "fast-check";
import type { Column } from "@/domain/column";
import {
  cellKey,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { addToCallUp, entryHasMarks } from "@/domain/call-up";
import { comparePlayers } from "@/domain/player-order";

const period = (number: number): Column => ({ kind: "period", number });

const entry = (id: number, name: string, number: string): CallUpEntry => ({
  id,
  playerId: id + 100,
  name,
  number,
});

function gridWith(
  callUp: readonly CallUpEntry[],
  marks: Partial<Record<CellKey, Mark>> = {},
): MatchGrid {
  return { format: 6, overtimeCount: 0, callUp, marks };
}

const ANA = entry(1, "Ana", "4");
const EVA = entry(2, "Eva", "5");
const LUIS = entry(3, "Luis", "9");

describe("addToCallUp on random call-ups", () => {
  const rowArbitrary = record({
    name: constantFrom("Ana", "Bea", "Carla", "Eva", "Luis", "Ñusta"),
    number: constantFrom("0", "00", "1", "7", "9", "10", "11"),
  });
  const sortedCallUp = (
    values: readonly { name: string; number: string }[],
  ): CallUpEntry[] =>
    values
      .map((value, index) => entry(index + 1, value.name, value.number))
      .sort(comparePlayers);

  it("RF-032 RF-042: the call-up stays sorted by comparePlayers, the others keep their relative order and the new row goes after its equals", () => {
    assert(
      property(
        array(rowArbitrary, { maxLength: 14 }),
        rowArbitrary,
        (existing, added) => {
          const callUp = sortedCallUp(existing);
          const newEntry = entry(1000, added.name, added.number);

          const result = addToCallUp(gridWith(callUp), newEntry).callUp;

          expect(result).toHaveLength(callUp.length + 1);
          expect(result.filter((row) => row.id === 1000)).toEqual([newEntry]);
          expect(result.filter((row) => row.id !== 1000)).toEqual(callUp);
          for (let index = 1; index < result.length; index += 1) {
            const [before, after] = [result[index - 1], result[index]];
            expect(comparePlayers(before!, after!)).toBeLessThanOrEqual(0);
          }
          const position = result.findIndex((row) => row.id === 1000);
          result.slice(position + 1).forEach((later) => {
            expect(comparePlayers(newEntry, later)).toBeLessThan(0);
          });
        },
      ),
    );
  });

  it("RF-032 RF-034: the marks of the grid are the same ones after adding, whatever the marks and the row added", () => {
    const cell = record({
      entry: constantFrom(1, 2, 3),
      number: constantFrom(1, 2, 3, 4, 5, 6),
      mark: constantFrom<Mark>("starter", "sub"),
    });
    assert(
      property(array(cell, { maxLength: 20 }), rowArbitrary, (cells, added) => {
        const marks: Partial<Record<CellKey, Mark>> = {};
        for (const c of cells) {
          marks[cellKey({ entryId: c.entry, column: period(c.number) })] =
            c.mark;
        }
        const grid = gridWith([ANA, EVA, LUIS], marks);

        const result = addToCallUp(grid, entry(1000, added.name, added.number));

        expect(result.marks).toEqual(grid.marks);
        expect(entryHasMarks(result, 1000)).toBe(false);
      }),
    );
  });
});
