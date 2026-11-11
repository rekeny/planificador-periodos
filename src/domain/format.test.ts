import { assert, double, integer, oneof, property } from "fast-check";
import {
  FORMAT_RULES,
  FORMATS,
  MAX_STARTERS_PER_PERIOD,
  isFormat,
  type Format,
} from "@/domain/format";

// Table of RF-002 to RF-005: format, periods, rule window, minimums and call-up range.
const RULES_TABLE: {
  format: Format;
  periodCount: number;
  windowPeriods: number;
  minPlayed: number;
  minRested: number;
  callUpMin: number;
  callUpMax: number;
}[] = [
  {
    format: 4,
    periodCount: 4,
    windowPeriods: 3,
    minPlayed: 1,
    minRested: 1,
    callUpMin: 8,
    callUpMax: 12,
  },
  {
    format: 6,
    periodCount: 6,
    windowPeriods: 5,
    minPlayed: 2,
    minRested: 2,
    callUpMin: 9,
    callUpMax: 12,
  },
  {
    format: 8,
    periodCount: 8,
    windowPeriods: 6,
    minPlayed: 2,
    minRested: 2,
    callUpMin: 8,
    callUpMax: 12,
  },
];

describe("FORMATS", () => {
  it("RF-001: offers exactly the three formats 4, 6 and 8, in that order", () => {
    expect(FORMATS).toEqual([4, 6, 8]);
  });

  it("RF-001: has a rules entry for each format and for no other", () => {
    expect(Object.keys(FORMAT_RULES).sort()).toEqual(["4", "6", "8"]);
  });
});

describe("FORMAT_RULES", () => {
  it.each(RULES_TABLE)(
    "RF-002: the $format-period format has $periodCount periods and a rule window of the first $windowPeriods",
    ({ format, periodCount, windowPeriods }) => {
      expect(FORMAT_RULES[format].periodCount).toBe(periodCount);
      expect(FORMAT_RULES[format].ruleWindow.periodCount).toBe(windowPeriods);
    },
  );

  it.each(RULES_TABLE)(
    "RF-003: the $format-period format requires at least $minPlayed periods played in the window",
    ({ format, minPlayed }) => {
      expect(FORMAT_RULES[format].ruleWindow.minPlayed).toBe(minPlayed);
    },
  );

  it.each(RULES_TABLE)(
    "RF-004: the $format-period format requires at least $minRested periods rested in the window",
    ({ format, minRested }) => {
      expect(FORMAT_RULES[format].ruleWindow.minRested).toBe(minRested);
    },
  );

  it.each(RULES_TABLE)(
    "RF-005: the $format-period format allows $callUpMin to $callUpMax players in the call-up",
    ({ format, callUpMin, callUpMax }) => {
      expect(FORMAT_RULES[format].callUpMin).toBe(callUpMin);
      expect(FORMAT_RULES[format].callUpMax).toBe(callUpMax);
    },
  );

  it("RF-002 RF-003 RF-004 RF-005: 6 periods gives window of 5 periods, minimums 2 and 2 and call-up 9 to 12", () => {
    expect(FORMAT_RULES[6]).toEqual({
      periodCount: 6,
      ruleWindow: { periodCount: 5, minPlayed: 2, minRested: 2 },
      callUpMin: 9,
      callUpMax: 12,
    });
  });

  it("RF-002 RF-006: the rule window is always shorter than the match, so every format has free periods", () => {
    for (const format of FORMATS) {
      expect(FORMAT_RULES[format].ruleWindow.periodCount).toBeLessThan(
        FORMAT_RULES[format].periodCount,
      );
    }
  });

  it("RF-004: a player can always meet both minimums inside the window", () => {
    for (const format of FORMATS) {
      const { periodCount, minPlayed, minRested } =
        FORMAT_RULES[format].ruleWindow;
      expect(minPlayed + minRested).toBeLessThanOrEqual(periodCount);
    }
  });

  it("RF-005 E-015: 8 players in a 6-period call-up are below the minimum of 9", () => {
    expect(8).toBeLessThan(FORMAT_RULES[6].callUpMin);
  });

  it("RF-005 E-030: 13 players in a 6-period call-up are above the maximum of 12", () => {
    expect(13).toBeGreaterThan(FORMAT_RULES[6].callUpMax);
  });
});

describe("isFormat", () => {
  it.each([4, 6, 8])("RF-001: %i is a format", (value) => {
    expect(isFormat(value)).toBe(true);
  });

  it.each([5, 0, 3, 7, 9, 10, 12, -4, -6, 4.5, 6.0001, NaN, Infinity])(
    "RF-001: %p is not a format",
    (value) => {
      expect(isFormat(value)).toBe(false);
    },
  );

  it("RF-001: is true exactly for the numbers listed in FORMATS", () => {
    assert(
      property(oneof(integer({ min: -20, max: 20 }), double()), (value) => {
        expect(isFormat(value)).toBe(
          (FORMATS as readonly number[]).includes(value),
        );
      }),
    );
  });
});

describe("MAX_STARTERS_PER_PERIOD", () => {
  it("RF-055: a period never has more than 5 X", () => {
    expect(MAX_STARTERS_PER_PERIOD).toBe(5);
  });
});
