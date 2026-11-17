// Steps of the tests of the new-player-from-the-match route (T047). This file holds no test calls.
// It adds to call-up-screen.ts without changing it. Assumed screens:
//   the call-up screen (`/matches/<id>/call-up`) has a button «Crear jugador nuevo», always shown;
//   the route `/matches/<id>/new-player` is a modal with the header «Nuevo jugador» and the same
//   form as the team's new player: fields «Nombre» and «Dorsal», a button «Guardar», the messages
//   of validation and `error.saveFailed`; when the match session is not open for its id it shows
//   only `notFound.message`. A saved player returns with `router.back()`.
// The stack opened by `openFormFromMatch` is match screen, call-up screen and the form: the screens
// below the form stay drawn, so a text they also show (a banner) can appear more than once.
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { ready } from "./call-up-screen";
import type { Session } from "./call-up-screen";

export const CREATE_PLAYER = "Crear jugador nuevo";

/** The match screen, then «Convocatoria», then «Crear jugador nuevo»: the way the coach gets there. */
export async function openFormFromMatch(session: Session): Promise<void> {
  await renderRouter("./src/app", {
    initialUrl: `/matches/${session.matchId}`,
  });
  await ready();
  await fireEvent.press(screen.getByRole("button", { name: "Convocatoria" }));
  await pressCreatePlayer();
}

/** Presses «Crear jugador nuevo» on the call-up screen and waits for the form. */
export async function pressCreatePlayer(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: CREATE_PLAYER }));
  await screen.findByLabelText("Dorsal");
}

/** The new-player route as the only screen, with the session open, as a deep link would leave it. */
export async function openFormAlone(session: Session): Promise<void> {
  session.store.getState().openMatch(session.matchId);
  await renderRouter("./src/app", {
    initialUrl: `/matches/${session.matchId}/new-player`,
  });
  await screen.findByLabelText("Nombre");
}

/** Any URL as the only screen, once the layout has drawn something. */
export async function openRoute(url: string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: url });
  await ready();
}

/** The texts without repeats: the screens under the form show the same banner as the one on top. */
export function distinct(texts: readonly string[]): string[] {
  return [...new Set(texts)];
}

/** How many entries of the list are exactly `text`. */
export function countOf(list: readonly string[], text: string): number {
  return list.filter((entry) => entry === text).length;
}
