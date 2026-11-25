// T065: the long press on a grid cell (RF-052). Assumed API of src/ui/grid/grid-cell.tsx, on top of
// the one of T054: a new prop `onLongPressCell: (cell: Cell) => void`, called with the cell's own
// `Cell` when a long press on a marked cell activates, and never for an empty cell, for a press that
// fails (the finger moved, as when the grid scrolls) or is cancelled, or before the gesture
// activates. A long press is never also a tap. The gesture is driven with the utility of
// gesture-handler 3 (tests/support/cell-long-press.ts); every cell, empty ones too, registers its
// long-press gesture with the `testID` `cell-long-press:<entryId>:<columnKey>`. A `GestureDetector`
// needs a `GestureHandlerRootView` above it, so the cell is rendered inside one.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import type { CellState } from "@/domain/grid";
import { GridCell } from "@/ui/grid/grid-cell";
import {
  hold,
  longPressId,
  type Finger,
} from "../../../tests/support/cell-long-press";
import {
  cellOf,
  type CellOptions,
} from "../../../tests/support/grid-cell-views";

async function renderCell(options: CellOptions = {}) {
  const { view, name } = cellOf(options);
  const onTapCell = jest.fn();
  const onLongPressCell = jest.fn();
  await render(
    <GestureHandlerRootView>
      <GridCell
        cell={view}
        playerName={name}
        cellWidth={44}
        rowHeight={44}
        onTapCell={onTapCell}
        onLongPressCell={onLongPressCell}
      />
    </GestureHandlerRootView>,
  );
  const id = longPressId(7, options.column ?? "P2");
  return { view, id, onTapCell, onLongPressCell };
}

const button = () => screen.getByRole("button");

describe("grid cell, long press", () => {
  it.each<CellState>(["starter", "sub"])(
    "RF-052: a long press on a %s cell calls onLongPressCell once with that cell and never onTapCell",
    async (state) => {
      const { view, id, onTapCell, onLongPressCell } = await renderCell({
        state,
      });
      await hold(id);
      expect(onLongPressCell).toHaveBeenCalledTimes(1);
      expect(onLongPressCell).toHaveBeenCalledWith(view.cell);
      expect(onTapCell).not.toHaveBeenCalled();
    },
  );

  it.each<[string, CellOptions]>([
    ["a free period", { column: "P6" }],
    ["an overtime", { column: "OT1" }],
  ])("RF-052: a long press works on a cell of %s", async (_name, options) => {
    const { view, id, onLongPressCell } = await renderCell({
      ...options,
      state: "starter",
    });
    await hold(id);
    expect(onLongPressCell).toHaveBeenCalledTimes(1);
    expect(onLongPressCell).toHaveBeenCalledWith(view.cell);
  });

  it("RF-052: a long press on an empty cell calls neither onLongPressCell nor onTapCell", async () => {
    const { id, onTapCell, onLongPressCell } = await renderCell({
      state: "empty",
    });
    await hold(id);
    expect(onLongPressCell).not.toHaveBeenCalled();
    expect(onTapCell).not.toHaveBeenCalled();
  });

  it("RF-052: the full press-hold-release on an empty cell calls neither onLongPressCell nor onTapCell", async () => {
    const { id, onTapCell, onLongPressCell } = await renderCell({
      state: "empty",
    });
    await fireEvent(button(), "pressIn");
    await hold(id);
    await fireEvent(button(), "pressOut");
    await fireEvent.press(button());
    expect(onLongPressCell).not.toHaveBeenCalled();
    expect(onTapCell).not.toHaveBeenCalled();
  });

  it.each<[string, Finger]>([
    ["fails because the finger moved (the grid scrolls)", "fails"],
    ["is cancelled by the system", "isCancelled"],
    ["has begun but not yet activated", "isOnlyBegun"],
  ])("RF-052: a long press that %s opens nothing", async (_name, finger) => {
    const { id, onTapCell, onLongPressCell } = await renderCell({
      state: "starter",
    });
    await hold(id, finger);
    expect(onLongPressCell).not.toHaveBeenCalled();
    expect(onTapCell).not.toHaveBeenCalled();
  });

  it("RF-052: the release that ends a long press is not also a tap, and the next short tap still taps", async () => {
    const { view, id, onTapCell, onLongPressCell } = await renderCell({
      state: "starter",
    });
    await fireEvent(button(), "pressIn");
    await hold(id);
    await fireEvent(button(), "pressOut");
    await fireEvent.press(button());
    expect(onLongPressCell).toHaveBeenCalledTimes(1);
    expect(onTapCell).not.toHaveBeenCalled();
    await fireEvent(button(), "pressIn");
    await fireEvent(button(), "pressOut");
    await fireEvent.press(button());
    expect(onTapCell).toHaveBeenCalledTimes(1);
    expect(onTapCell).toHaveBeenCalledWith(view.cell);
    expect(onLongPressCell).toHaveBeenCalledTimes(1);
  });

  it("RF-052: after a failed long press a short tap still calls onTapCell once and never onLongPressCell", async () => {
    const { view, id, onTapCell, onLongPressCell } = await renderCell({
      state: "empty",
    });
    await hold(id, "fails");
    await fireEvent.press(button());
    expect(onTapCell).toHaveBeenCalledTimes(1);
    expect(onTapCell).toHaveBeenCalledWith(view.cell);
    expect(onLongPressCell).not.toHaveBeenCalled();
  });
});
