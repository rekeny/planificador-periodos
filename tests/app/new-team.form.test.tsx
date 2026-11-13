// T034: the new-team form, creating teams and what it saves (RF-001, RF-012, RF-013, RF-014,
// E-022). Real src/app routes through renderRouter; the doubles are those of teams-list.test.tsx:
// expo-splash-screen, initializeDatabase and the squad store that `@/state/app-stores` hands out
// (a real store on the in-memory database). The route `/teams/new` and its files do not exist yet.
import { fireEvent, screen, testRouter } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { headerConfigs } from "../support/screen-reading";
import { presentations } from "../support/screen-presentation";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import {
  chooseFormat,
  createViaForm,
  isFormatChosen,
  NAME_REQUIRED,
  openForm,
  pressSave,
  savedTeams,
  typeName,
} from "../support/new-team-form";

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

const FORTY = "Club Baloncesto Alevín Aragón Zaragoza 1";
const FORMATS_TO_TRY = [4, 6, 8];
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
});

describe("new-team form, opening it", () => {
  it("RF-013: «Nuevo equipo» on the list opens /teams/new as a modal with the header «Nuevo equipo»", async () => {
    await openForm();
    expect(screen).toHavePathname("/teams/new");
    expect(headerConfigs().map((config) => config.title)).toEqual([
      "Equipos",
      "Nuevo equipo",
    ]);
    expect(presentations()).toEqual(["push", "modal"]);
  });

  it("RF-013 RF-012: the form shows the fields «Nombre», «Categoría» and «Variante por defecto» and the button «Guardar»", async () => {
    await openForm();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("");
    expect(screen.getByLabelText("Categoría")).toHaveDisplayValue("");
    expect(screen.getByText("Variante por defecto")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  it("RF-001: the format picker offers exactly «4 periodos», «6 periodos» and «8 periodos», in that order", async () => {
    await openForm();
    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(3);
    FORMATS_TO_TRY.forEach((periods) =>
      expect(
        screen.getByRole("radio", { name: `${periods} periodos` }),
      ).toBeTruthy(),
    );
  });

  it("RF-013: the form opens with «6 periodos» selected and the other two not", async () => {
    await openForm();
    expect(isFormatChosen(6)).toBe(true);
    expect(isFormatChosen(4)).toBe(false);
    expect(isFormatChosen(8)).toBe(false);
  });

  it("RF-013 RF-012: es.json holds the texts of the new-team form", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.teams?.new).toBe("Nuevo equipo");
    expect(texts.team?.field).toEqual({
      name: "Nombre",
      category: "Categoría",
      defaultFormat: "Variante por defecto",
    });
    expect(texts.common?.save).toBe("Guardar");
    expect(texts.format?.option).toBe("{{count}} periodos");
    expect(texts.validation?.nameRequired).toBe(NAME_REQUIRED);
    expect(texts.error?.saveFailed).toBe(
      "No se ha podido guardar el cambio. Inténtalo de nuevo.",
    );
  });
});

describe("new-team form, creating a team", () => {
  it("RF-013: «Alevín A» with category «2015» and the default format is listed and saved with 6 periods", async () => {
    await openForm();
    await createViaForm("Alevín A", "2015");
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.getByText("2015")).toBeTruthy();
    expect(screen).toHavePathname("/");
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: "2015", defaultFormat: 6 },
    ]);
  });

  it.each(FORMATS_TO_TRY)(
    "RF-001 RF-013: choosing %i periods saves it as the team's default format",
    async (periods) => {
      await openForm();
      await createViaForm("Alevín A", "", periods);
      await screen.findByText("Alevín A");
      expect(savedTeams(db)[0]?.defaultFormat).toBe(periods);
    },
  );

  it("RF-013: changing the format 4, then 8, then 6 before saving saves 6", async () => {
    await openForm();
    await chooseFormat(4);
    await chooseFormat(8);
    expect(isFormatChosen(8)).toBe(true);
    expect(isFormatChosen(4)).toBe(false);
    await chooseFormat(6);
    await createViaForm("Alevín A");
    await screen.findByText("Alevín A");
    expect(savedTeams(db)[0]?.defaultFormat).toBe(6);
  });

  it("RF-013: a team saved without touching the format has default format 6", async () => {
    await openForm();
    await createViaForm("Alevín A");
    await screen.findByText("Alevín A");
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: null, defaultFormat: 6 },
    ]);
  });

  it("RF-013: an empty category, and one of only spaces, are saved as no category", async () => {
    await openForm();
    await createViaForm("Alevín A", "   ");
    await screen.findByText("Alevín A");
    expect(savedTeams(db)[0]?.category).toBeNull();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("RF-013: a name and a category typed with spaces around are saved and shown without them", async () => {
    await openForm();
    await createViaForm("  Alevín A  ", "  2015  ");
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: "2015", defaultFormat: 6 },
    ]);
  });

  it("RF-013: accents, ñ and emoji are saved as typed", async () => {
    await openForm();
    await createViaForm("Águilas 🏀", "Ñandú");
    expect(await screen.findByText("Águilas 🏀")).toBeTruthy();
    expect(savedTeams(db)).toEqual([
      { name: "Águilas 🏀", category: "Ñandú", defaultFormat: 6 },
    ]);
  });

  it("RF-013 E-022: a 40-character name and a 40-character category are saved with no message", async () => {
    await openForm();
    await createViaForm(FORTY, FORTY.toUpperCase());
    expect(await screen.findByText(FORTY)).toBeTruthy();
    expect(FORTY).toHaveLength(40);
    expect(savedTeams(db)[0]).toMatchObject({
      name: FORTY,
      category: FORTY.toUpperCase(),
    });
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
  });

  it("RF-013 E-022: the name and the category fields stop at 40 characters (maxLength) and show no message at the limit", async () => {
    await openForm();
    expect(screen.getByLabelText("Nombre").props.maxLength).toBe(40);
    expect(screen.getByLabelText("Categoría").props.maxLength).toBe(40);
    await typeName(FORTY);
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue(FORTY);
  });
});

describe("new-team form, not blocking the coach and sequences", () => {
  it("RF-013 RF-014: two teams with the same name and category are both saved and listed", async () => {
    await openForm();
    await createViaForm("Alevín A", "2015");
    await screen.findByText("Alevín A");
    await fireEvent.press(screen.getByRole("button", { name: "Nuevo equipo" }));
    await screen.findByLabelText("Nombre");
    await createViaForm("Alevín A", "2015");
    await screen.findAllByText("Alevín A");
    expect(savedTeams(db)).toHaveLength(2);
    expect(screen.getAllByText("Alevín A")).toHaveLength(2);
  });

  it("RF-013: two teams created one after the other are listed in alphabetical order", async () => {
    await openForm();
    await createViaForm("Cadete B");
    await screen.findByText("Cadete B");
    await fireEvent.press(screen.getByRole("button", { name: "Nuevo equipo" }));
    await screen.findByLabelText("Nombre");
    await createViaForm("Alevín A");
    await screen.findByText("Alevín A");
    const listed = screen.getAllByText(/^(Alevín A|Cadete B)$/);
    expect(listed.map((item) => item.props.children)).toEqual([
      "Alevín A",
      "Cadete B",
    ]);
  });
});

describe("new-team form, mistakes", () => {
  it("RF-013 RF-012: pressing «Guardar» at once shows only «Escribe un nombre.», saves nothing and stays on the form", async () => {
    await openForm();
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    await pressSave();
    expect(await screen.findAllByText(NAME_REQUIRED)).toHaveLength(1);
    expect(screen.queryByText(/No se ha podido guardar/)).toBeNull();
    expect(screen).toHavePathname("/teams/new");
    expect(savedTeams(db)).toEqual([]);
  });

  it("RF-013: a name of only spaces shows «Escribe un nombre.» and saves nothing", async () => {
    await openForm();
    await createViaForm("    ", "2015");
    expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
    expect(savedTeams(db)).toEqual([]);
    expect(screen).toHavePathname("/teams/new");
  });

  it("RF-013: after the message, a valid name saves the team and closes the form", async () => {
    await openForm();
    await pressSave();
    await screen.findByText(NAME_REQUIRED);
    await createViaForm("Alevín A");
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen).toHavePathname("/");
    expect(testRouter.canGoBack()).toBe(false);
  });
});
