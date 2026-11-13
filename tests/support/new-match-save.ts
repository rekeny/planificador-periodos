// Steps of the call-up selection and «Guardar» tests of the new-match screen (T044). This file holds
// no test calls. It adds to new-match-form.ts and call-up-screen.ts without changing them. Assumed
// screen, below the fields of T043 and T082:
//   - one selectable control per active player, in the draft's order, each a single element with the
//     role «checkbox» whose checked state is the selection and whose Texts are the number and the
//     name (pressing it toggles the player); a deactivated player has none;
//   - the text `callUp.count` as one Text, «12 convocados»;
//   - the range banner of the match screen (`warning.callUpRange`), drawn only outside the range;
//   - a button «Guardar» and, after a failed save, the `error.saveFailed` banner (role alert).
// After a successful «Guardar» the route is replaced by `/matches/<id>`, the match screen of T046,
// which reads the match session store: `startMatchSession` hands it a real one on the same database.
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { listPlayers } from "@/data/player-repository";
import { createMatchSessionStore } from "@/state/match-session-store";
import { setMockMatchSessionStore } from "./mock-app-stores";
import { deactivate } from "./new-match-fixtures";
import type { NewMatchDraft } from "./new-match-fixtures";
import { ALEVIN } from "./squad-fixtures";
import type { TeamInput } from "./squad-fixtures";
import { seedTeam } from "./team-screen";

export { rangeBanner, rowsShown, bannerTexts } from "./call-up-screen";

type Spec = readonly [name: string, number: string];

/** "Jugador 1".. numbered 1.. */
export function squadOf(count: number): Spec[] {
  return Array.from({ length: count }, (_, index) => [
    `Jugador ${index + 1}`,
    String(index + 1),
  ]);
}

/** «Alevín A» (id 1 on a fresh database) with these players, of the given default format. */
export function seedSquadTeam(
  db: AppDatabase,
  players: readonly Spec[],
  defaultFormat: TeamInput["defaultFormat"] = 6,
): number {
  return seedTeam(db, { ...ALEVIN, defaultFormat }, players);
}

/** Deactivation arrives in D3: the test writes it in the database, by the player's name. */
export function deactivateNamed(
  db: AppDatabase,
  teamId: number,
  name: string,
): void {
  const player = listPlayers(db, teamId).find((one) => one.name === name);
  if (player === undefined) throw new Error(`No player ${name}`);
  deactivate(db, player.id);
}

/** The match session store that the match screen receives once «Guardar» has opened it. */
export function startMatchSession(db: AppDatabase): void {
  setMockMatchSessionStore(createMatchSessionStore(db));
}

export function boxes(): ReturnType<typeof screen.queryAllByRole> {
  return screen.queryAllByRole("checkbox");
}

/** One entry per control, in screen order: its Texts joined ("1 Jugador 1") and whether it is checked. */
export function boxStates(): { text: string; checked: boolean }[] {
  const checked = new Set(screen.queryAllByRole("checkbox", { checked: true }));
  return boxes().map((box) => ({
    text: within(box)
      .queryAllByText(/.+/)
      .map((node) => String(node.props.children))
      .join(" "),
    checked: checked.has(box),
  }));
}

export function checkedCount(): number {
  return boxStates().filter((state) => state.checked).length;
}

/** The names the screen lists, in order, as the player names of the draft's rows that it shows. */
export function listedNames(draft: NewMatchDraft): string[] {
  const states = boxStates();
  return draft
    .getState()
    .callUpSelection.map((row) => row.player.name)
    .filter((name) =>
      states.some((state) => new RegExp(`\\b${name}\\b`).test(state.text)),
    );
}

/** Presses the control of the player at this position of the draft's list. */
export async function toggleAt(index: number): Promise<void> {
  const box = boxes()[index];
  if (box === undefined) throw new Error(`No control at ${index}`);
  await fireEvent.press(box);
}

/** Presses the control of the player with that exact name. */
export async function toggleNamed(
  draft: NewMatchDraft,
  name: string,
): Promise<void> {
  const index = draft
    .getState()
    .callUpSelection.findIndex((row) => row.player.name === name);
  await toggleAt(index);
}

export function saveMatchButton(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole("button", { name: "Guardar" });
}

export async function pressSaveMatch(): Promise<void> {
  await fireEvent.press(saveMatchButton());
}

/** The texts that look like the count, «12 convocados». */
export function countTexts(): string[] {
  return screen
    .queryAllByText(/convocados$/)
    .map((node) => [node.props.children].flat().join(""));
}

export async function waitForPathname(pathname: string): Promise<void> {
  await waitFor(() => expect(screen).toHavePathname(pathname));
}
