// T096: «Borrar partido» in the match details and its confirmation (RF-029, RF-082, RF-085). The
// button is at the bottom of the details' scroll container; it opens a dialog that closes only with
// its buttons; cancelling, and a deletion that fails, leave the match and the details as they were.
// What a confirmed deletion does to the screens under is in match-details.delete.lists.test.tsx.
// Same doubles as match-details.navigation.test.tsx; assumed screens: tests/support/match-details-actions.ts.
import { act, screen } from "expo-router/testing-library";

import {
  SAVE_FAILED,
  openDetailsFromGrid,
  pressHandlerOf,
  seedDetails,
  shown,
} from "../support/match-details";
import {
  DELETE_CONFIRM,
  DELETE_MESSAGE,
  DELETE_TITLE,
  allowMatchDeletes,
  deleteButton,
  dialog,
  failMatchDeletes,
  gridUndo,
  hosts,
  matchIds,
  pressDelete,
  pressInDialog,
  rowsOf,
  seedMarks,
} from "../support/match-details-actions";
import { matchesStoreOn } from "../support/match-lists";
import { dialogTexts } from "../support/match-screen-grid";
import { pressBack, tapOutside } from "../support/choice-dialog-harness";
import { inScroll } from "../support/form-scroll";
import { homeField, typeIn } from "../support/new-match-form";

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

const DIALOG_TEXTS = [DELETE_TITLE, DELETE_MESSAGE, "Cancelar", DELETE_CONFIRM];
const dialogOpen = (): boolean => hosts().length > 0;

async function openWithMarks() {
  const seeded = seedDetails({ format: 6 });
  seedMarks(seeded, [
    [0, "P", 1, "starter"],
    [1, "P", 2, "sub"],
  ]);
  const matches = matchesStoreOn(seeded.db);
  await openDetailsFromGrid(1);
  return { ...seeded, matches };
}

describe("match details, the button «Borrar partido» (RF-029)", () => {
  it("RF-029: the details have one «Borrar partido», inside the scroll container and after «Guardar», and it deletes nothing by itself", async () => {
    const { db } = await openWithMarks();
    expect(
      inScroll().queryByRole("button", { name: "Borrar partido" }),
    ).not.toBeNull();
    const all = screen.getAllByRole("button");
    expect(all.indexOf(deleteButton())).toBeGreaterThan(
      all.indexOf(screen.getByRole("button", { name: "Guardar" })),
    );
    expect(dialogOpen()).toBe(false);
    expect(matchIds(db)).toEqual([1]);
  });

  it("RF-029: pressing it opens the confirmation with its title, message, «Cancelar» and confirm button, and the match is still there", async () => {
    const { db } = await openWithMarks();
    await pressDelete();
    expect(hosts()).toHaveLength(1);
    expect(dialogTexts()).toEqual(DIALOG_TEXTS);
    expect(matchIds(db)).toEqual([1]);
    expect(rowsOf(db, 1)).toEqual({ entries: 9, marks: 2 });
    expect(screen).toHavePathname("/matches/1/edit");
  });
});

// What closes a dialog without pressing a button: neither does it (RF-029, RF-039).
const CLOSING_WAYS = [
  ["a tap outside it", tapOutside],
  ["Android Back", async () => act(async () => pressBack())],
] as const;

describe("match details, the deletion closes only with its buttons (RF-029)", () => {
  it.each(CLOSING_WAYS)(
    "RF-029: %s leaves the confirmation open and deletes nothing, and the confirm button still deletes after",
    async (_way, close) => {
      const { db, matches } = await openWithMarks();
      const remove = jest.spyOn(matches.getState(), "deleteMatch");
      await pressDelete();
      await close();
      expect(dialogTexts()).toEqual(DIALOG_TEXTS);
      expect(remove).not.toHaveBeenCalled();
      expect(matchIds(db)).toEqual([1]);
      expect(screen).toHavePathname("/matches/1/edit");
      await pressInDialog(DELETE_CONFIRM);
      expect(remove).toHaveBeenCalledWith(1);
      expect(matchIds(db)).toEqual([]);
    },
  );

  it("RF-029: «Cancelar» closes it and changes nothing: the match, its marks, the typed text and the screen stay, and the button asks again", async () => {
    const { db, matches } = await openWithMarks();
    const remove = jest.spyOn(matches.getState(), "deleteMatch");
    await typeIn(homeField(), "Sin guardar");
    await pressDelete();
    await pressInDialog("Cancelar");
    expect(dialogOpen()).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    expect(matchIds(db)).toEqual([1]);
    expect(rowsOf(db, 1)).toEqual({ entries: 9, marks: 2 });
    expect(shown().home).toBe("Sin guardar");
    expect(screen).toHavePathname("/matches/1/edit");
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    await pressDelete();
    expect(dialogTexts()).toEqual(DIALOG_TEXTS);
  });

  it("RF-029: two quick presses on the confirm button delete the match once", async () => {
    const { matches } = await openWithMarks();
    const remove = jest.spyOn(matches.getState(), "deleteMatch");
    await pressDelete();
    const confirm = pressHandlerOf(
      dialog().getByRole("button", { name: DELETE_CONFIRM }),
    );
    await act(async () => {
      confirm();
      confirm();
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("match details, the deletion fails (RF-085)", () => {
  it("RF-029 RF-085: a failing deletion closes the dialog, shows the save error on the details, and leaves the match, its marks and the open session", async () => {
    const { db, store } = await openWithMarks();
    failMatchDeletes(db);
    await pressDelete();
    await pressInDialog(DELETE_CONFIRM);
    expect(dialogOpen()).toBe(false);
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
    expect(screen).toHavePathname("/matches/1/edit");
    expect(matchIds(db)).toEqual([1]);
    expect(rowsOf(db, 1)).toEqual({ entries: 9, marks: 2 });
    expect(store.getState().status).toBe("open");
    expect(gridUndo()).toBeTruthy();
  });

  it("RF-029 RF-085: once the device has space again, the same button deletes the match and leaves the details", async () => {
    const { db } = await openWithMarks();
    failMatchDeletes(db);
    await pressDelete();
    await pressInDialog(DELETE_CONFIRM);
    allowMatchDeletes(db);
    await pressDelete();
    await pressInDialog(DELETE_CONFIRM);
    expect(matchIds(db)).toEqual([]);
    expect(screen.queryByLabelText("Local")).toBeNull();
  });
});
