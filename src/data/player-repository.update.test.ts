// T074: editing a player (RF-018, RF-019, RF-020, E-018). updatePlayer touches only the player
// row: the call-up snapshots keep the name and number the player had when they entered a match.
// Failures are real SQLite triggers.
import { addToCallUp } from "@/data/call-up-repository";
import { createMatch } from "@/data/match-repository";
import {
  createPlayer,
  listPlayers,
  setPlayerActive,
  updatePlayer,
} from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import { callUpEntries } from "@/data/schema";
import { counts, failureOf } from "../../tests/data/schema-fixtures";
import { entryOf, matchValues } from "../../tests/data/match-fixtures";
import {
  failPlayerUpdates,
  openWithJuan,
  openWithTwoTeams,
  rowsOfTeam,
} from "../../tests/data/team-delete-fixtures";
import type { createTestDatabase } from "../../tests/support/test-database";

function snapshotsOf(db: ReturnType<typeof createTestDatabase>) {
  return db
    .select()
    .from(callUpEntries)
    .all()
    .map((e) => `${e.playerName} ${e.playerNumber}`);
}

describe("player repository, editing a player", () => {
  it("RF-018 RF-019 E-018: Juan 7 becomes 9; the match created before still holds 7", () => {
    const { db, teamId, juan } = openWithJuan();
    createMatch(db, matchValues(teamId), [entryOf(juan)]);
    const edited = updatePlayer(db, juan.id, { name: "Juan", number: "9" });
    expect(edited).toEqual({ ...juan, number: "9" });
    expect(listPlayers(db, teamId)).toEqual([{ ...juan, number: "9" }]);
    expect(snapshotsOf(db)).toEqual(["Juan 7"]);
    const newer = createMatch(db, matchValues(teamId), [
      entryOf(listPlayers(db, teamId)[0] as PlayerRecord),
    ]);
    expect(newer.id).toBeGreaterThan(0);
    expect(snapshotsOf(db)).toEqual(["Juan 7", "Juan 9"]);
  });

  it("RF-019 E-018: a player added to the older match after the change shows 9 in it, and the entry made before keeps 7", () => {
    const { db, teamId, juan } = openWithJuan();
    const ana = createPlayer(db, { teamId, name: "Ana", number: "7" });
    const old = createMatch(db, matchValues(teamId), [entryOf(ana)]);
    const edited = updatePlayer(db, juan.id, { name: "Juan", number: "9" });
    addToCallUp(db, old.id, {
      playerId: juan.id,
      name: edited?.name ?? "",
      number: edited?.number ?? "",
    });
    expect(snapshotsOf(db).sort()).toEqual(["Ana 7", "Juan 9"]);
  });

  it.each([
    ["name only", { name: "Juanito", number: "7" }],
    ["number only", { name: "Juan", number: "9" }],
    ["name and number", { name: "Juanito", number: "9" }],
    ["number 00, kept as text", { name: "Juan", number: "00" }],
    ["number 0, kept as text", { name: "Juan", number: "0" }],
    ["the same values", { name: "Juan", number: "7" }],
  ])("RF-018: %s is stored as given and returned", (_label, input) => {
    const { db, teamId, juan } = openWithJuan();
    expect(updatePlayer(db, juan.id, input)).toEqual({ ...juan, ...input });
    expect(listPlayers(db, teamId)).toEqual([{ ...juan, ...input }]);
  });

  it("RF-018: editing keeps the player's team, ID and active flag, also when deactivated", () => {
    const { db, juan } = openWithJuan();
    setPlayerActive(db, juan.id, false);
    expect(updatePlayer(db, juan.id, { name: "Juanito", number: "9" })).toEqual(
      { ...juan, name: "Juanito", number: "9", isActive: false },
    );
  });

  it("RF-018 RF-019: editing a player changes only that row: every other row of every table stays", () => {
    const { db, first, second } = openWithTwoTeams();
    const before = counts(db);
    const otherTeam = rowsOfTeam(db, second.teamId);
    const matchesBefore = rowsOfTeam(db, first.teamId);
    updatePlayer(db, first.playerIds[0] as number, {
      name: "Juanito",
      number: "9",
    });
    expect(counts(db)).toEqual(before);
    expect(rowsOfTeam(db, second.teamId)).toEqual(otherTeam);
    const after = rowsOfTeam(db, first.teamId);
    expect(after.matches).toEqual(matchesBefore.matches);
    expect(after.entries).toEqual(matchesBefore.entries);
    expect(after.marks).toEqual(matchesBefore.marks);
    expect(after.players.slice(1)).toEqual(matchesBefore.players.slice(1));
    expect(after.players[0]).toMatchObject({ name: "Juanito", number: "9" });
  });

  it("RF-018: an unknown ID returns undefined and changes nothing", () => {
    const { db, juan } = openWithJuan();
    const before = listPlayers(db, juan.teamId);
    for (const id of [juan.id + 1, 0, -1]) {
      expect(updatePlayer(db, id, { name: "X", number: "1" })).toBeUndefined();
    }
    expect(listPlayers(db, juan.teamId)).toEqual(before);
    expect(counts(db).players).toBe(1);
  });

  it("RF-020: the same name and number in two teams: editing one leaves the other", () => {
    const { db, first, second } = openWithTwoTeams();
    const [juanA] = rowsOfTeam(db, first.teamId).players;
    const [juanB] = rowsOfTeam(db, second.teamId).players;
    expect(juanA).toMatchObject({ name: "Juan", number: "7" });
    expect(juanB).toMatchObject({ name: "Juan", number: "7" });
    updatePlayer(db, juanA?.id as number, { name: "Juan", number: "9" });
    expect(rowsOfTeam(db, second.teamId).players[0]).toEqual(juanB);
    expect(rowsOfTeam(db, first.teamId).players[0]).toMatchObject({
      number: "9",
    });
  });

  it("RF-020 RF-017: two players of one team with the same name and number: the edit goes to the one asked for", () => {
    const { db, teamId, juan } = openWithJuan();
    const twin = createPlayer(db, { teamId, name: "Juan", number: "7" });
    updatePlayer(db, twin.id, { name: "Juan", number: "8" });
    expect(listPlayers(db, teamId)).toEqual([juan, { ...twin, number: "8" }]);
  });

  it("RF-018: odd text is stored as text and no table is touched", () => {
    const { db, teamId, juan } = openWithJuan();
    const injection = "x'); DROP TABLE players; --";
    expect(
      updatePlayer(db, juan.id, { name: injection, number: "1 OR 1=1" }),
    ).toMatchObject({ name: injection, number: "1 OR 1=1" });
    expect(listPlayers(db, teamId)).toEqual([
      { ...juan, name: injection, number: "1 OR 1=1" },
    ]);
    expect(counts(db).players).toBe(1);
    const emoji = "Ñandú «Águila» 🏀".padEnd(40, "é").slice(0, 40);
    expect(updatePlayer(db, juan.id, { name: emoji, number: "99" })?.name).toBe(
      emoji,
    );
  });

  it("RF-018 RF-082: a write that fails throws and leaves the player as it was", () => {
    const { db, teamId, juan } = openWithJuan();
    failPlayerUpdates(db);
    expect(
      failureOf(() =>
        updatePlayer(db, juan.id, { name: "Juanito", number: "9" }),
      ),
    ).toMatch(/disk full/);
    expect(listPlayers(db, teamId)).toEqual([juan]);
  });
});
