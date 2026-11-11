import { assert, constantFrom, integer, property } from "fast-check";
import {
  columnKey,
  gridColumns,
  isRuleWindowColumn,
  ruleWindowColumns,
  type Column,
  type Overtime,
  type Period,
} from "@/domain/column";
import { FORMAT_RULES, FORMATS, type Format } from "@/domain/format";

const period = (number: number): Period => ({ kind: "period", number });
const overtime = (number: number): Overtime => ({ kind: "overtime", number });

// Rule window (RF-002) per format: the first and the last period inside it and the first one outside.
const WINDOW_TABLE: {
  format: Format;
  last: number;
  firstFree: number;
}[] = [
  { format: 4, last: 3, firstFree: 4 },
  { format: 6, last: 5, firstFree: 6 },
  { format: 8, last: 6, firstFree: 7 },
];

describe("columnKey", () => {
  it.each([
    [period(1), "P1"],
    [period(8), "P8"],
    [overtime(1), "OT1"],
    [overtime(3), "OT3"],
  ] as const)("RF-042: the key of %j is %s", (column, key) => {
    expect(columnKey(column)).toBe(key);
  });

  it("RF-042: a period and an overtime with the same number have different keys", () => {
    expect(columnKey(period(2))).not.toBe(columnKey(overtime(2)));
  });
});

describe("gridColumns", () => {
  it("RF-006: 6 periods and no overtime give P1 to P6 and nothing else", () => {
    expect(gridColumns(6, 0).map(columnKey)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
    ]);
  });

  it.each([
    [4, 4],
    [6, 6],
    [8, 8],
  ] as const)(
    "RF-001 RF-042: the %i-period format has %i period columns when there are no overtimes",
    (format, count) => {
      const columns = gridColumns(format, 0);
      expect(columns).toHaveLength(count);
      expect(columns.every((column) => column.kind === "period")).toBe(true);
      expect(columns.map((column) => column.number)).toEqual(
        Array.from({ length: count }, (_, index) => index + 1),
      );
    },
  );

  it("RF-006: 3 overtimes give OT1 to OT3 after the last period", () => {
    expect(gridColumns(4, 3).map(columnKey)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "OT1",
      "OT2",
      "OT3",
    ]);
  });

  it("RF-006: 1 overtime in 8 periods is OT1 right after P8", () => {
    const columns = gridColumns(8, 1);
    expect(columns).toHaveLength(9);
    expect(columns[7]).toEqual(period(8));
    expect(columns[8]).toEqual(overtime(1));
  });

  it("RF-042: columns are plain period and overtime values", () => {
    expect(gridColumns(4, 1)).toEqual([
      period(1),
      period(2),
      period(3),
      period(4),
      overtime(1),
    ]);
  });

  it("RF-042: calling it twice gives equal results and does not share state", () => {
    const first = gridColumns(6, 2);
    const second = gridColumns(6, 2);
    expect(second).toEqual(first);
    expect(gridColumns(6, 0)).toHaveLength(6);
  });

  it("RF-006: the column count is the period count plus the overtime count and every key is unique", () => {
    assert(
      property(
        constantFrom(...FORMATS),
        integer({ min: 0, max: 12 }),
        (format, overtimeCount) => {
          const columns = gridColumns(format, overtimeCount);
          const keys = columns.map(columnKey);
          expect(columns).toHaveLength(
            FORMAT_RULES[format].periodCount + overtimeCount,
          );
          expect(new Set(keys).size).toBe(keys.length);
          const firstOvertime = columns.findIndex(
            (column) => column.kind === "overtime",
          );
          if (firstOvertime !== -1) {
            expect(firstOvertime).toBe(FORMAT_RULES[format].periodCount);
          }
        },
      ),
    );
  });
});

describe("ruleWindowColumns", () => {
  it.each(WINDOW_TABLE)(
    "RF-002: the rule window of the $format-period format is P1 to P$last",
    ({ format, last }) => {
      expect(ruleWindowColumns(format)).toEqual(
        Array.from({ length: last }, (_, index) => period(index + 1)),
      );
    },
  );

  it("RF-002 E-001: the 6-period window is P1 to P5, where Juan's P4 and P5 can turn light red", () => {
    expect(ruleWindowColumns(6).map(columnKey)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
    ]);
  });

  it.each(FORMATS)(
    "RF-002: the window of the %i-period format has as many periods as its rule says",
    (format) => {
      expect(ruleWindowColumns(format)).toHaveLength(
        FORMAT_RULES[format].ruleWindow.periodCount,
      );
    },
  );

  it.each(FORMATS)(
    "RF-006: the window of the %i-period format only has periods, never overtimes",
    (format) => {
      expect(
        ruleWindowColumns(format).every((column) => column.kind === "period"),
      ).toBe(true);
    },
  );
});

describe("isRuleWindowColumn", () => {
  it.each(WINDOW_TABLE)(
    "RF-002: P$last, the last window period of the $format-period format, is in the window",
    ({ format, last }) => {
      expect(isRuleWindowColumn(format, period(last))).toBe(true);
    },
  );

  it.each(WINDOW_TABLE)(
    "RF-002 RF-006: P$firstFree, the period after the window of the $format-period format, is free",
    ({ format, firstFree }) => {
      expect(isRuleWindowColumn(format, period(firstFree))).toBe(false);
    },
  );

  it.each(WINDOW_TABLE)(
    "RF-002: P1 is in the window of the $format-period format",
    ({ format }) => {
      expect(isRuleWindowColumn(format, period(1))).toBe(true);
    },
  );

  it("RF-002 RF-006 E-008: in 8 periods P1 to P6 are in the window and P7 and P8 are free", () => {
    const results = [1, 2, 3, 4, 5, 6, 7, 8].map((number) =>
      isRuleWindowColumn(8, period(number)),
    );
    expect(results).toEqual([true, true, true, true, true, true, false, false]);
  });

  it("RF-002 RF-006 E-009: in 4 periods P1 to P3 are in the window and P4 is free", () => {
    const results = [1, 2, 3, 4].map((number) =>
      isRuleWindowColumn(4, period(number)),
    );
    expect(results).toEqual([true, true, true, false]);
  });

  it("RF-002 E-001: in 6 periods P1 to P5 are in the window and P6 is free", () => {
    const results = [1, 2, 3, 4, 5, 6].map((number) =>
      isRuleWindowColumn(6, period(number)),
    );
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it.each(
    FORMATS.flatMap((format) =>
      [1, 2, 3, 4, 5, 6].map((n) => [format, n] as const),
    ),
  )(
    "RF-006: in the %i-period format OT%i is not a window column",
    (format, number) => {
      expect(isRuleWindowColumn(format, overtime(number))).toBe(false);
    },
  );

  it.each([
    [4, 3],
    [6, 5],
    [8, 6],
  ] as const)(
    "RF-006: an overtime numbered like the last window period (%i-period format, OT%i) is still free",
    (format, number) => {
      expect(isRuleWindowColumn(format, overtime(number))).toBe(false);
    },
  );

  it("RF-006: no overtime of any format is ever in the window, whatever its number", () => {
    assert(
      property(
        constantFrom(...FORMATS),
        integer({ min: 1, max: 20 }),
        (format, number) => {
          expect(isRuleWindowColumn(format, overtime(number))).toBe(false);
        },
      ),
    );
  });

  it("RF-002 RF-006: a column is in the window exactly when ruleWindowColumns lists it", () => {
    assert(
      property(
        constantFrom(...FORMATS),
        integer({ min: 0, max: 6 }),
        (format, overtimeCount) => {
          const windowKeys = new Set(ruleWindowColumns(format).map(columnKey));
          const columns: readonly Column[] = gridColumns(format, overtimeCount);
          for (const column of columns) {
            expect(isRuleWindowColumn(format, column)).toBe(
              windowKeys.has(columnKey(column)),
            );
          }
          expect(windowKeys.size).toBe(
            FORMAT_RULES[format].ruleWindow.periodCount,
          );
        },
      ),
    );
  });
});
