// T031: the player repository on a migrated in-memory database (RF-016, RF-017, RF-085).
// The repository stores what it is given and lists in database order; the number is text, and
// the sorting and the duplicate-number warning are the domain's and the state layer's.
import { createPlayer, listPlayers } from "@/data/player-repository";
import { createTeam } from "@/data/team-repository";
import {
  FOREIGN_KEY_FAILED,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

const FORTY = "Ñandú «Águila» \"x\" 'y' 🏀 ".padEnd(40, "é").slice(0, 40);

function openWithTeam() {
  const db = createTestDatabase();
  const team = createTeam(db, {
    name: "Alevín A",
    category: null,
    defaultFormat: 6,
  });
  return { db, teamId: team.id };
}

describe("player repository, create and list", () => {
  it("RF-016: createPlayer returns the stored record, active, and listPlayers returns it for that team only", () => {
    const { db, teamId } = openWithTeam();
    const other = createTeam(db, {
      name: "Cadete B",
      category: null,
      defaultFormat: 4,
    });
    const ana = createPlayer(db, { teamId, name: "Ana", number: "7" });
    expect(ana).toEqual({
      id: expect.any(Number),
      teamId,
      name: "Ana",
      number: "7",
      isActive: true,
    });
    expect(listPlayers(db, teamId)).toEqual([ana]);
    expect(listPlayers(db, other.id)).toEqual([]);
  });

  it("RF-016: a team with no players, and an unknown team, give an empty list", () => {
    const { db, teamId } = openWithTeam();
    expect(listPlayers(db, teamId)).toEqual([]);
    expect(listPlayers(db, teamId + 1)).toEqual([]);
  });

  it("RF-016: players come in database order (9, 4, 7 as created), never sorted", () => {
    const { db, teamId } = openWithTeam();
    for (const number of ["9", "4", "7"]) {
      createPlayer(db, { teamId, name: `P${number}`, number });
    }
    expect(listPlayers(db, teamId).map((player) => player.number)).toEqual([
      "9",
      "4",
      "7",
    ]);
  });

  it("RF-016: each team lists only its own players, whichever was created first", () => {
    const { db, teamId } = openWithTeam();
    const other = createTeam(db, {
      name: "Cadete B",
      category: null,
      defaultFormat: 4,
    });
    createPlayer(db, { teamId, name: "Ana", number: "1" });
    createPlayer(db, { teamId: other.id, name: "Eva", number: "2" });
    createPlayer(db, { teamId, name: "Bea", number: "3" });
    expect(listPlayers(db, teamId).map((player) => player.name)).toEqual([
      "Ana",
      "Bea",
    ]);
    expect(listPlayers(db, other.id).map((player) => player.name)).toEqual([
      "Eva",
    ]);
  });

  it("RF-016: the numbers 0 and 00 are stored and read back as two different texts", () => {
    const { db, teamId } = openWithTeam();
    createPlayer(db, { teamId, name: "Ana", number: "0" });
    createPlayer(db, { teamId, name: "Luis", number: "00" });
    const numbers = listPlayers(db, teamId).map((player) => player.number);
    expect(numbers).toEqual(["0", "00"]);
    expect(numbers.every((number) => typeof number === "string")).toBe(true);
  });

  it("RF-016: a player name of 40 characters is stored and read back unchanged", () => {
    const { db, teamId } = openWithTeam();
    createPlayer(db, { teamId, name: FORTY, number: "10" });
    expect(listPlayers(db, teamId)[0]?.name).toBe(FORTY);
  });

  it("RF-016: the repository stores what it is given: spaces around a name are kept", () => {
    const { db, teamId } = openWithTeam();
    createPlayer(db, { teamId, name: " Ana ", number: "7" });
    expect(listPlayers(db, teamId)[0]?.name).toBe(" Ana ");
  });

  it.each([
    "Álvaro Ñ",
    "D'Angelo",
    "Leo 🏀",
    'dice "hola"',
    "x'); DROP TABLE players; --",
    "'; DROP TABLE teams; --",
  ])(
    "RF-016 RF-085: names with accents, emoji, quotes and SQL text are stored as plain text",
    (name) => {
      const { db, teamId } = openWithTeam();
      createPlayer(db, { teamId, name, number: "5" });
      expect(listPlayers(db, teamId)).toMatchObject([{ name }]);
      expect(counts(db)).toMatchObject({ teams: 1, players: 1 });
    },
  );
});

describe("player repository, duplicates and failures", () => {
  it("RF-017: a second player 7 is saved and both are listed", () => {
    const { db, teamId } = openWithTeam();
    createPlayer(db, { teamId, name: "Luis", number: "7" });
    createPlayer(db, { teamId, name: "Ana", number: "7" });
    expect(listPlayers(db, teamId).map((player) => player.name)).toEqual([
      "Luis",
      "Ana",
    ]);
  });

  it("RF-017: a second player with the same name and number is also saved, as another row", () => {
    const { db, teamId } = openWithTeam();
    const first = createPlayer(db, { teamId, name: "Ana", number: "7" });
    const second = createPlayer(db, { teamId, name: "Ana", number: "7" });
    expect(second.id).not.toBe(first.id);
    expect(listPlayers(db, teamId)).toHaveLength(2);
  });

  it("RF-016 RF-085: a player for a team that does not exist throws, writes nothing and the next one is saved", () => {
    const { db, teamId } = openWithTeam();
    const failure = failureOf(() =>
      createPlayer(db, { teamId: teamId + 1, name: "Ghost", number: "1" }),
    );
    expect(failure).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db).players).toBe(0);
    createPlayer(db, { teamId, name: "Ana", number: "7" });
    expect(counts(db).players).toBe(1);
  });
});
