// T044: the call-up selection of the new-match screen: the list, the count and the range banner
// (RF-005, RF-010, RF-030, RF-031, RF-068, E-015, E-030). Real src/app routes through renderRouter
// and a real draft on the in-memory database; the doubles are those of new-match.form.test.tsx.
// The list, the count and the button «Guardar» do not exist yet. The assumed shape of the screen
// is described in tests/support/new-match-save.ts.
import { screen } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  chooseFormatInForm,
  freshDraft,
  openFormAlone,
} from "../support/new-match-form";
import {
  bannerTexts,
  boxStates,
  checkedCount,
  countTexts,
  deactivateNamed,
  listedNames,
  rangeBanner,
  saveMatchButton,
  seedSquadTeam,
  squadOf,
  toggleAt,
  toggleNamed,
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

const RANGE: [number, number, boolean][] = [
  [6, 8, true],
  [6, 9, false],
  [6, 12, false],
  [6, 13, true],
  [4, 7, true],
  [4, 8, false],
  [8, 7, true],
  [8, 8, false],
];
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let draft: NewMatchDraft;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
});

async function openSquad(count: number, format: 4 | 6 | 8 = 6): Promise<void> {
  const team = seedSquadTeam(db, squadOf(count), format);
  await openFormAlone(team);
}

describe("new-match call-up, the list (RF-030, RF-031)", () => {
  it("RF-030: es.json holds «{{count}} convocados» as callUp.count", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.callUp?.count).toBe("{{count}} convocados");
  });

  it("RF-030 RF-031: a team with 12 players lists the 12, in order, all selected, and the count is «12 convocados»", async () => {
    await openSquad(12);
    const states = boxStates();
    expect(states).toHaveLength(12);
    expect(checkedCount()).toBe(12);
    expect(listedNames(draft)).toEqual(
      draft.getState().callUpSelection.map((row) => row.player.name),
    );
    expect(states[0]?.text).toMatch(/\bJugador 1\b/);
    expect(states[11]?.text).toMatch(/\bJugador 12\b/);
    expect(countTexts()).toEqual(["12 convocados"]);
  });

  it("RF-030: a deactivated player is never offered: 12 active and 1 deactivated list 12, the count is 12 and the draft agrees", async () => {
    const team = seedSquadTeam(db, [...squadOf(12), ["Baja", "40"]]);
    deactivateNamed(db, team, "Baja");
    await openFormAlone(team);
    expect(boxStates()).toHaveLength(12);
    expect(screen.queryByText(/Baja/)).toBeNull();
    expect(countTexts()).toEqual(["12 convocados"]);
    expect(draft.getState().callUpSelection).toHaveLength(12);
  });

  it("RF-030: players with the same number, and the numbers «0» and «00», are all listed, in the order of the draft", async () => {
    const team = seedSquadTeam(db, [
      ["Ana", "7"],
      ["Eva", "7"],
      ["Zoe", "0"],
      ["Mia", "00"],
    ]);
    await openFormAlone(team);
    expect(boxStates()).toHaveLength(4);
    const order = draft.getState().callUpSelection.map((r) => r.player.name);
    expect(boxStates().map((state) => state.text)).toEqual(
      order.map((name) => expect.stringMatching(new RegExp(`\\b${name}\\b`))),
    );
    expect(new Set(order)).toEqual(new Set(["Ana", "Eva", "Zoe", "Mia"]));
  });

  it("RF-031: pressing a player deselects only that player and pressing again selects them, and the count follows", async () => {
    await openSquad(12);
    await toggleNamed(draft, "Jugador 3");
    const row = draft
      .getState()
      .callUpSelection.findIndex((one) => one.player.name === "Jugador 3");
    expect(boxStates()[row]?.checked).toBe(false);
    expect(checkedCount()).toBe(11);
    expect(countTexts()).toEqual(["11 convocados"]);
    expect(
      draft.getState().callUpSelection.filter((r) => !r.selected),
    ).toHaveLength(1);
    await toggleAt(row);
    expect(boxStates()[row]?.checked).toBe(true);
    expect(countTexts()).toEqual(["12 convocados"]);
  });

  it("RF-031: deselecting a player with the same number as another leaves the other selected", async () => {
    const team = seedSquadTeam(db, [
      ["Ana", "7"],
      ["Eva", "7"],
    ]);
    await openFormAlone(team);
    await toggleNamed(draft, "Eva");
    expect(
      draft.getState().callUpSelection.map((r) => [r.player.name, r.selected]),
    ).toEqual(
      expect.arrayContaining([
        ["Ana", true],
        ["Eva", false],
      ]),
    );
    expect(checkedCount()).toBe(1);
  });
});

describe("new-match call-up, the range banner (RF-005, RF-010, RF-068, E-015, E-030)", () => {
  it.each(RANGE)(
    "RF-005 RF-068 E-015 E-030: in %i periods with %i players the banner is shown: %s, and «Guardar» is still enabled",
    async (format, count, shown) => {
      await openSquad(count, format as 4 | 6 | 8);
      expect(bannerTexts()).toEqual(
        shown ? [rangeBanner(format as 4 | 6 | 8, count)] : [],
      );
      expect(countTexts()).toEqual([`${count} convocados`]);
      expect(saveMatchButton()).toBeEnabled();
    },
  );

  it("RF-068 E-015: 8 players in 6 periods show the exact banner «con 6 periodos deben ser de 9 a 12 jugadores, y hay 8»", async () => {
    await openSquad(8);
    expect(bannerTexts()).toEqual([
      "Convocatoria fuera del rango: con 6 periodos deben ser de 9 a 12 jugadores, y hay 8.",
    ]);
  });

  it("RF-068: the banner follows the selection: 12 → 9 hides it, 8 shows it, 9 again hides it", async () => {
    await openSquad(12);
    expect(bannerTexts()).toEqual([]);
    await toggleAt(0);
    await toggleAt(1);
    await toggleAt(2);
    expect(bannerTexts()).toEqual([]);
    await toggleAt(3);
    expect(bannerTexts()).toEqual([rangeBanner(6, 8)]);
    expect(countTexts()).toEqual(["8 convocados"]);
    await toggleAt(3);
    expect(bannerTexts()).toEqual([]);
  });

  it("RF-068: the banner follows the format chosen in the form: 8 players warn in 6 periods and not in 8 or 4", async () => {
    await openSquad(8);
    expect(bannerTexts()).toEqual([rangeBanner(6, 8)]);
    await chooseFormatInForm(8);
    expect(bannerTexts()).toEqual([]);
    await chooseFormatInForm(6);
    expect(bannerTexts()).toEqual([rangeBanner(6, 8)]);
    await chooseFormatInForm(4);
    expect(bannerTexts()).toEqual([]);
  });

  it("RF-010 RF-068: a team with no active players lists nobody, shows «0 convocados» and the banner, and «Guardar» is enabled", async () => {
    const team = seedSquadTeam(db, [["Baja", "1"]]);
    deactivateNamed(db, team, "Baja");
    await openFormAlone(team);
    expect(boxStates()).toEqual([]);
    expect(countTexts()).toEqual(["0 convocados"]);
    expect(bannerTexts()).toEqual([rangeBanner(6, 0)]);
    expect(saveMatchButton()).toBeEnabled();
  });

  it("RF-010: a team with no players at all shows the same", async () => {
    await openSquad(0);
    expect(boxStates()).toEqual([]);
    expect(countTexts()).toEqual(["0 convocados"]);
    expect(saveMatchButton()).toBeEnabled();
  });
});
