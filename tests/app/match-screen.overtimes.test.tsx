// T055: the match screen, adding and removing overtimes (RF-058, RF-059, RF-085). Same doubles and
// window as match-screen.marks.test.tsx (a phone: the buttons are in the toolbar). The confirmation
// is the ChoiceDialog of T045 with the texts of spec.md; its confirm button has the same name as
// the toolbar button, so it is read inside its Modal (match-screen-grid.ts).
import { screen, waitFor } from "expo-router/testing-library";

import {
  allowOvertimeWrites,
  failOvertimeWrites,
  fillColumn,
  savedMarks,
  savedOvertimes,
} from "../support/match-session-marks";
import { SAVE_FAILED } from "../support/call-up-screen";
import {
  pressBack,
  pressCancel,
  tapOutside,
} from "../support/choice-dialog-harness";
import {
  ADD,
  PHONE,
  REMOVE_OVERTIME,
  buttonsNamed,
  cellButtons,
  cellState,
  columnTitles,
  confirmRemoval,
  dialogOpen,
  dialogTexts,
  openPlan,
  pressButton,
  tap,
} from "../support/match-screen-grid";
import { restoreWindow, setWindow } from "../support/window-size";

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

const SIX = ["P1", "P2", "P3", "P4", "P5", "P6"];
const TITLE = "¿Quitar la prórroga 2?";
const MESSAGE = "Tiene marcas y se borrarán.";

beforeEach(async () => setWindow(PHONE.width, PHONE.height));
afterEach(async () => restoreWindow());

/** Two overtimes, the last one (PR2) with two marks and PR1 with one. */
function withMarksInLast() {
  return openPlan(
    9,
    [...fillColumn("OT2", [0, 1]), ...fillColumn("OT1", [2])],
    { overtimeCount: 2 },
  );
}

describe("match screen, adding overtimes", () => {
  it("RF-058: «Añadir prórroga» twice in a 6-period match shows 8 columns, saved", async () => {
    const s = await openPlan(9);
    await pressButton(ADD);
    await pressButton(ADD);
    expect(columnTitles()).toEqual([...SIX, "PR1", "PR2"]);
    expect(cellButtons()).toHaveLength(72);
    expect(savedOvertimes(s.db, s.matchId)).toBe(2);
  });

  it("RF-058 RF-059: an 8-period match with 3 overtimes has 11 columns, the new cells can be tapped and only the third offers removal", async () => {
    await openPlan(9, [], { format: 8, overtimeCount: 3 });
    expect(columnTitles()).toHaveLength(11);
    expect(columnTitles().slice(-4)).toEqual(["P8", "PR1", "PR2", "PR3"]);
    await tap("Jugador 1", "PR3");
    expect(cellState("Jugador 1", "PR3")).toBe("starter");
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(1);
  });
});

describe("match screen, removing the last overtime", () => {
  it("RF-059: with no overtime «Quitar prórroga» is not offered, and it is once one is added", async () => {
    await openPlan(9);
    expect(buttonsNamed(ADD)).toHaveLength(1);
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(0);
    await pressButton(ADD);
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(1);
    await pressButton(REMOVE_OVERTIME);
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(0);
    expect(columnTitles()).toEqual(SIX);
  });

  it("RF-059: with two overtimes only the last is removed, without a dialog when it has no marks", async () => {
    const s = await openPlan(9, [], { overtimeCount: 2 });
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(1);
    await pressButton(REMOVE_OVERTIME);
    expect(dialogOpen()).toBe(false);
    expect(columnTitles()).toEqual([...SIX, "PR1"]);
    expect(savedOvertimes(s.db, s.matchId)).toBe(1);
  });

  it("RF-059: marks in an earlier overtime do not ask: only the last one decides, and they stay", async () => {
    const s = await openPlan(9, fillColumn("OT1", [0, 1]), {
      overtimeCount: 2,
    });
    await pressButton(REMOVE_OVERTIME);
    expect(dialogOpen()).toBe(false);
    expect(columnTitles()).toEqual([...SIX, "PR1"]);
    expect(savedMarks(s.db, s.matchId)).toHaveLength(2);
  });
});

describe("match screen, removing an overtime with marks", () => {
  it("RF-059: asks first with the dialog of T045 and changes nothing until it is answered", async () => {
    const s = await withMarksInLast();
    await pressButton(REMOVE_OVERTIME);
    expect(await screen.findByText(TITLE)).toBeTruthy();
    expect(dialogTexts()).toEqual([
      TITLE,
      MESSAGE,
      "Cancelar",
      REMOVE_OVERTIME,
    ]);
    expect(columnTitles()).toEqual([...SIX, "PR1", "PR2"]);
    expect(savedOvertimes(s.db, s.matchId)).toBe(2);
    expect(savedMarks(s.db, s.matchId)).toHaveLength(3);
  });

  it("RF-059: cancelling leaves the overtime with its marks", async () => {
    const s = await withMarksInLast();
    await pressButton(REMOVE_OVERTIME);
    await screen.findByText(TITLE);
    await pressCancel();
    await waitFor(() => expect(dialogOpen()).toBe(false));
    expect(columnTitles()).toEqual([...SIX, "PR1", "PR2"]);
    expect(cellState("Jugador 1", "PR2")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(3);
  });

  it("RF-059: confirming removes the overtime and only its marks", async () => {
    const s = await withMarksInLast();
    await pressButton(REMOVE_OVERTIME);
    await screen.findByText(TITLE);
    await confirmRemoval();
    await waitFor(() => expect(dialogOpen()).toBe(false));
    expect(columnTitles()).toEqual([...SIX, "PR1"]);
    expect(savedOvertimes(s.db, s.matchId)).toBe(1);
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
    expect(cellState("Jugador 3", "PR1")).toBe("starter");
  });

  it("RF-059: tapping outside the dialog and Android Back do nothing and leave the overtime with its marks", async () => {
    const s = await withMarksInLast();
    await pressButton(REMOVE_OVERTIME);
    await screen.findByText(TITLE);
    await tapOutside();
    pressBack();
    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(columnTitles()).toEqual([...SIX, "PR1", "PR2"]);
    expect(savedOvertimes(s.db, s.matchId)).toBe(2);
    expect(savedMarks(s.db, s.matchId)).toHaveLength(3);
  });
});

describe("match screen, overtimes that fail to save", () => {
  it("RF-085: a failed «Añadir prórroga» adds no column and shows the message, and the next one works and clears it", async () => {
    const s = await openPlan(9);
    failOvertimeWrites(s.db);
    await pressButton(ADD);
    expect(columnTitles()).toEqual(SIX);
    expect(screen.getByText(SAVE_FAILED)).toBeTruthy();
    allowOvertimeWrites(s.db);
    await pressButton(ADD);
    await waitFor(() => expect(screen.queryByText(SAVE_FAILED)).toBeNull());
    expect(columnTitles()).toEqual([...SIX, "PR1"]);
  });

  it("RF-085 RF-059: a failed removal keeps the overtime and its marks and shows the message", async () => {
    const s = await withMarksInLast();
    failOvertimeWrites(s.db);
    await pressButton(REMOVE_OVERTIME);
    await screen.findByText(TITLE);
    await confirmRemoval();
    await waitFor(() => expect(screen.getByText(SAVE_FAILED)).toBeTruthy());
    expect(columnTitles()).toEqual([...SIX, "PR1", "PR2"]);
    expect(savedOvertimes(s.db, s.matchId)).toBe(2);
    expect(savedMarks(s.db, s.matchId)).toHaveLength(3);
  });
});
