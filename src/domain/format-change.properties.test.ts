import {
  assert,
  constantFrom,
  integer,
  property,
  uniqueArray,
  tuple,
  type Arbitrary,
} from "fast-check";
import { columnKey, gridColumns } from "@/domain/column";
import type { Format } from "@/domain/format";
import { changeFormat } from "@/domain/format-change";
import {
  cellKey,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

const FORMATS: readonly Format[] = [4, 6, 8];

const CALL_UP: readonly CallUpEntry[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  playerId: i + 1,
  name: `Player ${i + 1}`,
  number: String(i + 1),
}));

const formatArb: Arbitrary<Format> = constantFrom(...FORMATS);

// Each column gets up to 5 distinct rows marked, as the app guarantees (RF-055).
function gridArb(): Arbitrary<MatchGrid> {
  return tuple(formatArb, integer({ min: 0, max: 3 })).chain(
    ([format, overtimeCount]) => {
      const columns = gridColumns(format, overtimeCount);
      const perColumn = columns.map((column) =>
        uniqueArray(
          tuple(
            integer({ min: 1, max: 12 }),
            constantFrom<Mark>("starter", "sub"),
          ),
          { maxLength: 5, selector: ([entryId]) => entryId },
        ).map((cells) =>
          cells.map(
            ([entryId, mark]) => [cellKey({ entryId, column }), mark] as const,
          ),
        ),
      );
      return tuple(...perColumn).map((groups): MatchGrid => ({
        format,
        overtimeCount,
        callUp: CALL_UP,
        marks: Object.fromEntries(groups.flat()) as Partial<
          Record<CellKey, Mark>
        >,
      }));
    },
  );
}

const keysOf = (grid: MatchGrid): readonly string[] => Object.keys(grid.marks);

describe("changeFormat properties", () => {
  it("RF-038 RF-040 RF-041: every mark left is on a column of the new grid, and every other is unchanged", () => {
    assert(
      property(gridArb(), formatArb, (grid, target) => {
        const after = changeFormat(grid, target);
        const valid = new Set(
          gridColumns(target, grid.overtimeCount).map(columnKey),
        );

        expect(after.format).toBe(target);
        for (const key of keysOf(after)) {
          expect(valid.has(key.split(":")[1] as never)).toBe(true);
        }
        for (const [key, mark] of Object.entries(grid.marks)) {
          const survives = valid.has(key.split(":")[1] as never);
          expect(after.marks[key as CellKey]).toBe(survives ? mark : undefined);
        }
      }),
    );
  });

  it("RF-041: overtimes and their marks are never lost in any direction", () => {
    assert(
      property(gridArb(), formatArb, (grid, target) => {
        const after = changeFormat(grid, target);
        const overtimeMarks = (g: MatchGrid): readonly string[] =>
          Object.entries(g.marks)
            .filter(([key]) => key.includes(":OT"))
            .map(([key, mark]) => `${key}=${mark}`)
            .sort();

        expect(after.overtimeCount).toBe(grid.overtimeCount);
        expect(overtimeMarks(after)).toEqual(overtimeMarks(grid));
      }),
    );
  });

  it("RF-055: no column of the new grid has more than 5 X", () => {
    assert(
      property(gridArb(), formatArb, (grid, target) => {
        const after = changeFormat(grid, target);

        for (const column of gridColumns(target, after.overtimeCount)) {
          expect(starterCount(after, column)).toBeLessThanOrEqual(5);
        }
      }),
    );
  });

  it("RF-038: the same format returns the same grid", () => {
    assert(
      property(gridArb(), (grid) => {
        expect(changeFormat(grid, grid.format)).toEqual(grid);
      }),
    );
  });

  it("RF-040: going to a format and back never leaves marks the original did not have", () => {
    assert(
      property(gridArb(), formatArb, (grid, target) => {
        const back = changeFormat(changeFormat(grid, target), grid.format);

        for (const [key, mark] of Object.entries(back.marks)) {
          expect(grid.marks[key as CellKey]).toBe(mark);
        }
      }),
    );
  });

  it("RF-040: going to a larger format and back gives back the same grid", () => {
    assert(
      property(gridArb(), (grid) => {
        const larger = FORMATS.filter((format) => format >= grid.format);

        for (const format of larger) {
          expect(changeFormat(changeFormat(grid, format), grid.format)).toEqual(
            grid,
          );
        }
      }),
    );
  });
});
