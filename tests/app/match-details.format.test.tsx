// T096: the format picker of the match details and its confirmation (RF-038, RF-039, RF-082, RF-085,
// D39, D50). Choosing the match's own format does nothing; choosing another one asks first, with a
// dialog that closes only with its buttons; confirming calls the session's `changeFormat` and the
// picker and the grid under the details show the new format at once, outside «Guardar». Real
// src/app routes through renderRouter, the real stores on the in-memory database; the doubles are
// those of match-details.navigation.test.tsx. Assumed screens: tests/support/match-details-actions.ts.
import { act, screen } from "expo-router/testing-library";

import {
  SAVE_FAILED,
  allowMatchUpdates,
  failMatchUpdates,
  loggedUpdates,
  logMatchUpdates,
  openDetailsFromGrid,
  pressHandlerOf,
  savedMatch,
  seedDetails,
} from "../support/match-details";
import {
  FORMAT_CONFIRM,
  FORMAT_MESSAGE,
  FORMAT_PAIRS,
  FORMAT_TITLE,
  dialog,
  gridHeaders,
  gridUndo,
  headers,
  hosts,
  pickFormat,
  pressInDialog,
  seedMarks,
} from "../support/match-details-actions";
import { dialogTexts } from "../support/match-screen-grid";
import { breakReads } from "../support/match-session-fixtures";
import { savedMarkKeys } from "../support/match-session-call-up";
import { pressBack, tapOutside } from "../support/choice-dialog-harness";
import { inScroll } from "../support/form-scroll";
import { checkedFormats } from "../support/new-match-form";

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

const dialogOpen = (): boolean => hosts().length > 0;
const DIALOG_TEXTS = [FORMAT_TITLE, FORMAT_MESSAGE, "Cancelar", FORMAT_CONFIRM];

describe("match details, choosing the match's own format (RF-039, D39)", () => {
  it.each([4, 6, 8] as const)(
    "RF-039: choosing the %i periods of a match that already has them shows no confirmation and writes nothing",
    async (format) => {
      const { db } = seedDetails({ format });
      await openDetailsFromGrid(1);
      logMatchUpdates(db);
      await pickFormat(format);
      expect(dialogOpen()).toBe(false);
      expect(checkedFormats()).toEqual([format]);
      expect(gridHeaders()).toEqual(headers(format));
      expect(loggedUpdates(db)).toBe(0);
      expect(savedMatch(db, 1)).toMatchObject({ format });
    },
  );
});

// What closes a dialog without pressing a button: neither does it (RF-029, RF-039).
const CLOSING_WAYS = [
  ["a tap outside it", tapOutside],
  ["Android Back", async () => act(async () => pressBack())],
] as const;

describe("match details, another format asks first (RF-038, RF-039, E-016)", () => {
  it.each(FORMAT_PAIRS)(
    "RF-038 RF-039: from %i periods to %i the details open the warning with «Cancelar» and the confirm button, and nothing has changed yet",
    async (from, to) => {
      const { db } = seedDetails({ format: from });
      await openDetailsFromGrid(1);
      logMatchUpdates(db);
      await pickFormat(to);
      expect(hosts()).toHaveLength(1);
      expect(dialogTexts()).toEqual(DIALOG_TEXTS);
      expect(checkedFormats()).toEqual([from]);
      expect(gridHeaders()).toEqual(headers(from));
      expect(loggedUpdates(db)).toBe(0);
    },
  );

  it("RF-039 E-016: a match with no mark at all still asks before changing its format", async () => {
    const { db } = seedDetails({ format: 6 });
    await openDetailsFromGrid(1);
    expect(savedMarkKeys(db, 1)).toEqual([]);
    await pickFormat(8);
    expect(dialogTexts()).toEqual(DIALOG_TEXTS);
  });

  it.each(CLOSING_WAYS)(
    "RF-039: %s leaves the confirmation open and changes nothing, and its buttons still work after",
    async (_way, close) => {
      const { db } = seedDetails({ format: 6 });
      await openDetailsFromGrid(1);
      logMatchUpdates(db);
      await pickFormat(8);
      await close();
      expect(dialogTexts()).toEqual(DIALOG_TEXTS);
      expect(checkedFormats()).toEqual([6]);
      expect(loggedUpdates(db)).toBe(0);
      await pressInDialog(FORMAT_CONFIRM);
      expect(checkedFormats()).toEqual([8]);
    },
  );

  it("RF-039: «Cancelar» closes the confirmation, changes nothing, and choosing the format again asks again", async () => {
    const seeded = seedDetails({ format: 6 });
    const { db } = seeded;
    seedMarks(seeded, [[0, "P", 1, "starter"]]);
    await openDetailsFromGrid(1);
    const marks = savedMarkKeys(db, 1);
    logMatchUpdates(db);
    await pickFormat(4);
    await pressInDialog("Cancelar");
    expect(dialogOpen()).toBe(false);
    expect(checkedFormats()).toEqual([6]);
    expect(gridHeaders()).toEqual(headers(6));
    expect(savedMarkKeys(db, 1)).toEqual(marks);
    expect(loggedUpdates(db)).toBe(0);
    expect(screen).toHavePathname("/matches/1/edit");
    await pickFormat(4);
    expect(dialogTexts()).toEqual(DIALOG_TEXTS);
  });
});

describe("match details, confirming a format change (RF-038, RF-039, RF-082, D50)", () => {
  it.each(FORMAT_PAIRS)(
    "RF-038 RF-039 RF-082: from %i periods to %i, confirming calls changeFormat and the picker, the grid and the database show it at once, outside «Guardar»",
    async (from, to) => {
      const { db, store } = seedDetails({ format: from });
      const change = jest.spyOn(store.getState(), "changeFormat");
      await openDetailsFromGrid(1);
      await pickFormat(to);
      await pressInDialog(FORMAT_CONFIRM);
      expect(change).toHaveBeenCalledTimes(1);
      expect(change).toHaveBeenCalledWith(to);
      expect(dialogOpen()).toBe(false);
      expect(checkedFormats()).toEqual([to]);
      expect(gridHeaders()).toEqual(headers(to));
      expect(savedMatch(db, 1)).toMatchObject({ format: to });
      expect(screen).toHavePathname("/matches/1/edit");
    },
  );

  it("RF-039: two quick presses on the confirm button change the format once", async () => {
    const { db, store } = seedDetails({ format: 6 });
    const change = jest.spyOn(store.getState(), "changeFormat");
    await openDetailsFromGrid(1);
    await pickFormat(8);
    logMatchUpdates(db);
    const confirm = pressHandlerOf(
      dialog().getByRole("button", { name: FORMAT_CONFIRM }),
    );
    await act(async () => {
      confirm();
      confirm();
    });
    expect(change).toHaveBeenCalledTimes(1);
    expect(loggedUpdates(db)).toBe(1);
  });
});

describe("match details, the format change fails (RF-085)", () => {
  const FAILURES = [
    ["the write", failMatchUpdates],
    [
      "the read of the team's players",
      (db: Parameters<typeof breakReads>[0]) => breakReads(db, "players"),
    ],
  ] as const;

  it.each(FAILURES)(
    "RF-085 RF-039: when %s fails, the dialog closes, the details show the save error and the format, the grid and the database stay as they were",
    async (_what, fail) => {
      const { db } = seedDetails({ format: 6 });
      await openDetailsFromGrid(1);
      fail(db);
      await pickFormat(8);
      await pressInDialog(FORMAT_CONFIRM);
      expect(dialogOpen()).toBe(false);
      expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
      expect(checkedFormats()).toEqual([6]);
      expect(gridHeaders()).toEqual(headers(6));
      expect(gridUndo()).toBeDisabled();
      expect(screen).toHavePathname("/matches/1/edit");
    },
  );

  it("RF-085 RF-039: after a failed change, once the device has space again the same choice works", async () => {
    const { db } = seedDetails({ format: 6 });
    await openDetailsFromGrid(1);
    failMatchUpdates(db);
    await pickFormat(8);
    await pressInDialog(FORMAT_CONFIRM);
    expect(savedMatch(db, 1)).toMatchObject({ format: 6 });
    allowMatchUpdates(db);
    await pickFormat(8);
    await pressInDialog(FORMAT_CONFIRM);
    expect(checkedFormats()).toEqual([8]);
    expect(savedMatch(db, 1)).toMatchObject({ format: 8 });
  });
});
