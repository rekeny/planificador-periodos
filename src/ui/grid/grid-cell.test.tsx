// T054: the grid cell with its three states (RF-043). Assumed API of src/ui/grid/grid-cell.tsx, which
// the Implementer writes (the plan names the file but gives no props, so these are assumed):
//   GridCell({ cell: CellView, playerName: string, cellWidth: number, rowHeight: number,
//              onTapCell: (cell: Cell) => void })
// It is one button whose accessible label is `grid.cell.empty|starter|sub` with the player's name and
// the column header («PR1» for an overtime). The mark (X, circled X, blank) is only a drawing. It
// takes view data and a callback: no store, no rules.
import "@/i18n";
import { Fragment } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { CellState } from "@/domain/grid";
import es from "@/i18n/es.json";
import { GridCell } from "@/ui/grid/grid-cell";
import {
  cellOf,
  drawing,
  type CellOptions,
} from "../../../tests/support/grid-cell-views";

const LABELS: Record<CellState, (column: string) => string> = {
  empty: (column) => `Ana, ${column}: casilla vacía`,
  starter: (column) => `Ana, ${column}: X, titular`,
  sub: (column) => `Ana, ${column}: X con círculo, entró de cambio`,
};

function cellElement(options: CellOptions = {}, onTapCell = jest.fn()) {
  const { view, name } = cellOf(options);
  return (
    <GridCell
      cell={view}
      playerName={name}
      cellWidth={44}
      rowHeight={44}
      onTapCell={onTapCell}
    />
  );
}

const states: readonly CellState[] = ["empty", "starter", "sub"];

describe("grid cell", () => {
  it("RF-043: the three cell labels live in es.json as grid.cell.empty, grid.cell.starter and grid.cell.sub", () => {
    expect(es).toHaveProperty(
      "grid.cell.empty",
      "{{name}}, {{period}}: casilla vacía",
    );
    expect(es).toHaveProperty(
      "grid.cell.starter",
      "{{name}}, {{period}}: X, titular",
    );
    expect(es).toHaveProperty(
      "grid.cell.sub",
      "{{name}}, {{period}}: X con círculo, entró de cambio",
    );
  });

  it("RF-043: each of the three states is a button found by its own accessible label", async () => {
    await render(
      <>
        {states.map((state) => (
          <Fragment key={state}>{cellElement({ state })}</Fragment>
        ))}
      </>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    for (const state of states) {
      expect(
        screen.getByRole("button", { name: LABELS[state]("P2") }),
      ).toBeOnTheScreen();
    }
  });

  it.each(states)(
    "RF-043: a cell in state %s has exactly its own label and none of the other two",
    async (state) => {
      await render(cellElement({ state }));
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(
        screen.getByRole("button", { name: LABELS[state]("P2") }),
      ).toBeOnTheScreen();
      for (const other of states.filter((s) => s !== state)) {
        expect(
          screen.queryByRole("button", { name: LABELS[other]("P2") }),
        ).toBeNull();
      }
    },
  );

  it("RF-043: the three states are drawn differently, an empty cell shows no X and the others do", async () => {
    const drawings: string[] = [];
    for (const state of states) {
      const { unmount } = await render(cellElement({ state }));
      drawings.push(drawing(screen.toJSON()));
      if (state === "empty") expect(screen.queryByText("X")).toBeNull();
      else expect(screen.getByText("X")).toBeOnTheScreen();
      await unmount();
    }
    expect(new Set(drawings).size).toBe(3);
  });

  it("RF-043: re-rendering after a change shows the new drawing and the new label, and the old label is gone", async () => {
    const { rerender } = await render(cellElement({ state: "empty" }));
    const before = drawing(screen.toJSON());
    await rerender(cellElement({ state: "starter" }));
    expect(
      screen.getByRole("button", { name: LABELS.starter("P2") }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: LABELS.empty("P2") }),
    ).toBeNull();
    expect(drawing(screen.toJSON())).not.toBe(before);
  });

  it.each([
    ["P8", 8],
    ["OT1", 6],
    ["OT3", 6],
  ] as const)(
    "RF-042 RF-043: the label of a cell in column %s names its header, «P8», «PR1» and «PR3»",
    async (column, format) => {
      await render(cellElement({ column, format }));
      const header = column.replace("OT", "PR");
      expect(
        screen.getByRole("button", { name: LABELS.empty(header) }),
      ).toBeOnTheScreen();
    },
  );

  it("RF-043: a player name of 40 characters goes whole into the label and the cell is still one button", async () => {
    const name = "Maximiliano José de la Santísima Trinida";
    expect(name).toHaveLength(40);
    await render(cellElement({ name, state: "starter" }));
    expect(
      screen.getByRole("button", { name: `${name}, P2: X, titular` }),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("RF-043: a name with accents and a ñ goes unchanged into the label", async () => {
    await render(cellElement({ name: "Íñigo Ñáñez", state: "sub" }));
    expect(
      screen.getByRole("button", {
        name: "Íñigo Ñáñez, P2: X con círculo, entró de cambio",
      }),
    ).toBeOnTheScreen();
  });

  it.each(["0", "00", "7"])(
    "RF-043: the player number «%s» is not in the label, which has the name and the column only",
    async (number) => {
      await render(cellElement({ name: "Luis", number }));
      expect(
        screen.getByRole("button", { name: "Luis, P2: casilla vacía" }),
      ).toBeOnTheScreen();
    },
  );

  it.each(states)(
    "RF-043: pressing a cell in state %s calls onTapCell once with that cell, as CellView.cell",
    async (state) => {
      const onTapCell = jest.fn();
      const { view } = cellOf({ state, column: "OT2" });
      await render(cellElement({ state, column: "OT2" }, onTapCell));
      expect(onTapCell).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole("button"));
      expect(onTapCell).toHaveBeenCalledTimes(1);
      expect(onTapCell.mock.calls[0]).toHaveLength(1);
      expect(onTapCell.mock.calls[0][0]).toEqual(view.cell);
    },
  );

  it.each([
    [44, 44],
    [57, 51],
  ])(
    "RF-043: the pressable cell takes the size from the props, cellWidth %d and rowHeight %d, never below 44 pt",
    async (cellWidth, rowHeight) => {
      const { view, name } = cellOf();
      await render(
        <GridCell
          cell={view}
          playerName={name}
          cellWidth={cellWidth}
          rowHeight={rowHeight}
          onTapCell={jest.fn()}
        />,
      );
      expect(screen.getByRole("button")).toHaveStyle({
        width: cellWidth,
        height: rowHeight,
      });
    },
  );
});
