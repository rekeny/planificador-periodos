// T082: the edges of the date and time of the new-match form: dismissing a picker, «Quitar hora»
// with no time, no text field, rotating and leaving the form (RF-026, RF-082, RF-083, RF-084, E-032).
// Same doubles as new-match.date-time.test.tsx. The field and the files do not exist yet.
import { act, screen, testRouter } from "expo-router/testing-library";
import { Dimensions } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  dismissPicker,
  localParts,
  pickDate,
  pickTime,
  pickerValue,
} from "../support/date-time-picker-double";
import {
  chooseFormatInForm,
  freshDraft,
  openFormAlone,
  openFormFromTeam,
  pressAddTime,
  pressClearTime,
  pressNewMatch,
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

describe("new-match form, dismissing a picker (RF-026, RF-083)", () => {
  it("RF-026 RF-083: dismissing the date picker without choosing keeps today, and after choosing a date keeps that date", async () => {
    await openFormAlone(alevin);
    await dismissPicker("date");
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(draft.getState().date).toBe("2026-11-11");
    await pickDate(2026, 3, 1);
    await dismissPicker("date");
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(draft.getState().date).toBe("2026-03-01");
  });

  it("RF-083: with no time there is no time picker to dismiss, and after «Añadir hora» and 18:30 dismissing it keeps 18:30", async () => {
    await openFormAlone(alevin);
    expect(screen.queryByTestId("date-time-picker-time")).toBeNull();
    expect(shownTimes()).toEqual([]);
    expect(draft.getState().time).toBeNull();
    await pressAddTime();
    await pickTime(18, 30);
    await dismissPicker("time");
    expect(shownTimes()).toEqual(["18:30"]);
    expect(draft.getState().time).toBe("18:30");
  });

  it("RF-083 E-032: dismissing a picker after «Quitar hora» does not bring the cleared time back", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(18, 30);
    await pressClearTime();
    await dismissPicker("date");
    expect(screen.queryByTestId("date-time-picker-time")).toBeNull();
    expect(screen.getByText("Sin hora")).toBeTruthy();
    expect(shownTimes()).toEqual([]);
    expect(draft.getState().time).toBeNull();
  });
});

describe("new-match form, no «Quitar hora» with no time (RF-083, E-032)", () => {
  it("RF-083 E-032: with no time chosen no «Quitar hora» is offered, the date is kept and the form saves with no time", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 11, 14);
    expect(screen.queryByRole("button", { name: "Quitar hora" })).toBeNull();
    expect(shownTimes()).toEqual([]);
    expect(screen.getByText("14/11/2026")).toBeTruthy();
    expect(draft.getState()).toMatchObject({ date: "2026-11-14", time: null });
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-14", time: null },
    ]);
  });
});

describe("new-match form, no text for the date or the time (RF-083)", () => {
  it("RF-083: no editable text field is labelled «Fecha» or «Hora», and none shows a date or a time as its text", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pressAddTime();
    await pickTime(18, 30);
    const typed = screen
      .queryAllByLabelText(/^(Fecha|Hora)/)
      .filter((node) => node.type === "TextInput");
    expect(typed).toEqual([]);
    expect(
      screen.queryAllByDisplayValue(/\d{2}\/\d{2}\/\d{4}|\d{2}:\d{2}/),
    ).toEqual([]);
  });

  it("RF-083: the only text fields of the form are home, away, the two scores and the notes", async () => {
    await openFormAlone(alevin);
    const labels = screen
      .queryAllByDisplayValue(/^/)
      .map((node) => node.props.accessibilityLabel)
      .sort();
    expect(labels).toEqual(
      [
        "Local",
        "Visitante",
        "Notas",
        "Resultado final",
        "Resultado final",
      ].sort(),
    );
  });
});

describe("new-match form, interruptions (RF-082, RF-083, RF-084)", () => {
  it("RF-083: rotating the device keeps the chosen date and time, in the texts and in the pickers", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pressAddTime();
    await pickTime(18, 30);
    await act(() => {
      Dimensions.set({
        window: { width: 800, height: 400, scale: 2, fontScale: 1 },
      });
    });
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(shownTimes()).toEqual(["18:30"]);
    expect(localParts(await pickerValue("date")).slice(0, 3)).toEqual([
      2026, 3, 1,
    ]);
    expect(localParts(await pickerValue("time")).slice(3)).toEqual([18, 30]);
  });

  it("RF-084 RF-083: changing the format keeps the chosen date and time", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pressAddTime();
    await pickTime(18, 30);
    await chooseFormatInForm(8);
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(shownTimes()).toEqual(["18:30"]);
  });

  it("RF-082 RF-083: leaving the form with Back drops the chosen date and time, and opening it again shows today and no time", async () => {
    await openFormFromTeam("Alevín A");
    await pickDate(2030, 1, 31);
    await pressAddTime();
    await pickTime(9, 5);
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${alevin}`);
    expect(savedMatches(db)).toEqual([]);
    await pressNewMatch();
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(shownTimes()).toEqual([]);
    expect(screen.getByText("Sin hora")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Añadir hora" })).toBeTruthy();
    expect(draft.getState()).toMatchObject({ date: "2026-11-11", time: null });
  });
});
