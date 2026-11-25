// F-D3-05 (Codex review of PR 25, finding 3, RF-015, RF-082): confirming «Borrar equipo» ends on the
// list of teams (`/`) whatever the stack under the form, and leaves no route of the deleted team.
// `canDismiss()` is true when the team screen is the ROOT of the stack (a restored `/teams/1`) and
// `dismissAll()` then keeps it, so the deleted team's screen would be left alone as a not-found
// root. The normal stack and the restored single-screen stack stay as they are. Real src/app routes
// through renderRouter; same doubles as edit-team.delete.test.tsx.
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import {
  NOT_FOUND,
  expectOnList,
  openEditFromList,
  pressConfirm,
  pressDelete,
  recordStatuses,
  seedDeletable,
  teamIds,
  teamScreensMounted,
  watchNotFound,
} from "../support/edit-team-delete";
import { formReady } from "../support/edit-team";
import { openTeamAlone } from "../support/team-screen";

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

/** The team screen is the root of the stack (a restored `/teams/1`), then «Editar equipo». */
async function openFormOverRootTeam(): Promise<void> {
  await openTeamAlone(1);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Editar equipo" }),
  );
  await formReady();
}

/** The form as the only screen of the stack (a restored `/teams/1/edit`). */
async function openFormAlone(): Promise<void> {
  await renderRouter("./src/app", { initialUrl: "/teams/1/edit" });
  await formReady();
}

const STACKS = [
  [
    "the team screen opened directly (a restored stack) with its form on it",
    openFormOverRootTeam,
  ],
  [
    "the list, the team screen and its form (the normal stack)",
    async () => {
      await renderRouter("./src/app");
      await openEditFromList();
    },
  ],
  ["the form as the only screen of the stack", openFormAlone],
] as const;

describe("edit-team form, confirming the deletion ends on the list of teams whatever the stack (F-D3-05)", () => {
  it.each(STACKS)(
    "F-D3-05 RF-015 RF-082: with %s, the app ends on the list of teams with no route of the deleted team left and «not found» never shown",
    async (_name, open) => {
      const { db, store } = seedDeletable(10, 3);
      const notFound = watchNotFound();
      await open();
      const { seen, stop } = recordStatuses(store);
      await pressDelete();
      await pressConfirm();
      await expectOnList();
      stop();
      expect(screen).toHavePathname("/");
      expect(teamScreensMounted()).toBe(false);
      expect(
        await screen.findByRole("button", { name: /Cadete B/ }),
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Alevín A/ })).toBeNull();
      expect(notFound).not.toHaveBeenCalled();
      expect(seen).not.toContain("notFound");
      expect(
        screen.queryByText(NOT_FOUND, { includeHiddenElements: true }),
      ).toBeNull();
      expect(teamIds(db)).toEqual([2]);
    },
  );
});
