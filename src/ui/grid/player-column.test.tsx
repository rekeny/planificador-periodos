// T083: the fixed player column (RF-070, RF-071, RF-077, E-020). Assumed API of
// src/ui/grid/player-column.tsx, which the Implementer writes (the task names the file, not the props):
//   PlayerColumn({ rows: readonly RowView[], rowHeight: number })
// One entry per row, in the order given: the number and the name each in their own text, and the
// counter below as one text from `grid.counter` («J 3 · D 3»). It draws no cells and takes no
// callback: only view data.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";

import { PlayerColumn } from "@/ui/grid/player-column";
import {
  gridWith,
  viewOf,
  type GridOptions,
} from "../../../tests/support/match-view-grid";

const rowsOf = (options: GridOptions = {}) => viewOf(gridWith(options)).rows;

describe("player column", () => {
  it("RF-077: each row shows the number, the name and the counter, and no cell", async () => {
    const callUp = [
      { id: 1, playerId: 1, name: "Juan", number: "4" },
      { id: 2, playerId: 2, name: "Pedro", number: "7" },
    ];
    const marks = { "1:P1": "starter", "1:P2": "starter" } as const;
    await render(
      <PlayerColumn rows={rowsOf({ callUp, marks })} rowHeight={44} />,
    );
    for (const text of ["4", "Juan", "J 2 · D 4", "7", "Pedro", "J 0 · D 6"]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("RF-070 RF-071 E-014: a circled X adds to neither number of the counter", async () => {
    const callUp = [{ id: 1, playerId: 1, name: "Juan", number: "4" }];
    const marks = {
      "1:P1": "starter",
      "1:P3": "starter",
      "1:P6": "starter",
      "1:P5": "sub",
    } as const;
    await render(
      <PlayerColumn
        rows={rowsOf({ callUp, marks, overtimeCount: 1 })}
        rowHeight={44}
      />,
    );
    expect(screen.getByText("J 3 · D 3")).toBeOnTheScreen();
  });

  it("RF-077 E-020: the rows keep the order given and the numbers «0» and «00» are different texts", async () => {
    const callUp = [
      { id: 5, playerId: 5, name: "Ana", number: "0" },
      { id: 4, playerId: 4, name: "Luis", number: "00" },
      { id: 2, playerId: 2, name: "Bea", number: "7" },
    ];
    await render(<PlayerColumn rows={rowsOf({ callUp })} rowHeight={56} />);
    expect(screen.getByText("0")).toBeOnTheScreen();
    expect(screen.getByText("00")).toBeOnTheScreen();
    const names = screen
      .getAllByText(/^(Ana|Luis|Bea)$/)
      .map((text) => text.props.children);
    expect(names).toEqual(["Ana", "Luis", "Bea"]);
  });

  it("RF-077: no rows draw no counters and do not fail", async () => {
    await render(<PlayerColumn rows={[]} rowHeight={44} />);
    expect(screen.queryAllByText(/^J \d+ · D \d+$/)).toHaveLength(0);
  });

  it("RF-070: a long name is one line cut with an ellipsis at the end", async () => {
    const name = "Maximiliano José de la Santísima Trinida";
    const callUp = [{ id: 1, playerId: 1, name, number: "9" }];
    await render(<PlayerColumn rows={rowsOf({ callUp })} rowHeight={44} />);
    expect(screen.getByText(name).props.numberOfLines).toBe(1);
    expect(screen.getByText(name).props.ellipsizeMode).toBe("tail");
  });
});
