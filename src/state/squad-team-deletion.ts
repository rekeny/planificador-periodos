import {
  countTeamContents,
  deleteTeam as removeTeam,
  getTeam,
  listTeams,
} from "@/data/team-repository";
import type { TeamContents } from "@/data/team-repository";
import type { SaveResult } from "@/state/save-result";
import type { SquadContext } from "@/state/squad-player-actions";
import type { Team } from "@/domain/squad";

/** What the team holds, or null when it does not exist or any read fails. Only reads (RF-015). */
export function teamContents(
  context: SquadContext,
  teamId: number,
): TeamContents | null {
  try {
    if (getTeam(context.db, teamId) === undefined) {
      return null;
    }
    return countTeamContents(context.db, teamId);
  } catch {
    return null;
  }
}

/**
 * Deletes the team and drops it from `teams`. The open team stays as it is, so the screens that
 * show it do not redraw as not found; the store remembers it was deleted instead (T075).
 */
export function deleteTeam(context: SquadContext, teamId: number): SaveResult {
  try {
    // The list is read first: after the delete no read is left that could fail (RF-085).
    listTeams(context.db);
    removeTeam(context.db, teamId);
  } catch {
    return { kind: "saveFailed" };
  }
  const { team, teams } = context.get();
  if (team !== null && team.id === teamId) {
    context.deletedOpenTeam.value = true;
  }
  context.set({ teams: teams.filter((other: Team) => other.id !== teamId) });
  return { kind: "saved" };
}
