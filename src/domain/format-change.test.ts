import { gridColumns, type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import { changeFormat } from "@/domain/format-change";
import {
  cellKey,
  cellState,
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

describe("changeFormat: marks of periods that disappear", () => {
  it("RF-040 E-016: 8 to 4 periods deletes the marks of P5 to P8 and keeps those of P1 to P4", () => {
    const before = gridWith({
      format: 8,
      marks: [
        [1, period(1), "starter"],
        [2, period(4), "sub"],
        [1, period(5), "starter"],
        [2, period(6), "sub"],
        [3, period(7), "starter"],
        [1, period(8), "starter"],
      ],
    });

    const after = changeFormat(before, 4);

    expect(after.format).toBe(4);
    expect(after.marks).toEqual(
      marksOf([
        [1, period(1), "starter"],
        [2, period(4), "sub"],
      ]),
    );
  });

  it.each([
    { from: 8, to: 6, lost: [7, 8] },
    { from: 8, to: 4, lost: [5, 6, 7, 8] },
    { from: 6, to: 4, lost: [5, 6] },
  ] as const)(
    "RF-038 RF-040: $from to $to periods drops the marks after P$to and keeps the rest",
    ({ from, to, lost }) => {
      const marks = gridColumns(from, 0).map(
        (column) => [1, column, "starter"] as const,
      );

      const after = changeFormat(gridWith({ format: from, marks }), to);

      const kept = gridColumns(to, 0);
      for (const column of gridColumns(from, 0)) {
        const expected = lost.some((n) => column.number === n)
          ? "empty"
          : "starter";
        expect(cellState(after, { entryId: 1, column })).toBe(expected);
      }
      expect(Object.keys(after.marks)).toHaveLength(kept.length);
    },
  );

  it("RF-040: both kinds of mark are kept in surviving periods", () => {
    const before = gridWith({
      format: 6,
      marks: [
        [1, period(2), "starter"],
        [2, period(2), "sub"],
        [3, period(6), "sub"],
      ],
    });

    const after = changeFormat(before, 4);

    expect(cellState(after, { entryId: 1, column: period(2) })).toBe("starter");
    expect(cellState(after, { entryId: 2, column: period(2) })).toBe("sub");
    expect(cellState(after, { entryId: 3, column: period(6) })).toBe("empty");
  });
});

describe("changeFormat: boundaries and the same format", () => {
  it("RF-038 RF-040: 4 to 8 keeps every mark and adds empty P5 to P8", () => {
    const before = gridWith({
      format: 4,
      marks: [
        [1, period(1), "starter"],
        [2, period(4), "sub"],
      ],
    });

    const after = changeFormat(before, 8);

    expect(after.format).toBe(8);
    expect(after.marks).toEqual(before.marks);
    for (const column of gridColumns(8, 0).slice(4)) {
      for (const row of CALL_UP) {
        expect(cellState(after, { entryId: row.id, column })).toBe("empty");
      }
    }
  });

  it("RF-038 RF-040: 4 to 6 and 6 to 8 each keep all the marks", () => {
    const four = gridWith({ format: 4, marks: [[1, period(4), "starter"]] });

    const six = changeFormat(four, 6);
    const eight = changeFormat(six, 8);

    expect(six.marks).toEqual(four.marks);
    expect(eight.marks).toEqual(four.marks);
  });

  it("RF-040: the last surviving period keeps its marks and the first lost one loses them", () => {
    const before = gridWith({
      format: 6,
      marks: [
        [1, period(4), "starter"],
        [1, period(5), "starter"],
      ],
    });

    const after = changeFormat(before, 4);

    expect(after.marks).toEqual(marksOf([[1, period(4), "starter"]]));
  });

  it.each([4, 6, 8] as const)(
    "RF-038: choosing the same format (%i) returns the same grid",
    (format) => {
      const before = gridWith({
        format,
        overtimeCount: 1,
        marks: [
          [1, period(1), "starter"],
          [2, overtime(1), "sub"],
        ],
      });

      expect(changeFormat(before, format)).toEqual(before);
    },
  );

  it("RF-038: an empty grid changes format with no marks appearing", () => {
    const after = changeFormat(gridWith({ format: 8 }), 4);

    expect(after).toEqual(gridWith({ format: 4 }));
  });

  it("RF-040: changing format does not touch the call-up", () => {
    const after = changeFormat(gridWith({ format: 8 }), 6);

    expect(after.callUp).toEqual(CALL_UP);
  });
});
