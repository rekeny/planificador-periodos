// T077, D3 rule 6 (RF-015, RF-076): the edit-team form with «Borrar equipo» and its confirmation in
// the assembled app (list of teams, team screen, form) at 375 × 667 and 667 × 375 (phone) and
// 1024 × 768 and 768 × 1024 (tablet). Jest has no layout engine, so these tests check the
// configuration (every field and button is rendered once inside the one scroll container, the
// dialog shows all its buttons); the geometry is checked on a device (T094, T079). Same doubles as
// edit-team.delete.test.tsx.
import { sql } from "drizzle-orm";
import { screen } from "expo-router/testing-library";

import {
  DELETE_BUTTON,
  DELETE_CONFIRM,
  deleteButton,
  deleteTitle,
  dialog,
  hosts,
  openFormFromList,
  pressDelete,
  seedDeletable,
} from "../support/edit-team-delete";
import {
  KEYBOARD_AWARE,
  inScroll,
  reachable,
  structure,
} from "../support/form-scroll";
import { dialogTexts } from "../support/match-screen-grid";
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

afterEach(restoreWindow);

describe("edit-team form with «Borrar equipo», in the assembled app (D3 rule 6)", () => {
  it.each(SIZES)(
    "RF-015 RF-076: on %s the fields, the three formats, «Guardar» and «Borrar equipo» are all drawn once inside one scroll container that keeps taps, «Borrar equipo» last",
    async (_kind, width, height) => {
      seedDeletable(10, 3);
      await setWindow(width, height);
      await openFormFromList();
      expect(structure()).toEqual(KEYBOARD_AWARE);
      expect(
        reachable([
          "Nombre",
          "Categoría",
          "4 periodos",
          "6 periodos",
          "8 periodos",
          "Guardar",
          DELETE_BUTTON,
        ]).filter((control) => !control.inside),
      ).toEqual([]);
      for (const name of ["Guardar", DELETE_BUTTON]) {
        expect(inScroll().queryAllByRole("button", { name })).toHaveLength(1);
      }
      const buttons = inScroll().getAllByRole("button");
      expect(buttons[buttons.length - 1]).toBe(deleteButton());
    },
  );

  it.each(SIZES)(
    "RF-015 RF-076: on %s «Borrar equipo» opens one dialog with the team's name, the message, «Cancelar» and the confirm button, all rendered",
    async (_kind, width, height) => {
      seedDeletable(10, 3);
      await setWindow(width, height);
      await openFormFromList();
      await pressDelete();
      expect(hosts()).toHaveLength(1);
      expect(dialogTexts()).toEqual([
        deleteTitle("Alevín A"),
        "Se borrarán también sus 10 jugadores y sus 3 partidos. No se puede deshacer.",
        "Cancelar",
        DELETE_CONFIRM,
      ]);
      expect(dialog().getByRole("button", { name: "Cancelar" })).toBeTruthy();
      expect(
        dialog().getByRole("button", { name: DELETE_CONFIRM }),
      ).toBeTruthy();
    },
  );

  it.each(SIZES)(
    "RF-015 RF-076: on %s a team whose name has 40 characters still shows its whole name in the dialog's title",
    async (_kind, width, height) => {
      const forty = "Club Baloncesto Alevín Aragón Zaragoza 1";
      const { db } = seedDeletable(1, 1);
      db.run(sql`UPDATE teams SET name = ${forty} WHERE id = 1`);
      await setWindow(width, height);
      await openFormFromList(forty);
      await pressDelete();
      expect(forty).toHaveLength(40);
      expect(screen.getByText(deleteTitle(forty))).toBeTruthy();
    },
  );
});
