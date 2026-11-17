import {
  displayDate,
  displayTime,
  isoDate,
  isoTime,
} from "@/domain/match-date";
import { newMatchDefaults } from "@/domain/match-input";

describe("match date and time", () => {
  it.each([
    [{ year: 2026, month: 3, day: 1 }, "2026-03-01"],
    [{ year: 2026, month: 11, day: 11 }, "2026-11-11"],
    [{ year: 2026, month: 1, day: 1 }, "2026-01-01"],
    [{ year: 2026, month: 12, day: 31 }, "2026-12-31"],
    [{ year: 2028, month: 2, day: 29 }, "2028-02-29"],
    [{ year: 2026, month: 9, day: 9 }, "2026-09-09"],
    [{ year: 2026, month: 10, day: 10 }, "2026-10-10"],
  ])(
    "RF-083 E-023 E-032: isoDate of %j is %s, padded with zeros",
    (parts, expected) => {
      expect(isoDate(parts)).toBe(expected);
    },
  );

  it.each([
    [{ hour: 9, minute: 5 }, "09:05"],
    [{ hour: 0, minute: 0 }, "00:00"],
    [{ hour: 23, minute: 59 }, "23:59"],
    [{ hour: 18, minute: 30 }, "18:30"],
    [{ hour: 10, minute: 10 }, "10:10"],
    [{ hour: 0, minute: 9 }, "00:09"],
    [{ hour: 9, minute: 0 }, "09:00"],
  ])(
    "RF-083 E-032: isoTime of %j is %s, in 24 hours padded with zeros",
    (parts, expected) => {
      expect(isoTime(parts)).toBe(expected);
    },
  );

  it.each([
    ["2026-11-11", "11/11/2026"],
    ["2026-03-01", "01/03/2026"],
    ["2026-01-01", "01/01/2026"],
    ["2026-12-31", "31/12/2026"],
    ["2028-02-29", "29/02/2028"],
    ["2026-09-09", "09/09/2026"],
    ["2026-10-10", "10/10/2026"],
  ])(
    "RF-083 E-023 E-032: displayDate of %s is %s, day first and never without zeros",
    (date, expected) => {
      expect(displayDate(date)).toBe(expected);
    },
  );

  it.each([
    ["18:30", "18:30"],
    ["09:05", "09:05"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
    [null, null],
  ])(
    "RF-083 E-032: displayTime of %j is %j, and no time stays no time",
    (time, expected) => {
      expect(displayTime(time)).toBe(expected);
    },
  );

  it("RF-026 RF-083 E-023: a match created on 2026-11-11 shows 11/11/2026 and no time", () => {
    const defaults = newMatchDefaults(6, "2026-11-11");
    expect(displayDate(defaults.date)).toBe("11/11/2026");
    expect(displayTime(defaults.time)).toBeNull();
  });

  it("RF-025 RF-083 E-032: 1 March 2026 at 18:30 shows 01/03/2026 and 18:30, and after Quitar hora shows 01/03/2026 without a time", () => {
    const date = isoDate({ year: 2026, month: 3, day: 1 });
    const time: string | null = isoTime({ hour: 18, minute: 30 });
    expect(displayDate(date)).toBe("01/03/2026");
    expect(displayTime(time)).toBe("18:30");
    const cleared: string | null = null;
    expect(displayDate(date)).toBe("01/03/2026");
    expect(displayTime(cleared)).toBeNull();
  });

  it("RF-083: the same inputs always give the same text, whatever the system clock says", () => {
    jest.useFakeTimers({ now: new Date("2030-05-05T10:00:00Z") });
    try {
      const before = [displayDate("2026-03-01"), displayTime("18:30")];
      jest.setSystemTime(new Date("2040-01-01T00:00:00Z"));
      expect([displayDate("2026-03-01"), displayTime("18:30")]).toEqual(before);
      expect(before).toEqual(["01/03/2026", "18:30"]);
    } finally {
      jest.useRealTimers();
    }
  });
});
