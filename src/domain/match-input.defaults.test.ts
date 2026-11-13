import type { Format } from "@/domain/format";
import { newMatchDefaults } from "@/domain/match-input";

describe("newMatchDefaults", () => {
  it("RF-026 RF-036: a team with 6 periods and today 2026-11-11 gives 6 periods, 2026-11-11 and no time", () => {
    expect(newMatchDefaults(6, "2026-11-11")).toStrictEqual({
      format: 6,
      date: "2026-11-11",
      time: null,
    });
  });

  it.each([
    [4, "2026-11-11"],
    [6, "2026-11-11"],
    [8, "2026-11-11"],
  ] as const)(
    "RF-036 RF-084: the team default format %d is the format of the new match",
    (defaultFormat, today) => {
      expect(newMatchDefaults(defaultFormat, today).format).toBe(defaultFormat);
    },
  );

  it.each([
    "2026-12-31",
    "2027-01-01",
    "2028-02-29",
    "1999-01-01",
    "2999-12-31",
  ])(
    "RF-026: today %s is the date as given, in the ISO text of the state layer, with no time and no blocking of past or far future dates",
    (today) => {
      expect(newMatchDefaults(6, today)).toStrictEqual({
        format: 6,
        date: today,
        time: null,
      });
    },
  );

  it("RF-026: two different values of today give two different dates, because the domain never reads the clock", () => {
    const first = newMatchDefaults(6, "2026-11-11");
    const second = newMatchDefaults(6, "2026-11-12");
    expect(first.date).toBe("2026-11-11");
    expect(second.date).toBe("2026-11-12");
  });

  it("RF-026: the same inputs always give the same output, whatever the system clock says", () => {
    jest.useFakeTimers({ now: new Date("2030-05-05T10:00:00Z") });
    try {
      const before = newMatchDefaults(8, "2026-11-11");
      jest.setSystemTime(new Date("2040-01-01T00:00:00Z"));
      const after = newMatchDefaults(8, "2026-11-11");
      expect(before).toStrictEqual({
        format: 8,
        date: "2026-11-11",
        time: null,
      });
      expect(after).toStrictEqual(before);
    } finally {
      jest.useRealTimers();
    }
  });

  it("RF-025 RF-036: every format starts with no time, so a match created without choosing one has no time", () => {
    const formats: readonly Format[] = [4, 6, 8];
    for (const format of formats) {
      expect(newMatchDefaults(format, "2026-11-11").time).toBeNull();
    }
  });
});
