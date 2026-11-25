// Steps of the tests of the player screen (T076). This file holds no test calls. Assumed screens:
//   - the team screen (`/teams/<id>`): every player row is a button whose accessible name contains
//     the player's name (the number and the name are its Texts); the row of a deactivated player has
//     one more Text, «Desactivado» (`player.deactivated`), and the row of an active player has none;
//     pressing a row pushes `/teams/<id>/players/<playerId>`;
//   - the player screen is the form of the new player (fields «Nombre» and «Dorsal», button
//     «Guardar») filled with the player's values, plus a button «Desactivar» (an active player) or
//     «Reactivar» (a deactivated one), all inside the form's scroll container. «Desactivar» opens ONE
//     confirmation dialog (`ChoiceDialog` in confirm mode, a `Modal`) whose confirm button has the
//     same name as the screen's own button, so the dialog's buttons are read inside the dialog;
//     confirming, and «Reactivar», which asks nothing, save at once and go back to the team (the
//     spec does not say where the screen goes; this is the assumption of T076); a failed one shows
//     `error.saveFailed` inside the scroll container and stays on the screen.
// The data is real, on the in-memory database; failures are SQLite triggers.
import { sql } from "drizzle-orm";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { listPlayers } from "@/data/player-repository";
import { createSquadStore } from "@/state/squad-store";
import { textsOf } from "./match-lists";
import { useMockSquadStore } from "./mock-app-stores";
import { resetMockDatabase } from "./mock-database";
import { ALEVIN, CADETE } from "./squad-fixtures";
import type { SquadStore } from "./squad-fixtures";
import { openTeamAlone, seedTeam } from "./team-screen";

export const INACTIVE = "Desactivado";
export const DEACTIVATE = "Desactivar";
export const REACTIVATE = "Reactivar";
export const DEACTIVATE_MESSAGE =
  "No aparecerá en los partidos nuevos. Seguirá en los partidos guardados y podrás reactivarlo.";

export const deactivateTitle = (name: string): string =>
  `¿Desactivar a ${name}?`;

export interface SavedPlayer {
  readonly name: string;
  readonly number: string;
  readonly isActive: boolean;
}

/** What the database holds for the team's players, in database order. */
export function savedRows(db: AppDatabase, teamId: number): SavedPlayer[] {
  return listPlayers(db, teamId).map(({ name, number, isActive }) => ({
    name,
    number,
    isActive,
  }));
}

export function playerIdOf(
  db: AppDatabase,
  teamId: number,
  name: string,
): number {
  const found = listPlayers(db, teamId).find((player) => player.name === name);
  if (found === undefined) throw new Error(`The team has no player ${name}`);
  return found.id;
}

/** Deactivates a player behind the app's back, as a store on another run would. */
export function deactivateDirectly(db: AppDatabase, playerId: number): void {
  db.run(sql`UPDATE players SET is_active = 0 WHERE id = ${playerId}`);
}

/** Gives a player a number behind the app's back, to make two players share one. */
export function renumberDirectly(
  db: AppDatabase,
  playerId: number,
  number: string,
): void {
  db.run(sql`UPDATE players SET number = ${number} WHERE id = ${playerId}`);
}

/** The player route as the only screen, as a deep link would open it. */
export async function openPlayerAlone(
  teamId: number | string,
  playerId: number | string,
): Promise<void> {
  await renderRouter("./src/app", {
    initialUrl: `/teams/${teamId}/players/${playerId}`,
  });
}

/** The row button of a player on the team screen. */
export function rowOf(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole("button", { name: new RegExp(name) });
}

/** The Texts inside a player's row on the team screen. */
export function rowTexts(name: string): string[] {
  return textsOf(rowOf(name));
}

export async function pressRow(name: string): Promise<void> {
  await fireEvent.press(rowOf(name));
}

/** The team screen as the only screen, then the row of the player: the player screen on top of it. */
export async function openPlayerFromTeam(
  teamId: number,
  name: string,
): Promise<void> {
  await openTeamAlone(teamId);
  await pressRow(name);
  await screen.findByLabelText("Dorsal");
}

/** What the two fields of the player screen show now. */
export function fieldValues(): { name: unknown; number: unknown } {
  return {
    name: screen.getByLabelText("Nombre").props.value,
    number: screen.getByLabelText("Dorsal").props.value,
  };
}

/** Whether a node lives inside a `Modal` (the dialogs). */
function inModal(node: ReturnType<typeof screen.getByRole>): boolean {
  let parent = node.parent;
  while (parent !== null) {
    if (parent.type === "Modal") return true;
    parent = parent.parent;
  }
  return false;
}

/** The screen's own «Desactivar» or «Reactivar», not the confirm button of the dialog of the same name. */
export function actionButton(
  label: string,
): ReturnType<typeof screen.getByRole> {
  const own = screen
    .queryAllByRole("button", { name: label })
    .filter((button) => !inModal(button));
  if (own.length !== 1) {
    throw new Error(`Expected one «${label}», found ${own.length}`);
  }
  return own[0]!;
}

export function hasAction(label: string): boolean {
  return (
    screen
      .queryAllByRole("button", { name: label })
      .filter((button) => !inModal(button)).length > 0
  );
}

export async function pressAction(label: string): Promise<void> {
  await fireEvent.press(actionButton(label));
}

/** Waits for the team screen of the team to be the one on top. */
export async function expectOnTeam(teamId: number): Promise<void> {
  await waitFor(() => expect(screen).toHavePathname(`/teams/${teamId}`));
}

/** Counts the calls to the store's `updatePlayer`, and lets the real one run. */
export function spyOnUpdates(store: SquadStore): jest.Mock {
  const calls = jest.fn();
  const state = store.getState();
  store.setState({
    updatePlayer: (playerId, input) => {
      calls(playerId, input);
      return state.updatePlayer(playerId, input);
    },
  });
  return calls;
}

/** Counts the calls to the store's `setPlayerActive`, and lets the real one run. */
export function spyOnActive(store: SquadStore): jest.Mock {
  const calls = jest.fn();
  const state = store.getState();
  store.setState({
    setPlayerActive: (playerId, isActive) => {
      calls(playerId, isActive);
      return state.setPlayerActive(playerId, isActive);
    },
  });
  return calls;
}

/** The name and number that a match's call-up kept for each of its players (RF-019). */
export function callUpSnapshots(
  db: AppDatabase,
  matchId: number,
): { name: string; number: string }[] {
  return db.all<{ name: string; number: string }>(
    sql`SELECT player_name AS name, player_number AS number
        FROM call_up_entries WHERE match_id = ${matchId} ORDER BY id`,
  );
}

// Not a hook: the alias keeps the rules-of-hooks lint from reading it as one.
const giveSquadStore = useMockSquadStore;

/**
 * A new database with «Alevín A» (Juan 7 and Ana 4) and «Cadete B» (Bea 7), and a squad store on it
 * that the screens use. Called from `beforeEach`.
 */
export function seedPlayerScreen(): {
  db: AppDatabase;
  store: SquadStore;
  alevin: number;
  cadete: number;
  juan: number;
  ana: number;
  bea: number;
} {
  const db = resetMockDatabase();
  const alevin = seedTeam(db, ALEVIN, [
    ["Juan", "7"],
    ["Ana", "4"],
  ]);
  const cadete = seedTeam(db, CADETE, [["Bea", "7"]]);
  const store = createSquadStore(db);
  giveSquadStore(store);
  return {
    db,
    store,
    alevin,
    cadete,
    juan: playerIdOf(db, alevin, "Juan"),
    ana: playerIdOf(db, alevin, "Ana"),
    bea: playerIdOf(db, cadete, "Bea"),
  };
}

export const JUAN_AND_ANA: readonly SavedPlayer[] = [
  { name: "Juan", number: "7", isActive: true },
  { name: "Ana", number: "4", isActive: true },
];
