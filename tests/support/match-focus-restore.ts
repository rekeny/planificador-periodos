// Steps of the tests of the match screen when focus comes back to it after another match route
// (third Codex review, finding 1, RF-057). This file holds no test calls. It adds to
// match-undo-routes.ts and call-up-screen.ts without changing them. The second match is real: it
// lives in the same database as the first one, with its first `count` players called up.
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { createMatch } from "@/data/match-repository";
import { entryOf, matchValues } from "../data/match-fixtures";
import type { Session } from "./call-up-screen";
import { showGrid } from "./match-undo-routes";

export const NOT_FOUND = "No se ha encontrado: puede que se haya borrado.";

/** A second match of the same team that calls up only the first `count` players. */
export function secondMatchOf(s: Session, count: number): number {
  const entries = s.players.slice(0, count).map(entryOf);
  return createMatch(s.db, matchValues(s.teamId), entries).id;
}

/** Pushes the unknown match 999 on top of the grid and goes back to the grid. */
export async function roundTripThroughNotFound(s: Session): Promise<void> {
  await testRouter.push("/matches/999");
  await screen.findByText(NOT_FOUND);
  await testRouter.back();
  expect(screen).toHavePathname(`/matches/${s.matchId}`);
}

/** The session is open for the match and the grid is drawn again. */
export async function gridRestored(s: Session): Promise<void> {
  await waitFor(() => {
    expect(s.store.getState().status).toBe("open");
    expect(s.store.getState().view?.matchId).toBe(s.matchId);
  });
  await showGrid();
}
