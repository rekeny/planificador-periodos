// T059: the assembled grid draws the warnings of its view (RF-006, RF-061, RF-062, RF-063, RF-065,
// RF-066, RF-067, RF-087, E-001, E-002, E-003). The grid itself draws only the colours and the header
// marks; the general warning and the legend are drawn by the screen (see match-screen.warnings*).
// Colours and marks are read as tests/support/warning-reading.ts describes.
import "@/i18n";
import { render } from "@testing-library/react-native";

import type { MatchGrid } from "@/domain/grid";
import { MatchGrid as Grid } from "@/ui/grid/match-grid";
import { viewOf } from "../../../tests/support/match-view-grid";
import {
  headerMarks,
  legendTexts,
  lightRedCells,
  redPlayers,
  generalWarningShown,
} from "../../../tests/support/warning-reading";
import {
  calmGrid,
  E001,
  E002,
  E003,
  E008,
} from "../../../tests/support/warning-views";
import { restoreWindow, setWindow } from "../../../tests/support/window-size";

async function drawn(grid: MatchGrid) {
  await setWindow(1024, 768);
  await render(<Grid view={viewOf(grid)} onTapCell={jest.fn()} />);
}

afterEach(async () => restoreWindow());

describe("match grid, warnings", () => {
  it("RF-062 RF-065 E-001: E-001 colours Juan's P4 and P5 and marks P1 to P5 with «!», nobody in red", async () => {
    await drawn(E001);
    expect(lightRedCells()).toEqual(["Jugador 1, P4", "Jugador 1, P5"]);
    expect(headerMarks()).toEqual({
      P1: "!",
      P2: "!",
      P3: "!",
      P4: "!",
      P5: "!",
    });
    expect(redPlayers()).toEqual([]);
  });

  it("RF-066 E-002: E-002 marks P3 with «≠» and the other four periods with «!»", async () => {
    await drawn(E002);
    expect(headerMarks()).toEqual({
      P1: "!",
      P2: "!",
      P3: "≠",
      P4: "!",
      P5: "!",
    });
    expect(lightRedCells()).toEqual(["Jugador 1, P4", "Jugador 1, P5"]);
  });

  it("RF-063 E-003: E-003 puts Juan in red and colours his P5", async () => {
    await drawn(E003);
    expect(redPlayers()).toEqual(["Jugador 1"]);
    expect(lightRedCells()).toEqual(["Jugador 1, P5"]);
  });

  it("RF-006 RF-072 E-008: E-008 colours P5 and P6 only and marks P1 to P6 only", async () => {
    await drawn(E008);
    expect(lightRedCells()).toEqual(["Jugador 1, P5", "Jugador 1, P6"]);
    expect(Object.keys(headerMarks()).sort()).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
    ]);
  });

  it("RF-061 RF-087: a grid with no warning draws no colour and no mark", async () => {
    await drawn(calmGrid());
    expect(lightRedCells()).toEqual([]);
    expect(redPlayers()).toEqual([]);
    expect(headerMarks()).toEqual({});
  });

  it("RF-067 RF-087: the grid itself draws neither the general warning nor the legend, the screen does", async () => {
    await drawn(E003);
    expect(generalWarningShown()).toBe(false);
    expect(legendTexts()).toEqual([]);
  });
});
