// T076, D3 rules 6 and 15 (RF-076): the team screen's player rows and the player screen in the
// assembled app at 375 × 667 and 667 × 375 (phone) and 1024 × 768 and 768 × 1024 (tablet). Jest has
// no layout engine, so these tests check the configuration (every button and field is rendered, the
// form scrolls as one, the dialog shows all its buttons, the lines that can grow are cut); the
// geometry is checked on a device (T094, T079). Same doubles as player-screen.edit.test.tsx.
import { screen, within } from "expo-router/testing-library";

import { ALEVIN } from "../support/squad-fixtures";
import { dialog, hosts } from "../support/match-screen-questions";
import {
  KEYBOARD_AWARE,
  inScroll,
  reachable,
  structure,
} from "../support/form-scroll";
import { MATCHES, PLAYERS, scrolls } from "../support/team-matches";
import { openTeamAlone, seedTeam } from "../support/team-screen";
import {
  DEACTIVATE,
  DEACTIVATE_MESSAGE,
  INACTIVE,
  REACTIVATE,
  deactivateDirectly,
  deactivateTitle,
  hasAction,
  openPlayerFromTeam,
  playerIdOf,
  pressAction,
  rowOf,
  seedPlayerScreen,
} from "../support/player-screen";
import { restoreWindow, setWindow } from "../support/window-size";

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

const SIZES = [
  ["a phone in portrait", 375, 667],
  ["a phone in landscape", 667, 375],
  ["a tablet in landscape", 1024, 768],
  ["a tablet in portrait", 768, 1024],
] as const;
const LONG = "Club Baloncesto Alevín Aragón Zaragoza Femenino 2015 A";
let s: ReturnType<typeof seedPlayerScreen>;

beforeEach(() => {
  s = seedPlayerScreen();
});
afterEach(restoreWindow);

describe("team screen, the player rows as buttons (D3 rule 6)", () => {
  it.each(SIZES)(
    "RF-018 RF-022 RF-076: on %s a team of 13 players, two of them deactivated, draws every row as a button inside the one scroll, and «Desactivado» twice",
    async (_kind, width, height) => {
      await setWindow(width, height);
      const id = seedTeam(
        s.db,
        { ...ALEVIN, name: "Grande" },
        Array.from({ length: 13 }, (_, n) => [
          `Jugador ${n + 1}`,
          String(n + 1),
        ]),
      );
      deactivateDirectly(s.db, playerIdOf(s.db, id, "Jugador 3"));
      deactivateDirectly(s.db, playerIdOf(s.db, id, "Jugador 12"));
      await openTeamAlone(id);
      const lists = scrolls();
      expect(lists).toHaveLength(1);
      const [list] = lists;
      if (list === undefined) throw new Error("No scroll");
      expect(within(list).queryByText(PLAYERS)).not.toBeNull();
      expect(within(list).queryByText(MATCHES)).not.toBeNull();
      for (let n = 1; n <= 13; n += 1) {
        expect(
          within(list).queryByRole("button", {
            name: new RegExp(`Jugador ${n}$|Jugador ${n} `),
          }),
        ).not.toBeNull();
      }
      expect(within(list).getAllByText(INACTIVE)).toHaveLength(2);
    },
  );

  it.each(SIZES)(
    "RF-018 RF-022 RF-076: on %s a deactivated player with a very long name keeps its name cut to one line and still shows «Desactivado»",
    async (_kind, width, height) => {
      await setWindow(width, height);
      const id = seedTeam(s.db, ALEVIN, [[LONG, "7"]]);
      deactivateDirectly(s.db, playerIdOf(s.db, id, LONG));
      await openTeamAlone(id);
      const name = await screen.findByText(LONG);
      expect(name.props.numberOfLines).toBe(1);
      expect(screen.getByText(INACTIVE)).toBeOnTheScreen();
      expect(within(rowOf(LONG)).getByText(INACTIVE)).toBeOnTheScreen();
    },
  );
});

describe("player screen, in the assembled app (D3 rules 6 and 15)", () => {
  it.each(SIZES)(
    "RF-018 RF-022 RF-076: on %s the fields, «Guardar» and «Desactivar» are all drawn once inside one scroll container that keeps taps",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openPlayerFromTeam(s.alevin, "Juan");
      expect(structure()).toEqual(KEYBOARD_AWARE);
      expect(
        reachable(["Nombre", "Dorsal", "Guardar", DEACTIVATE]).filter(
          (control) => !control.inside,
        ),
      ).toEqual([]);
      for (const name of ["Guardar", DEACTIVATE]) {
        expect(inScroll().queryAllByRole("button", { name })).toHaveLength(1);
      }
      expect(hasAction(REACTIVATE)).toBe(false);
    },
  );

  it.each(SIZES)(
    "RF-024 RF-076: on %s a deactivated player's screen draws «Reactivar» once, inside the scroll container, and no «Desactivar»",
    async (_kind, width, height) => {
      await setWindow(width, height);
      deactivateDirectly(s.db, s.juan);
      await openPlayerFromTeam(s.alevin, "Juan");
      expect(
        inScroll().queryAllByRole("button", { name: REACTIVATE }),
      ).toHaveLength(1);
      expect(hasAction(DEACTIVATE)).toBe(false);
      expect(
        reachable(["Nombre", "Dorsal", "Guardar", REACTIVATE]).every(
          (control) => control.inside,
        ),
      ).toBe(true);
    },
  );

  it.each(SIZES)(
    "RF-022 RF-076: on %s «Desactivar» opens one dialog with the player's name, its message, «Cancelar» and «Desactivar»",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openPlayerFromTeam(s.alevin, "Juan");
      await pressAction(DEACTIVATE);
      expect(hosts()).toHaveLength(1);
      expect(dialog().getByText(deactivateTitle("Juan"))).toBeTruthy();
      expect(dialog().getByText(DEACTIVATE_MESSAGE)).toBeTruthy();
      expect(dialog().getByRole("button", { name: "Cancelar" })).toBeTruthy();
      expect(dialog().getByRole("button", { name: DEACTIVATE })).toBeTruthy();
    },
  );

  it.each(SIZES)(
    "RF-076: on %s the first field, «Nombre», is inside the scroll container and not in a layer of its own over the header's area (F-D3-01)",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openPlayerFromTeam(s.alevin, "Juan");
      expect(inScroll().queryByLabelText("Nombre")).not.toBeNull();
    },
  );
});
