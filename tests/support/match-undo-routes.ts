// Steps of the tests of the Undo history across the match's own routes (T084). This file holds no
// test calls. It adds to call-up-screen.ts, match-screen-grid.ts and new-player-in-match.ts
// without changing them. Assumed screens: the ones of those files. The stack is built the way the
// app builds it: team screen, then the match screen (`testRouter.push`), then the call-up screen
// and the new-player form pushed on top, so the grid stays mounted below them.
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { squadSpecs, type PlayerSpec } from "./match-session-fixtures";
import { useMockSquadStore } from "./mock-app-stores";
import {
  pressRemove,
  removeButtons,
  startSession,
  type Session,
} from "./call-up-screen";
import { buttonsNamed, cellButtons, UNDO } from "./match-screen-grid";
// `useMockSquadStore` is not a hook: the alias keeps the rules-of-hooks lint from reading it as one.
const giveSquadStore = useMockSquadStore;

/** Nine players, "Jugador 1".."Jugador 8" and Eva (number 9), all called up. */
export function evaSession(): Session {
  const specs = squadSpecs(9).map((spec): PlayerSpec =>
    spec[0] === "Jugador 9" ? ["Eva", "9"] : spec,
  );
  return startSession(specs);
}

/** Waits until the grid is drawn. */
export async function showGrid(): Promise<void> {
  await waitFor(() => expect(cellButtons().length).toBeGreaterThan(0));
}

/** The team screen, then the match pushed on top of it with its route, as the app would. */
export async function openFromTeam(s: Session): Promise<void> {
  giveSquadStore(createSquadStore(s.db));
  await renderRouter("./src/app", { initialUrl: `/teams/${s.teamId}` });
  await screen.findByRole("button", { name: "Nuevo jugador" });
  await testRouter.push(`/matches/${s.matchId}`);
  await showGrid();
}

/** «Convocatoria» of the grid, and waits for the rows of the call-up screen. */
export async function pressCallUp(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Convocatoria" }));
  await waitFor(() => expect(removeButtons().length).toBeGreaterThan(0));
}

/** Removes the player in the call-up screen, confirming when the dialog asks (the player has marks). */
export async function removeAndConfirm(
  s: Session,
  name: string,
): Promise<void> {
  const before = removeButtons().length;
  await pressRemove(s, name);
  await fireEvent.press(await screen.findByRole("button", { name: "Quitar" }));
  await waitFor(() => expect(removeButtons()).toHaveLength(before - 1));
}

/** True when the grid has a row for the player (its cells are drawn). */
export function hasRow(player: string): boolean {
  return (
    screen.queryAllByRole("button", { name: new RegExp(`^${player}, P1: `) })
      .length > 0
  );
}

/** The «Deshacer» button, wherever it is (header or toolbar). */
export function undoButton() {
  const [button] = buttonsNamed(UNDO);
  if (button === undefined) throw new Error("No «Deshacer» button");
  return button;
}
