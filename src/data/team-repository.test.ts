// T031: the team repository on a migrated in-memory database (RF-013, RF-014, RF-017, RF-085).
// The repository stores what it is given: trimming and an empty category as null belong to the
// domain (T030) and to the state layer, so nothing here expects them. Lists come in database
// order; sorting is the state layer's (review P-01).
import { matches } from "@/data/schema";
import {
  createTeam,
  getTeam,
  listTeams,
  updateTeam,
} from "@/data/team-repository";
import {
  CHECK_FAILED,
  addMatch,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

const FORTY = "Ñandú «Águila» \"x\" 'y' 🏀 ".padEnd(40, "é").slice(0, 40);

const ALEVIN = { name: "Alevín A", category: "2015", defaultFormat: 6 };

describe("team repository, create and read", () => {
  it("RF-013 RF-014: createTeam returns the stored record with a new ID and listTeams has it", () => {
    const db = createTestDatabase();
    const team = createTeam(db, ALEVIN);
    expect(team).toEqual({ id: expect.any(Number), ...ALEVIN });
    expect(typeof team.defaultFormat).toBe("number");
    expect(listTeams(db)).toEqual([team]);
    expect(getTeam(db, team.id)).toEqual(team);
  });

  it("RF-014: two teams are both listed, in the order they were created, not sorted", () => {
    const db = createTestDatabase();
    const zeta = createTeam(db, { ...ALEVIN, name: "Zeta" });
    const alba = createTeam(db, { ...ALEVIN, name: "Alba" });
    expect(alba.id).not.toBe(zeta.id);
    expect(listTeams(db).map((team) => team.name)).toEqual(["Zeta", "Alba"]);
  });

  it("RF-013: with no team, listTeams is empty", () => {
    expect(listTeams(createTestDatabase())).toEqual([]);
  });

  it("RF-013: getTeam of an unknown ID returns nothing and does not throw, with and without other teams", () => {
    const db = createTestDatabase();
    expect(getTeam(db, 1)).toBeUndefined();
    const team = createTeam(db, ALEVIN);
    expect(getTeam(db, team.id + 1)).toBeUndefined();
    expect(getTeam(db, 0)).toBeUndefined();
    expect(getTeam(db, -1)).toBeUndefined();
  });

  it("RF-013: a name and a category of 40 characters are stored and read back unchanged", () => {
    const db = createTestDatabase();
    const { id } = createTeam(db, {
      name: FORTY,
      category: FORTY,
      defaultFormat: 8,
    });
    expect(getTeam(db, id)).toEqual({
      id,
      name: FORTY,
      category: FORTY,
      defaultFormat: 8,
    });
  });

  it("RF-013: a null category is read back as null, never as an empty text or the word null", () => {
    const db = createTestDatabase();
    const { id } = createTeam(db, {
      name: "Mini",
      category: null,
      defaultFormat: 4,
    });
    expect(getTeam(db, id)?.category).toBeNull();
    expect(listTeams(db)[0]?.category).toBeNull();
  });

  it("RF-013: the repository stores what it is given: spaces and an empty category are kept as they came", () => {
    const db = createTestDatabase();
    const first = createTeam(db, {
      name: "  Alevín A  ",
      category: "   ",
      defaultFormat: 6,
    });
    const second = createTeam(db, {
      name: "Mini",
      category: "",
      defaultFormat: 6,
    });
    expect(getTeam(db, first.id)).toMatchObject({
      name: "  Alevín A  ",
      category: "   ",
    });
    expect(getTeam(db, second.id)?.category).toBe("");
  });

  it.each([
    "Álvaro Ñandú",
    "D'Angelo",
    "Equipo 🏀 ñ",
    'dice "hola"',
    "x'); DROP TABLE teams; --",
    "'; DROP TABLE players; --",
  ])(
    "RF-013 RF-014 RF-085: names with accents, emoji, quotes and SQL text are stored as plain text",
    (name) => {
      const db = createTestDatabase();
      createTeam(db, { name: "Other", category: null, defaultFormat: 6 });
      const team = createTeam(db, { name, category: name, defaultFormat: 6 });
      expect(getTeam(db, team.id)).toMatchObject({ name, category: name });
      expect(counts(db).teams).toBe(2);
    },
  );

  it("RF-014: two teams with the same name and category are two rows", () => {
    const db = createTestDatabase();
    const first = createTeam(db, ALEVIN);
    const second = createTeam(db, ALEVIN);
    expect(second.id).not.toBe(first.id);
    expect(listTeams(db)).toHaveLength(2);
  });
});

describe("team repository, update", () => {
  it("RF-013: editing name and category and reading back gives the new data, same ID, one row", () => {
    const db = createTestDatabase();
    const { id } = createTeam(db, {
      name: "Alevín A",
      category: null,
      defaultFormat: 6,
    });
    const updated = updateTeam(db, id, {
      name: "Alevín B",
      category: "2015",
      defaultFormat: 6,
    });
    expect(updated).toEqual({
      id,
      name: "Alevín B",
      category: "2015",
      defaultFormat: 6,
    });
    expect(getTeam(db, id)).toEqual(updated);
    expect(listTeams(db)).toHaveLength(1);
    updateTeam(db, id, { name: "Alevín C", category: null, defaultFormat: 6 });
    expect(getTeam(db, id)).toEqual({
      id,
      name: "Alevín C",
      category: null,
      defaultFormat: 6,
    });
  });

  it("RF-013: changing the default format 6 to 8 reads back 8 and changes no match", () => {
    const db = createTestDatabase();
    const { id } = createTeam(db, ALEVIN);
    addMatch(db, id, { format: 6 });
    updateTeam(db, id, { ...ALEVIN, defaultFormat: 8 });
    expect(getTeam(db, id)?.defaultFormat).toBe(8);
    expect(db.select().from(matches).all()).toMatchObject([{ format: 6 }]);
  });

  it("RF-013 RF-014: editing one team never changes another team", () => {
    const db = createTestDatabase();
    const first = createTeam(db, ALEVIN);
    const other = createTeam(db, {
      name: "Cadete B",
      category: null,
      defaultFormat: 4,
    });
    updateTeam(db, first.id, {
      name: "Zaragoza",
      category: "x",
      defaultFormat: 8,
    });
    expect(getTeam(db, other.id)).toEqual(other);
  });

  it("RF-013: saving the same values again works and changes nothing", () => {
    const db = createTestDatabase();
    const team = createTeam(db, ALEVIN);
    expect(updateTeam(db, team.id, ALEVIN)).toEqual(team);
    expect(getTeam(db, team.id)).toEqual(team);
  });

  it("RF-085: updateTeam of an unknown ID returns nothing, throws nothing and changes no row", () => {
    const db = createTestDatabase();
    const team = createTeam(db, ALEVIN);
    expect(
      updateTeam(db, team.id + 1, {
        name: "Ghost",
        category: "x",
        defaultFormat: 8,
      }),
    ).toBeUndefined();
    expect(listTeams(db)).toEqual([team]);
  });
});

describe("team repository, failing writes", () => {
  it("RF-085: createTeam with a default format of 5 throws the check and leaves nothing written", () => {
    const db = createTestDatabase();
    createTeam(db, ALEVIN);
    expect(
      failureOf(() => createTeam(db, { ...ALEVIN, defaultFormat: 5 })),
    ).toMatch(CHECK_FAILED);
    expect(counts(db).teams).toBe(1);
    expect(createTeam(db, { ...ALEVIN, name: "Next" }).name).toBe("Next");
    expect(counts(db).teams).toBe(2);
  });

  it("RF-085: updateTeam with a default format of 5 throws and leaves the whole team as it was", () => {
    const db = createTestDatabase();
    const team = createTeam(db, ALEVIN);
    const message = failureOf(() =>
      updateTeam(db, team.id, {
        name: "Changed",
        category: "changed",
        defaultFormat: 5,
      }),
    );
    expect(message).toMatch(CHECK_FAILED);
    expect(getTeam(db, team.id)).toEqual(team);
  });
});
