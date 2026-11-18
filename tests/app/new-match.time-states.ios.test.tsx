// T089: the time field of the new-match form on iOS, in its two states (RF-025, RF-083, RF-084,
// E-032, E-033). Without a time the field shows «Hora», «Sin hora» and the button «Añadir hora», and
// no time picker and no «Quitar hora»; with a time it shows the time, the inline picker and «Quitar
// hora». Real src/app routes and the real draft on the in-memory database; only the native picker
// module is replaced, by the native-equivalent double. Platform.OS is jest-expo's default, «ios».
import { screen } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  localParts,
  pickDate,
  pickTime,
  pickerProps,
  pickerValue,
} from "../support/date-time-picker-double";
import { isPickerOpen } from "../support/date-time-picker-native-double";
import {
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

/** The state without a time: «Hora», «Sin hora», «Añadir hora»; no picker, no «Quitar hora», no time. */
function expectWithoutTime(): void {
  expect(screen.getByText("Hora")).toBeTruthy();
  expect(screen.getByText("Sin hora")).toBeTruthy();
  expect(addButton()).toBeTruthy();
  expect(isPickerOpen("time")).toBe(false);
  expect(clearButton()).toBeNull();
  expect(shownTimes()).toEqual([]);
}

/** The state with a time: the time once, the picker and «Quitar hora»; no «Sin hora», no «Añadir hora». */
function expectWithTime(time: string): void {
  expect(shownTimes()).toEqual([time]);
  expect(isPickerOpen("time")).toBe(true);
  expect(clearButton()).toBeTruthy();
  expect(screen.queryByText("Sin hora")).toBeNull();
  expect(addButton()).toBeNull();
}

describe("iOS time field, without a time and with one (RF-083, E-032, E-033)", () => {
  it("RF-083: es.json holds match.noTime «Sin hora» and match.addTime «Añadir hora»", () => {
    const match = (es as unknown as Record<string, Record<string, unknown>>)
      .match;
    expect(match?.noTime).toBe("Sin hora");
    expect(match?.addTime).toBe("Añadir hora");
  });

  it("RF-083 E-033: a new form shows «Hora», «Sin hora» and «Añadir hora», and no time picker, no «Quitar hora» and no time", async () => {
    await openFormAlone(alevin);
    expectWithoutTime();
    expect(isPickerOpen("date")).toBe(true);
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(draft.getState().time).toBeNull();
  });

  it("RF-083 E-033: «Añadir hora» puts 12:00 in the draft and the field shows «12:00», the time picker on 12:00 in Spanish and «Quitar hora», and neither «Sin hora» nor «Añadir hora»", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    expect(draft.getState()).toMatchObject({
      date: "2026-11-11",
      time: "12:00",
    });
    expectWithTime("12:00");
    expect(localParts(await pickerValue("time"))).toEqual([
      2026, 11, 11, 12, 0,
    ]);
    const props = (await pickerProps("time")) as unknown as { locale?: string };
    expect(props.locale).toMatch(/^es([-_]ES)?$/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-083 E-032: after «Añadir hora», picking 18:30 shows only «18:30», the draft keeps it and «Quitar hora» stays", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(18, 30);
    expectWithTime("18:30");
    expect(draft.getState().time).toBe("18:30");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-083 E-032 E-033: «Quitar hora» goes back to «Sin hora» and «Añadir hora», with no time picker, no «Quitar hora» and no time, and keeps the date", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickDate(2026, 3, 1);
    await pickTime(18, 30);
    await pressClearTime();
    expectWithoutTime();
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(draft.getState()).toMatchObject({ date: "2026-03-01", time: null });
  });
});

describe("iOS time field, boundaries (RF-083, E-033)", () => {
  it.each(["18:30", "00:00", "23:59", "09:05"])(
    "RF-083 E-033: «Añadir hora» after «Quitar hora» with %s chosen before gives 12:00 again, never the earlier time (D51)",
    async (earlier) => {
      const [hour = 0, minute = 0] = earlier.split(":").map(Number);
      await openFormAlone(alevin);
      await pressAddTime();
      await pickTime(hour, minute);
      await pressClearTime();
      await pressAddTime();
      expect(shownTimes()).toEqual(["12:00"]);
      expect(draft.getState().time).toBe("12:00");
      expect(localParts(await pickerValue("time")).slice(3)).toEqual([12, 0]);
    },
  );

  it("RF-083 E-033: «Añadir hora» after choosing 1 March 2026 keeps the date and offers 12:00 of that day", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pressAddTime();
    expect(draft.getState()).toMatchObject({
      date: "2026-03-01",
      time: "12:00",
    });
    expect(localParts(await pickerValue("time"))).toEqual([2026, 3, 1, 12, 0]);
  });

  it("RF-083: picking 12:00 with the picker right after «Añadir hora» keeps «12:00» and the state with a time", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(12, 0);
    expectWithTime("12:00");
    expect(draft.getState().time).toBe("12:00");
  });
});
