// T035: saving, leaving and failing in the new-player form (RF-016, RF-017, RF-069, RF-082,
// RF-085, E-020). Same doubles as new-player.form.test.tsx. The failure is real: a SQLite trigger
// makes every insert into `players` fail. The team screen is opened as the only screen of the
// stack so that its Texts are the only ones read by `playerOrder()`.
import {
  act,
  fireEvent,
  screen,
  testRouter,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import {
  ALEVIN,
  CADETE,
  allowWrites,
  failWrites,
} from "../support/squad-fixtures";
import { SAVE_FAILED, pressSave, saveButton } from "../support/new-team-form";
import {
  DUPLICATE_BANNER,
  addViaForm,
  bannerTexts,
  openPlayerForm,
  openPlayerFormAlone,
  openTeamAlone,
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

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let alevin: number;
let cadete: number;

beforeEach(() => {
  db = resetMockDatabase();
  alevin = seedTeam(db, ALEVIN, [["Ana", "4"]]);
  cadete = seedTeam(db, CADETE, [["Bea", "7"]]);
  useMockSquadStore(createSquadStore(db));
});

async function addFromTeamScreen(name: string, number: string): Promise<void> {
  await openPlayerForm();
  await addViaForm(name, number);
  await screen.findByRole("button", { name: "Nuevo jugador" });
}

describe("new-player form, saving", () => {
  it("RF-016 E-020: adding 9, 4 and 7 one after another without leaving the team screen lists 4, 7, 9", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("Pau", "9");
    await addFromTeamScreen("Eva", "5");
    await addFromTeamScreen("Luis", "7");
    expect(screen).toHavePathname(`/teams/${alevin}`);
    expect(playerOrder()).toBe("4 Ana 5 Eva 7 Luis 9 Pau");
    expect(savedPlayers(db, alevin)).toHaveLength(4);
  });

  it("RF-016: a name typed with spaces around is saved and listed without them", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("  Eva  ", "5");
    expect(playerOrder()).toBe("4 Ana 5 Eva");
    expect(savedPlayers(db, alevin).at(-1)).toEqual({
      name: "Eva",
      number: "5",
    });
  });

  it("RF-016: each time the form opens it is empty, whatever was saved before", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("Eva", "5");
    await openPlayerForm();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("");
    expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("");
  });

  it("RF-016 E-020: «0» and «00» added in the same team are both listed, «0» first, with no banner", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("Luis", "00");
    await addFromTeamScreen("Eva", "0");
    expect(playerOrder()).toBe("0 Eva 00 Luis 4 Ana");
    expect(bannerTexts()).toEqual([]);
  });

  it("RF-016: a player added to a team is not added to the other one", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("Eva", "5");
    expect(savedPlayers(db, cadete)).toEqual([{ name: "Bea", number: "7" }]);
  });
});

describe("new-player form, the same number twice", () => {
  it("RF-017 RF-069: a second player with number 7 is saved and the banner appears when it is saved, without leaving the screen", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("Luis", "7");
    expect(screen.queryByText(DUPLICATE_BANNER)).toBeNull();
    await addFromTeamScreen("Ana", "7");
    expect(playerOrder()).toBe("4 Ana 7 Ana 7 Luis");
    expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]);
    expect(savedPlayers(db, alevin)).toHaveLength(3);
  });

  it("RF-017 RF-069: a third player with number 7 keeps one banner that names the 7 once", async () => {
    await openTeamAlone(alevin);
    await addFromTeamScreen("Luis", "7");
    await addFromTeamScreen("Eva", "7");
    await addFromTeamScreen("Pau", "7");
    expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]);
  });
});

describe("new-player form, leaving it", () => {
  it("RF-082: going back from a half-filled form asks nothing, saves nothing and shows the team as it was", async () => {
    await openTeamAlone(alevin);
    await openPlayerForm();
    await typePlayerName("Eva");
    await typeNumber("5");
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${alevin}`);
    expect(playerOrder()).toBe("4 Ana");
    expect(savedPlayers(db, alevin)).toEqual([{ name: "Ana", number: "4" }]);
  });

  it("RF-082 E-029: a half-filled form lost when the app closes leaves the team with its saved players only", async () => {
    await openTeamAlone(alevin);
    await openPlayerForm();
    await typePlayerName("Eva");
    await typeNumber("5");
    await act(async () => screen.unmount());
    useMockSquadStore(createSquadStore(db));
    await openTeamAlone(alevin);
    expect(playerOrder()).toBe("4 Ana");
    expect(savedPlayers(db, alevin)).toEqual([{ name: "Ana", number: "4" }]);
  });
});

describe("new-player form, when saving fails", () => {
  it("RF-085: a failed save shows the message, keeps the form open with its text and lists no player", async () => {
    failWrites(db, "players", "INSERT");
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await addViaForm("Eva", "5");
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${alevin}/players/new`);
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Eva");
    expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("5");
    expect(savedPlayers(db, alevin)).toEqual([{ name: "Ana", number: "4" }]);
  });

  it("RF-085: after a failed save the team screen does not list the player", async () => {
    await openTeamAlone(alevin);
    await openPlayerForm();
    failWrites(db, "players", "INSERT");
    await addViaForm("Eva", "5");
    await screen.findByText(SAVE_FAILED);
    await testRouter.back();
    expect(playerOrder()).toBe("4 Ana");
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });

  it("RF-085 RF-016: after a failed save, pressing «Guardar» again saves the player, closes the form and hides the message", async () => {
    await openTeamAlone(alevin);
    await openPlayerForm();
    failWrites(db, "players", "INSERT");
    await addViaForm("Eva", "5");
    await screen.findByText(SAVE_FAILED);
    allowWrites(db, "players", "INSERT");
    await pressSave();
    expect(await screen.findByRole("button", { name: "Editar" })).toBeTruthy();
    expect(playerOrder()).toBe("4 Ana 5 Eva");
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(screen).toHavePathname(`/teams/${alevin}`);
  });
});

describe("new-player form, quick presses", () => {
  it("RF-016 RF-082: two quick presses on «Guardar» add one player", async () => {
    // A deep link leaves the form as the only screen, so it stays mounted after the save and the
    // second press reaches the very same button: only a guard that outlives the save ignores it.
    await openPlayerFormAlone(alevin);
    await screen.findByLabelText("Nombre");
    await typePlayerName("Eva");
    await typeNumber("5");
    const save = saveButton();
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(savedPlayers(db, alevin)).toEqual([
      { name: "Ana", number: "4" },
      { name: "Eva", number: "5" },
    ]);
  });
});
