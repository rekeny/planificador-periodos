// Order of the teams in the list of teams (RF-073).
import type { Team } from "@/domain/squad";

const spanish = new Intl.Collator("es");

// Alphabetical in Spanish order. Equal names compare as 0, so Array.prototype.sort
// keeps both teams in their order (stable, RF-014).
export function compareTeams(
  a: Pick<Team, "name">,
  b: Pick<Team, "name">,
): number {
  return spanish.compare(a.name, b.name);
}
