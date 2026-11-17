// T035: the players of the team screen, their order and the duplicate-number banner (RF-016,
// RF-017, RF-069, E-020). Same doubles as team-screen.test.tsx. Every test opens the team screen
// as the only screen, because the screens under it would add their own Texts. The players are
// created behind the app's back, so the screen must read them with `openTeam` from the database.
import { renderRouter, screen } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN, CADETE, breakReads } from "../support/squad-fixtures";
import { NOT_FOUND } from "../support/edit-team";
import {
  DUPLICATE_BANNER,
  bannerTexts,
  openTeamAlone,
  playerOrder,
  seedTeam,
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

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
});

describe("team screen, order of the players", () => {
  it("RF-016 E-020: Luis 00, Ana 0, Eva 10, Bea 7 and Carla 0 are shown as Ana 0, Carla 0, Luis 00, Bea 7, Eva 10", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "00"],
      ["Ana", "0"],
      ["Eva", "10"],
      ["Bea", "7"],
      ["Carla", "0"],
    ]);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("0 Ana 0 Carla 00 Luis 7 Bea 10 Eva");
  });

  it("RF-016: the players 9, 4 and 7 are shown as 4, 7, 9", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Pau", "9"],
      ["Eva", "4"],
      ["Luis", "7"],
    ]);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("4 Eva 7 Luis 9 Pau");
  });

  it("RF-016: Luis 7 and Ana 7 are shown with Ana first, whichever was saved first", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "7"],
      ["Ana", "7"],
    ]);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("7 Ana 7 Luis");
  });

  it("RF-016 E-020: «0» and «00» in the same team are both listed, «0» first, and the screen shows no banner", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "00"],
      ["Ana", "0"],
    ]);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("0 Ana 00 Luis");
    expect(bannerTexts()).toEqual([]);
  });

  it("RF-016: a team with no players shows an empty list with no text and no banner", async () => {
    const id = seedTeam(db, CADETE);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("");
    expect(bannerTexts()).toEqual([]);
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("RF-016: another team's players are never shown", async () => {
    const id = seedTeam(db, ALEVIN, [["Ana", "4"]]);
    seedTeam(db, CADETE, [["Bea", "7"]]);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("4 Ana");
  });

  it("RF-016 RF-085: players whose read fails show the not-found message and no list", async () => {
    const id = seedTeam(db, ALEVIN, [["Ana", "4"]]);
    breakReads(db, "players");
    await renderRouter("./src/app", { initialUrl: `/teams/${id}` });
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screen.queryByText("Ana")).toBeNull();
  });
});

describe("team screen, duplicate-number banner", () => {
  it("RF-017 RF-069: two players with number 7 are both listed and the banner names the 7", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "7"],
      ["Ana", "7"],
      ["Eva", "10"],
    ]);
    await openTeamAlone(id);
    expect(playerOrder()).toBe("7 Ana 7 Luis 10 Eva");
    expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]);
  });

  it("RF-069: three players with number 7 name the 7 only once", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "7"],
      ["Ana", "7"],
      ["Eva", "7"],
    ]);
    await openTeamAlone(id);
    expect(bannerTexts()).toEqual(["Hay jugadores con el mismo dorsal: 7."]);
  });

  it("RF-069: two repeated numbers, 7 and 9, are both named in one banner", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "7"],
      ["Ana", "7"],
      ["Eva", "9"],
      ["Pau", "9"],
      ["Bea", "4"],
    ]);
    await openTeamAlone(id);
    expect(bannerTexts()).toHaveLength(1);
    expect(bannerTexts()[0]).toMatch(/: .*7.*\.$/);
    expect(bannerTexts()[0]).toMatch(/: .*9.*\.$/);
    expect(bannerTexts()[0]).not.toMatch(/4/);
  });

  it("RF-069: all different numbers show no banner", async () => {
    const id = seedTeam(db, ALEVIN, [
      ["Luis", "7"],
      ["Ana", "8"],
    ]);
    await openTeamAlone(id);
    expect(screen.queryByText(DUPLICATE_BANNER)).toBeNull();
  });

  it("RF-069: the banner of one team is not shown in another team without repeats", async () => {
    seedTeam(db, ALEVIN, [
      ["Luis", "7"],
      ["Ana", "7"],
    ]);
    const other = seedTeam(db, CADETE, [["Bea", "7"]]);
    await openTeamAlone(other);
    expect(bannerTexts()).toEqual([]);
  });
});
