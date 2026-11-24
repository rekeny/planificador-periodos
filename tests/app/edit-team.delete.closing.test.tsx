// T077: the confirmation of «Borrar equipo» closes only with its buttons (RF-015, D44, D46): a tap
// outside it and Android Back leave it open and change nothing, «Cancelar» closes it and changes
// nothing. Real src/app routes through renderRouter; same doubles as edit-team.delete.test.tsx.
import { act, fireEvent, screen } from "expo-router/testing-library";

import { pressBack, tapOutside } from "../support/choice-dialog-harness";
import {
  BEFORE_10_3,
  DELETE_CONFIRM,
  deleteTitle,
  dialog,
  hosts,
  openFormFromList,
  pressDelete,
  seedDeletable,
  tableCounts,
  teamIds,
} from "../support/edit-team-delete";
import { dialogTexts } from "../support/match-screen-grid";
import { savedTeams, typeName } from "../support/new-team-form";

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

afterEach(() => {
  jest.restoreAllMocks();
});

const dialogOpen = (): boolean => hosts().length > 0;
const dialogFor = (name: string, players: string, matches: string) => [
  deleteTitle(name),
  `Se borrarán también ${players} y ${matches}. No se puede deshacer.`,
  "Cancelar",
  DELETE_CONFIRM,
];

// What closes a dialog without pressing a button: neither does it (RF-015, D44, D46).
const CLOSING_WAYS = [
  ["a tap outside it", tapOutside],
  ["Android Back", async () => act(async () => pressBack())],
] as const;

describe("edit-team form, the confirmation closes only with its buttons (RF-015)", () => {
  it.each(CLOSING_WAYS)(
    "RF-015: %s leaves the confirmation open and deletes nothing, and «Cancelar» still closes it after",
    async (_way, close) => {
      const { db, store } = seedDeletable(10, 3);
      const remove = jest.spyOn(store.getState(), "deleteTeam");
      await openFormFromList();
      await pressDelete();
      await close();
      expect(dialogTexts()).toEqual(
        dialogFor("Alevín A", "sus 10 jugadores", "sus 3 partidos"),
      );
      expect(remove).not.toHaveBeenCalled();
      expect(tableCounts(db)).toEqual(BEFORE_10_3);
      expect(screen).toHavePathname("/teams/1/edit");
      await fireEvent.press(dialog().getByRole("button", { name: "Cancelar" }));
      expect(dialogOpen()).toBe(false);
    },
  );

  it("RF-015: «Cancelar» closes it and changes nothing: the team, its data, the typed text and the screen stay, and the button asks again", async () => {
    const { db, store } = seedDeletable(10, 3);
    const remove = jest.spyOn(store.getState(), "deleteTeam");
    await openFormFromList();
    await typeName("Sin guardar");
    await pressDelete();
    await fireEvent.press(dialog().getByRole("button", { name: "Cancelar" }));
    expect(dialogOpen()).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    expect(tableCounts(db)).toEqual(BEFORE_10_3);
    expect(teamIds(db)).toEqual([1, 2]);
    expect(savedTeams(db)[0]?.name).toBe("Alevín A");
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Sin guardar");
    expect(screen).toHavePathname("/teams/1/edit");
    await pressDelete();
    expect(hosts()).toHaveLength(1);
  });
});
