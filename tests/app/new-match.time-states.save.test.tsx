// T091: the time field of the new-match form together with the real button «Guardar», on iOS and on
// Android (RF-025, RF-082, RF-083, E-032, E-033, D51, D52). What the screen shows and what «Guardar»
// stores must agree: the iPhone of 2026-11-17 showed «12:00» and saved no time. Real src/app routes,
// the real draft and the real match session store on the in-memory database; only the native picker
// module is replaced, by the native-equivalent double. On Android «Añadir hora» opens the time dialog,
// which hides «Quitar hora» and «Guardar» from the coach, so `addTime()` closes it with «Cancelar»
// (dismissPicker) and the time stays 12:00 (D52).
import { screen, testRouter } from "expo-router/testing-library";
import { Platform } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  dismissPicker,
  pickDate,
  pickTime,
} from "../support/date-time-picker-double";
import { isPickerOpen } from "../support/date-time-picker-native-double";
import {
  freshDraft,
  openFormAlone,
  openFormFromTeam,
  pressAddTime,
  pressClearTime,
  pressNewMatch,
  shownTimes,
} from "../support/new-match-form";
import {
  pressSaveMatch,
  seedSquadTeam,
  squadOf,
  startMatchSession,
  waitForPathname,
} from "../support/new-match-save";

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

describe.each<Os>(["ios", "android"])(
  "%s: the time field and «Guardar» (RF-025, RF-083, E-032, E-033)",
  (os) => {
    let db: Db;
    let draft: NewMatchDraft;
    let team: number;
    let platform: ReturnType<typeof jest.replaceProperty>;

    beforeEach(() => {
      platform = jest.replaceProperty(Platform, "OS", os);
      db = resetMockDatabase();
      useMockSquadStore(createSquadStore(db));
      draft = freshDraft(db);
      startMatchSession(db);
      team = seedSquadTeam(db, squadOf(12));
    });

    afterEach(() => {
      platform.restore();
    });

    /** «Añadir hora» and, on Android only, «Cancelar» on the dialog it opens (T089-A-01). */
    async function addTime(): Promise<void> {
      await pressAddTime();
      if (os === "android") {
        expect(isPickerOpen("time")).toBe(true);
        await dismissPicker("time");
        expect(isPickerOpen("time")).toBe(false);
      }
    }

    /** The opening state: «Sin hora», «Añadir hora», no time picker (no «Hora» button), no «Quitar hora». */
    function expectWithoutTime(): void {
      expect(screen.getByText("Sin hora")).toBeTruthy();
      expect(addButton()).toBeTruthy();
      expect(clearButton()).toBeNull();
      expect(shownTimes()).toEqual([]);
      expect(isPickerOpen("time")).toBe(false);
      expect(timeButton()).toBeNull();
      expect(draft.getState().time).toBeNull();
    }

    /** The state with a time: the time once, the time picker (iOS) or the «Hora» button (Android), «Quitar hora». */
    function expectWithTime(time: string): void {
      expect(shownTimes()).toEqual([time]);
      expect(clearButton()).toBeTruthy();
      expect(screen.queryByText("Sin hora")).toBeNull();
      expect(addButton()).toBeNull();
      if (os === "ios") {
        expect(isPickerOpen("time")).toBe(true);
      } else {
        expect(timeButton()).toBeTruthy();
      }
      expect(draft.getState().time).toBe(time);
    }

    /** «Guardar» opens the grid of match 1 and the form is gone, with no alert shown before it. */
    async function save(): Promise<void> {
      expect(screen.queryByRole("alert")).toBeNull();
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(screen.queryByLabelText("Local")).toBeNull();
    }

    it("RF-025 RF-083 E-033: the opening state, «Añadir hora» → «12:00», «Quitar hora» → the opening state again, then «Guardar» opens the grid and the match has no time", async () => {
      await openFormAlone(team);
      expectWithoutTime();
      await addTime();
      expectWithTime("12:00");
      await pressClearTime();
      expectWithoutTime();
      await save();
      expect(savedMatches(db)).toMatchObject([
        { date: "2026-11-11", time: null },
      ]);
      expect(savedMatches(db)).toHaveLength(1);
    });

    it("RF-025 RF-083 E-033: «Añadir hora» and «Guardar» without touching the picker saves the match with 12:00 (D51, D52)", async () => {
      await openFormAlone(team);
      await addTime();
      await save();
      expect(savedMatches(db)).toMatchObject([
        { date: "2026-11-11", time: "12:00" },
      ]);
      expect(savedMatches(db)).toHaveLength(1);
    });

    it("RF-025 RF-083 E-032: 1 March 2026, «Añadir hora» and 18:30, then «Guardar» saves 2026-03-01 and 18:30 and opens the grid", async () => {
      await openFormAlone(team);
      await pickDate(2026, 3, 1);
      await addTime();
      await pickTime(18, 30);
      expect(screen.getByText("01/03/2026")).toBeTruthy();
      expectWithTime("18:30");
      await save();
      expect(savedMatches(db)).toMatchObject([
        { date: "2026-03-01", time: "18:30" },
      ]);
    });

    it("RF-025 RF-083 E-032: after 18:30 and «Quitar hora» the form shows «01/03/2026», «Sin hora» and «Añadir hora», and «Guardar» saves 2026-03-01 with no time", async () => {
      await openFormAlone(team);
      await pickDate(2026, 3, 1);
      await addTime();
      await pickTime(18, 30);
      await pressClearTime();
      expectWithoutTime();
      expect(screen.getByText("01/03/2026")).toBeTruthy();
      await save();
      expect(savedMatches(db)).toMatchObject([
        { date: "2026-03-01", time: null },
      ]);
    });

    it("RF-083 E-033: «Añadir hora», 18:30, «Quitar hora», «Añadir hora» again and «Guardar» saves 12:00, not 18:30 (D51)", async () => {
      await openFormAlone(team);
      await addTime();
      await pickTime(18, 30);
      await pressClearTime();
      await addTime();
      expectWithTime("12:00");
      await save();
      expect(savedMatches(db)).toMatchObject([
        { date: "2026-11-11", time: "12:00" },
      ]);
    });

    it("RF-082 RF-083: «Añadir hora» and Back saves nothing, and the form opened again shows «Sin hora» and «Añadir hora»", async () => {
      await openFormFromTeam("Alevín A");
      await addTime();
      await testRouter.back();
      expect(screen).toHavePathname(`/teams/${team}`);
      expect(screen.queryByLabelText("Local")).toBeNull();
      expect(savedMatches(db)).toEqual([]);
      await pressNewMatch();
      expectWithoutTime();
    });

    it("RF-083 E-033: «Quitar hora» right after «Añadir hora», with nothing else touched, and «Guardar» saves no time", async () => {
      await openFormAlone(team);
      await addTime();
      await pressClearTime();
      expectWithoutTime();
      await save();
      expect(savedMatches(db)).toMatchObject([
        { date: "2026-11-11", time: null },
      ]);
      expect(savedMatches(db)).toHaveLength(1);
    });
  },
);
