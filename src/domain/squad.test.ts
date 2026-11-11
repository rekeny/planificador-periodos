// squad.ts holds only types (Team, Player, Match), so these tests check that the types match the
// functions that use them. They fail to compile, and not only at run time, if a field changes.
import { gridColumns } from "@/domain/column";
import type { CallUpEntry } from "@/domain/grid";
import { comparePlayers } from "@/domain/player-order";
import type { Match, Player, Team } from "@/domain/squad";

const team: Team = {
  id: 1,
  name: "Infantil A",
  category: null,
  defaultFormat: 6,
};

const players: readonly Player[] = [
  { id: 1, teamId: team.id, name: "Luis", number: "7", isActive: true },
  { id: 2, teamId: team.id, name: "Ana", number: "7", isActive: true },
  { id: 3, teamId: team.id, name: "Eva", number: "00", isActive: false },
  { id: 4, teamId: team.id, name: "Bea", number: "0", isActive: true },
];

const match: Match = {
  id: 1,
  teamId: team.id,
  format: team.defaultFormat,
  date: "2026-11-11",
  time: null,
  homeName: null,
  awayName: null,
  homeScore: null,
  awayScore: null,
  notes: null,
  overtimeCount: 1,
};

describe("squad types", () => {
  it("RF-016: the players of a team, deactivated ones included, sort by number and then by name", () => {
    expect(
      [...players].sort(comparePlayers).map((player) => player.name),
    ).toEqual(["Bea", "Eva", "Ana", "Luis"]);
  });

  it("RF-042: the call-up entries of those players sort the same way", () => {
    const entries: readonly CallUpEntry[] = players.map((player, index) => ({
      id: index + 10,
      playerId: player.id,
      name: player.name,
      number: player.number,
    }));
    expect(
      [...entries].sort(comparePlayers).map((row) => row.playerId),
    ).toEqual([4, 3, 2, 1]);
  });

  it("RF-042: a match of 6 periods with 1 overtime has 7 columns", () => {
    expect(gridColumns(match.format, match.overtimeCount)).toHaveLength(7);
  });
});
