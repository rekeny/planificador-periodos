// T083: the assembled grid, what it draws (RF-042, RF-070, RF-071, E-014, E-020). Assumed API of
// src/ui/grid/match-grid.tsx, which the Implementer writes (the task names the file, not the props):
//   MatchGrid({ view: MatchView, onTapCell: (cell: Cell) => void,
//               chromeHeight?: number, bannersHeight?: number, legendHeight?: number })
// The three heights are what the screen measures above the rows, in points, default 0. The grid
// reads the window with useWindowDimensions and computes its sizes with gridLayout; it draws only
// the view. The player column prints the number and the name in their own texts and the counter
// as one text, `grid.counter` = «J {{played}} · D {{rested}}». The layout is in match-grid.layout.test.tsx.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import es from "@/i18n/es.json";
import type { MatchView } from "@/state/match-view";
import { MatchGrid } from "@/ui/grid/match-grid";
import {
  gridWith,
  viewOf,
  type GridOptions,
} from "../../../tests/support/match-view-grid";
import { restoreWindow, setWindow } from "../../../tests/support/window-size";

const juan = { id: 1, playerId: 1, name: "Juan", number: "4" };
const pedro = { id: 2, playerId: 2, name: "Pedro", number: "7" };

const viewWith = (options: GridOptions = {}) => viewOf(gridWith(options));

function gridElement(view: MatchView, onTapCell = jest.fn()) {
  return (
    <MatchGrid view={view} onTapCell={onTapCell} onLongPressCell={jest.fn()} />
  );
}

beforeEach(async () => setWindow(1024, 768));
afterEach(async () => restoreWindow());

describe("match grid, content", () => {
  it("RF-070: the counter text lives in es.json as grid.counter, «J {{played}} · D {{rested}}»", () => {
    expect(es).toHaveProperty("grid.counter", "J {{played}} · D {{rested}}");
  });

  it("RF-042: 6 periods + 1 overtime and 10 players draw 10 rows and 7 columns, 70 cells and headers P1 to P6 and PR1", async () => {
    await render(gridElement(viewWith({ players: 10, overtimeCount: 1 })));
    expect(screen.getAllByRole("button")).toHaveLength(70);
    for (const header of ["P1", "P2", "P3", "P4", "P5", "P6", "PR1"]) {
      expect(screen.getByText(header)).toBeOnTheScreen();
    }
    for (let player = 1; player <= 10; player += 1) {
      expect(screen.getByText(`Jugador ${player}`)).toBeOnTheScreen();
      expect(
        screen.getByRole("button", {
          name: `Jugador ${player}, PR1: casilla vacía`,
        }),
      ).toBeOnTheScreen();
    }
  });

  it("RF-070 E-014: Juan with X in P1, P3 and P6, a sub in P5 and 7 columns shows «J 3 · D 3»", async () => {
    const marks = {
      "1:P1": "starter",
      "1:P3": "starter",
      "1:P6": "starter",
      "1:P5": "sub",
    } as const;
    await render(
      gridElement(viewWith({ overtimeCount: 1, callUp: [juan, pedro], marks })),
    );
    expect(screen.getByText("J 3 · D 3")).toBeOnTheScreen();
    expect(screen.getByText("J 0 · D 7")).toBeOnTheScreen();
  });

  it.each([
    ["starter", "J 1 · D 5"],
    ["sub", "J 0 · D 5"],
  ] as const)(
    "RF-070 RF-071: one %s mark in 6 periods with no overtime shows «%s», and a circled X adds to neither",
    async (mark, counter) => {
      const marks = { "1:P2": mark } as const;
      await render(gridElement(viewWith({ callUp: [juan], marks })));
      expect(screen.getByText(counter)).toBeOnTheScreen();
    },
  );

  it("RF-070: 3 overtimes count too, so X in PR1 and PR2 gives «J 2 · D 7»", async () => {
    const marks = { "1:OT1": "starter", "1:OT2": "starter" } as const;
    await render(
      gridElement(viewWith({ callUp: [juan], overtimeCount: 3, marks })),
    );
    expect(screen.getByText("J 2 · D 7")).toBeOnTheScreen();
    expect(screen.getByText("PR3")).toBeOnTheScreen();
  });

  it("RF-042 RF-070: a single player draws one row, one counter and the periods of a 4-period format", async () => {
    await render(gridElement(viewWith({ players: 1, format: 4 })));
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getAllByText(/^J \d+ · D \d+$/)).toHaveLength(1);
    expect(screen.getByText("J 0 · D 4")).toBeOnTheScreen();
    expect(screen.queryByText("P5")).toBeNull();
  });

  it("RF-042: an empty call-up draws no rows and no counters and does not fail", async () => {
    await render(gridElement(viewWith({ players: 0 })));
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByText(/^J \d+ · D \d+$/)).toHaveLength(0);
  });

  it("RF-042 E-020: the rows come in the order given, Ana 0, Carla 0, Luis 00, Bea 7, Eva 10, with «0» before «00»", async () => {
    const callUp = [
      { id: 5, playerId: 5, name: "Ana", number: "0" },
      { id: 3, playerId: 3, name: "Carla", number: "0" },
      { id: 4, playerId: 4, name: "Luis", number: "00" },
      { id: 2, playerId: 2, name: "Bea", number: "7" },
      { id: 1, playerId: 1, name: "Eva", number: "10" },
    ];
    await render(gridElement(viewWith({ callUp })));
    const names = screen
      .getAllByText(/^(Ana|Carla|Luis|Bea|Eva)$/)
      .map((text) => text.props.children);
    expect(names).toEqual(["Ana", "Carla", "Luis", "Bea", "Eva"]);
    const numbers = screen
      .getAllByText(/^(0|00|7|10)$/)
      .map((text) => text.props.children);
    expect(numbers).toEqual(["0", "0", "00", "7", "10"]);
  });

  it("RF-042: a 40-character name goes whole into the text, on one line, cut with an ellipsis at the end", async () => {
    const name = "Maximiliano José de la Santísima Trinida";
    const callUp = [{ id: 1, playerId: 1, name, number: "9" }];
    await render(gridElement(viewWith({ callUp })));
    const text = screen.getByText(name);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.ellipsizeMode).toBe("tail");
  });

  it("RF-042: tapping a cell calls onTapCell once with that cell and nothing else", async () => {
    const onTapCell = jest.fn();
    const view = viewWith({ callUp: [juan, pedro] });
    await render(gridElement(view, onTapCell));
    await fireEvent.press(
      screen.getByRole("button", { name: "Pedro, P2: casilla vacía" }),
    );
    const pedroRow = view.rows.find((row) => row.entryId === pedro.id);
    expect(onTapCell).toHaveBeenCalledTimes(1);
    expect(onTapCell.mock.calls[0]).toEqual([pedroRow?.cells[1]?.cell]);
  });
});

describe("match grid, over time", () => {
  it("RF-070 RF-071: a change of one cell in the view changes its counter and its label at once, and the old ones are gone", async () => {
    const before = viewWith({ callUp: [juan] });
    const after = viewWith({ callUp: [juan], marks: { "1:P3": "starter" } });
    const { rerender } = await render(gridElement(before));
    expect(screen.getByText("J 0 · D 6")).toBeOnTheScreen();
    await rerender(gridElement(after));
    expect(screen.getByText("J 1 · D 5")).toBeOnTheScreen();
    expect(screen.queryByText("J 0 · D 6")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Juan, P3: X, titular" }),
    ).toBeOnTheScreen();
  });

  it("RF-042 RF-070: drawing the same view twice, with an unmount between, gives the same tree", async () => {
    const view = viewWith({
      callUp: [juan, pedro],
      overtimeCount: 2,
      marks: { "1:P1": "starter", "2:OT2": "sub" },
    });
    const first = await render(gridElement(view));
    const tree = JSON.stringify(screen.toJSON());
    await first.unmount();
    await render(gridElement(view));
    expect(JSON.stringify(screen.toJSON())).toBe(tree);
  });

  it("RF-042 RF-070: nothing is kept between mounts, so a second view shows none of the first one", async () => {
    const first = await render(gridElement(viewWith({ callUp: [juan] })));
    await first.unmount();
    await render(gridElement(viewWith({ callUp: [pedro], format: 4 })));
    expect(screen.queryByText("Juan")).toBeNull();
    expect(screen.queryByText("P5")).toBeNull();
    expect(screen.getByText("Pedro")).toBeOnTheScreen();
    expect(screen.getByText("J 0 · D 4")).toBeOnTheScreen();
  });
});
