// T077: the sequence of a confirmed deletion (RF-015, RF-082, D3 rule 3, phase 4 review M-6): no
// not-found screen between the confirmation and the list of teams (the open team stays in the squad
// store on purpose, T075), the deletion happens once, and the whole sequence renders cleanly. Real
// src/app routes through renderRouter; same doubles as edit-team.delete.test.tsx.
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
  dialog,
  expectOnList,
  openFormFromList,
  pressConfirm,
  pressDelete,
  pressHandlerOf,
  recordStatuses,
  renderUpdateWarnings,
  seedDeletable,
  tableCounts,
  teamIds,
  watchNotFound,
} from "../support/edit-team-delete";

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

describe("edit-team form, no not-found on the way (phase 4 review M-6)", () => {
  it("RF-015: between the confirmation and the list of teams the not-found screen is never drawn, by the form or by the team screen, and the squad store never reports «notFound»", async () => {
    const { store } = seedDeletable(10, 3);
    const notFound = watchNotFound();
    await openFormFromList();
    const { seen, stop } = recordStatuses(store);
    await pressDelete();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    await pressConfirm();
    await expectOnList();
    stop();
    expect(notFound).not.toHaveBeenCalled();
    expect(seen).not.toContain("notFound");
    expect(
      screen.queryByText(NOT_FOUND, { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("RF-015: the instrument sees a real not-found: the deleted team's link, opened afterwards, renders it", async () => {
    seedDeletable(10, 3);
    const notFound = watchNotFound();
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    expect(notFound).not.toHaveBeenCalled();
    await testRouter.push("/teams/1/edit");
    await screen.findByText(NOT_FOUND);
    expect(notFound).toHaveBeenCalled();
  });

  it("RF-015 RF-082: opened as the only screen (a restored stack), the confirmation still ends on the list of teams without the form of the deleted team", async () => {
    const { db } = seedDeletable(10, 3);
    const notFound = watchNotFound();
    await renderRouter("./src/app", { initialUrl: "/teams/1/edit" });
    await screen.findByLabelText("Nombre");
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    expect(
      await screen.findByRole("button", { name: /Cadete B/ }),
    ).toBeTruthy();
    expect(teamRowOf("Alevín A")).toBeNull();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
    expect(notFound).not.toHaveBeenCalled();
    expect(teamIds(db)).toEqual([2]);
  });
});

describe("edit-team form, the deletion happens once and renders cleanly (RF-015, D3 rule 3)", () => {
  it("RF-015: two quick presses on the confirm button delete the team once", async () => {
    const { db, store } = seedDeletable(10, 3);
    const remove = jest.spyOn(store.getState(), "deleteTeam");
    await openFormFromList();
    await pressDelete();
    const confirm = pressHandlerOf(confirmButton());
    await act(async () => {
      confirm();
      confirm();
    });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(tableCounts(db)).toEqual(AFTER_10_3);
  });

  it("RF-015: the whole sequence, from the list to the list, raises no «Cannot update a component» error", async () => {
    const errors = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { db } = seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    await pressConfirm();
    await expectOnList();
    expect(teamIds(db)).toEqual([2]);
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });

  it("RF-015: going to the form and back without deleting raises no «Cannot update a component» error and changes nothing", async () => {
    const errors = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { db } = seedDeletable(10, 3);
    await openFormFromList();
    await pressDelete();
    await fireEvent.press(dialog().getByRole("button", { name: "Cancelar" }));
    await act(async () => testRouter.back());
    await act(async () => testRouter.back());
    await expectOnList();
    expect(tableCounts(db)).toEqual(BEFORE_10_3);
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });
});
