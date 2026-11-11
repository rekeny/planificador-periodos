import { assert, constantFrom, integer, property, tuple } from "fast-check";
import { callUpRangeWarning } from "@/domain/call-up-range";
import type { Format } from "@/domain/format";

const LIMITS: Readonly<Record<Format, { min: number; max: number }>> = {
  4: { min: 8, max: 12 },
  6: { min: 9, max: 12 },
  8: { min: 8, max: 12 },
};

describe("callUpRangeWarning, spec examples", () => {
  it("RF-005 RF-010 RF-068 E-015: 8 players in 6 periods warn with minimum 9 and count 8", () => {
    expect(callUpRangeWarning(6, 8)).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 8,
    });
  });

  it("RF-005 RF-010 RF-068 E-030: 13 players in 6 periods warn with maximum 12 and count 13", () => {
    expect(callUpRangeWarning(6, 13)).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 13,
    });
  });
});

describe("callUpRangeWarning, boundaries of each format", () => {
  it.each<[Format, number, boolean]>([
    [4, 7, true],
    [4, 8, false],
    [4, 9, false],
    [4, 12, false],
    [4, 13, true],
    [6, 8, true],
    [6, 9, false],
    [6, 10, false],
    [6, 12, false],
    [6, 13, true],
    [8, 7, true],
    [8, 8, false],
    [8, 9, false],
    [8, 12, false],
    [8, 13, true],
  ])(
    "RF-005 RF-068 E-015 E-030: %i periods with %i players gives a warning: %s",
    (format, count, warns) => {
      const warning = callUpRangeWarning(format, count);
      expect(warning !== null).toBe(warns);
    },
  );

  it.each<Format>([4, 6, 8])(
    "RF-005 RF-068: a warning in %i periods carries the limits of that format and the count",
    (format) => {
      const { min, max } = LIMITS[format];
      expect(callUpRangeWarning(format, min - 1)).toEqual({
        format,
        min,
        max,
        count: min - 1,
      });
      expect(callUpRangeWarning(format, max + 1)).toEqual({
        format,
        min,
        max,
        count: max + 1,
      });
    },
  );
});

describe("callUpRangeWarning, odd data and never blocking", () => {
  it.each<Format>([4, 6, 8])(
    "RF-010 RF-068: an empty call-up in %i periods warns with count 0 instead of failing",
    (format) => {
      expect(callUpRangeWarning(format, 0)).toEqual({
        format,
        min: LIMITS[format].min,
        max: 12,
        count: 0,
      });
    },
  );

  it("RF-010 RF-068: a very large call-up still returns a warning, it never throws", () => {
    expect(callUpRangeWarning(8, 40)?.count).toBe(40);
  });

  it("RF-068: the same inputs give the same warning", () => {
    expect(callUpRangeWarning(6, 13)).toEqual(callUpRangeWarning(6, 13));
  });
});

describe("callUpRangeWarning, properties", () => {
  it("RF-005 RF-010 RF-068: warns exactly when the count is outside the limits of the format", () => {
    assert(
      property(
        tuple(constantFrom<Format>(4, 6, 8), integer({ min: 0, max: 30 })),
        ([format, count]) => {
          const { min, max } = LIMITS[format];
          const warning = callUpRangeWarning(format, count);
          if (count >= min && count <= max) return warning === null;
          return (
            warning !== null &&
            warning.count === count &&
            warning.min === min &&
            warning.max === max &&
            warning.format === format
          );
        },
      ),
    );
  });
});
