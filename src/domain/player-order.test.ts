import {
  assert,
  array,
  constantFrom,
  property,
  record,
  uniqueArray,
} from "fast-check";
import { comparePlayers } from "@/domain/player-order";

interface Sortable {
  readonly name: string;
  readonly number: string;
}

const p = (name: string, number: string): Sortable => ({ name, number });

// Sorts a copy with comparePlayers and shows "number name" so a failure reads well.
function sortedLabels(players: readonly Sortable[]): string[] {
  return [...players]
    .sort(comparePlayers)
    .map((player) => `${player.number} ${player.name}`);
}

describe("comparePlayers", () => {
  it("RF-016: adding players 9, 4 and 7 shows them as 4, 7, 9", () => {
    expect(
      sortedLabels([p("Nico", "9"), p("Diego", "4"), p("Sara", "7")]),
    ).toEqual(["4 Diego", "7 Sara", "9 Nico"]);
  });

  it("RF-016 RF-042: two players with number 7, Luis and Ana, show Ana first", () => {
    expect(sortedLabels([p("Luis", "7"), p("Ana", "7")])).toEqual([
      "7 Ana",
      "7 Luis",
    ]);
  });

  it("RF-016 RF-042 E-020: Luis 00, Ana 0, Eva 10, Bea 7 and Carla 0 show Ana 0, Carla 0, Luis 00, Bea 7, Eva 10", () => {
    expect(
      sortedLabels([
        p("Luis", "00"),
        p("Ana", "0"),
        p("Eva", "10"),
        p("Bea", "7"),
        p("Carla", "0"),
      ]),
    ).toEqual(["0 Ana", "0 Carla", "00 Luis", "7 Bea", "10 Eva"]);
  });

  // Numeric value, not text: "10" is after "9" and "99" after "10".
  it.each([
    ["9", "10"],
    ["10", "99"],
    ["9", "99"],
    ["1", "10"],
    ["2", "10"],
    ["0", "1"],
    ["00", "1"],
  ] as const)(
    "RF-016 RF-042 E-020: number %s sorts before number %s",
    (first, second) => {
      expect(comparePlayers(p("Zoe", first), p("Ana", second))).toBeLessThan(0);
      expect(comparePlayers(p("Ana", second), p("Zoe", first))).toBeGreaterThan(
        0,
      );
    },
  );

  it("RF-016 E-020: '0' sorts before '00' whatever the names are", () => {
    expect(comparePlayers(p("Zoe", "0"), p("Ana", "00"))).toBeLessThan(0);
    expect(comparePlayers(p("Ana", "00"), p("Zoe", "0"))).toBeGreaterThan(0);
  });

  it("RF-016: the number decides before the name", () => {
    expect(comparePlayers(p("Zoe", "3"), p("Ana", "4"))).toBeLessThan(0);
  });

  // Spanish order: case and accents do not move a name to the end of the list.
  it.each([
    ["alba", "Álvaro"],
    ["Álvaro", "Beatriz"],
    ["alba", "Beatriz"],
    ["Nuria", "Ñandú"],
    ["Ñandú", "Olga"],
    ["Ana", "ana maría"],
  ] as const)(
    "RF-016 RF-042: with the same number, %s sorts before %s in Spanish order",
    (first, second) => {
      expect(comparePlayers(p(first, "7"), p(second, "7"))).toBeLessThan(0);
      expect(comparePlayers(p(second, "7"), p(first, "7"))).toBeGreaterThan(0);
    },
  );

  it("RF-016 RF-042: two players with the same name and number compare as equal and keep their order", () => {
    const first = { ...p("Ana", "7"), id: 1 };
    const second = { ...p("Ana", "7"), id: 2 };
    expect(comparePlayers(first, second)).toBe(0);
    expect([first, second].sort(comparePlayers).map((x) => x.id)).toEqual([
      1, 2,
    ]);
    expect([second, first].sort(comparePlayers).map((x) => x.id)).toEqual([
      2, 1,
    ]);
  });

  it("RF-016: a player compared with itself is equal", () => {
    expect(comparePlayers(p("Ana", "0"), p("Ana", "0"))).toBe(0);
    expect(comparePlayers(p("Ana", "00"), p("Ana", "00"))).toBe(0);
  });

  it.each([["07"], [""], ["abc"], ["100"], ["-1"], [" 7"], ["7.5"]])(
    "RF-016: a malformed number %j never throws and gives a real number",
    (number) => {
      const result = comparePlayers(p("Ana", number), p("Bea", "7"));
      expect(Number.isNaN(result)).toBe(false);
      expect(() =>
        [p("Ana", number), p("Bea", "7")].sort(comparePlayers),
      ).not.toThrow();
    },
  );

  it("RF-042: sorting an empty list or a single player works", () => {
    expect(sortedLabels([])).toEqual([]);
    expect(sortedLabels([p("Ana", "0")])).toEqual(["0 Ana"]);
  });

  describe("properties", () => {
    const names = constantFrom(
      "Ana",
      "Álvaro",
      "alba",
      "Bea",
      "Eva",
      "Luis",
      "Ñandú",
      "Zoe",
    );
    const numbers = constantFrom(
      "0",
      "00",
      "1",
      "4",
      "7",
      "9",
      "10",
      "11",
      "20",
      "99",
    );
    const player = record({ name: names, number: numbers });

    it("RF-016 RF-042: the order is antisymmetric", () => {
      assert(
        property(player, player, (a, b) => {
          expect(Math.sign(comparePlayers(a, b))).toBe(
            -Math.sign(comparePlayers(b, a)) || 0,
          );
        }),
      );
    });

    it("RF-016 RF-042: the sorted list does not depend on the order the players were added in", () => {
      assert(
        property(
          uniqueArray(player, {
            selector: (x) => `${x.number}|${x.name}`,
            maxLength: 12,
          }),
          (players) => {
            const reversed = [...players].reverse();
            expect(sortedLabels(reversed)).toEqual(sortedLabels(players));
          },
        ),
      );
    });

    it("RF-016 RF-042: a sorted list is already sorted (neighbours never compare greater)", () => {
      assert(
        property(array(player, { maxLength: 12 }), (players) => {
          const sorted = [...players].sort(comparePlayers);
          for (let index = 1; index < sorted.length; index += 1) {
            const previous = sorted[index - 1];
            const current = sorted[index];
            if (previous && current) {
              expect(comparePlayers(previous, current)).toBeLessThanOrEqual(0);
            }
          }
        }),
      );
    });
  });
});
