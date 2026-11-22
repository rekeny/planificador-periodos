// T059: the light red background of a grid cell (RF-006, RF-061, RF-062, RF-072, E-001, E-008).
// Assumed (named in tests/support/warning-reading.ts): GridCell keeps its props and its accessible
// label, and when `cell.isLightRed` is true its pressable has `backgroundColor: LIGHT_RED` (from
// src/ui/theme/warning-colors.ts). The colour comes only from the view flag: the component
// never works out a rule.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { ColumnKey } from "@/domain/column";
import type { MatchGrid } from "@/domain/grid";
import type { CellView } from "@/state/match-view-grid";
import { GridCell } from "@/ui/grid/grid-cell";
import { LIGHT_RED } from "@/ui/theme/warning-colors";
import { backgroundOf } from "../../../tests/support/warning-reading";
import {
  calmGrid,
  cellViewOf,
  E001,
  E008,
  JUAN,
} from "../../../tests/support/warning-views";

async function draw(cell: CellView, playerName = "Jugador 1") {
  await render(
    <GridCell
      cell={cell}
      playerName={playerName}
      cellWidth={44}
      rowHeight={44}
      onTapCell={jest.fn()}
      onLongPressCell={jest.fn()}
    />,
  );
  return screen.getByRole("button");
}

const background = async (grid: MatchGrid, key: ColumnKey) => {
  const { cell, playerName } = cellViewOf(grid, JUAN, key);
  const colour = backgroundOf(await draw(cell, playerName));
  await screen.unmount();
  return colour;
};

describe("grid cell, light red", () => {
  it.each(["P4", "P5"] as const)(
    "RF-062 E-001: Juan's empty %s is drawn with the light red background",
    async (key) => {
      expect(await background(E001, key)).toBe(LIGHT_RED);
    },
  );

  it.each(["P1", "P3", "P6"] as const)(
    "RF-061 RF-062 E-001: Juan's %s (marked or free) has no light red background",
    async (key) => {
      expect(await background(E001, key)).not.toBe(LIGHT_RED);
    },
  );

  it("RF-061: with nothing to warn about no cell has the light red background", async () => {
    expect(await background(calmGrid(), "P1")).not.toBe(LIGHT_RED);
  });

  it("RF-006 RF-072 E-008: of an 8-period match with an overtime only P5 and P6 are light red, never P7, P8 or the overtime", async () => {
    for (const key of ["P5", "P6"] as const) {
      expect(await background(E008, key)).toBe(LIGHT_RED);
    }
    for (const key of ["P7", "P8", "OT1"] as const) {
      expect(await background(E008, key)).not.toBe(LIGHT_RED);
    }
  });

  it("RF-060: the colour follows the view flag alone, so a flag set on a cell with no warning in its grid is drawn and a cleared one is not", async () => {
    const { cell } = cellViewOf(calmGrid(), JUAN, "P1");
    expect(backgroundOf(await draw({ ...cell, isLightRed: true }))).toBe(
      LIGHT_RED,
    );
    await screen.unmount();
    const light = cellViewOf(E001, JUAN, "P4").cell;
    expect(backgroundOf(await draw({ ...light, isLightRed: false }))).not.toBe(
      LIGHT_RED,
    );
  });

  it("RF-062 RF-043: a light red cell keeps its label and still reports the tap of its own cell", async () => {
    const onTapCell = jest.fn();
    const { cell } = cellViewOf(E001, JUAN, "P4");
    await render(
      <GridCell
        cell={cell}
        playerName="Jugador 1"
        cellWidth={44}
        rowHeight={44}
        onTapCell={onTapCell}
        onLongPressCell={jest.fn()}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Jugador 1, P4: casilla vacía",
    });
    expect(backgroundOf(button)).toBe(LIGHT_RED);
    await fireEvent.press(button);
    expect(onTapCell).toHaveBeenCalledWith(cell.cell);
  });
});
