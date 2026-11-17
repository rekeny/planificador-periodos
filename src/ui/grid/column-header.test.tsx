// T054: the column header of the grid (RF-042). Assumed API of src/ui/grid/column-header.tsx, which
// the Implementer writes (the plan names the file but gives no props, so these are assumed):
//   ColumnHeader({ column: ColumnView, cellWidth: number, height: number })
// It draws «P1»… for a period and «PR1»… for an overtime from `grid.header.*` in es.json, and
// takes only view data (no store, no rules).
import "@/i18n";
import { Fragment } from "react";
import { render, screen } from "@testing-library/react-native";

import type { ColumnKey } from "@/domain/column";
import type { Format } from "@/domain/format";
import es from "@/i18n/es.json";
import { ColumnHeader } from "@/ui/grid/column-header";
import { columnOf, columnsOf } from "../../../tests/support/grid-cell-views";

const header = (key: ColumnKey, format: Format = 6) => (
  <ColumnHeader column={columnOf(key, format)} cellWidth={44} height={32} />
);

const LAST_COLUMNS: readonly ColumnKey[] = ["P8", "OT3"];

describe("column header", () => {
  it("RF-042: the header texts live in es.json as grid.header.period «P{{number}}» and grid.header.overtime «PR{{number}}»", () => {
    expect(es).toHaveProperty("grid.header.period", "P{{number}}");
    expect(es).toHaveProperty("grid.header.overtime", "PR{{number}}");
  });

  it("RF-042: the header of the second period shows «P2»", async () => {
    await render(header("P2"));
    expect(screen.getByText("P2")).toBeOnTheScreen();
  });

  it("RF-042: the header of the first overtime shows «PR1», not «OT1» and not «P1»", async () => {
    await render(header("OT1"));
    expect(screen.getByText("PR1")).toBeOnTheScreen();
    expect(screen.queryByText("P1")).toBeNull();
    expect(screen.queryByText("OT1")).toBeNull();
  });

  it("RF-042: the headers of the last period of 8 periods and of the third overtime show «P8» and «PR3»", async () => {
    await render(
      <>
        {LAST_COLUMNS.map((key) => (
          <Fragment key={key}>{header(key, 8)}</Fragment>
        ))}
      </>,
    );
    expect(screen.getByText("P8")).toBeOnTheScreen();
    expect(screen.getByText("PR3")).toBeOnTheScreen();
  });

  it("RF-042: every column of a 4-period match with 3 overtimes shows its own header, in column order", async () => {
    const columns = columnsOf(4, 3);
    await render(
      <>
        {columns.map((column) => (
          <ColumnHeader
            key={column.key}
            column={column}
            cellWidth={44}
            height={32}
          />
        ))}
      </>,
    );
    const texts = ["P1", "P2", "P3", "P4", "PR1", "PR2", "PR3"];
    for (const text of texts) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    expect(screen.queryByText("P5")).toBeNull();
  });

  it("RF-042: re-rendering the header with another column shows the new text and drops the old one", async () => {
    const { rerender } = await render(header("P2"));
    await rerender(header("OT2"));
    expect(screen.getByText("PR2")).toBeOnTheScreen();
    expect(screen.queryByText("P2")).toBeNull();
  });
});
