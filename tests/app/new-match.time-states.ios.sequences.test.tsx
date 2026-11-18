// T089: sequences, interruptions, mistakes and what is saved for the iOS time field (RF-025, RF-083,
// RF-084, E-033). Same setup as new-match.time-states.ios.test.tsx. After every step what the screen
// shows and what «Guardar» would save must agree (the bug of the iPhone of 2026-11-17).
import { act, screen } from "expo-router/testing-library";
import { Dimensions } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import { pickDate, pickTime } from "../support/date-time-picker-double";
import { isPickerOpen } from "../support/date-time-picker-native-double";
import {
  chooseFormatInForm,
  freshDraft,
  openFormAlone,
  pressAddTime,
  pressClearTime,
  seedTeams,
  shownTimes,
} from "../support/new-match-form";

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
jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<typeof import("../support/date-time-picker-native-double")>(
      "../support/date-time-picker-native-double",
    )
    .nativeDateTimePickerModule(),
);

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let draft: NewMatchDraft;
let alevin: number;

beforeEach(() => {
  db = resetMockDatabase();
  alevin = seedTeams(db).alevin;
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
});

const addButton = () => screen.queryByRole("button", { name: "Añadir hora" });
const clearButton = () => screen.queryByRole("button", { name: "Quitar hora" });

/** The screen agrees with the draft: no time if and only if «Sin hora» is on screen. */
function expectScreenAgreesWithDraft(): void {
  const time = draft.getState().time;
  const without = time === null;
  expect(screen.queryByText("Sin hora") !== null).toBe(without);
  expect(addButton() !== null).toBe(without);
  expect(clearButton() === null).toBe(without);
  expect(isPickerOpen("time")).toBe(!without);
  expect(shownTimes()).toEqual(without ? [] : [time]);
}

const STEPS: Record<string, () => Promise<void>> = {
  add: pressAddTime,
  clear: pressClearTime,
  "pick 18:30": () => pickTime(18, 30),
  "pick 09:05": () => pickTime(9, 5),
  "date 1 March 2026": () => pickDate(2026, 3, 1),
};
const SEQUENCES: [string][] = [
  ["add"],
  ["add, clear"],
  ["add, pick 18:30, clear, add"],
  ["add, clear, add, clear, add"],
  ["add, pick 09:05, date 1 March 2026, clear"],
];

describe("iOS time field, sequences (RF-083, E-033)", () => {
  it.each(SEQUENCES)(
    "RF-083 E-033: after each step of «%s» the screen and the draft agree",
    async (sequence) => {
      await openFormAlone(alevin);
      expectScreenAgreesWithDraft();
      for (const name of sequence.split(", ")) {
        await STEPS[name]?.();
        expectScreenAgreesWithDraft();
      }
    },
  );
});

async function rotate(): Promise<void> {
  await act(() => {
    Dimensions.set({
      window: { width: 800, height: 400, scale: 2, fontScale: 1 },
    });
  });
}

describe("iOS time field, interruptions and mistakes (RF-083, RF-084)", () => {
  it.each(["without a time", "with a time"])(
    "RF-083: rotating the device keeps the state %s of the time field",
    async (state) => {
      await openFormAlone(alevin);
      if (state === "with a time") {
        await pressAddTime();
      }
      const before = draft.getState().time;
      await rotate();
      expect(draft.getState().time).toBe(before);
      expectScreenAgreesWithDraft();
      expect(before === null).toBe(state === "without a time");
    },
  );

  it("RF-084 RF-083: changing the format with no time chosen keeps «Sin hora» and «Añadir hora»", async () => {
    await openFormAlone(alevin);
    await chooseFormatInForm(8);
    expect(screen.getByText("Sin hora")).toBeTruthy();
    expect(addButton()).toBeTruthy();
    expect(draft.getState().time).toBeNull();
  });

  it("RF-083: each button exists only in its state: no «Añadir hora» after pressing it and no «Quitar hora» after pressing it", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    expect(addButton()).toBeNull();
    await pressClearTime();
    expect(clearButton()).toBeNull();
  });
});

describe("iOS time field, what is saved (RF-025, RF-083, E-033)", () => {
  it("RF-025 RF-083 E-033: the match created after «Añadir hora» and «Quitar hora» is saved with no time", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pressClearTime();
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([{ time: null }]);
  });

  it("RF-025 RF-083 E-033: the match created after «Añadir hora» alone is saved with 12:00 (D51)", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-11", time: "12:00" },
    ]);
  });

  it("RF-025 RF-083 E-033: the match created after «Añadir hora» and 18:30 is saved with 18:30", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(18, 30);
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([{ time: "18:30" }]);
  });
});
