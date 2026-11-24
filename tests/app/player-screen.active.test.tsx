// T076: deactivating and reactivating a player from the player screen (RF-021, RF-022, RF-024,
// RF-069, RF-082). «Desactivar» opens a confirmation that closes only with its buttons; confirming
// saves at once, goes back to the team and the row shows «Desactivado»; «Reactivar» asks nothing.
// Same doubles as player-screen.edit.test.tsx; the dialog helpers are those of match-details.delete.
// What a failed deactivation does is in player-screen.active.failures.test.tsx.
import { act, screen, waitFor } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { useMockSquadStore } from "../support/mock-app-stores";
import { pressHandlerOf } from "../support/match-details";
import { pressBack, tapOutside } from "../support/choice-dialog-harness";
import { dialog, hosts, press } from "../support/match-screen-questions";
import { dialogTexts } from "../support/match-screen-grid";
import { inScroll } from "../support/form-scroll";
import { openTeamAlone } from "../support/team-screen";
import {
  DEACTIVATE,
  DEACTIVATE_MESSAGE,
  INACTIVE,
  REACTIVATE,
  deactivateTitle,
  expectOnTeam,
  hasAction,
  openPlayerFromTeam,
  pressAction,
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

const DIALOG_TEXTS = [
  deactivateTitle("Ana"),
  DEACTIVATE_MESSAGE,
  "Cancelar",
  DEACTIVATE,
];
const dialogOpen = (): boolean => hosts().length > 0;
let s: ReturnType<typeof seedPlayerScreen>;

beforeEach(() => {
  s = seedPlayerScreen();
});

describe("player screen, the texts of deactivating (RF-012)", () => {
  it("RF-012 RF-022 RF-024: es.json holds «Desactivado», «Desactivar», «Reactivar» and the three texts of the confirmation", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.player).toMatchObject({
      deactivated: "Desactivado",
      deactivate: "Desactivar",
      reactivate: "Reactivar",
    });
    expect((texts.confirm as Record<string, unknown>).deactivatePlayer).toEqual(
      {
        title: "¿Desactivar a {{name}}?",
        message:
          "No aparecerá en los partidos nuevos. Seguirá en los partidos guardados y podrás reactivarlo.",
        confirm: "Desactivar",
      },
    );
  });
});

describe("player screen, the button «Desactivar» (RF-022)", () => {
  it("RF-022 RF-076: an active player's screen has one «Desactivar», inside the scroll container, no «Reactivar»", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    expect(
      inScroll().queryAllByRole("button", { name: DEACTIVATE }),
    ).toHaveLength(1);
    expect(hasAction(REACTIVATE)).toBe(false);
    expect(dialogOpen()).toBe(false);
  });

  it("RF-022: pressing it opens the confirmation with the player's name, its message, «Cancelar» and «Desactivar», and nothing is saved yet", async () => {
    const calls = spyOnActive(s.store);
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(DEACTIVATE);
    expect(hosts()).toHaveLength(1);
    expect(dialogTexts()).toEqual(DIALOG_TEXTS);
    expect(calls).not.toHaveBeenCalled();
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(true);
  });
});

// What closes a dialog without pressing a button: neither does it (RF-022).
const CLOSING_WAYS = [
  ["a tap outside it", tapOutside],
  ["Android Back", async () => act(async () => pressBack())],
] as const;

describe("player screen, the confirmation closes only with its buttons (RF-022)", () => {
  it.each(CLOSING_WAYS)(
    "RF-022: %s leaves the confirmation open and the player active, and its confirm button still deactivates after",
    async (_way, close) => {
      const calls = spyOnActive(s.store);
      await openPlayerFromTeam(s.alevin, "Ana");
      await pressAction(DEACTIVATE);
      await close();
      expect(dialogTexts()).toEqual(DIALOG_TEXTS);
      expect(calls).not.toHaveBeenCalled();
      expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(true);
      await press(DEACTIVATE);
      expect(calls).toHaveBeenCalledWith(s.ana, false);
      expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(false);
    },
  );

  it("RF-022: «Cancelar» closes it, keeps the player active and on the screen, and the button asks again", async () => {
    const calls = spyOnActive(s.store);
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(DEACTIVATE);
    await press("Cancelar");
    expect(dialogOpen()).toBe(false);
    expect(calls).not.toHaveBeenCalled();
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(true);
    expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.ana}`);
    await pressAction(DEACTIVATE);
    expect(dialogTexts()).toEqual(DIALOG_TEXTS);
  });

  it("RF-022: two quick presses on the confirm button deactivate once", async () => {
    const calls = spyOnActive(s.store);
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(DEACTIVATE);
    const confirm = pressHandlerOf(
      dialog().getByRole("button", { name: DEACTIVATE }),
    );
    await act(async () => {
      confirm();
      confirm();
    });
    expect(calls).toHaveBeenCalledTimes(1);
  });
});

describe("player screen, confirming (RF-022, RF-082)", () => {
  it("RF-022 RF-082: confirming saves at once, goes back to the team and the team lists Ana with «Desactivado» and Juan without it", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await expectOnTeam(s.alevin);
    expect(savedRows(s.db, s.alevin)).toEqual([
      { name: "Juan", number: "7", isActive: true },
      { name: "Ana", number: "4", isActive: false },
    ]);
    await waitFor(() => expect(rowTexts("Ana")).toContain(INACTIVE));
    expect(rowTexts("Juan")).not.toContain(INACTIVE);
    expect(screen.getAllByText(INACTIVE)).toHaveLength(1);
    expect(dialogOpen()).toBe(false);
  });

  it("RF-022 RF-082: a new store on the same database, as after closing the app, still lists Ana as «Desactivado»", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await expectOnTeam(s.alevin);
    await act(async () => screen.unmount());
    useMockSquadStore(createSquadStore(s.db));
    await openTeamAlone(s.alevin);
    expect(rowTexts("Ana")).toContain(INACTIVE);
  });
});
