import { assert, integer, property, tuple } from "fast-check";
import {
  displayDate,
  displayTime,
  isoDate,
  isoTime,
} from "@/domain/match-date";

const year = integer({ min: 1000, max: 9999 });
const month = integer({ min: 1, max: 12 });
const day = integer({ min: 1, max: 31 });
const hour = integer({ min: 0, max: 23 });
const minute = integer({ min: 0, max: 59 });

describe("match date and time properties", () => {
  it("RF-083 E-023 E-032: isoDate is always YYYY-MM-DD and displayDate reads back the same day, month and year in the form DD/MM/YYYY", () => {
    assert(
      property(year, month, day, (y, m, d) => {
        const iso = isoDate({ year: y, month: m, day: d });
        expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const shown = displayDate(iso);
        expect(shown).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        const [dd, mm, yyyy] = shown.split("/").map(Number);
        expect([dd, mm, yyyy]).toEqual([d, m, y]);
      }),
    );
  });

  it("RF-083 E-032: isoTime is always HH:MM in 24 hours and displayTime reads back the same hour and minute", () => {
    assert(
      property(hour, minute, (h, min) => {
        const iso = isoTime({ hour: h, minute: min });
        expect(iso).toMatch(/^\d{2}:\d{2}$/);
        const shown = displayTime(iso);
        expect(shown).not.toBeNull();
        const [hh, mm] = (shown ?? "").split(":").map(Number);
        expect([hh, mm]).toEqual([h, min]);
      }),
    );
  });

  it("RF-083: ordering ISO dates as text is the same as ordering the days, so the text keeps its meaning for later sorting", () => {
    const parts = tuple(year, month, day);
    assert(
      property(parts, parts, ([y1, m1, d1], [y2, m2, d2]) => {
        const first = isoDate({ year: y1, month: m1, day: d1 });
        const second = isoDate({ year: y2, month: m2, day: d2 });
        const byParts = y1 - y2 || m1 - m2 || d1 - d2;
        expect(Math.sign(first.localeCompare(second))).toBe(Math.sign(byParts));
      }),
    );
  });
});
