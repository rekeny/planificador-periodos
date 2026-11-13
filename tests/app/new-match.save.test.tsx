// T044: «Guardar» of the new-match screen when it works: what is saved, where the screen goes and
// what Back does afterwards (RF-005, RF-010, RF-025, RF-030, RF-031, RF-036, RF-068, RF-082, E-015,
// E-030). Real src/app routes through renderRouter and the real draft and match session store on
// the in-memory database; the doubles are those of new-match.form.test.tsx. The button «Guardar»
// and the call-up list do not exist yet (see tests/support/new-match-save.ts for the assumed shape).
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import { listTeams } from "@/data/team-repository";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedEntryLabels, savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  chooseFormatInForm,
  freshDraft,
  homeField,
  openFormAlone,
  scoreFields,
  typeIn,
} from "../support/new-match-form";
import {
  bannerTexts,
  boxStates,
  deactivateNamed,
  pressSaveMatch,
  rangeBanner,
  rowsShown,
  seedSquadTeam,
  squadOf,
  startMatchSession,
  toggleAt,
  waitForPathname,
} from "../support/new-match-save";

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
let draft: NewMatchDraft;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
  startMatchSession(db);
});

describe("new-match «Guardar», the match is created (RF-025, RF-030, RF-036)", () => {
  it.each([6, 8] as const)(
    "RF-025 RF-030 RF-036: with the defaults of a %i-period team and 12 players, «Guardar» saves one match with that format, today (2026-11-11), no time and 12 entries, and opens its screen",
    async (format) => {
      const team = seedSquadTeam(db, squadOf(12), format);
      await openFormAlone(team);
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatches(db)).toMatchObject([
        { teamId: team, format, date: "2026-11-11", time: null },
      ]);
      expect(savedEntryLabels(db, 1)).toHaveLength(12);
      expect(screen.queryByLabelText("Local")).toBeNull();
    },
  );

  it("RF-030: the match screen shows the call-up of the new match in the draft's order, and no banner with 12 players", async () => {
    const team = seedSquadTeam(db, squadOf(12));
    await openFormAlone(team);
    const order = draft.getState().callUpSelection.map((r) => r.player);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(rowsShown()).toBe(
      order.map((player) => `${player.number} ${player.name}`).join(" "),
    );
    expect(bannerTexts()).toEqual([]);
  });

  it("RF-031: deselecting two of twelve players saves a match with 10 entries, without them, and both stay in the team", async () => {
    const team = seedSquadTeam(db, squadOf(12));
    await openFormAlone(team);
    const [first, second] = draft.getState().callUpSelection;
    await toggleAt(0);
    await toggleAt(1);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    const labels = savedEntryLabels(db, 1);
    expect(labels).toHaveLength(10);
    expect(labels).not.toContain(
      `${first?.player.number} ${first?.player.name}`,
    );
    expect(labels).not.toContain(
      `${second?.player.number} ${second?.player.name}`,
    );
    // Whole rows, in the draft's order: a substring check would find "Jugador 1" in "Jugador 12".
    const kept = draft.getState().callUpSelection.slice(2);
    expect(rowsShown()).toBe(
      kept.map((row) => `${row.player.number} ${row.player.name}`).join(" "),
    );
  });

  it("RF-025 RF-036: the typed fields and the chosen format are saved, and the team's default format stays", async () => {
    const team = seedSquadTeam(db, squadOf(12));
    await openFormAlone(team);
    await chooseFormatInForm(4);
    await typeIn(homeField(), " Alevín A ");
    await typeIn(scoreFields()[0]!, "54");
    await typeIn(scoreFields()[1]!, "0");
    await toggleAt(2);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toMatchObject([
      { format: 4, homeName: "Alevín A", homeScore: 54, awayScore: 0 },
    ]);
    expect(savedEntryLabels(db, 1)).toHaveLength(11);
    expect(listTeams(db).map((one) => one.defaultFormat)).toEqual([6]);
  });

  it("RF-030: a deactivated player is not in the saved call-up", async () => {
    const team = seedSquadTeam(db, [...squadOf(9), ["Baja", "40"]]);
    deactivateNamed(db, team, "Baja");
    await openFormAlone(team);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedEntryLabels(db, 1)).toHaveLength(9);
    expect(savedEntryLabels(db, 1).join(" ")).not.toContain("Baja");
  });
});

describe("new-match «Guardar», outside the range never blocks (RF-010, E-015, E-030)", () => {
  it.each([
    [8, 6, true],
    [9, 6, false],
    [12, 6, false],
    [13, 6, true],
    [7, 4, true],
    [13, 8, true],
  ] as const)(
    "RF-010 RF-068 E-015 E-030: %i players in %i periods are saved with all their entries, the match screen shows the banner: %s",
    async (count, format, banner) => {
      const team = seedSquadTeam(db, squadOf(count), format);
      await openFormAlone(team);
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatches(db)).toHaveLength(1);
      expect(savedEntryLabels(db, 1)).toHaveLength(count);
      expect(bannerTexts()).toEqual(banner ? [rangeBanner(format, count)] : []);
    },
  );

  it("RF-010 RF-068: a team with no active players saves a match with an empty call-up, and the match screen shows the banner", async () => {
    const team = seedSquadTeam(db, [["Baja", "1"]]);
    deactivateNamed(db, team, "Baja");
    await openFormAlone(team);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryLabels(db, 1)).toEqual([]);
    expect(bannerTexts()).toEqual([rangeBanner(6, 0)]);
  });

  it("RF-010: a team with no players at all saves a match too", async () => {
    const team = seedSquadTeam(db, []);
    await openFormAlone(team);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryLabels(db, 1)).toEqual([]);
  });

  it("RF-010: everyone deselected is saved as an empty call-up", async () => {
    const team = seedSquadTeam(db, squadOf(9));
    await openFormAlone(team);
    for (let index = 0; index < 9; index += 1) await toggleAt(index);
    expect(boxStates().every((state) => !state.checked)).toBe(true);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedEntryLabels(db, 1)).toEqual([]);
  });
});

describe("new-match «Guardar», Back and quick presses (P-30, RF-031, RF-082)", () => {
  it("RF-025 RF-082: «Guardar» replaces the form with the grid, so Back goes to the team screen and not to the form, with one match saved", async () => {
    const team = seedSquadTeam(db, squadOf(9));
    await renderRouter("./src/app", { initialUrl: `/teams/${team}` });
    await testRouter.push(`/teams/${team}/matches/new`);
    await screen.findByLabelText("Local");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${team}`);
    expect(screen.queryByLabelText("Local")).toBeNull();
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryLabels(db, 1)).toHaveLength(9);
  });

  it("RF-025: two quick presses on «Guardar» create one match with one set of entries", async () => {
    const team = seedSquadTeam(db, squadOf(10));
    await openFormAlone(team);
    const save = screen.getByRole("button", { name: "Guardar" });
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryLabels(db, 1)).toHaveLength(10);
    await waitForPathname("/matches/1");
  });

  it("RF-031 RF-082: sequence toggle, change the format, save: the match has the format and the selection, and the next new match starts with everyone selected", async () => {
    const team = seedSquadTeam(db, squadOf(12));
    await openFormAlone(team);
    await toggleAt(4);
    await chooseFormatInForm(8);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toMatchObject([{ format: 8 }]);
    expect(savedEntryLabels(db, 1)).toHaveLength(11);
    await testRouter.push(`/teams/${team}/matches/new`);
    await screen.findByLabelText("Local");
    expect(boxStates()).toHaveLength(12);
    expect(boxStates().every((state) => state.checked)).toBe(true);
    expect(savedMatches(db)).toHaveLength(1);
  });
});
