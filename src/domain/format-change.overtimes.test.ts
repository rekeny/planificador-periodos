import { gridColumns, type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import { changeFormat } from "@/domain/format-change";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const CALL_UP: readonly CallUpEntry[] = [1, 2, 3].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

// `marks` lists [entry id, column, mark] triples.
function gridWith(
  options: {
    format?: Format;
    overtimeCount?: number;
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
    callUp: CALL_UP,
    marks,
  };
}

const marksOf = (
  triples: readonly (readonly [number, Column, Mark])[],
): MatchGrid["marks"] => gridWith({ marks: triples }).marks;

describe("changeFormat: overtimes", () => {
  it("RF-041: 6 periods with 1 overtime to 4 periods shows P1 to P4 then OT1 with its marks", () => {
    const before = gridWith({
      format: 6,
      overtimeCount: 1,
      marks: [
        [1, period(2), "starter"],
        [1, period(6), "starter"],
        [2, overtime(1), "starter"],
        [3, overtime(1), "sub"],
      ],
    });

    const after = changeFormat(before, 4);

    expect(after.overtimeCount).toBe(1);
    expect(gridColumns(after.format, after.overtimeCount)).toEqual([
      period(1),
      period(2),
      period(3),
      period(4),
      overtime(1),
    ]);
    expect(after.marks).toEqual(
      marksOf([
        [1, period(2), "starter"],
        [2, overtime(1), "starter"],
        [3, overtime(1), "sub"],
      ]),
    );
  });

  it.each([
    { from: 4, to: 8 },
    { from: 8, to: 4 },
    { from: 6, to: 8 },
    { from: 8, to: 6 },
    { from: 4, to: 6 },
    { from: 6, to: 4 },
  ] as const)(
    "RF-041: $from to $to periods keeps 2 overtimes and all their marks",
    ({ from, to }) => {
      const before = gridWith({
        format: from,
        overtimeCount: 2,
        marks: [
          [1, overtime(1), "starter"],
          [2, overtime(1), "sub"],
          [3, overtime(2), "starter"],
        ],
      });

      const after = changeFormat(before, to);

      expect(after.overtimeCount).toBe(2);
      expect(after.marks).toEqual(before.marks);
    },
  );

  it("RF-041 RF-040: a mark in OT1 is never mistaken for the period that disappears", () => {
    const before = gridWith({
      format: 8,
      overtimeCount: 1,
      marks: [
        [1, period(5), "starter"],
        [1, overtime(1), "sub"],
      ],
    });

    const after = changeFormat(before, 4);

    expect(cellState(after, { entryId: 1, column: overtime(1) })).toBe("sub");
    expect(cellState(after, { entryId: 1, column: period(5) })).toBe("empty");
  });
});

describe("changeFormat: sequences, limit and purity", () => {
  it("RF-040 RF-038: 8 to 4 to 8 leaves P5 to P8 empty and keeps P1 to P4", () => {
    const before = gridWith({
      format: 8,
      marks: [
        [1, period(1), "starter"],
        [2, period(5), "starter"],
        [3, period(8), "sub"],
      ],
    });

    const back = changeFormat(changeFormat(before, 4), 8);

    expect(back.format).toBe(8);
    expect(back.marks).toEqual(marksOf([[1, period(1), "starter"]]));
  });

  it("RF-055: a period with 5 X keeps exactly 5 X after changing format", () => {
    const entryIds = [1, 2, 3, 4, 5];
    const before: MatchGrid = {
      format: 8,
      overtimeCount: 0,
      callUp: entryIds.map((id) => ({
        id,
        playerId: id,
        name: `Player ${id}`,
        number: String(id),
      })),
      marks: Object.fromEntries(
        entryIds.map((entryId) => [
          cellKey({ entryId, column: period(2) }),
          "starter" as const,
        ]),
      ),
    };

    const after = changeFormat(before, 4);

    expect(starterCount(after, period(2))).toBe(5);
  });

  it("RF-040: it does not mutate the grid it receives", () => {
    const before = gridWith({
      format: 8,
      overtimeCount: 1,
      marks: [
        [1, period(7), "starter"],
        [2, overtime(1), "sub"],
      ],
    });
    const snapshot = structuredClone(before);

    changeFormat(before, 4);

    expect(before).toEqual(snapshot);
  });
});
