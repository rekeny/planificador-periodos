// F-D3-04 (Codex review of PR 25, finding 2, RF-023, RF-032): a player deactivated while a new-match
// form is open is no longer offered in it and is not saved in its call-up. The stack is the list of
// teams, the team screen and the form, with the player's edit route pushed over the form:
// «Desactivar», Back. The refresh of the candidates keeps what was typed, the chosen format and the
// players the coach deselected. Real src/app routes and stores on the in-memory database; same
// doubles as new-match.same-team-forms.test.tsx.
import { screen } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { deactivateOver } from "../support/deactivated-while-open";
import { useMockSquadStore } from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
import { savedEntryLabels, savedMatches } from "../support/new-match-fixtures";
import {
  chooseFormatInForm,
  checkedFormats,
  freshDraft,
  homeField,
  openFormFromTeam,
  typeIn,
} from "../support/new-match-form";
import {
  boxStates,
  checkedCount,
  countTexts,
  pressSaveMatch,
  seedSquadTeam,
  squadOf,
  startMatchSession,
  toggleNamed,
  waitForPathname,
} from "../support/new-match-save";
import { playerIdOf } from "../support/player-screen";

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
let draft: ReturnType<typeof freshDraft>;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
  startMatchSession(db);
  seedSquadTeam(db, squadOf(10));
});

const FORM = "/teams/1/matches/new";
const listed = (): string[] => boxStates().map((state) => state.text);

/** The form with the home name typed, the 4-period format chosen and Jugador 2 deselected. */
async function openEditedForm(): Promise<void> {
  await openFormFromTeam("Alevín A");
  await typeIn(homeField(), "Águilas");
  await chooseFormatInForm(4);
  await toggleNamed(draft, "Jugador 2");
}

describe("new-match form, a player deactivated while the form is open (F-D3-04)", () => {
  it("F-D3-04 RF-023 RF-032: after «Desactivar» and Back the form no longer lists Jugador 3, and the count and the checks are of the nine left", async () => {
    await openEditedForm();
    expect(listed()).toContain("3 Jugador 3");
    await deactivateOver(1, playerIdOf(db, 1, "Jugador 3"), FORM);
    expect(listed()).toHaveLength(9);
    expect(listed()).not.toContain("3 Jugador 3");
    expect(checkedCount()).toBe(8);
    expect(countTexts()).toEqual(["8 convocados"]);
  });

  it("F-D3-04 RF-023 RF-082: the refresh keeps what was typed, the chosen format and the player the coach had deselected", async () => {
    await openEditedForm();
    await deactivateOver(1, playerIdOf(db, 1, "Jugador 3"), FORM);
    expect(homeField().props.value).toBe("Águilas");
    expect(checkedFormats()).toEqual([4]);
    expect(boxStates().find((s) => s.text === "2 Jugador 2")?.checked).toBe(
      false,
    );
    expect(boxStates().find((s) => s.text === "1 Jugador 1")?.checked).toBe(
      true,
    );
  });

  it("F-D3-04 RF-023 RF-032: «Guardar» saves a call-up without the deactivated player and without the deselected one, with the typed name and format", async () => {
    await openEditedForm();
    await deactivateOver(1, playerIdOf(db, 1, "Jugador 3"), FORM);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    const labels = savedEntryLabels(db, 1);
    expect(labels).toHaveLength(8);
    expect(labels).not.toContain("3 Jugador 3");
    expect(labels).not.toContain("2 Jugador 2");
    expect(savedMatches(db)[0]).toMatchObject({
      homeName: "Águilas",
      format: 4,
    });
    expect(screen.queryByText(/Jugador 3/)).toBeNull();
  });
});
