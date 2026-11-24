// T096: what a confirmed format change does to the grid under the details and to what is saved
// (RF-040, RF-041, RF-057, RF-082, RF-086, E-016, F-A2). Same doubles and assumed screens as
// match-details.format.test.tsx.
import { ScrollView } from "react-native";
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import {
  openDetailsFromGrid,
  pressEdit,
  savedMatch,
  seedDetails,
} from "../support/match-details";
import {
  FORMAT_CONFIRM,
  FORMAT_MESSAGE,
  gridCellState,
  gridHeaders,
  headers,
  openDetailsFromAllMatches,
  pickFormat,
  pressInDialog,
  seedMarks,
} from "../support/match-details-actions";
import type { MarkSeed } from "../support/match-details-actions";
import { matchesStoreOn, pressItemOf } from "../support/match-lists";
import { dialogTexts } from "../support/match-screen-grid";
import { HORIZONTAL, measureHeaderRow } from "../support/match-grid-reading";
import { HEADER_ROW_HEIGHT, measureViewport } from "../support/grid-viewport";
import { savedEntryIds, savedMarkKeys } from "../support/match-session-call-up";
import { savedMarks } from "../support/match-session-marks";
import { waitForPathname } from "../support/new-match-save";
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

afterEach(async () => {
  jest.restoreAllMocks();
  await restoreWindow();
});

// E-016: P1 and P4 survive an 8 → 4 change, P5 to P8 do not.
const EIGHT_PERIODS: readonly MarkSeed[] = [
  [0, "P", 1, "starter"],
  [0, "P", 4, "sub"],
  [1, "P", 5, "starter"],
  [1, "P", 8, "sub"],
  [2, "P", 6, "starter"],
];

describe("match details, E-016: 8 → 4 periods with marks in P5–P8 (RF-039, RF-040)", () => {
  it("RF-039 RF-040 E-016: the warning appears, confirming leaves P1–P4 with their marks, the marks of P5–P8 are deleted, and the match opened again is the same", async () => {
    const seeded = seedDetails({ format: 8 });
    const { db } = seeded;
    seedMarks(seeded, EIGHT_PERIODS);
    matchesStoreOn(db);
    const [first] = savedEntryIds(db, 1);
    await openDetailsFromAllMatches();
    await testRouter.back();
    await screen.findByRole("button", { name: "Editar" });
    expect(gridCellState("Jugador 2", "P5")).toBe("starter");
    await pressEdit();
    await screen.findByLabelText("Local");
    await pickFormat(4);
    expect(dialogTexts()).toContain(FORMAT_MESSAGE);
    await pressInDialog(FORMAT_CONFIRM);
    await testRouter.back();
    await waitForPathname("/matches/1");
    expect(gridHeaders()).toEqual(headers(4));
    expect(gridCellState("Jugador 1", "P1")).toBe("starter");
    expect(gridCellState("Jugador 1", "P4")).toBe("sub");
    expect(
      screen.queryByRole("button", { name: /^Jugador 2, P5: / }),
    ).toBeNull();
    expect(savedMarks(db, 1)).toEqual([
      `${first}:P1=starter`,
      `${first}:P4=sub`,
    ]);
    await testRouter.back();
    await waitForPathname("/matches");
    await pressItemOf("01/11/2026");
    await screen.findByRole("button", { name: "Editar" });
    expect(gridHeaders()).toEqual(headers(4));
    expect(gridCellState("Jugador 1", "P4")).toBe("sub");
  });
});

describe("match details, the overtimes stay with their marks (RF-041)", () => {
  const OVERTIME_MARKS: readonly MarkSeed[] = [
    [0, "P", 1, "starter"],
    [0, "OT", 1, "starter"],
    [1, "OT", 2, "sub"],
  ];
  it.each([
    [6, 4],
    [8, 4],
    [6, 8],
    [4, 6],
  ] as const)(
    "RF-041: a %i-period match with 2 overtimes changed to %i shows its periods and then PR1 and PR2 with their marks, and the database keeps them",
    async (from, to) => {
      const seeded = seedDetails({ format: from, overtimeCount: 2 });
      seedMarks(seeded, OVERTIME_MARKS);
      await openDetailsFromGrid(1);
      await pickFormat(to);
      await pressInDialog(FORMAT_CONFIRM);
      expect(gridHeaders()).toEqual(headers(to, 2));
      expect(gridCellState("Jugador 1", "PR1")).toBe("starter");
      expect(gridCellState("Jugador 2", "PR2")).toBe("sub");
      expect(savedMatch(seeded.db, 1)).toMatchObject({
        format: to,
        overtimeCount: 2,
      });
      expect(savedMarkKeys(seeded.db, 1)).toHaveLength(3);
    },
  );

  it("RF-041: a 6-period match with 1 overtime changed to 4 shows P1–P4 and then PR1 with its marks (grid P1 to P4 and PR1 only)", async () => {
    const seeded = seedDetails({ format: 6, overtimeCount: 1 });
    seedMarks(seeded, [
      [0, "P", 6, "starter"],
      [1, "OT", 1, "starter"],
    ]);
    await openDetailsFromGrid(1);
    await pickFormat(4);
    await pressInDialog(FORMAT_CONFIRM);
    expect(gridHeaders()).toEqual(["P1", "P2", "P3", "P4", "PR1"]);
    expect(gridCellState("Jugador 2", "PR1")).toBe("starter");
    expect(savedMarkKeys(seeded.db, 1)).toHaveLength(1);
  });
});

// The grid is under the details once they open, so it is read with hidden elements included.
const sideways = (): boolean =>
  screen.getByTestId(HORIZONTAL, { includeHiddenElements: true }).props
    .scrollEnabled !== false;

describe("match details, the grid scrolled sideways (F-A2, RF-076)", () => {
  it("RF-038 RF-076 F-A2: with the grid scrolled to P8 before 8 → 4, the grid goes back to its start and does not scroll, so P1 is reachable", async () => {
    seedDetails({ format: 8 });
    await setWindow(411, 800);
    await renderRouter("./src/app", { initialUrl: "/matches/1" });
    await screen.findByRole("button", { name: "Editar" });
    await measureHeaderRow(HEADER_ROW_HEIGHT);
    await measureViewport(411, 600);
    expect(sideways()).toBe(true);
    await fireEvent.scroll(screen.getByTestId(HORIZONTAL), {
      nativeEvent: { contentOffset: { x: 41, y: 0 } },
    });
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
    scrollTo.mockClear();
    await pressEdit();
    await screen.findByLabelText("Local");
    await pickFormat(4);
    await pressInDialog(FORMAT_CONFIRM);
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: false });
    expect(sideways()).toBe(false);
    expect(gridHeaders()).toEqual(headers(4));
  });
});
