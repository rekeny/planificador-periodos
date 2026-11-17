// T046: the first version of the match screen `/matches/[matchId]` (RF-033, RF-068, RF-057). Real
// src/app routes through renderRouter with the real match session store on the in-memory
// database; only expo-sqlite, the splash screen, initializeDatabase and the store getters of
// `@/state/app-stores` are doubles. The routes `/matches/[matchId]` and its `call-up` do not exist
// yet. The assumed shape of both screens is described in tests/support/call-up-screen.ts.
import { fireEvent, screen, testRouter } from "expo-router/testing-library";

import type { Format } from "@/domain/format";
import { breakReads, squadSpecs } from "../support/match-session-fixtures";
import { undoEntryOf } from "../support/match-session-call-up";
import { NOT_FOUND } from "../support/edit-team";
import { presentations } from "../support/screen-presentation";
import { headerConfigs, screenTexts } from "../support/screen-reading";
import {
  bannerTexts,
  openMatchScreen,
  rangeBanner,
  ready,
  removeButtons,
  rowsShown,
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

const RANGE: [Format, number, boolean][] = [
  [6, 8, true],
  [6, 9, false],
  [6, 12, false],
  [6, 13, true],
  [6, 0, true],
  [4, 7, true],
  [4, 8, false],
  [8, 7, true],
  [8, 8, false],
];

describe("match screen, opening the session", () => {
  it("RF-033: /matches/1 opens the match by itself and lists its call-up in order", async () => {
    const s = startSession([
      ["Bea", "7"],
      ["Ana", "4"],
      ["Luis", "9"],
    ]);
    expect(s.store.getState().status).toBe("closed");
    await openMatchScreen(s.matchId);
    expect(s.store.getState().status).toBe("open");
    expect(rowsShown()).toBe("4 Ana 7 Bea 9 Luis");
  });

  it("RF-033: the players of the team who are not in the call-up are not listed in the match screen", async () => {
    const s = startSession([["Ana", "4"]], [["Nora", "15"]]);
    await openMatchScreen(s.matchId);
    expect(rowsShown()).toBe("4 Ana");
  });

  it("RF-033: players with the numbers «0» and «00» are listed in order, before «1»", async () => {
    const s = startSession([
      ["Uno", "1"],
      ["Doble", "00"],
      ["Cero", "0"],
    ]);
    await openMatchScreen(s.matchId);
    expect(rowsShown()).toBe("0 Cero 00 Doble 1 Uno");
  });

  it("RF-033: a call-up of 0 players shows no rows and the range banner", async () => {
    const s = startSession([]);
    await openMatchScreen(s.matchId);
    expect(rowsShown()).toBe("");
    expect(bannerTexts()).toEqual([rangeBanner(6, 0)]);
  });

  it("RF-033: the match screen has no header title", async () => {
    const s = startSession(squadSpecs(9));
    await openMatchScreen(s.matchId);
    expect(screen.getByRole("button", { name: "Convocatoria" })).toBeTruthy();
    const titles = headerConfigs()
      .filter((config) => config.hidden !== true)
      .map((config) => config.title)
      .filter((title) => typeof title === "string" && title !== "");
    expect(titles).toEqual([]);
  });
});

describe("match screen, range banner", () => {
  it.each(RANGE)(
    "RF-068 E-015 E-030: %s periods with %s players → banner shown: %s",
    async (format, count, shown) => {
      const s = startSession(squadSpecs(count), [], { format });
      await openMatchScreen(s.matchId);
      // The screen is really drawn, so "no banner" is not just an empty page.
      expect(screen.getByRole("button", { name: "Convocatoria" })).toBeTruthy();
      expect(rowsShown() === "").toBe(count === 0);
      expect(bannerTexts()).toEqual(shown ? [rangeBanner(format, count)] : []);
    },
  );
});

describe("match screen, a match that cannot be shown", () => {
  it.each(["abc", "0", "01", "1.5", "-1"])(
    "RF-033: /matches/%s shows only «No se ha encontrado: puede que se haya borrado.», with no button",
    async (id) => {
      startSession(squadSpecs(9));
      await openMatchScreen(id);
      expect(screenTexts()).toEqual([NOT_FOUND]);
      expect(screen.queryByRole("button", { name: "Convocatoria" })).toBeNull();
    },
  );

  it("RF-033: an unknown match id shows only the not-found message and opens no match", async () => {
    const s = startSession(squadSpecs(9));
    await openMatchScreen(s.matchId + 1);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(s.store.getState().status).toBe("notFound");
  });

  it("RF-033 RF-085: a match whose read fails shows only the not-found message", async () => {
    const s = startSession(squadSpecs(9));
    breakReads(s.db, "matches");
    await openMatchScreen(s.matchId);
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(screen.queryByRole("button", { name: "Convocatoria" })).toBeNull();
  });
});

describe("match screen, the call-up screen on top of it", () => {
  it("RF-032: «Convocatoria» opens the call-up screen with router.push, with the header «Convocatoria»", async () => {
    const s = startSession(squadSpecs(9));
    await openMatchScreen(s.matchId);
    await fireEvent.press(screen.getByRole("button", { name: "Convocatoria" }));
    expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`);
    expect(presentations()).toEqual(["push", "push"]);
    expect(headerConfigs().at(-1)?.title).toBe("Convocatoria");
    expect(removeButtons()).toHaveLength(9);
  });

  it("RF-033: opening the call-up and going back keeps the same session: the match is opened once and not closed", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openMatchScreen(s.matchId);
    const marker = [undoEntryOf(s.entryIds[0] ?? 0, 1)];
    s.store.setState({ history: marker });
    await fireEvent.press(screen.getByRole("button", { name: "Convocatoria" }));
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(s.matchId);
    expect(close).not.toHaveBeenCalled();
    expect(s.store.getState().history).toEqual(marker);
    expect(s.store.getState().status).toBe("open");
  });

  it("RF-033: a call-up changed in the call-up screen is the one the match screen shows on return", async () => {
    const s = startSession(squadSpecs(9), [["Nora", "15"]]);
    await openMatchScreen(s.matchId);
    await fireEvent.press(screen.getByRole("button", { name: "Convocatoria" }));
    s.store.getState().addToCallUp(s.benched[0]?.id ?? 0);
    await testRouter.back();
    await ready();
    expect(rowsShown().endsWith("9 Jugador 9 15 Nora")).toBe(true);
  });
});
