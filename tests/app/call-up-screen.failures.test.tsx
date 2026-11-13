// T046: the call-up screen when the session is not open, when a save fails and when the app is
// closed and opened again (RF-033, RF-034, RF-082, RF-085). Same doubles as match-screen.test.tsx;
// failures are real SQLite triggers. The route `/matches/[matchId]/call-up` does not exist yet.
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { createMatchSessionStore } from "@/state/match-session-store";
import { squadSpecs, writeMark } from "../support/match-session-fixtures";
import {
  allowWrites,
  failWrites,
  savedCallUp,
  savedMarkKeys,
} from "../support/match-session-call-up";
import { NOT_FOUND } from "../support/edit-team";
import { setMockMatchSessionStore } from "../support/mock-app-stores";
import { screenTexts } from "../support/screen-reading";
import {
  SAVE_FAILED,
  openCallUpAlone,
  openMatchScreen,
  pressAdd,
  pressRemove,
  ready,
  removeButtons,
  rowsShown,
  shows,
  startSession,
} from "../support/call-up-screen";

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

const NORA: [string, string] = ["Nora", "15"];

async function openCallUpUrl(url: string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: url });
  await ready();
}

describe("call-up screen, a session that is not open", () => {
  it("RF-033: the call-up route of a match whose session is not open shows only the not-found message", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    await openCallUpUrl(`/matches/${s.matchId}/call-up`);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(removeButtons()).toHaveLength(0);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
  });

  it("RF-033: the call-up route of another match than the open one shows only the not-found message", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    s.store.getState().openMatch(s.matchId);
    await openCallUpUrl(`/matches/${s.matchId + 1}/call-up`);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(removeButtons()).toHaveLength(0);
  });

  it.each(["abc", "0", "01"])(
    "RF-033: /matches/%s/call-up shows only the not-found message even with a match open",
    async (id) => {
      const s = startSession(squadSpecs(9));
      s.store.getState().openMatch(s.matchId);
      await openCallUpUrl(`/matches/${id}/call-up`);
      expect(screenTexts()).toEqual([NOT_FOUND]);
    },
  );
});

describe("call-up screen, a save that fails", () => {
  it("RF-085 RF-032: a failed add shows «No se ha podido guardar el cambio. Inténtalo de nuevo.» and changes nothing", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    failWrites(s.db, "call_up_entries", "INSERT");
    await openCallUpAlone(s);
    await pressAdd("Nora");
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(removeButtons()).toHaveLength(9);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
    expect(shows("Nora")).toBe(true);
  });

  it("RF-085 RF-032: after a failed add, pressing again once the device has space saves it and the message goes", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    failWrites(s.db, "call_up_entries", "INSERT");
    await openCallUpAlone(s);
    await pressAdd("Nora");
    await screen.findByText(SAVE_FAILED);
    allowWrites(s.db, "call_up_entries", "INSERT");
    await pressAdd("Nora");
    await waitFor(() => expect(removeButtons()).toHaveLength(10));
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(savedCallUp(s.db, s.matchId)).toContain("15 Nora");
  });

  it("RF-085 RF-033: a failed removal shows the message and the row stays", async () => {
    const s = startSession(squadSpecs(9));
    failWrites(s.db, "call_up_entries", "DELETE");
    await openCallUpAlone(s);
    await pressRemove(s, "Jugador 3");
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(removeButtons()).toHaveLength(9);
    expect(savedCallUp(s.db, s.matchId)).toContain("3 Jugador 3");
  });

  it("RF-085 RF-034 E-017: a failed removal of a player with marks, after confirming, keeps her row and her marks", async () => {
    const s = startSession(squadSpecs(9));
    writeMark(s.db, s.entryIds[0] ?? 0, "P", 1, "starter");
    failWrites(s.db, "call_up_entries", "DELETE");
    await openCallUpAlone(s);
    await pressRemove(s, "Jugador 1");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Quitar" }),
    );
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(removeButtons()).toHaveLength(9);
    expect(savedMarkKeys(s.db, s.matchId)).toHaveLength(1);
    expect(savedCallUp(s.db, s.matchId)).toContain("1 Jugador 1");
  });
});

describe("call-up screen, the app closed in the middle", () => {
  it("RF-082: after adding one player and removing another, closing the app and opening the match again shows the call-up as it was left", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    await openCallUpAlone(s);
    await pressAdd("Nora");
    await waitFor(() => expect(removeButtons()).toHaveLength(10));
    await pressRemove(s, "Jugador 2");
    await waitFor(() => expect(removeButtons()).toHaveLength(9));
    screen.unmount();
    // A new start: new stores on the same database, nothing from the old session.
    const next = createMatchSessionStore(s.db);
    setMockMatchSessionStore(next);
    expect(next.getState().status).toBe("closed");
    await openMatchScreen(s.matchId);
    expect(rowsShown()).toBe(
      "1 Jugador 1 3 Jugador 3 4 Jugador 4 5 Jugador 5 6 Jugador 6 7 Jugador 7 8 Jugador 8 9 Jugador 9 15 Nora",
    );
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
  });
});
