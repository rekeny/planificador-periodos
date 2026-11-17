// Steps of the two-form navigation tests (fourth Codex review, finding 2, RF-025, RF-082). This
// file holds no test calls. Two new-match forms are mounted in the same stack (team A's, then team
// B's pushed over it) and the coach goes Back to the first: «Guardar» there must save for the team
// in ITS route, with that team's players, whatever the shared draft held meanwhile.
import { screen, testRouter } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { savedEntryLabels, savedMatches } from "./new-match-fixtures";
import { openFormFromTeam } from "./new-match-form";
import { boxStates, pressSaveMatch, waitForPathname } from "./new-match-save";

/** The form of the team with that name (from the list), then the form of team `otherId` over it. */
export async function openThenPushOther(
  name: string,
  otherId: number,
): Promise<void> {
  await openFormFromTeam(name);
  await testRouter.push(`/teams/${otherId}/matches/new`);
  await screen.findByLabelText("Local");
  expect(screen).toHavePathname(`/teams/${otherId}/matches/new`);
}

/** Back to the first form; reads its pathname and waits for the form to be drawn. */
export async function backToFirst(teamId: number): Promise<void> {
  await testRouter.back();
  expect(screen).toHavePathname(`/teams/${teamId}/matches/new`);
  await screen.findByLabelText("Local");
}

/** Matches saved per team, in team id order: [matches of team 1, matches of team 2]. */
export function matchesPerTeam(db: AppDatabase): number[] {
  const all = savedMatches(db);
  return [1, 2].map((id) => all.filter((match) => match.teamId === id).length);
}

/** The players the call-up list of the form shows, as "number name" texts. */
export function listedPlayers(): string[] {
  return boxStates().map((state) => state.text);
}

/** Presses «Guardar», waits for the match screen and returns the saved call-up of match 1. */
export async function saveAndRead(db: AppDatabase): Promise<string[]> {
  await pressSaveMatch();
  await waitForPathname("/matches/1");
  return savedEntryLabels(db, 1);
}
