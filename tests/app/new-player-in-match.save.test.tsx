// T047: saving, leaving and failing in the new-player-from-the-match form (RF-035, RF-010, RF-016,
// RF-068, RF-082, RF-085, E-021, E-029). Same doubles as new-player-in-match.form.test.tsx. Failures
// are real SQLite triggers. The route and the button «Crear jugador nuevo» do not exist yet.
import { act, screen, testRouter, waitFor } from "expo-router/testing-library";

import { createMatchSessionStore } from "@/state/match-session-store";
import { squadSpecs } from "../support/match-session-fixtures";
import { savedCallUp, savedTeam } from "../support/match-session-call-up";
import { setMockMatchSessionStore } from "../support/mock-app-stores";
import { presentations } from "../support/screen-presentation";
import { addViaForm, typeNumber, typePlayerName } from "../support/team-screen";
import {
  bannerTexts,
  openMatchScreen,
  pressRemove,
  rangeBanner,
  removeButtons,
  rowsShown,
  shows,
  startSession,
} from "../support/call-up-screen";
import {
  distinct,
  openFormFromMatch,
  pressCreatePlayer,
} from "../support/new-player-in-match";

jest.mock("expo-sqlite", () => {
  throw new Error("expo-sqlite was loaded in Jest");
});
jest.mock("@/data/database", () =>
  jest
    .requireActual<typeof import("../support/mock-database")>(
      "../support/mock-database",
    )
    .mockDatabaseModule(),
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/database-ready", () => ({
  initializeDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/app-stores", () =>
  jest
    .requireActual<typeof import("../support/mock-app-stores")>(
      "../support/mock-app-stores",
    )
    .mockAppStoresModule(),
);

type Session = ReturnType<typeof startSession>;

/** Types and saves from the form opened through the call-up screen, then waits for the way back. */
async function createAndReturn(
  s: Session,
  name: string,
  number: string,
): Promise<void> {
  await addViaForm(name, number);
  await waitFor(() =>
    expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`),
  );
}

describe("new player from the match, saving", () => {
  it("RF-035: «Nora 15» is created in the team and in the call-up, and the form returns to the call-up screen with no second grid", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    await openFormFromMatch(s);
    await createAndReturn(s, "Nora", "15");
    expect(presentations()).toEqual(["push", "push"]);
    expect(removeButtons()).toHaveLength(10);
    expect(shows("Nora")).toBe(true);
    expect(savedTeam(s.db, s.teamId)).toContain("15 Nora");
    expect(savedCallUp(s.db, s.matchId)).toContain("15 Nora");
    expect(s.store.getState().status).toBe("open");
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("RF-035: Nora is in the grid underneath once the call-up screen is closed", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await createAndReturn(s, "Nora", "15");
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(rowsShown().endsWith("9 Jugador 9 15 Nora")).toBe(true);
  });

  it("RF-035 RF-016: a name typed with spaces around is created without them, in the team and in the call-up", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await createAndReturn(s, "  Nora  ", "15");
    expect(savedTeam(s.db, s.teamId)).toContain("15 Nora");
    expect(savedCallUp(s.db, s.matchId)).toContain("15 Nora");
  });

  it.each(["0", "00", "99"])(
    "RF-035 RF-016 E-021: the number «%s» is accepted and the new player is a row of the call-up",
    async (number) => {
      const s = startSession(squadSpecs(9));
      await openFormFromMatch(s);
      await createAndReturn(s, "Nora", number);
      expect(savedCallUp(s.db, s.matchId)).toContain(`${number} Nora`);
      expect(savedTeam(s.db, s.teamId)).toContain(`${number} Nora`);
      expect(removeButtons()).toHaveLength(10);
    },
  );

  it("RF-035 RF-016: a number that another player already has is allowed, and both stay in the team and in the call-up", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await createAndReturn(s, "Nora", "7");
    expect(savedTeam(s.db, s.teamId)).toEqual(
      expect.arrayContaining(["7 Jugador 7", "7 Nora"]),
    );
    expect(savedCallUp(s.db, s.matchId)).toEqual(
      expect.arrayContaining(["7 Jugador 7", "7 Nora"]),
    );
    expect(removeButtons()).toHaveLength(10);
  });
});

describe("new player from the match, sequences", () => {
  it("RF-035 RF-033: creating Nora and then removing her from the call-up leaves her in the team, ready to add again", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await createAndReturn(s, "Nora", "15");
    await pressRemove(s, "Nora");
    await waitFor(() => expect(removeButtons()).toHaveLength(9));
    expect(savedCallUp(s.db, s.matchId)).not.toContain("15 Nora");
    expect(savedTeam(s.db, s.teamId)).toContain("15 Nora");
    expect(s.store.getState().view?.playersToAdd.map((p) => p.name)).toEqual([
      "Nora",
    ]);
  });

  it("RF-035: two players created in a row are both in the team and in the call-up", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await createAndReturn(s, "Nora", "15");
    await pressCreatePlayer();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("");
    await createAndReturn(s, "Olga", "16");
    expect(removeButtons()).toHaveLength(11);
    expect(savedTeam(s.db, s.teamId)).toEqual(
      expect.arrayContaining(["15 Nora", "16 Olga"]),
    );
    expect(savedCallUp(s.db, s.matchId)).toEqual(
      expect.arrayContaining(["15 Nora", "16 Olga"]),
    );
  });

  it("RF-035 RF-010 RF-068: with 12 players in the call-up, creating one more shows the range banner on return and in the match screen", async () => {
    const s = startSession(squadSpecs(12));
    await openFormFromMatch(s);
    expect(bannerTexts()).toEqual([]);
    await createAndReturn(s, "Nora", "15");
    expect(distinct(bannerTexts())).toEqual([rangeBanner(6, 13)]);
    await testRouter.back();
    expect(bannerTexts()).toEqual([rangeBanner(6, 13)]);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(13);
  });
});

describe("new player from the match, leaving and closing", () => {
  it("RF-035 RF-082: going back from a half-filled form asks nothing, creates nothing and shows the call-up as it was", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await typePlayerName("Nora");
    await typeNumber("15");
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`);
    expect(removeButtons()).toHaveLength(9);
    expect(shows("Nora")).toBe(false);
    expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
  });

  it("RF-035 RF-082 E-029: a half-filled form lost when the app closes leaves the team and the call-up with their saved players only", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await typePlayerName("Nora");
    await typeNumber("15");
    await act(async () => screen.unmount());
    setMockMatchSessionStore(createMatchSessionStore(s.db));
    await openMatchScreen(s.matchId);
    expect(rowsShown()).toBe(
      "1 Jugador 1 2 Jugador 2 3 Jugador 3 4 Jugador 4 5 Jugador 5 6 Jugador 6 7 Jugador 7 8 Jugador 8 9 Jugador 9",
    );
    expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
  });

  it("RF-035 RF-082: a player created before the app closes is in the call-up when the match is opened again", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    await createAndReturn(s, "Nora", "15");
    await act(async () => screen.unmount());
    setMockMatchSessionStore(createMatchSessionStore(s.db));
    await openMatchScreen(s.matchId);
    expect(rowsShown().endsWith("9 Jugador 9 15 Nora")).toBe(true);
    expect(savedTeam(s.db, s.teamId)).toContain("15 Nora");
  });
});
