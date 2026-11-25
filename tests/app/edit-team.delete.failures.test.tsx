// T077: a deletion of a team that fails (RF-015, RF-085). The delete is made to fail with a real
// SQLite trigger, as a full device would: the dialog closes, the team and everything of it stay in
// the database and in the list of teams, `error.saveFailed` shows inside the form's scroll
// container (in normal flow, like the one of «Guardar»), and once the device has room again the same
// button deletes. Same doubles as edit-team.delete.test.tsx.
import { act, screen, testRouter, waitFor } from "expo-router/testing-library";

import {
  BEFORE_10_3,
  NOT_FOUND,
  allowDeletes,
  expectOnList,
  failDeletes,
  hosts,
  openFormFromList,
  pressConfirm,
  pressDelete,
  seedDeletable,
  tableCounts,
  teamIds,
  watchNotFound,
} from "../support/edit-team-delete";
import { inScroll } from "../support/form-scroll";
import { pressSave, savedTeams, typeName } from "../support/new-team-form";
import { SAVE_FAILED, expectBannerInFlow } from "../support/save-error-banner";

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

const teamRow = (name: string) =>
  screen.queryByRole("button", { name: new RegExp(name) });

describe("edit-team form, a deletion that fails (RF-085)", () => {
  it("RF-015 RF-085: a failing delete closes the dialog, shows the save error in the form, stays on the form and leaves the team and everything of it", async () => {
    const { db } = seedDeletable(10, 3);
    failDeletes(db);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    expect(hosts()).toHaveLength(0);
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expectBannerInFlow();
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
    expect(screen).toHavePathname("/teams/1/edit");
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Alevín A");
    expect(tableCounts(db)).toEqual(BEFORE_10_3);
    expect(teamIds(db)).toEqual([1, 2]);
  });

  it("RF-015 RF-085: after the failure the team is still in the list of teams, and its screen is still the team", async () => {
    const { db } = seedDeletable(10, 3);
    const notFound = watchNotFound();
    failDeletes(db);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await screen.findByText(SAVE_FAILED);
    await act(async () => testRouter.back());
    expect(await screen.findByText("Jugador 1")).toBeTruthy();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    await act(async () => testRouter.back());
    await expectOnList();
    expect(teamRow("Alevín A")).not.toBeNull();
    expect(teamRow("Cadete B")).not.toBeNull();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    expect(notFound).not.toHaveBeenCalled();
  });

  // A trigger on a table the team's delete cascades to makes the whole delete fail: nothing is half deleted.
  it.each(["players", "matches"] as const)(
    "RF-015 RF-085: a failure while deleting the team's %s leaves the team and every row exactly as they were",
    async (table) => {
      const { db } = seedDeletable(10, 3);
      failDeletes(db, table);
      await openFormFromList();
      await pressDelete();
      await pressConfirm();
      expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
      expect(tableCounts(db)).toEqual(BEFORE_10_3);
      expect(screen).toHavePathname("/teams/1/edit");
    },
  );

  it("RF-015 RF-085: once the device has room again, the same button asks again and deletes the team, and the error is gone", async () => {
    const { db } = seedDeletable(10, 3);
    failDeletes(db);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await screen.findByText(SAVE_FAILED);
    allowDeletes(db);
    await pressDelete();
    expect(hosts()).toHaveLength(1);
    await pressConfirm();
    await expectOnList();
    expect(teamIds(db)).toEqual([2]);
    expect(teamRow("Alevín A")).toBeNull();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });

  it("RF-085: after a failed delete the form still saves a rename with «Guardar»", async () => {
    const { db } = seedDeletable(2, 1);
    failDeletes(db);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await screen.findByText(SAVE_FAILED);
    await typeName("Alevín B");
    await pressSave();
    await waitFor(() => expect(savedTeams(db)[0]?.name).toBe("Alevín B"));
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(tableCounts(db).teams).toBe(2);
  });
});
