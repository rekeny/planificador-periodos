// T076: leaving the player screen without «Guardar», two quick presses, editing a deactivated
// player, and the duplicate-number banner after an edit (RF-018, RF-022, RF-069, RF-082). Same
// doubles as player-screen.edit.test.tsx.
import {
  act,
  fireEvent,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { useMockSquadStore } from "../support/mock-app-stores";
import { saveButton } from "../support/new-team-form";
import {
  addViaForm,
  bannerTexts,
  openTeamAlone,
  playerOrder,
  typeNumber,
  typePlayerName,
} from "../support/team-screen";
import {
  JUAN_AND_ANA,
  deactivateDirectly,
  expectOnTeam,
  fieldValues,
  openPlayerAlone,
  openPlayerFromTeam,
  pressRow,
  savedRows,
  seedPlayerScreen,
  spyOnUpdates,
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

let s: ReturnType<typeof seedPlayerScreen>;

beforeEach(() => {
  s = seedPlayerScreen();
});

describe("player screen, leaving and pressing twice", () => {
  it("RF-082: going back with a changed name and number asks nothing, saves nothing and the team shows the old data", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await typePlayerName("Juanito");
    await typeNumber("9");
    await testRouter.back();
    await expectOnTeam(s.alevin);
    expect(playerOrder()).toBe("4 Ana 7 Juan");
    expect(savedRows(s.db, s.alevin)).toEqual(JUAN_AND_ANA);
  });

  it("RF-082: the screen opened again after leaving with changes shows the saved values, not the typed ones", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await typePlayerName("Juanito");
    await testRouter.back();
    await expectOnTeam(s.alevin);
    await pressRow("Juan");
    await screen.findByLabelText("Dorsal");
    expect(fieldValues()).toEqual({ name: "Juan", number: "7" });
  });

  it("RF-082 E-029: a half-edited form lost when the app closes leaves the saved player as it was", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await typePlayerName("Juanito");
    await typeNumber("9");
    await act(async () => screen.unmount());
    useMockSquadStore(createSquadStore(s.db));
    await openTeamAlone(s.alevin);
    expect(playerOrder()).toBe("4 Ana 7 Juan");
    expect(savedRows(s.db, s.alevin)).toEqual(JUAN_AND_ANA);
  });

  it("RF-018 RF-082: two quick presses on «Guardar» write once", async () => {
    // A deep link leaves the form as the only screen, so it stays mounted after the save and the
    // second press reaches the very same button: only a guard that outlives the save ignores it.
    const updates = spyOnUpdates(s.store);
    await openPlayerAlone(s.alevin, s.juan);
    await screen.findByLabelText("Dorsal");
    await typePlayerName("Juanito");
    await typeNumber("9");
    const save = saveButton();
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(updates).toHaveBeenCalledTimes(1);
    expect(savedRows(s.db, s.alevin)[0]).toMatchObject({
      name: "Juanito",
      number: "9",
    });
  });
});

describe("player screen, a deactivated player is edited too", () => {
  it("RF-018 RF-022: changing the name and number of a deactivated player saves them and keeps it deactivated", async () => {
    deactivateDirectly(s.db, s.juan);
    await openPlayerFromTeam(s.alevin, "Juan");
    expect(fieldValues()).toEqual({ name: "Juan", number: "7" });
    await addViaForm("Juanito", "9");
    await expectOnTeam(s.alevin);
    expect(savedRows(s.db, s.alevin)[0]).toEqual({
      name: "Juanito",
      number: "9",
      isActive: false,
    });
  });
});

describe("player screen, the duplicate-number banner (RF-069)", () => {
  it("RF-069 RF-018: two active players with 7 show the banner; editing one to 8 and pressing «Guardar» takes it away", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    await addViaForm("Ana", "7");
    await expectOnTeam(s.alevin);
    await waitFor(() =>
      expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]),
    );
    await pressRow("Ana");
    await screen.findByLabelText("Dorsal");
    await addViaForm("Ana", "8");
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(bannerTexts()).toEqual([]));
    expect(playerOrder()).toBe("7 Juan 8 Ana");
  });

  it("RF-069 RF-018: the banner is not there before the edit and the team screen shows it once the second 7 is saved", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    expect(bannerTexts()).toEqual([]);
    await addViaForm("Ana", "7");
    await expectOnTeam(s.alevin);
    await waitFor(() =>
      expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]),
    );
  });
});
