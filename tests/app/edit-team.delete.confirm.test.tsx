// T077: a confirmed deletion of a team from its edit form (RF-015, RF-021, RF-082, D3 rules 3 and
// 5, phase 4 review M-6). Confirming runs the store's `deleteTeam` and, in the same handler, takes the
// app back to the list of teams, popping the team screen and the form together; the team, its
// players, its matches and their call-ups and marks are gone and the other team is untouched. The
// open team stays in the squad store on purpose (T075), so no screen may draw `notFound.message`
// between the confirmation and the list. Real src/app routes through renderRouter; same doubles as
// edit-team.delete.test.tsx.
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import {
  AFTER_10_3,
  BEFORE_10_3,
  NOT_FOUND,
  confirmButton,
  expectOnList,
  openEditFromList,
  openFormFromList,
  pressConfirm,
  pressDelete,
  pressHandlerOf,
  seedDeletable,
  tableCounts,
  teamIds,
  teamScreensMounted,
} from "../support/edit-team-delete";
import { itemDates, pressAllMatches } from "../support/match-lists";

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

const teamRowOf = (name: string) =>
  screen.queryByRole("button", { name: new RegExp(name) });

describe("edit-team form, confirming the deletion (RF-015)", () => {
  it("RF-015: a team with 10 players and 3 matches is deleted with everything of it: players, matches, call-ups and marks; the other team keeps its own", async () => {
    const { db, store } = seedDeletable(10, 3);
    const remove = jest.spyOn(store.getState(), "deleteTeam");
    await openFormFromList();
    expect(tableCounts(db)).toEqual(BEFORE_10_3);
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(1);
    expect(tableCounts(db)).toEqual(AFTER_10_3);
    expect(teamIds(db)).toEqual([2]);
  });

  it("RF-015 RF-021: after confirming, the list of teams shows only the other team and no screen of the deleted one is left in the stack, so Back cannot reach it", async () => {
    seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    expect(teamRowOf("Alevín A")).toBeNull();
    expect(teamRowOf("Cadete B")).not.toBeNull();
    expect(teamScreensMounted()).toBe(false);
    expect(testRouter.canGoBack()).toBe(false);
  });

  it("RF-015: in the same handler, with no wait, the app is already on the list of teams (a press that only closes the dialog would leave it on the form)", async () => {
    seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    const confirm = pressHandlerOf(confirmButton());
    await act(async () => {
      confirm();
    });
    expect(screen).toHavePathname("/");
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });

  it("RF-015: a team with no players and no matches is deleted too, and nothing of the other team changes", async () => {
    const { db } = seedDeletable(0, 0);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    expect(tableCounts(db)).toEqual({
      teams: 1,
      players: 1,
      matches: 1,
      call_up_entries: 0,
      marks: 0,
    });
    expect(teamIds(db)).toEqual([2]);
    expect(teamRowOf("Alevín A")).toBeNull();
  });

  it("RF-015: the other team is still there with its player and its match", async () => {
    seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    await fireEvent.press(screen.getByRole("button", { name: /Cadete B/ }));
    expect(await screen.findByText("Bea")).toBeTruthy();
    expect(itemDates()).toEqual(["20/11/2026"]);
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("RF-015 RF-021: the team's player rows and matches are not shown anywhere: the team's link now shows not-found and the list never lists it", async () => {
    seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    await testRouter.push("/teams/1");
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screen.queryByText("Jugador 1")).toBeNull();
  });
});

describe("edit-team form, the list of every match after the deletion (RF-015, D3 rule 5)", () => {
  it("RF-015: «Todos los partidos», loaded before the deletion with the 4 matches, lists only the other team's match afterwards", async () => {
    seedDeletable(10, 3);
    await renderRouter("./src/app");
    await pressAllMatches();
    expect(itemDates()).toHaveLength(4);
    await act(async () => testRouter.back());
    await openEditFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    await pressAllMatches();
    expect(itemDates()).toEqual(["20/11/2026"]);
  });

  it("RF-015: after deleting both teams the list of every match shows its empty text", async () => {
    seedDeletable(2, 2);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    await fireEvent.press(screen.getByRole("button", { name: /Cadete B/ }));
    await screen.findByText("Bea");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Editar equipo" }),
    );
    await screen.findByLabelText("Nombre");
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    await pressAllMatches();
    expect(await screen.findByText("Todavía no hay partidos.")).toBeTruthy();
    expect(itemDates()).toEqual([]);
  });
});
