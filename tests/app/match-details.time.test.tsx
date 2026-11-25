// T072: the time field of the match details on iOS and on Android (RF-082, RF-083, E-032, D51, D52,
// F-02). A saved match without a time opens with «Sin hora» and «Añadir hora» and no picker; one
// with a time opens with the time, the picker (iOS) or the «Hora» button (Android) and «Quitar
// hora»; «Quitar hora» and «Añadir hora» change the draft only, and nothing is written until
// «Guardar». Real src/app routes, the real details draft and the real session store on the
// in-memory database; only the native picker module is replaced, by the native-equivalent double.
// On Android «Añadir hora» opens the time dialog, so `addTime()` closes it with «Cancelar»
// (dismissPicker) and the time stays 12:00, as in new-match.time-states.save.test.tsx.
import { screen, testRouter } from "expo-router/testing-library";
import { Platform } from "react-native";

import { resetMockDatabase } from "../support/mock-database";
import {
  localParts,
  dismissPicker,
  pickDate,
  pickTime,
  pickerValue,
} from "../support/date-time-picker-double";
import { isPickerOpen } from "../support/date-time-picker-native-double";
import {
  openDetailsFromGrid,
  pressEdit,
  savedMatch,
  seedDetails,
} from "../support/match-details";
import {
  pressAddTime,
  pressClearTime,
  shownTimes,
} from "../support/new-match-form";
import { pressSaveMatch, waitForPathname } from "../support/new-match-save";

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
type Os = "ios" | "android";

const addButton = () => screen.queryByRole("button", { name: "Añadir hora" });
const clearButton = () => screen.queryByRole("button", { name: "Quitar hora" });
const timeButton = () => screen.queryByRole("button", { name: /^Hora/ });
const MARCH_29 = { date: "2026-03-29", time: "02:30" };

describe.each<Os>(["ios", "android"])(
  "%s: the time field of the match details (RF-083, E-032)",
  (os) => {
    let db: Db;
    let platform: ReturnType<typeof jest.replaceProperty>;

    beforeEach(() => {
      platform = jest.replaceProperty(Platform, "OS", os);
    });

    afterEach(() => {
      platform.restore();
    });

    /** «Añadir hora» and, on Android only, «Cancelar» on the dialog it opens. */
    async function addTime(): Promise<void> {
      await pressAddTime();
      if (os === "android") {
        expect(isPickerOpen("time")).toBe(true);
        await dismissPicker("time");
      }
    }

    /** «Sin hora» and «Añadir hora», no time picker, no «Hora» button, no «Quitar hora», no time. */
    function expectWithoutTime(): void {
      expect(screen.getByText("Sin hora")).toBeTruthy();
      expect(addButton()).toBeTruthy();
      expect(clearButton()).toBeNull();
      expect(shownTimes()).toEqual([]);
      expect(isPickerOpen("time")).toBe(false);
      expect(timeButton()).toBeNull();
    }

    /** The time once, the picker (iOS) or the «Hora» button (Android) and «Quitar hora». */
    function expectWithTime(time: string): void {
      expect(shownTimes()).toEqual([time]);
      expect(clearButton()).toBeTruthy();
      expect(screen.queryByText("Sin hora")).toBeNull();
      expect(addButton()).toBeNull();
      if (os === "ios") expect(isPickerOpen("time")).toBe(true);
      else expect(timeButton()).toBeTruthy();
    }

    it("RF-083: a saved match without a time opens with «Sin hora» and «Añadir hora» and no picker, and keeps its date", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: null } }));
      await openDetailsFromGrid(1);
      expectWithoutTime();
      expect(screen.getByText("01/03/2026")).toBeTruthy();
    });

    it("RF-083: a saved match with a time opens with that time, the picker and «Quitar hora», and no «Sin hora»", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: "18:30" } }));
      await openDetailsFromGrid(1);
      expectWithTime("18:30");
      expect(localParts(await pickerValue("time")).slice(3)).toEqual([18, 30]);
    });

    it("RF-083 F-02: a match of 29 March 2026 at 02:30 opens showing 02:30, with the time picker on 02:30, and «Guardar» keeps 02:30", async () => {
      ({ db } = seedDetails({ values: MARCH_29 }));
      await openDetailsFromGrid(1);
      expectWithTime("02:30");
      expect(localParts(await pickerValue("time")).slice(3)).toEqual([2, 30]);
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject(MARCH_29);
    });

    it("RF-082 RF-083 E-032: in the details of a match of 1 March 2026 at 18:30, «Quitar hora» shows «Sin hora» and «Añadir hora» with no picker and the date kept, and «Guardar» saves the match with no time", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: "18:30" } }));
      await openDetailsFromGrid(1);
      await pressClearTime();
      expectWithoutTime();
      expect(screen.getByText("01/03/2026")).toBeTruthy();
      expect(savedMatch(db, 1)).toMatchObject({ time: "18:30" });
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({
        date: "2026-03-01",
        time: null,
      });
    });

    it("RF-082 RF-083 E-032: after «Quitar hora» and no «Guardar», Back leaves the saved time, and the details opened again show it", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: "18:30" } }));
      await openDetailsFromGrid(1);
      await pressClearTime();
      await testRouter.back();
      expect(screen).toHavePathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({ time: "18:30" });
      await pressEdit();
      await screen.findByLabelText("Local");
      expectWithTime("18:30");
    });

    it("RF-082 RF-083: «Añadir hora» on a match with no time and no «Guardar», Back leaves it without a time, and the details opened again show «Sin hora»", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: null } }));
      await openDetailsFromGrid(1);
      await addTime();
      expect(shownTimes()).toEqual(["12:00"]);
      await testRouter.back();
      expect(savedMatch(db, 1)).toMatchObject({ time: null });
      await pressEdit();
      await screen.findByLabelText("Local");
      expectWithoutTime();
    });

    it("RF-083 E-032 D51: «Añadir hora» and «Guardar» without touching the picker saves 12:00, and picking 19:15 saves 19:15", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: null } }));
      await openDetailsFromGrid(1);
      await addTime();
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({ time: "12:00" });
      await pressEdit();
      await screen.findByLabelText("Local");
      await pickTime(19, 15);
      expectWithTime("19:15");
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({ time: "19:15" });
    });

    it("RF-083 D51: «Quitar hora» and «Añadir hora» again gives 12:00, not the saved 18:30, and «Guardar» saves 12:00", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: "18:30" } }));
      await openDetailsFromGrid(1);
      await pressClearTime();
      await addTime();
      expectWithTime("12:00");
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({ time: "12:00" });
    });

    it("RF-083 RF-028: a new date keeps the time, and «Guardar» saves both", async () => {
      ({ db } = seedDetails({ values: { date: "2026-03-01", time: "18:30" } }));
      await openDetailsFromGrid(1);
      await pickDate(2026, 3, 29);
      expect(screen.getByText("29/03/2026")).toBeTruthy();
      expectWithTime("18:30");
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({
        date: "2026-03-29",
        time: "18:30",
      });
    });
  },
);
