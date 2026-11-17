// T046: the call-up screen `/matches/[matchId]/call-up`, adding and removing players without marks
// (RF-023, RF-032, RF-033, RF-068). Same doubles as match-screen.test.tsx. The route does not
// exist yet; the assumed screen is described in tests/support/call-up-screen.ts.
import { screen, waitFor } from "expo-router/testing-library";

import type { Format } from "@/domain/format";
import { squadSpecs, writeMark } from "../support/match-session-fixtures";
import {
  deactivatePlayer,
  savedCallUp,
} from "../support/match-session-call-up";
import { presentations } from "../support/screen-presentation";
import { headerConfigs } from "../support/screen-reading";
import {
  ADD_EMPTY,
  bannerTexts,
  confirmationShown,
  openCallUpAlone,
  pressAdd,
  pressRemove,
  rangeBanner,
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
const PAU: [string, string] = ["Pau", "16"];
const RANGE: [Format, number, boolean][] = [
  [6, 8, true],
  [6, 9, false],
  [6, 12, false],
  [6, 13, true],
  [4, 7, true],
  [8, 7, true],
];

describe("call-up screen, adding players", () => {
  it("RF-032: the header says «Convocatoria» and the screen is a normal push", async () => {
    const s = startSession(squadSpecs(9));
    await openCallUpAlone(s);
    expect(headerConfigs().map((config) => config.title)).toEqual([
      "Convocatoria",
    ]);
    expect(presentations()).toEqual(["push"]);
  });

  it("RF-032: adding two players puts both in the call-up, in order, and saves them", async () => {
    const s = startSession(squadSpecs(9), [NORA, PAU]);
    await openCallUpAlone(s);
    expect(removeButtons()).toHaveLength(9);
    expect(shows("Nora")).toBe(true);
    await pressAdd("Nora");
    await pressAdd("Pau");
    await waitFor(() => expect(removeButtons()).toHaveLength(11));
    expect(savedCallUp(s.db, s.matchId)).toContain("15 Nora");
    expect(savedCallUp(s.db, s.matchId)).toContain("16 Pau");
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(11);
    expect(rowsShown()).toBe(
      "1 Jugador 1 2 Jugador 2 3 Jugador 3 4 Jugador 4 5 Jugador 5 6 Jugador 6 7 Jugador 7 8 Jugador 8 9 Jugador 9 15 Nora 16 Pau",
    );
  });

  it("RF-032 RF-023: a deactivated player of the team is not offered", async () => {
    const s = startSession(squadSpecs(9), [NORA, PAU]);
    deactivatePlayer(s.db, s.benched[1]?.id ?? 0);
    await openCallUpAlone(s);
    expect(shows("Nora")).toBe(true);
    expect(shows("Pau")).toBe(false);
  });

  it("RF-032: only players who are not in the call-up are offered, and nobody is offered twice", async () => {
    const s = startSession([["Ana", "4"]], [NORA]);
    await openCallUpAlone(s);
    expect(screen.getAllByText(/Ana/)).toHaveLength(1);
    expect(screen.getAllByText(/Nora/)).toHaveLength(1);
  });

  it("RF-032 RF-035: with nobody left to add the list shows «No quedan jugadores activos por añadir. Puedes crear uno nuevo.»", async () => {
    const s = startSession(squadSpecs(9));
    await openCallUpAlone(s);
    expect(screen.getByText(ADD_EMPTY)).toBeTruthy();
  });

  it("RF-032 RF-023: with the only other player deactivated the empty message is shown", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    deactivatePlayer(s.db, s.benched[0]?.id ?? 0);
    await openCallUpAlone(s);
    expect(screen.getByText(ADD_EMPTY)).toBeTruthy();
    expect(shows("Nora")).toBe(false);
  });

  it("RF-032: once the last player is added the empty message appears, and not before", async () => {
    const s = startSession(squadSpecs(9), [NORA]);
    await openCallUpAlone(s);
    expect(screen.queryByText(ADD_EMPTY)).toBeNull();
    await pressAdd("Nora");
    expect(await screen.findByText(ADD_EMPTY)).toBeTruthy();
  });
});

describe("call-up screen, removing players without marks", () => {
  it("RF-033: a player without marks is removed at once, with no confirmation, and the row is gone", async () => {
    const s = startSession(squadSpecs(9));
    await openCallUpAlone(s);
    await pressRemove(s, "Jugador 4");
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    expect(confirmationShown()).toBe(false);
    expect(savedCallUp(s.db, s.matchId)).not.toContain("4 Jugador 4");
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(8);
  });

  it("RF-033 RF-032: a removed player can be added again and is a row once more", async () => {
    const s = startSession(squadSpecs(9));
    await openCallUpAlone(s);
    await pressRemove(s, "Jugador 4");
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    expect(shows("Jugador 4")).toBe(true);
    await pressAdd("Jugador 4");
    await waitFor(() => expect(removeButtons()).toHaveLength(9));
    expect(savedCallUp(s.db, s.matchId)).toContain("4 Jugador 4");
    expect(screen.getByText(ADD_EMPTY)).toBeTruthy();
  });

  it("RF-033: removing a player who has no marks asks nothing even when another player has marks", async () => {
    const s = startSession(squadSpecs(9));
    writeMark(s.db, s.entryIds[0] ?? 0, "P", 1, "starter");
    await openCallUpAlone(s);
    await pressRemove(s, "Jugador 5");
    await waitFor(() => expect(removeButtons()).toHaveLength(8));
    expect(confirmationShown()).toBe(false);
  });
});

describe("call-up screen, range banner", () => {
  it.each(RANGE)(
    "RF-068 E-015 E-030: %s periods with %s players → banner shown in the call-up screen: %s",
    async (format, count, shown) => {
      const s = startSession(squadSpecs(count), [], { format });
      await openCallUpAlone(s);
      // The screen is really drawn, so "no banner" is not just an empty page.
      expect(removeButtons()).toHaveLength(count);
      expect(bannerTexts()).toEqual(shown ? [rangeBanner(format, count)] : []);
    },
  );

  it("RF-068: a call-up of 0 players shows no rows and the banner, and the players to add are offered", async () => {
    const s = startSession([], [NORA]);
    await openCallUpAlone(s);
    expect(removeButtons()).toHaveLength(0);
    expect(bannerTexts()).toEqual([rangeBanner(6, 0)]);
    expect(shows("Nora")).toBe(true);
  });

  it("RF-068 RF-032 RF-033: the banner follows the call-up: adding the ninth player hides it and removing one brings it back", async () => {
    const s = startSession(squadSpecs(8), [NORA]);
    await openCallUpAlone(s);
    expect(bannerTexts()).toEqual([rangeBanner(6, 8)]);
    await pressAdd("Nora");
    await waitFor(() => expect(bannerTexts()).toEqual([]));
    await pressRemove(s, "Jugador 1");
    await waitFor(() => expect(bannerTexts()).toEqual([rangeBanner(6, 8)]));
  });
});
