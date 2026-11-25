// T068: the two match lists of the match repository (RF-074, RF-075, RF-029, RF-082). The lists
// come in database order, so these tests sort by ID: the state layer sorts for the screens.
import {
  deleteMatch,
  listAllMatches,
  listTeamMatches,
  updateMatchDetails,
} from "@/data/match-repository";
import type { MatchListRecord, MatchRecord } from "@/data/records";
import { updateTeam } from "@/data/team-repository";
import {
  addEntry,
  addMatch,
  addPlayer,
  addTeam,
  counts,
} from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

const byId = <T extends { readonly id: number }>(rows: readonly T[]): T[] =>
  [...rows].sort((a, b) => a.id - b.id);

const record = (
  id: number,
  teamId: number,
  values: Partial<MatchRecord> = {},
): MatchRecord => ({
  id,
  teamId,
  format: 6,
  date: "2026-11-11",
  time: null,
  homeName: null,
  awayName: null,
  notes: null,
  homeScore: null,
  awayScore: null,
  overtimeCount: 0,
  ...values,
});

/** Two teams: «Alevín A» (category «Alevín») with two matches and «Cadete B» (no category) with one. */
function openWithTwoTeams() {
  const db = createTestDatabase();
  const alevin = addTeam(db, { name: "Alevín A", category: "Alevín" });
  const cadete = addTeam(db, { name: "Cadete B", category: null });
  const first = addMatch(db, alevin, { date: "2026-11-01" });
  const second = addMatch(db, cadete, {
    date: "2026-11-08",
    time: "10:00",
    format: 4,
  });
  const third = addMatch(db, alevin, {
    date: "2026-11-15",
    format: 8,
    homeName: "Alevín A",
    awayName: "Cadete B",
    homeScore: 72,
    awayScore: 65,
    notes: "Llevar petos",
    overtimeCount: 2,
  });
  return { db, alevin, cadete, first, second, third };
}

describe("match repository, the list of every match", () => {
  it("RF-074: with matches of two teams it returns all of them, each with its team's name and category", () => {
    const { db, alevin, cadete, first, second, third } = openWithTwoTeams();
    const expected: MatchListRecord[] = [
      {
        ...record(first, alevin, { date: "2026-11-01" }),
        teamName: "Alevín A",
        teamCategory: "Alevín",
      },
      {
        ...record(second, cadete, {
          date: "2026-11-08",
          time: "10:00",
          format: 4,
        }),
        teamName: "Cadete B",
        teamCategory: null,
      },
      {
        ...record(third, alevin, {
          date: "2026-11-15",
          format: 8,
          homeName: "Alevín A",
          awayName: "Cadete B",
          homeScore: 72,
          awayScore: 65,
          notes: "Llevar petos",
          overtimeCount: 2,
        }),
        teamName: "Alevín A",
        teamCategory: "Alevín",
      },
    ];
    expect(byId(listAllMatches(db))).toEqual(expected);
  });

  it("RF-074: with no matches it returns an empty list, also when teams exist", () => {
    const db = createTestDatabase();
    expect(listAllMatches(db)).toEqual([]);
    addTeam(db, { name: "Alevín A" });
    expect(listAllMatches(db)).toEqual([]);
  });

  it("RF-074: a team with a null category gives a null teamCategory, not an empty text", () => {
    const db = createTestDatabase();
    const team = addTeam(db, { name: "Mini", category: null });
    addMatch(db, team);
    const [only] = listAllMatches(db);
    expect(only?.teamName).toBe("Mini");
    expect(only?.teamCategory).toBeNull();
  });

  it("RF-074: a team name and category with accents, quotes and a SQL injection attempt come back as written", () => {
    const db = createTestDatabase();
    const name = "Ñandú 'x'); DROP TABLE matches; --";
    const team = addTeam(db, { name, category: '«Infantil» "B" 🏀' });
    addMatch(db, team);
    const [only] = listAllMatches(db);
    expect([only?.teamName, only?.teamCategory]).toEqual([
      name,
      '«Infantil» "B" 🏀',
    ]);
    expect(counts(db).matches).toBe(1);
  });

  it("RF-074: a match is listed once however many players are called up, and two identical matches are two rows", () => {
    const db = createTestDatabase();
    const team = addTeam(db);
    const matchId = addMatch(db, team);
    addMatch(db, team);
    for (let index = 0; index < 12; index += 1) {
      const player = addPlayer(db, team, { number: String(index) });
      addEntry(db, matchId, player);
    }
    expect(listAllMatches(db)).toHaveLength(2);
  });

  it("RF-074: a team that has no matches adds nothing to the list", () => {
    const { db } = openWithTwoTeams();
    addTeam(db, { name: "Sin partidos" });
    expect(listAllMatches(db)).toHaveLength(3);
  });

  it("RF-074 RF-028: after a team is renamed the list shows the new name and category on its matches only", () => {
    const { db, alevin, cadete } = openWithTwoTeams();
    updateTeam(db, alevin, {
      name: "Infantil A",
      category: null,
      defaultFormat: 6,
    });
    const rows = listAllMatches(db);
    const ofAlevin = rows.filter((row) => row.teamId === alevin);
    const ofCadete = rows.filter((row) => row.teamId === cadete);
    expect(ofAlevin.map((row) => [row.teamName, row.teamCategory])).toEqual([
      ["Infantil A", null],
      ["Infantil A", null],
    ]);
    expect(ofCadete.map((row) => [row.teamName, row.teamCategory])).toEqual([
      ["Cadete B", null],
    ]);
  });

  it("RF-074 RF-028: after the details of a match are edited the list shows them, with the team's data kept", () => {
    const { db, alevin, first } = openWithTwoTeams();
    updateMatchDetails(db, first, {
      date: "2026-12-24",
      time: "18:30",
      homeName: "Local B",
      awayName: null,
      homeScore: 0,
      awayScore: 0,
      notes: null,
    });
    const edited = listAllMatches(db).find((row) => row.id === first);
    expect(edited).toEqual({
      ...record(first, alevin, {
        date: "2026-12-24",
        time: "18:30",
        homeName: "Local B",
        homeScore: 0,
        awayScore: 0,
      }),
      teamName: "Alevín A",
      teamCategory: "Alevín",
    });
  });

  it("RF-029 RF-074: after deleting a match the list no longer has it and keeps the others with their team data", () => {
    const { db, first, second, third } = openWithTwoTeams();
    deleteMatch(db, second);
    expect(byId(listAllMatches(db)).map((row) => row.id)).toEqual([
      first,
      third,
    ]);
    expect(listAllMatches(db).map((row) => row.teamName)).toEqual([
      "Alevín A",
      "Alevín A",
    ]);
  });
});

describe("match repository, the list of one team's matches", () => {
  it("RF-075: it returns only that team's matches, as plain match records without the team name or category", () => {
    const { db, alevin, cadete, first, second, third } = openWithTwoTeams();
    const ofAlevin = byId(listTeamMatches(db, alevin));
    expect(ofAlevin.map((row) => row.id)).toEqual([first, third]);
    expect(ofAlevin[0]).toEqual(record(first, alevin, { date: "2026-11-01" }));
    expect(ofAlevin[0]).not.toHaveProperty("teamName");
    expect(ofAlevin[0]).not.toHaveProperty("teamCategory");
    expect(listTeamMatches(db, cadete)).toEqual([
      record(second, cadete, { date: "2026-11-08", time: "10:00", format: 4 }),
    ]);
  });

  it("RF-075: every field of a match comes back as stored, with its score, notes and overtimes", () => {
    const { db, alevin, third } = openWithTwoTeams();
    const stored = listTeamMatches(db, alevin).find((row) => row.id === third);
    expect(stored).toEqual(
      record(third, alevin, {
        date: "2026-11-15",
        format: 8,
        homeName: "Alevín A",
        awayName: "Cadete B",
        homeScore: 72,
        awayScore: 65,
        notes: "Llevar petos",
        overtimeCount: 2,
      }),
    );
  });

  it("RF-075: a team with no matches, and a team ID that does not exist, give an empty list without failing", () => {
    const { db } = openWithTwoTeams();
    const empty = addTeam(db, { name: "Sin partidos" });
    expect(listTeamMatches(db, empty)).toEqual([]);
    expect(listTeamMatches(db, empty + 100)).toEqual([]);
    expect(listTeamMatches(createTestDatabase(), 1)).toEqual([]);
  });

  it("RF-075: two matches of the same team with the same date and time are both listed", () => {
    const db = createTestDatabase();
    const team = addTeam(db);
    addMatch(db, team, { date: "2026-11-08", time: "10:00" });
    addMatch(db, team, { date: "2026-11-08", time: "10:00" });
    expect(listTeamMatches(db, team)).toHaveLength(2);
  });

  it("RF-075 RF-029: after deleting a match of the team the list has the other one, and the other team's list is unchanged", () => {
    const { db, alevin, cadete, first, third } = openWithTwoTeams();
    deleteMatch(db, first);
    expect(listTeamMatches(db, alevin).map((row) => row.id)).toEqual([third]);
    expect(listTeamMatches(db, cadete)).toHaveLength(1);
  });
});
