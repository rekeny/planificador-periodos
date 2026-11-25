// Steps of the tests of a player deactivated while a match session or a new-match draft is open
// (F-D3-04). This file holds no test calls. It adds to player-screen.ts without changing it. The
// player's edit route is pushed over the screen that holds the session or the draft, «Desactivar» is
// confirmed and the player screen goes back, so the screen under it is focused again with the
// player already deactivated in the database, as the coach does it.
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { press } from "./match-screen-questions";
import { DEACTIVATE, pressAction } from "./player-screen";

/** Pushes the player's route, deactivates him and waits to be back on the route that was below. */
export async function deactivateOver(
  teamId: number,
  playerId: number,
  below: string,
): Promise<void> {
  await testRouter.push(`/teams/${teamId}/players/${playerId}`);
  await screen.findByLabelText("Dorsal");
  await pressAction(DEACTIVATE);
  await press(DEACTIVATE);
  await waitFor(() => expect(screen).toHavePathname(below));
}
