import {
  assert,
  array,
  boolean,
  constantFrom,
  property,
  record,
} from "fast-check";
import type { CallUp } from "@/domain/grid";
import { initialCallUp, playersToAdd } from "@/domain/call-up";
import { comparePlayers } from "@/domain/player-order";
import type { Player } from "@/domain/squad";

const player = (
  id: number,
  name: string,
  number: string,
  isActive = true,
): Player => ({ id, teamId: 1, name, number, isActive });

const entryOf = (id: number, who: Player): CallUp[number] => ({
  id,
  playerId: who.id,
  name: who.name,
  number: who.number,
});

const names = (players: readonly Player[]): string[] =>
  players.map((who) => who.name);

const twelveActive: readonly Player[] = Array.from({ length: 12 }, (_, index) =>
  player(index + 1, `Player ${index + 1}`, String(index + 4)),
);

describe("initialCallUp", () => {
  it("RF-030: a team with 12 active players and 1 deactivated starts with exactly the 12 active ones", () => {
    const squad = [...twelveActive, player(13, "Ana", "99", false)];

    const result = initialCallUp(squad);

    expect(result.map((who) => who.id)).toEqual(
      twelveActive.map((who) => who.id),
    );
    expect(result).toHaveLength(12);
  });

  it("RF-030 RF-023: a deactivated player is not in a new call-up even if she has the lowest number", () => {
    const result = initialCallUp([
      player(1, "Ana", "0", false),
      player(2, "Eva", "5"),
    ]);

    expect(names(result)).toEqual(["Eva"]);
  });

  it("RF-030 RF-042: the call-up comes sorted by number, with 0 before 00 and name for the same number", () => {
    const result = initialCallUp([
      player(1, "Luis", "00"),
      player(2, "Eva", "10"),
      player(3, "Bea", "7"),
      player(4, "Carla", "0"),
      player(5, "Ana", "0"),
      player(6, "Zoe", "7"),
    ]);

    expect(names(result)).toEqual([
      "Ana",
      "Carla",
      "Luis",
      "Bea",
      "Zoe",
      "Eva",
    ]);
  });

  it("RF-030: a team with no active players gives an empty call-up", () => {
    expect(
      initialCallUp([
        player(1, "Ana", "4", false),
        player(2, "Eva", "5", false),
      ]),
    ).toEqual([]);
  });

  it("RF-030: a team with no players gives an empty call-up", () => {
    expect(initialCallUp([])).toEqual([]);
  });

  it("RF-030: a team with 13 active players starts with all 13 (the range is only a warning)", () => {
    const squad = Array.from({ length: 13 }, (_, index) =>
      player(index + 1, `P${index + 1}`, String(index + 1)),
    );

    expect(initialCallUp(squad)).toHaveLength(13);
  });

  it("RF-030: it returns the same players, not copies with other data", () => {
    const ana = player(1, "Ana", "4");

    expect(initialCallUp([ana])).toEqual([ana]);
  });

  it("RF-030: it does not reorder or change the list it receives", () => {
    const squad = [player(1, "Luis", "9"), player(2, "Ana", "4")];
    const copy = squad.map((who) => ({ ...who }));

    initialCallUp(squad);

    expect(squad).toEqual(copy);
  });

  it("RF-030 RF-042: for any squad it keeps exactly the active players, sorted", () => {
    const anyPlayer = record({
      name: constantFrom("Ana", "Luis", "Eva", "Álex", "Bea"),
      number: constantFrom("0", "00", "7", "07", "10", "99"),
      isActive: boolean(),
    });
    assert(
      property(array(anyPlayer, { maxLength: 20 }), (generated) => {
        const squad = generated.map((who, index) => ({
          ...who,
          id: index + 1,
          teamId: 1,
        }));

        const result = initialCallUp(squad);

        const expectedIds = squad
          .filter((who) => who.isActive)
          .map((who) => who.id)
          .sort((a, b) => a - b);
        expect(result.map((who) => who.id).sort((a, b) => a - b)).toEqual(
          expectedIds,
        );
        for (let index = 1; index < result.length; index += 1) {
          expect(
            comparePlayers(result[index - 1]!, result[index]!),
          ).toBeLessThanOrEqual(0);
        }
      }),
    );
  });
});

describe("playersToAdd", () => {
  const ana = player(1, "Ana", "4");
  const eva = player(2, "Eva", "5");
  const luis = player(3, "Luis", "6");

  it("RF-032 RF-023: only active players that are not yet in the call-up are offered, sorted", () => {
    const result = playersToAdd(
      [player(5, "Nico", "9"), ana, player(4, "Sara", "2", false), luis, eva],
      [entryOf(10, ana)],
    );

    expect(names(result)).toEqual(["Eva", "Luis", "Nico"]);
  });

  it("RF-032 RF-023: the deactivated players of the team are not offered", () => {
    const result = playersToAdd(
      [ana, player(2, "Eva", "5", false), player(3, "Luis", "6", false)],
      [],
    );

    expect(names(result)).toEqual(["Ana"]);
  });

  it("RF-032: when every active player is in the call-up nobody is offered", () => {
    expect(
      playersToAdd([ana, eva], [entryOf(10, ana), entryOf(11, eva)]),
    ).toEqual([]);
  });

  it("RF-032: with no players or no active ones nobody is offered", () => {
    expect(playersToAdd([], [])).toEqual([]);
    expect(playersToAdd([player(1, "Ana", "4", false)], [])).toEqual([]);
  });

  it("RF-032 RF-030: with an empty call-up every active player is offered", () => {
    expect(names(playersToAdd([eva, ana], []))).toEqual(["Ana", "Eva"]);
  });

  it("RF-032 RF-019: a player in the call-up with an old name or number is still not offered", () => {
    const renamed = player(1, "Ana María", "9");
    const oldEntry = { id: 10, playerId: 1, name: "Ana", number: "4" };

    expect(playersToAdd([renamed, eva], [oldEntry])).toEqual([eva]);
  });

  it("RF-032 RF-023: a player in the call-up who is now deactivated is not offered", () => {
    const deactivated = { ...ana, isActive: false };

    expect(playersToAdd([deactivated], [entryOf(10, ana)])).toEqual([]);
  });

  it("RF-032: a player removed from the call-up is offered again", () => {
    expect(playersToAdd([ana, eva], [entryOf(11, eva)])).toEqual([ana]);
  });

  it("RF-032 RF-042: players sharing a number come sorted by name", () => {
    const result = playersToAdd(
      [player(1, "Luis", "7"), player(2, "Ana", "7")],
      [],
    );

    expect(names(result)).toEqual(["Ana", "Luis"]);
  });

  it("RF-032: it does not change the squad or the call-up it receives", () => {
    const squad = [luis, ana];
    const callUp = [entryOf(10, eva)];

    playersToAdd(squad, callUp);

    expect(squad).toEqual([luis, ana]);
    expect(callUp).toEqual([entryOf(10, eva)]);
  });

  it("RF-032 RF-023: offered players and active players in the call-up together are all the active players, with no overlap", () => {
    assert(
      property(
        array(boolean(), { maxLength: 15 }),
        array(boolean(), { maxLength: 15 }),
        (activeFlags, inFlags) => {
          const squad = activeFlags.map((isActive, index) =>
            player(index + 1, `P${index + 1}`, String(index), isActive),
          );
          const callUp = squad
            .filter((_, index) => inFlags[index] === true)
            .map((who) => entryOf(who.id + 100, who));

          const offered = playersToAdd(squad, callUp).map((who) => who.id);

          const inIds = callUp.map((entry) => entry.playerId);
          const activeIds = squad
            .filter((who) => who.isActive)
            .map((who) => who.id);
          expect(offered.filter((id) => inIds.includes(id))).toEqual([]);
          expect(
            [...offered, ...activeIds.filter((id) => inIds.includes(id))].sort(
              (a, b) => a - b,
            ),
          ).toEqual(activeIds);
        },
      ),
    );
  });
});
