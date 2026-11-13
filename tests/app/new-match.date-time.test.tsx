// T082: date and time of the new-match form with the native pickers and «Quitar hora» (RF-026,
// RF-083, E-023, E-032). Real src/app routes and the real draft on the in-memory database; only the
// native picker module is replaced by the double of tests/support/date-time-picker-double.ts, which
// calls onValueChange as the native picker would. The field and the files do not exist yet.
import { screen } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  localParts,
  pickDate,
  pickTime,
  pickerValue,
} from "../support/date-time-picker-double";
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
    .requireActual<typeof import("../support/date-time-picker-double")>(
      "../support/date-time-picker-double",
    )
    .dateTimePickerModule(),
);

const DATES: [string, string, number, number, number][] = [
  ["01/01/2026", "2026-01-01", 2026, 1, 1],
  ["31/12/2026", "2026-12-31", 2026, 12, 31],
  ["01/03/2026", "2026-03-01", 2026, 3, 1],
  ["29/02/2020", "2020-02-29", 2020, 2, 29],
  ["15/06/2020", "2020-06-15", 2020, 6, 15],
  ["31/12/2030", "2030-12-31", 2030, 12, 31],
];
const TIMES: [string, number, number][] = [
  ["00:00", 0, 0],
  ["23:59", 23, 59],
  ["09:05", 9, 5],
  ["18:30", 18, 30],
];
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

describe("new-match form, date and time by default (RF-026, RF-083, E-023)", () => {
  it("RF-083: es.json holds the texts «Fecha», «Hora» and «Quitar hora»", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    const field = texts.match?.field as Record<string, unknown>;
    expect(field.date).toBe("Fecha");
    expect(field.time).toBe("Hora");
    expect(texts.match?.clearTime).toBe("Quitar hora");
  });

  it("RF-026 RF-083 E-023: a new form shows the labels «Fecha» and «Hora», today as «11/11/2026», no time and the button «Quitar hora»", async () => {
    await openFormAlone(alevin);
    expect(screen.getByText("Fecha")).toBeTruthy();
    expect(screen.getByText("Hora")).toBeTruthy();
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(shownTimes()).toEqual([]);
    expect(screen.getByRole("button", { name: "Quitar hora" })).toBeTruthy();
    expect(draft.getState()).toMatchObject({ date: "2026-11-11", time: null });
  });

  it("RF-083: the date and the time are chosen with native pickers, one in date mode on the draft's day and one in time mode", async () => {
    await openFormAlone(alevin);
    expect(localParts(await pickerValue("date")).slice(0, 3)).toEqual([
      2026, 11, 11,
    ]);
    expect(await pickerValue("time")).toBeInstanceOf(Date);
  });
});

describe("new-match form, choosing the date (RF-026, RF-083)", () => {
  it("RF-026 RF-083: picking 14 November 2026 shows «14/11/2026», the draft has «2026-11-14», the picker shows the choice and no time appears", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 11, 14);
    expect(screen.getByText("14/11/2026")).toBeTruthy();
    expect(screen.queryByText("11/11/2026")).toBeNull();
    expect(draft.getState()).toMatchObject({ date: "2026-11-14", time: null });
    expect(localParts(await pickerValue("date")).slice(0, 3)).toEqual([
      2026, 11, 14,
    ]);
    expect(shownTimes()).toEqual([]);
  });

  it.each(DATES)(
    "RF-026 RF-083 E-023: picking the date «%s» (draft «%s», the year boundaries, the past and the far future) is accepted, shown with two digits and never blocked",
    async (shown, iso, year, month, day) => {
      await openFormAlone(alevin);
      await pickDate(year, month, day);
      expect(screen.getByText(shown)).toBeTruthy();
      expect(draft.getState().date).toBe(iso);
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  it("RF-083: 1 March 2026 is shown as «01/03/2026», never as «1/3/2026»", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(screen.queryByText("1/3/2026")).toBeNull();
  });
});

describe("new-match form, choosing the time (RF-083)", () => {
  it.each(TIMES)(
    "RF-083: picking the time «%s» (the day boundaries and the 24-hour format) shows it with two digits and the draft keeps it",
    async (shown, hour, minute) => {
      await openFormAlone(alevin);
      await pickTime(hour, minute);
      expect(shownTimes()).toEqual([shown]);
      expect(draft.getState().time).toBe(shown);
      expect(draft.getState().date).toBe("2026-11-11");
    },
  );
});

describe("new-match form, several choices in a row (RF-026, RF-083, E-032)", () => {
  it("RF-083 E-032: 1 March 2026 at 18:30 shows «01/03/2026» and «18:30», then «Quitar hora» leaves the date and no time", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pickTime(18, 30);
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(shownTimes()).toEqual(["18:30"]);
    await pressClearTime();
    expect(shownTimes()).toEqual([]);
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(draft.getState()).toMatchObject({ date: "2026-03-01", time: null });
  });

  it("RF-083: choosing a time and then changing the date keeps the time", async () => {
    await openFormAlone(alevin);
    await pickTime(9, 5);
    await pickDate(2026, 11, 14);
    await pickDate(2030, 1, 31);
    expect(shownTimes()).toEqual(["09:05"]);
    expect(draft.getState()).toMatchObject({
      date: "2030-01-31",
      time: "09:05",
    });
  });

  it("RF-083 E-032: choosing a time, «Quitar hora» and choosing another time shows the new one", async () => {
    await openFormAlone(alevin);
    await pickTime(18, 30);
    await pressClearTime();
    await pickTime(10, 0);
    expect(shownTimes()).toEqual(["10:00"]);
    expect(draft.getState().time).toBe("10:00");
  });

  it("RF-083: after «Quitar hora» the time picker still works and a second «Quitar hora» changes nothing more", async () => {
    await openFormAlone(alevin);
    await pickTime(7, 45);
    await pressClearTime();
    await pressClearTime();
    await pickTime(7, 45);
    expect(shownTimes()).toEqual(["07:45"]);
  });
});

describe("new-match form, what is saved (RF-025, RF-026, RF-083, E-032)", () => {
  it("RF-025 RF-026 RF-083: the match created after picking 14 November 2026 at 09:05 is saved with that date and time", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 11, 14);
    await pickTime(9, 5);
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-14", time: "09:05" },
    ]);
  });

  it("RF-025 RF-083 E-032: the match created after «Quitar hora» is saved with its date and no time, and one created with no time chosen has none", async () => {
    await openFormAlone(alevin);
    await pickTime(18, 30);
    await pickDate(2026, 3, 1);
    await pressClearTime();
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-03-01", time: null },
    ]);
  });

  it("RF-025 RF-026 E-023: keeping the defaults saves today (2026-11-11) with no time", async () => {
    await openFormAlone(alevin);
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-11", time: null },
    ]);
  });
});
