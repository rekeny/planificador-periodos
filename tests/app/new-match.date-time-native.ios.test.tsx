// T082 (Codex re-run, blocking finding «Android assigns a time without user selection»): on iOS the
// pickers stay inline and the installed SwiftUI picker reports nothing on mount (DatePickerView.swift
// lines 19-21), so the same native-equivalent double leaves the draft untouched and a user choice
// still reaches it, with no button to open (RF-025, RF-026, RF-083, E-023, E-032). Platform.OS is the
// jest-expo default, «ios». Real src/app routes and the real draft on the in-memory database.
import { screen } from "expo-router/testing-library";
import { Platform } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import { pickDate, pickTime } from "../support/date-time-picker-double";
import { isPickerOpen } from "../support/date-time-picker-native-double";
import {
  freshDraft,
  openFormAlone,
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

describe("iOS, inline pickers with the native-equivalent double (RF-025, RF-026, RF-083, E-032)", () => {
  it("RF-083: the platform of this file is iOS", () => {
    expect(Platform.OS).toBe("ios");
  });

  it("RF-025 RF-083 E-023: an untouched form shows both pickers, has no time and saves 2026-11-11 with no time", async () => {
    await openFormAlone(alevin);
    expect(isPickerOpen("date")).toBe(true);
    expect(isPickerOpen("time")).toBe(true);
    expect(shownTimes()).toEqual([]);
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-11", time: null },
    ]);
  });

  it("RF-026 RF-083: picking 1 March 2026 and 18:30 in the inline pickers is kept and saved", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pickTime(18, 30);
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(shownTimes()).toEqual(["18:30"]);
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-03-01", time: "18:30" },
    ]);
  });

  it("RF-083 E-032: «Quitar hora» after picking 18:30 leaves no time and nothing brings it back", async () => {
    await openFormAlone(alevin);
    await pickTime(18, 30);
    await pressClearTime();
    expect(shownTimes()).toEqual([]);
    expect(draft.getState().time).toBeNull();
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([{ time: null }]);
  });
});
