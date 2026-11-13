// Steps of the match screen and call-up screen tests (T046). This file holds no test calls.
// Assumed screens (the routes do not exist yet; if the Implementer draws them differently, only
// this file changes):
//   `/matches/<id>`          the match screen: one Text per call-up row (the number and the name,
//                            as one Text or two), the range banner, and a button «Convocatoria».
//   `/matches/<id>/call-up`  the call-up screen: the same rows, each with its own button «Quitar de
//                            la convocatoria» (the accessible name may add the player), the range
//                            banner, the players to add under the heading «Añadir a la
//                            convocatoria» (a player is added by pressing their visible name),
//                            `callUp.addEmpty` when there is nobody to add, and `error.saveFailed`.
// Neither screen draws other texts than these and the `callUp.count` line. The session store is the
// real one on the in-memory database of match-session-fixtures.ts; nothing else is mocked.
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import type { Format } from "@/domain/format";
import { setMockMatchSessionStore } from "./mock-app-stores";
import { sessionWithBench } from "./match-session-call-up";
import type { PlayerSpec, SessionOptions } from "./match-session-fixtures";
import { screenTexts } from "./screen-reading";

export const SAVE_FAILED =
  "No se ha podido guardar el cambio. Inténtalo de nuevo.";
export const ADD_EMPTY =
  "No quedan jugadores activos por añadir. Puedes crear uno nuevo.";
export const REMOVE = /Quitar de la convocatoria/;
const CHROME = [
  "Convocatoria",
  "Añadir a la convocatoria",
  "Quitar de la convocatoria",
  "Crear jugador nuevo",
  ADD_EMPTY,
  SAVE_FAILED,
];
const BANNER = /^Convocatoria fuera del rango/;
const COUNT = /convocados$/;
// What the grid of T083 and the buttons of T055 add to the match screen: column headers, counters,
// the X of a mark and the three grid buttons. `rowsShown` leaves them out, so it still reads only
// the call-up rows ("4 Ana 7 Bea").
const GRID_TEXT = /^(PR?\d+|J \d+ · D \d+|X)$/;
const GRID_BUTTONS = ["Deshacer", "Añadir prórroga", "Quitar prórroga"];

export type Session = ReturnType<typeof sessionWithBench>;

/** A session whose store the screens receive from `getMatchSessionStore()`. */
export function startSession(
  calledUp: readonly PlayerSpec[],
  bench: readonly PlayerSpec[] = [],
  options: SessionOptions = {},
): Session {
  const session = sessionWithBench(calledUp, bench, options);
  setMockMatchSessionStore(session.store);
  return session;
}

/** The exact text of the range banner (RF-068); the minimum comes from RF-005. */
export function rangeBanner(format: Format, count: number): string {
  const min = format === 6 ? 9 : 8;
  return `Convocatoria fuera del rango: con ${format} periodos deben ser de ${min} a 12 jugadores, y hay ${count}.`;
}

/** Waits until the layout is ready and the router has drawn something. */
export async function ready(): Promise<void> {
  await waitFor(() => expect(screen.toJSON()).not.toBeNull());
}

/** The match screen as the only screen of the stack, as a deep link would open it. */
export async function openMatchScreen(matchId: number | string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: `/matches/${matchId}` });
  await ready();
}

/** The call-up route as the only screen, with the session already open (the match screen is not below). */
export async function openCallUpAlone(session: Session): Promise<void> {
  session.store.getState().openMatch(session.matchId);
  await renderRouter("./src/app", {
    initialUrl: `/matches/${session.matchId}/call-up`,
  });
  await ready();
}

/** The Texts of the screen without its buttons, banners and messages, joined: "1 Ana 2 Luis". */
export function rowsShown(): string {
  return screenTexts()
    .filter(
      (text) =>
        !CHROME.includes(text) &&
        !GRID_BUTTONS.includes(text) &&
        !GRID_TEXT.test(text) &&
        !BANNER.test(text) &&
        !COUNT.test(text),
    )
    .join(" ");
}

export function bannerTexts(): string[] {
  return screenTexts().filter((text) => BANNER.test(text));
}

/** True when some Text of the screen contains `text` (a row may be "15 Nora" or two Texts). */
export function shows(text: string): boolean {
  return screenTexts().some((shown) => shown.includes(text));
}

export function removeButtons() {
  return screen.queryAllByRole("button", { name: REMOVE });
}

/** Presses the «Quitar de la convocatoria» of the row of that player (rows are in the view's order). */
export async function pressRemove(
  session: Session,
  playerName: string,
): Promise<void> {
  const rows = session.store.getState().view?.rows ?? [];
  const index = rows.findIndex((row) => row.name === playerName);
  const button = removeButtons()[index];
  if (index < 0 || button === undefined) {
    throw new Error(`No remove button for ${playerName}`);
  }
  await fireEvent.press(button);
}

/** Adds a player from the list of players to add, by pressing their visible name. */
export async function pressAdd(playerName: string): Promise<void> {
  await fireEvent.press(screen.getByText(new RegExp(playerName)));
}

export function confirmationShown(): boolean {
  return screen.queryByRole("button", { name: "Cancelar" }) !== null;
}
