import {
  array,
  assert,
  constantFrom,
  property,
  shuffledSubarray,
} from "fast-check";
import { compareTeams } from "@/domain/team-order";

interface Named {
  readonly id: number;
  readonly name: string;
}

const t = (name: string, id = 0): Named => ({ id, name });

// Sorts a copy with compareTeams and returns the names, so a failure reads well.
function sortedNames(teams: readonly Named[]): string[] {
  return [...teams].sort(compareTeams).map((team) => team.name);
}

describe("compareTeams", () => {
  it("RF-073: teams Cadete B and Alevín A are shown Alevín A first", () => {
    expect(sortedNames([t("Cadete B"), t("Alevín A")])).toEqual([
      "Alevín A",
      "Cadete B",
    ]);
  });

  it("RF-073: Ñandú comes after Nuño, not at the end of the alphabet", () => {
    expect(compareTeams(t("Nuño"), t("Ñandú"))).toBeLessThan(0);
    expect(compareTeams(t("Ñandú"), t("Nuño"))).toBeGreaterThan(0);
    expect(sortedNames([t("Ñandú"), t("Zaragoza"), t("Nuño")])).toEqual([
      "Nuño",
      "Ñandú",
      "Zaragoza",
    ]);
  });

  it("RF-073: álvaro sorts next to Alba, between Alba and Beatriz, not at the end", () => {
    expect(sortedNames([t("Beatriz"), t("álvaro"), t("Alba")])).toEqual([
      "Alba",
      "álvaro",
      "Beatriz",
    ]);
  });

  it.each([
    ["alba", "Beatriz"],
    ["Alba", "beatriz"],
    ["Ana", "ana maría"],
    ["Infantil", "Juvenil"],
    ["Cadete A", "Cadete B"],
    ["Alevín", "Benjamín"],
  ] as const)(
    "RF-073: the team %s sorts before the team %s in Spanish order",
    (first, second) => {
      expect(compareTeams(t(first), t(second))).toBeLessThan(0);
      expect(compareTeams(t(second), t(first))).toBeGreaterThan(0);
    },
  );

  it("RF-014 RF-073: two teams with the same name compare as equal and both are kept in their order", () => {
    const first = t("Alevín A", 1);
    const second = t("Alevín A", 2);
    expect(compareTeams(first, second)).toBe(0);
    expect([first, second].sort(compareTeams).map((x) => x.id)).toEqual([1, 2]);
    expect([second, first].sort(compareTeams).map((x) => x.id)).toEqual([2, 1]);
  });

  it("RF-073: sorting an empty list or a single team works, and a team equals itself", () => {
    expect(sortedNames([])).toEqual([]);
    expect(sortedNames([t("Alevín A")])).toEqual(["Alevín A"]);
    expect(compareTeams(t("Alevín A"), t("Alevín A"))).toBe(0);
  });

  it("RF-073: sorting an already sorted list changes nothing", () => {
    const once = [t("Cadete B", 1), t("Alevín A", 2), t("álvaro", 3)].sort(
      compareTeams,
    );
    expect([...once].sort(compareTeams)).toEqual(once);
  });

  describe("properties", () => {
    const names = [
      "Alevín A",
      "Alevín B",
      "Alba",
      "álvaro",
      "Beatriz",
      "Cadete B",
      "Nuño",
      "Ñandú",
      "Zaragoza",
    ];
    const team = constantFrom(...names).map((name) => t(name));

    it("RF-073: the sorted list does not depend on the order the teams were created in", () => {
      const teamsAndPermutation = array(team, { maxLength: 12 }).chain(
        (teams) =>
          shuffledSubarray(teams, {
            minLength: teams.length,
            maxLength: teams.length,
          }).map((permutation) => ({ teams, permutation })),
      );
      assert(
        property(teamsAndPermutation, ({ teams, permutation }) => {
          expect(sortedNames(permutation)).toEqual(sortedNames(teams));
        }),
      );
    });

    it("RF-073: the order is antisymmetric", () => {
      assert(
        property(team, team, (a, b) => {
          expect(Math.sign(compareTeams(a, b))).toBe(
            -Math.sign(compareTeams(b, a)) || 0,
          );
        }),
      );
    });

    it("RF-073: a sorted list is already sorted (neighbours never compare greater)", () => {
      assert(
        property(array(team, { maxLength: 12 }), (teams) => {
          const sorted = [...teams].sort(compareTeams);
          for (let index = 1; index < sorted.length; index += 1) {
            const previous = sorted[index - 1];
            const current = sorted[index];
            if (previous && current) {
              expect(compareTeams(previous, current)).toBeLessThanOrEqual(0);
            }
          }
        }),
      );
    });
  });
});
