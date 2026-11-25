import {
  array,
  assert,
  constantFrom,
  property,
  shuffledSubarray,
} from "fast-check";
import { compareMatches } from "./match-order";

interface Slot {
  readonly date: string;
  readonly time: string | null;
}

const slot = (date: string, time: string | null = null): Slot => ({
  date,
  time,
});

// Sorts a copy and returns "date time" texts, so a failure reads well.
function sortedSlots(matches: readonly Slot[]): string[] {
  return [...matches]
    .sort(compareMatches)
    .map((match) => `${match.date} ${match.time ?? "-"}`);
}

// [description, the match that must come first, the match that must come second]
const FIRST_BEFORE_SECOND = [
  ["a later date comes first", slot("2026-11-15"), slot("2026-11-08")],
  ["the 8th comes before the 1st", slot("2026-11-08"), slot("2026-11-01")],
  [
    "the date decides even when the earlier match has the later time",
    slot("2026-11-08", "09:00"),
    slot("2026-11-01", "20:00"),
  ],
  [
    "the date decides even when only the earlier match has a time",
    slot("2026-11-08"),
    slot("2026-11-01", "20:00"),
  ],
  [
    "on the same date 12:00 comes before 10:00",
    slot("2026-11-08", "12:00"),
    slot("2026-11-08", "10:00"),
  ],
  [
    "on the same date 10:00 comes before 09:00 (compared as times, not as text lengths)",
    slot("2026-11-08", "10:00"),
    slot("2026-11-08", "09:00"),
  ],
  [
    "on the same date a match with a time comes before one without",
    slot("2026-11-08", "00:00"),
    slot("2026-11-08"),
  ],
  [
    "2026-01-01 comes before 2025-12-31 (year boundary)",
    slot("2026-01-01"),
    slot("2025-12-31"),
  ],
  [
    "2026-11-01 comes before 2026-02-01 (November is later than February)",
    slot("2026-11-01"),
    slot("2026-02-01"),
  ],
  [
    "2026-11-15 comes before 2026-11-08 (day 15 is later than day 8)",
    slot("2026-11-15"),
    slot("2026-11-08"),
  ],
] as const;

// Every pair here is the same date and time, so the order must say "equal".
const EQUAL = [
  [
    "identical date and time",
    slot("2026-11-08", "10:00"),
    slot("2026-11-08", "10:00"),
  ],
  [
    "two matches without a time on the same date",
    slot("2026-11-08"),
    slot("2026-11-08"),
  ],
] as const;

describe("compareMatches", () => {
  it.each(FIRST_BEFORE_SECOND)(
    "RF-074 RF-075: %s",
    (_description, first, second) => {
      expect(compareMatches(first, second)).toBeLessThan(0);
      expect(compareMatches(second, first)).toBeGreaterThan(0);
    },
  );

  it.each(EQUAL)(
    "RF-074 RF-075: returns 0 for %s",
    (_description, first, second) => {
      expect(compareMatches(first, second)).toBe(0);
      expect(compareMatches(second, first)).toBe(0);
    },
  );

  it("RF-074 RF-075: matches on 2026-11-01, 2026-11-08 and 2026-11-15 are listed 15, 8, 1", () => {
    expect(
      sortedSlots([slot("2026-11-08"), slot("2026-11-01"), slot("2026-11-15")]),
    ).toEqual(["2026-11-15 -", "2026-11-08 -", "2026-11-01 -"]);
  });

  it("RF-074 RF-075: two matches on 2026-11-08 at 10:00 and 12:00 are listed 12:00 first", () => {
    expect(
      sortedSlots([slot("2026-11-08", "10:00"), slot("2026-11-08", "12:00")]),
    ).toEqual(["2026-11-08 12:00", "2026-11-08 10:00"]);
  });

  it("RF-074 RF-075: on one date the times go latest first and the match without a time goes last", () => {
    expect(
      sortedSlots([
        slot("2026-11-08"),
        slot("2026-11-08", "09:00"),
        slot("2026-11-08", "18:30"),
        slot("2026-11-08", "10:00"),
      ]),
    ).toEqual([
      "2026-11-08 18:30",
      "2026-11-08 10:00",
      "2026-11-08 09:00",
      "2026-11-08 -",
    ]);
  });

  it("RF-074 RF-075: matches of the same date and time keep the order they had", () => {
    const first = { ...slot("2026-11-08", "10:00"), id: 1 };
    const second = { ...slot("2026-11-08", "10:00"), id: 2 };
    const third = { ...slot("2026-11-08"), id: 3 };
    const fourth = { ...slot("2026-11-08"), id: 4 };
    expect([fourth, second, third, first].sort(compareMatches)).toEqual([
      second,
      first,
      fourth,
      third,
    ]);
  });

  it("RF-074 RF-075: sorting an empty list or a single match works", () => {
    expect(sortedSlots([])).toEqual([]);
    expect(sortedSlots([slot("2026-11-08", "10:00")])).toEqual([
      "2026-11-08 10:00",
    ]);
  });

  describe("sequences and properties", () => {
    const TEN_MATCHES: readonly Slot[] = [
      slot("2025-12-31", "23:59"),
      slot("2026-01-01"),
      slot("2026-02-01", "09:00"),
      slot("2026-11-01", "10:00"),
      slot("2026-11-01", "09:00"),
      slot("2026-11-01"),
      slot("2026-11-08", "12:00"),
      slot("2026-11-08", "10:00"),
      slot("2026-11-15"),
      slot("2026-11-15", "00:00"),
    ];
    const EXPECTED_ORDER = [
      "2026-11-15 00:00",
      "2026-11-15 -",
      "2026-11-08 12:00",
      "2026-11-08 10:00",
      "2026-11-01 10:00",
      "2026-11-01 09:00",
      "2026-11-01 -",
      "2026-02-01 09:00",
      "2026-01-01 -",
      "2025-12-31 23:59",
    ];
    const SHUFFLED_INDEXES = [
      [6, 2, 9, 0, 4, 8, 1, 5, 3, 7],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      [3, 7, 0, 5, 9, 1, 8, 2, 6, 4],
    ] as const;

    it.each(SHUFFLED_INDEXES)(
      "RF-074 RF-075: a shuffled list of ten matches is sorted into the same order, and sorting it again changes nothing (%#)",
      (...indexes) => {
        const shuffled = indexes.map((index) => TEN_MATCHES[index] as Slot);
        const once = [...shuffled].sort(compareMatches);
        const twice = [...once].sort(compareMatches);
        expect(sortedSlots(shuffled)).toEqual(EXPECTED_ORDER);
        expect(twice).toEqual(once);
      },
    );

    const dates = ["2025-12-31", "2026-01-01", "2026-02-01", "2026-11-01"];
    const times = [null, "00:00", "09:00", "10:00", "12:00", "23:59"];
    const aSlot = constantFrom(...dates).chain((date) =>
      constantFrom(...times).map((time) => slot(date, time)),
    );

    it("RF-074 RF-075: the sorted list does not depend on the order the matches were created in", () => {
      const listAndPermutation = array(aSlot, { maxLength: 12 }).chain((list) =>
        shuffledSubarray(list, {
          minLength: list.length,
          maxLength: list.length,
        }).map((permutation) => ({ list, permutation })),
      );
      assert(
        property(listAndPermutation, ({ list, permutation }) => {
          expect(sortedSlots(permutation)).toEqual(sortedSlots(list));
        }),
      );
    });

    it("RF-074 RF-075: the order is antisymmetric", () => {
      assert(
        property(aSlot, aSlot, (a, b) => {
          expect(Math.sign(compareMatches(a, b))).toBe(
            -Math.sign(compareMatches(b, a)) || 0,
          );
        }),
      );
    });

    it("RF-074 RF-075: neighbours in a sorted list never compare greater", () => {
      assert(
        property(array(aSlot, { maxLength: 12 }), (list) => {
          const sorted = [...list].sort(compareMatches);
          for (let index = 1; index < sorted.length; index += 1) {
            const previous = sorted[index - 1];
            const current = sorted[index];
            if (previous && current) {
              expect(compareMatches(previous, current)).toBeLessThanOrEqual(0);
            }
          }
        }),
      );
    });
  });
});
