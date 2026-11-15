// T035: the new-player form, its fields, limits and validation (RF-016, RF-012, E-021, E-022).
// Real src/app routes through renderRouter, with the doubles of team-screen.test.tsx. The route
// `/teams/[teamId]/players/new` does not exist yet. The test double does not apply `maxLength`:
// `typeNumber` cuts the text at the field's limit, so typing "100" leaves "10" (D42).
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { presentations } from "../support/screen-presentation";
import { screenTexts } from "../support/screen-reading";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN, CADETE, breakReads } from "../support/squad-fixtures";
import { NOT_FOUND } from "../support/edit-team";
import { NAME_REQUIRED, pressSave } from "../support/new-team-form";
import {
  NUMBER_INVALID,
  addViaForm,
  headerTitles,
  openPlayerForm,
  openPlayerFormAlone,
  playerOrder,
  savedPlayers,
  seedTeam,
  typeNumber,
  typePlayerName,
} from "../support/team-screen";

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
const SAVED_NUMBERS = ["0", "00", "7", "99"];
const REJECTED_NUMBERS = ["07", ""];
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let alevin: number;

beforeEach(() => {
  db = resetMockDatabase();
  alevin = seedTeam(db, ALEVIN, [["Ana", "4"]]);
  seedTeam(db, CADETE);
  useMockSquadStore(createSquadStore(db));
});

describe("new-player form, opening it", () => {
  it("RF-016: from the list, the team and «Nuevo jugador» the form is a modal over the team with the header «Nuevo jugador»", async () => {
    await renderRouter("./src/app");
    await fireEvent.press(await screen.findByText("Alevín A"));
    await screen.findByText("Ana");
    await openPlayerForm();
    expect(screen).toHavePathname(`/teams/${alevin}/players/new`);
    expect(headerTitles()).toEqual(["Equipos", "Alevín A", "Nuevo jugador"]);
    expect(presentations()).toEqual(["push", "push", "modal"]);
  });

  it("RF-016: the form has the fields «Nombre» and «Dorsal», both empty, and the button «Guardar»", async () => {
    await openPlayerFormAlone(alevin);
    expect(await screen.findByLabelText("Nombre")).toHaveDisplayValue("");
    expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });

  it("RF-016 E-022: the name field stops at 40 characters and the number field at 2 (maxLength)", async () => {
    await openPlayerFormAlone(alevin);
    expect((await screen.findByLabelText("Nombre")).props.maxLength).toBe(40);
    expect(screen.getByLabelText("Dorsal").props.maxLength).toBe(2);
  });

  it("RF-016 E-022: a 40-character name is saved and no message is shown at the limit", async () => {
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await addViaForm(FORTY, "5");
    expect(FORTY).toHaveLength(40);
    expect(savedPlayers(db, alevin).at(-1)).toEqual({
      name: FORTY,
      number: "5",
    });
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });

  it.each(["abc", "0", "01", "99"])(
    "RF-016 RF-085: /teams/%s/players/new shows only «No se ha encontrado: puede que se haya borrado.» and no form",
    async (id) => {
      await openPlayerFormAlone(id);
      expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
      expect(screenTexts()).toEqual([NOT_FOUND]);
      expect(screen.queryByLabelText("Dorsal")).toBeNull();
      expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    },
  );

  it("RF-016 RF-085: the new-player route of a team whose read fails shows the not-found message and saves nothing", async () => {
    breakReads(db, "teams");
    await openPlayerFormAlone(alevin);
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screenTexts()).toEqual([NOT_FOUND]);
  });
});

describe("new-player form, the numbers of E-021", () => {
  it.each(SAVED_NUMBERS)(
    "RF-016 E-021: the number «%s» is saved, shown on the team screen and no message appears",
    async (number) => {
      await renderRouter("./src/app", { initialUrl: `/teams/${alevin}` });
      await screen.findByRole("button", { name: "Nuevo jugador" });
      await openPlayerForm();
      await addViaForm("Luis", number);
      expect(
        await screen.findByRole("button", { name: "Editar" }),
      ).toBeTruthy();
      expect(screen).toHavePathname(`/teams/${alevin}`);
      expect(playerOrder()).toContain(`${number} Luis`);
      expect(savedPlayers(db, alevin)).toContainEqual({ name: "Luis", number });
      expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
    },
  );

  it.each(REJECTED_NUMBERS)(
    "RF-016 E-021: the number «%s» shows «El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.», saves nothing and keeps the form open",
    async (number) => {
      await openPlayerFormAlone(alevin);
      await screen.findByLabelText("Nombre");
      await addViaForm("Luis", number);
      expect(await screen.findByText(NUMBER_INVALID)).toBeTruthy();
      expect(screen).toHavePathname(`/teams/${alevin}/players/new`);
      expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Luis");
      expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
      expect(savedPlayers(db, alevin)).toEqual([{ name: "Ana", number: "4" }]);
    },
  );
});

describe("new-player form, a number over the limit", () => {
  it("RF-016 E-021: typing 100 leaves 10 in the number field with no message and saving gives the number 10", async () => {
    await renderRouter("./src/app", { initialUrl: `/teams/${alevin}` });
    await screen.findByRole("button", { name: "Nuevo jugador" });
    await openPlayerForm();
    await addViaForm("Luis", "100");
    expect(await screen.findByRole("button", { name: "Editar" })).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${alevin}`);
    expect(playerOrder()).toContain("10 Luis");
    expect(savedPlayers(db, alevin)).toContainEqual({
      name: "Luis",
      number: "10",
    });
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });

  it("RF-016 E-021: typing 100 leaves 10 in the field itself and shows no message before saving", async () => {
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await typeNumber("100");
    expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("10");
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });
});

describe("new-player form, the name", () => {
  it.each(["", "     "])(
    "RF-016: a name typed as «%s» shows «Escribe un nombre.», saves nothing and shows no number message",
    async (blank) => {
      await openPlayerFormAlone(alevin);
      await screen.findByLabelText("Nombre");
      await addViaForm(blank, "7");
      expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
      expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
      expect(savedPlayers(db, alevin)).toHaveLength(1);
    },
  );

  it("RF-016: opening the form and pressing «Guardar» at once shows both messages and saves nothing", async () => {
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await pressSave();
    expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
    expect(screen.getByText(NUMBER_INVALID)).toBeTruthy();
    expect(savedPlayers(db, alevin)).toHaveLength(1);
  });

  it("RF-016: a blank name and an invalid number together show both messages and save nothing", async () => {
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await typePlayerName("  ");
    await typeNumber("07");
    await pressSave();
    expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
    expect(screen.getByText(NUMBER_INVALID)).toBeTruthy();
    expect(savedPlayers(db, alevin)).toHaveLength(1);
  });

  it("RF-016: after an invalid number, fixing it and pressing «Guardar» again saves the player", async () => {
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await addViaForm("Luis", "07");
    await screen.findByText(NUMBER_INVALID);
    await typeNumber("7");
    await pressSave();
    expect(savedPlayers(db, alevin)).toContainEqual({
      name: "Luis",
      number: "7",
    });
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });
});
