// T076: reactivating a player, the sequences of deactivating and reactivating, the absence of any
// delete action and the duplicate-number banner after a deactivation (RF-021, RF-022, RF-024,
// RF-069). Same doubles as player-screen.active.test.tsx.
import { screen, waitFor } from "expo-router/testing-library";

import { hosts, press } from "../support/match-screen-questions";
import { inScroll } from "../support/form-scroll";
import { textsOf } from "../support/match-lists";
import {
  bannerTexts,
  openTeamAlone,
  playerOrder,
} from "../support/team-screen";
import {
  DEACTIVATE,
  INACTIVE,
  REACTIVATE,
  deactivateDirectly,
  expectOnTeam,
  hasAction,
  openPlayerFromTeam,
  pressAction,
  pressRow,
  renumberDirectly,
  rowTexts,
  savedRows,
  seedPlayerScreen,
  spyOnActive,
} from "../support/player-screen";

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

const dialogOpen = (): boolean => hosts().length > 0;
let s: ReturnType<typeof seedPlayerScreen>;

beforeEach(() => {
  s = seedPlayerScreen();
});

describe("player screen, reactivating (RF-024)", () => {
  it("RF-024 RF-022: a deactivated player's screen has «Reactivar» and no «Desactivar», both inside the scroll container", async () => {
    deactivateDirectly(s.db, s.ana);
    await openPlayerFromTeam(s.alevin, "Ana");
    expect(
      inScroll().queryAllByRole("button", { name: REACTIVATE }),
    ).toHaveLength(1);
    expect(hasAction(DEACTIVATE)).toBe(false);
  });

  it("RF-024: «Reactivar» asks nothing: no dialog, the player is active at once, back on the team without «Desactivado»", async () => {
    deactivateDirectly(s.db, s.ana);
    const calls = spyOnActive(s.store);
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(REACTIVATE);
    expect(dialogOpen()).toBe(false);
    expect(calls).toHaveBeenCalledWith(s.ana, true);
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(true);
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(screen.queryByText(INACTIVE)).toBeNull());
  });

  it("RF-022 RF-024: deactivate, reactivate and deactivate again, each time from the team's row", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(rowTexts("Ana")).toContain(INACTIVE));
    await pressRow("Ana");
    await screen.findByLabelText("Dorsal");
    await pressAction(REACTIVATE);
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(screen.queryByText(INACTIVE)).toBeNull());
    await pressRow("Ana");
    await screen.findByLabelText("Dorsal");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(rowTexts("Ana")).toContain(INACTIVE));
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(false);
  });
});

describe("player screen, there is no way to delete a player (RF-021)", () => {
  it.each([
    ["an active player", false, ["Guardar", DEACTIVATE]],
    ["a deactivated player", true, ["Guardar", REACTIVATE]],
  ] as const)(
    "RF-021: the screen of %s has only these buttons and no delete action",
    async (_kind, inactive, expected) => {
      if (inactive) deactivateDirectly(s.db, s.ana);
      await openPlayerFromTeam(s.alevin, "Ana");
      const names = inScroll()
        .getAllByRole("button")
        .map((button) => textsOf(button).join(""));
      expect(names).toEqual(expected);
      expect(screen.queryByText(/borrar|eliminar|quitar/i)).toBeNull();
    },
  );
});

describe("player screen, the duplicate-number banner after deactivating (RF-069)", () => {
  it("RF-069 RF-022: two active 7s show the banner; deactivating one and confirming takes it away, and reactivating it brings it back", async () => {
    renumberDirectly(s.db, s.ana, "7");
    await openTeamAlone(s.alevin);
    await waitFor(() =>
      expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]),
    );
    await pressRow("Ana");
    await screen.findByLabelText("Dorsal");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(bannerTexts()).toEqual([]));
    expect(playerOrder()).toContain("Juan");
    await pressRow("Ana");
    await screen.findByLabelText("Dorsal");
    await pressAction(REACTIVATE);
    await expectOnTeam(s.alevin);
    await waitFor(() =>
      expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]),
    );
  });

  it("RF-069: two 7s, one of them deactivated before the team screen opens, show no banner and the deactivated row says «Desactivado»", async () => {
    deactivateDirectly(s.db, s.ana);
    renumberDirectly(s.db, s.ana, "7");
    await openTeamAlone(s.alevin);
    expect(bannerTexts()).toEqual([]);
    expect(rowTexts("Ana")).toContain(INACTIVE);
  });
});
