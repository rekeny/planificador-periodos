// T076: the player screen, `/teams/<id>/players/<playerId>`: opening it from a row of the team
// screen, its form with the player's values, and saving a new name and number (RF-016, RF-018,
// RF-019, RF-021, E-018). Real src/app routes through renderRouter, with the doubles of
// new-player.save.test.tsx. The route does not exist yet; the assumed screens are in
// tests/support/player-screen.ts. What cannot be saved is in player-screen.edit.rejects.test.tsx,
// leaving and the banner in player-screen.edit.leaving.test.tsx, deactivating in
// player-screen.active.test.tsx.
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createMatch } from "@/data/match-repository";
import { listPlayers } from "@/data/player-repository";
import { entryOf, matchValues } from "../data/match-fixtures";
import { presentations } from "../support/screen-presentation";
import {
  NAME_REQUIRED,
  SAVE_FAILED,
  saveButton,
} from "../support/new-team-form";
import {
  NUMBER_INVALID,
  addViaForm,
  headerTitles,
  openTeamAlone,
  playerOrder,
} from "../support/team-screen";
import {
  callUpSnapshots,
  expectOnTeam,
  fieldValues,
  hasAction,
  openPlayerFromTeam,
  pressRow,
  rowOf,
  savedRows,
  seedPlayerScreen,
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

const FORTY = "Club Baloncesto Alevín Aragón Zaragoza 1";
let s: ReturnType<typeof seedPlayerScreen>;

beforeEach(() => {
  s = seedPlayerScreen();
});

describe("player screen, opening it from the team screen", () => {
  it("RF-018: every player row of the team screen is a button, one per player", async () => {
    await openTeamAlone(s.alevin);
    expect(rowOf("Juan")).toBeTruthy();
    expect(rowOf("Ana")).toBeTruthy();
    expect(playerOrder()).toBe("4 Ana 7 Juan");
  });

  it("RF-018 RF-076: pressing Juan's row opens /teams/<id>/players/<playerId> as a modal titled «Editar» over the team", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.juan}`);
    expect(headerTitles()).toEqual(["Alevín A", "Editar"]);
    expect(presentations()).toEqual(["push", "modal"]);
  });

  it("RF-018: the form shows the player's own name and number, the button «Guardar» and no message", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    expect(fieldValues()).toEqual({ name: "Juan", number: "7" });
    expect(saveButton()).toBeTruthy();
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });

  it("RF-018: the form of Ana, opened after Juan's, shows Ana's values", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await testRouter.back();
    await pressRow("Ana");
    await screen.findByLabelText("Dorsal");
    expect(fieldValues()).toEqual({ name: "Ana", number: "4" });
  });

  it("RF-018 RF-021: the new-player form has no «Desactivar» and no «Reactivar», only the edit one", async () => {
    await renderRouter("./src/app", {
      initialUrl: `/teams/${s.alevin}/players/new`,
    });
    await screen.findByLabelText("Dorsal");
    expect(hasAction("Desactivar")).toBe(false);
    expect(hasAction("Reactivar")).toBe(false);
  });

  it("RF-016 E-022: the fields stop at 40 and 2 characters, as in the new-player form", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    expect(screen.getByLabelText("Nombre").props.maxLength).toBe(40);
    expect(screen.getByLabelText("Dorsal").props.maxLength).toBe(2);
  });
});

describe("player screen, saving a new name and number", () => {
  it("RF-018 E-018: renaming Juan to «Juanito» and changing 7 to 9 and pressing «Guardar» goes back to the team, which shows «9 Juanito»", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await addViaForm("Juanito", "9");
    await expectOnTeam(s.alevin);
    await waitFor(() => expect(playerOrder()).toBe("4 Ana 9 Juanito"));
    expect(savedRows(s.db, s.alevin)).toEqual([
      { name: "Juanito", number: "9", isActive: true },
      { name: "Ana", number: "4", isActive: true },
    ]);
  });

  it("RF-018: a name typed with spaces around is saved without them, and only the player's own row changes", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    await addViaForm("  Anita  ", "4");
    await expectOnTeam(s.alevin);
    expect(savedRows(s.db, s.alevin)).toEqual([
      { name: "Juan", number: "7", isActive: true },
      { name: "Anita", number: "4", isActive: true },
    ]);
    expect(savedRows(s.db, s.cadete)).toEqual([
      { name: "Bea", number: "7", isActive: true },
    ]);
  });

  it("RF-018 RF-019 E-018: the match created before the change keeps «Juan» and 7 in its call-up, and the player has the new number", async () => {
    const record = listPlayers(s.db, s.alevin).find((p) => p.id === s.juan);
    const match = createMatch(s.db, matchValues(s.alevin), [entryOf(record!)]);
    await openPlayerFromTeam(s.alevin, "Juan");
    await addViaForm("Juanito", "9");
    await expectOnTeam(s.alevin);
    expect(callUpSnapshots(s.db, match.id)).toEqual([
      { name: "Juan", number: "7" },
    ]);
    expect(savedRows(s.db, s.alevin)[0]).toMatchObject({ number: "9" });
  });

  it("RF-018 E-022: a 40-character name is saved and no message is shown at the limit", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await addViaForm(FORTY, "7");
    await expectOnTeam(s.alevin);
    expect(FORTY).toHaveLength(40);
    expect(savedRows(s.db, s.alevin)[0]).toMatchObject({ name: FORTY });
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
  });

  it.each(["0", "00", "99"])(
    "RF-018 RF-016 E-021: changing the number to «%s» is saved",
    async (number) => {
      await openPlayerFromTeam(s.alevin, "Juan");
      await addViaForm("Juan", number);
      await expectOnTeam(s.alevin);
      expect(savedRows(s.db, s.alevin)[0]).toMatchObject({ number });
    },
  );
});
