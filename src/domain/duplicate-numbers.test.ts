import {
  array,
  assert,
  boolean,
  constantFrom,
  property,
  record,
} from "fast-check";
import { duplicateNumbers } from "@/domain/duplicate-numbers";
import type { Player } from "@/domain/squad";

// Inline helper: a player of team 1; ids come from the position in the list.
const p = (id: number, number: string, isActive = true): Player => ({
  id,
  teamId: 1,
  name: `Player ${id}`,
  number,
  isActive,
});

// The order of the result is not specified, so compare it sorted.
const sorted = (numbers: readonly string[]): string[] => [...numbers].sort();

describe("duplicateNumbers", () => {
  it("RF-017 RF-069: two active players with number 7 give the warning for 7", () => {
    expect(sorted(duplicateNumbers([p(1, "7"), p(2, "7")]))).toEqual(["7"]);
  });

  it("RF-069: three active players with number 7 give 7 once", () => {
    expect(duplicateNumbers([p(1, "7"), p(2, "7"), p(3, "7")])).toEqual(["7"]);
  });

  it("RF-069: two different shared numbers, 7 and 10, are both listed once", () => {
    expect(
      sorted(
        duplicateNumbers([
          p(1, "7"),
          p(2, "10"),
          p(3, "7"),
          p(4, "10"),
          p(5, "4"),
        ]),
      ),
    ).toEqual(["10", "7"]);
  });

  it.each([
    ["no players", []],
    ["one player", [p(1, "7")]],
    ["all different numbers", [p(1, "7"), p(2, "8"), p(3, "9")]],
  ] as const)("RF-069: %s give no warning", (_label, players) => {
    expect(duplicateNumbers(players)).toEqual([]);
  });

  it.each([
    ["0 and 00", "0", "00"],
    ["7 and 07", "7", "07"],
    ["1 and 10", "1", "10"],
  ] as const)(
    "RF-016 RF-069: %s are different numbers, no warning",
    (_label, a, b) => {
      expect(duplicateNumbers([p(1, a), p(2, b)])).toEqual([]);
    },
  );

  it.each(["0", "00"] as const)(
    "RF-069: two active players with number %s give the warning",
    (number) => {
      expect(duplicateNumbers([p(1, number), p(2, number)])).toEqual([number]);
    },
  );

  it("RF-069: an active 7 and a deactivated 7 give no warning", () => {
    expect(duplicateNumbers([p(1, "7"), p(2, "7", false)])).toEqual([]);
  });

  it("RF-069: two deactivated players with number 7 give no warning", () => {
    expect(duplicateNumbers([p(1, "7", false), p(2, "7", false)])).toEqual([]);
  });

  it("RF-069: a deactivated 7 does not make a third player's 7 count twice or hide the pair", () => {
    expect(duplicateNumbers([p(1, "7"), p(2, "7", false), p(3, "7")])).toEqual([
      "7",
    ]);
  });

  it("RF-017 RF-069: changing one of two active 7 to 8 removes the warning", () => {
    const before = [p(1, "7"), p(2, "7")];
    expect(duplicateNumbers(before)).toEqual(["7"]);
    const after = [before[0]!, { ...before[1]!, number: "8" }];
    expect(duplicateNumbers(after)).toEqual([]);
  });

  it("RF-069: deactivating one of two active 7 removes the warning and reactivating brings it back", () => {
    const both = [p(1, "7"), p(2, "7")];
    const oneOut = [both[0]!, { ...both[1]!, isActive: false }];
    expect(duplicateNumbers(oneOut)).toEqual([]);
    expect(duplicateNumbers(both)).toEqual(["7"]);
  });

  it("RF-017: it never rejects a player, so the input is returned untouched and nothing is thrown", () => {
    const players = [p(1, "7"), p(2, "7"), p(3, "7", false)];
    const copy = JSON.parse(JSON.stringify(players)) as Player[];
    expect(() => duplicateNumbers(players)).not.toThrow();
    expect(players).toEqual(copy);
  });

  describe("properties", () => {
    const playersArb = array(
      record({
        number: constantFrom("0", "00", "1", "7", "10", "99"),
        isActive: boolean(),
      }),
      { maxLength: 12 },
    ).map((items) =>
      items.map((item, i) => p(i + 1, item.number, item.isActive)),
    );

    it("RF-069: a number is listed exactly when two or more active players have it, and never twice", () => {
      assert(
        property(playersArb, (players) => {
          const result = duplicateNumbers(players);
          const counts = new Map<string, number>();
          for (const player of players) {
            if (player.isActive) {
              counts.set(player.number, (counts.get(player.number) ?? 0) + 1);
            }
          }
          const expected = [...counts]
            .filter(([, count]) => count >= 2)
            .map(([number]) => number);
          expect(sorted(result)).toEqual(sorted(expected));
          expect(new Set(result).size).toBe(result.length);
        }),
      );
    });

    it("RF-069: deactivated players never change the result", () => {
      assert(
        property(playersArb, (players) => {
          const onlyActive = players.filter((player) => player.isActive);
          expect(sorted(duplicateNumbers(players))).toEqual(
            sorted(duplicateNumbers(onlyActive)),
          );
        }),
      );
    });
  });
});
