// T077: «Borrar equipo» at the bottom of the edit-team form and its confirmation (RF-015). The button
// is inside the form's scroll container, after «Guardar»; pressing it reads the team's contents (at
// press time, never while rendering) and opens a dialog with the team's name and the plural forms of
// the answered D3-2 text. What closes it is in edit-team.delete.closing.test.tsx, what a confirmed
// deletion does in edit-team.delete.confirm.test.tsx and .sequence.test.tsx, what a failing one does
// in edit-team.delete.failures.test.tsx, and the layout and keyboard in .layout and .keyboard.
// Real src/app routes through renderRouter, with the doubles of edit-team.save.test.tsx; assumed
// screens: tests/support/edit-team-delete.ts.
import { sql } from "drizzle-orm";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import {
  BEFORE_10_3,
  DELETE_BUTTON,
  DELETE_CONFIRM,
  addPlayerDirectly,
  deleteButton,
  deleteTitle,
  dialog,
  hasDeleteButton,
  hosts,
  openFormFromList,
  pressDelete,
  seedDeletable,
  tableCounts,
} from "../support/edit-team-delete";
import { inScroll } from "../support/form-scroll";
import { dialogTexts } from "../support/match-screen-grid";
import { savedTeams, typeCategory, typeName } from "../support/new-team-form";

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

const message = (players: string, matches: string): string =>
  `Se borrarán también ${players} y ${matches}. No se puede deshacer.`;
const dialogOpen = (): boolean => hosts().length > 0;
const dialogFor = (name: string, players: string, matches: string) => [
  deleteTitle(name),
  message(players, matches),
  "Cancelar",
  DELETE_CONFIRM,
];

describe("es.json, the texts of the team deletion (RF-015, RF-012)", () => {
  it("RF-015 RF-012: es.json holds the title, the new message, the four plural forms, the confirm button and the form's button", () => {
    const texts = es as unknown as {
      confirm: { deleteTeam: Record<string, string> };
      team: Record<string, unknown>;
    };
    expect(texts.confirm.deleteTeam).toEqual({
      title: "¿Borrar el equipo {{name}}?",
      message:
        "Se borrarán también {{players}} y {{matches}}. No se puede deshacer.",
      players_one: "su jugador",
      players_other: "sus {{count}} jugadores",
      matches_one: "su partido",
      matches_other: "sus {{count}} partidos",
      confirm: "Borrar equipo",
    });
    expect(texts.team.delete).toBe("Borrar equipo");
  });
});

describe("edit-team form, the button «Borrar equipo» (RF-015)", () => {
  it("RF-015: the form has one «Borrar equipo», inside the scroll container after «Guardar» and the format picker, and it deletes nothing by itself", async () => {
    const { db } = seedDeletable(10, 3);
    await openFormFromList();
    expect(
      inScroll().queryAllByRole("button", { name: DELETE_BUTTON }),
    ).toHaveLength(1);
    const all = screen.getAllByRole("button");
    expect(all.indexOf(deleteButton())).toBeGreaterThan(
      all.indexOf(screen.getByRole("button", { name: "Guardar" })),
    );
    expect(all.indexOf(deleteButton())).toBeGreaterThan(
      all.indexOf(screen.getByRole("radio", { name: "8 periodos" })),
    );
    expect(dialogOpen()).toBe(false);
    expect(tableCounts(db)).toEqual(BEFORE_10_3);
    expect(screen).toHavePathname("/teams/1/edit");
  });

  it("RF-015: the new-team form and the list of teams have no «Borrar equipo»: a team that does not exist yet cannot be deleted", async () => {
    seedDeletable(2, 1);
    await renderRouter("./src/app");
    await screen.findByRole("button", { name: "Nuevo equipo" });
    expect(hasDeleteButton()).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: "Nuevo equipo" }));
    await screen.findByLabelText("Nombre");
    expect(hasDeleteButton()).toBe(false);
  });

  it("RF-015: the team's contents are read when the button is pressed, never while the form renders or is typed in", async () => {
    const { store } = seedDeletable(10, 3);
    const read = jest.spyOn(store.getState(), "teamContents");
    await openFormFromList();
    await typeName("Alevín B");
    await typeCategory("2016");
    expect(read).not.toHaveBeenCalled();
    await pressDelete();
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(1);
  });

  it("RF-015: a player added after the form was drawn and before the button is pressed is counted, because the contents are read at press time", async () => {
    const { db } = seedDeletable(10, 3);
    await openFormFromList();
    addPlayerDirectly(db, 1);
    await pressDelete();
    expect(dialogTexts()).toEqual(
      dialogFor("Alevín A", "sus 11 jugadores", "sus 3 partidos"),
    );
  });
});

describe("edit-team form, the confirmation states what will be deleted (RF-015)", () => {
  it("RF-015: pressing the button opens ONE dialog with the team's name, the message, «Cancelar» and the confirm button, and nothing is deleted yet", async () => {
    const { db } = seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    expect(hosts()).toHaveLength(1);
    expect(dialogTexts()).toEqual(
      dialogFor("Alevín A", "sus 10 jugadores", "sus 3 partidos"),
    );
    expect(tableCounts(db)).toEqual(BEFORE_10_3);
    expect(screen).toHavePathname("/teams/1/edit");
  });

  // The singular is only for exactly one; zero and the rest are plural (D3-2, 2026-11-21).
  it.each([
    [1, 3, "su jugador", "sus 3 partidos"],
    [10, 1, "sus 10 jugadores", "su partido"],
    [3, 10, "sus 3 jugadores", "sus 10 partidos"],
    [1, 1, "su jugador", "su partido"],
    [0, 0, "sus 0 jugadores", "sus 0 partidos"],
    [0, 1, "sus 0 jugadores", "su partido"],
    [2, 0, "sus 2 jugadores", "sus 0 partidos"],
  ])(
    "RF-015: a team with %i players and %i matches reads «%s» and «%s»",
    async (players, matches, playersText, matchesText) => {
      seedDeletable(players, matches);
      await openFormFromList();
      await pressDelete();
      expect(dialogTexts()).toEqual(
        dialogFor("Alevín A", playersText, matchesText),
      );
    },
  );

  it("RF-015: the other team's player and match are not counted: «Cadete B» says «su jugador y su partido»", async () => {
    seedDeletable(10, 3);
    await openFormFromList("Cadete B");
    await pressDelete();
    expect(dialogTexts()).toEqual(
      dialogFor("Cadete B", "su jugador", "su partido"),
    );
  });

  it("RF-015 E-022: a team named with 40 characters shows its whole name in the title", async () => {
    const forty = "Club Baloncesto Alevín Aragón Zaragoza 1";
    const { db } = seedDeletable(2, 1);
    db.run(sql`UPDATE teams SET name = ${forty} WHERE id = 1`);
    await openFormFromList(forty);
    await pressDelete();
    expect(forty).toHaveLength(40);
    expect(dialog().getByText(deleteTitle(forty))).toBeTruthy();
    expect(savedTeams(db)[0]?.name).toBe(forty);
  });
});
