// T059: the «!» and «≠» of the column headers (RF-006, RF-065, RF-066, E-001, E-002, E-007, E-008).
// Assumed (named in tests/support/warning-reading.ts): ColumnHeader keeps its props; when
// `column.headerMark` is "incomplete" it also draws a Text with testID `column-mark-<key>` and the
// child «!» (`grid.header.incompleteMark`), when "inconsistent" the child «≠»
// (`grid.header.inconsistentMark`), and nothing when null. The title («P3») stays its own Text.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";

import type { ColumnKey } from "@/domain/column";
import type { MatchGrid } from "@/domain/grid";
import es from "@/i18n/es.json";
import { ColumnHeader } from "@/ui/grid/column-header";
import { gridWith } from "../../../tests/support/match-view-grid";
import {
  fillPeriods,
  poolOf,
} from "../../../tests/support/match-view-warnings";
import { headerMarks } from "../../../tests/support/warning-reading";
import {
  calmGrid,
  columnViewOf,
  E001,
  E002,
  E007,
  E008,
} from "../../../tests/support/warning-views";

async function draw(grid: MatchGrid, key: ColumnKey) {
  await render(
    <ColumnHeader
      column={columnViewOf(grid, key)}
      cellWidth={44}
      height={32}
    />,
  );
  return headerMarks();
}

describe("column header, marks", () => {
  it("RF-065 RF-066: the marks live in es.json as grid.header.incompleteMark «!» and grid.header.inconsistentMark «≠»", () => {
    expect(es).toHaveProperty("grid.header.incompleteMark", "!");
    expect(es).toHaveProperty("grid.header.inconsistentMark", "≠");
  });

  it.each(["P1", "P5"] as const)(
    "RF-065 E-001: %s of E-001 shows «!» next to its title",
    async (key) => {
      expect(await draw(E001, key)).toEqual({ [key]: "!" });
      expect(screen.getByText(key)).toBeOnTheScreen();
    },
  );

  it("RF-066 E-002: P3 of E-002 shows «≠» and not «!»", async () => {
    expect(await draw(E002, "P3")).toEqual({ P3: "≠" });
    expect(screen.queryByText("!")).toBeNull();
    expect(screen.getByText("P3")).toBeOnTheScreen();
  });

  it("RF-065 E-002: P4 of E-002, incomplete only, shows «!» and not «≠»", async () => {
    expect(await draw(E002, "P4")).toEqual({ P4: "!" });
    expect(screen.queryByText("≠")).toBeNull();
  });

  it.each(["P6", "P7"] as const)(
    "RF-006 RF-065 E-001 E-008: the empty free period %s shows no mark",
    async (key) => {
      const grid = key === "P6" ? E001 : E008;
      expect(await draw(grid, key)).toEqual({});
      expect(screen.getByText(key)).toBeOnTheScreen();
    },
  );

  it("RF-065 RF-006 E-008: the empty overtime of E-008 shows no mark and its title is «PR1»", async () => {
    expect(await draw(E008, "OT1")).toEqual({});
    expect(screen.getByText("PR1")).toBeOnTheScreen();
  });

  it("RF-065 E-007: of E-007 only P5 shows «!»; P4 (5 X) and P6 (free, empty) show nothing", async () => {
    expect(await draw(E007, "P5")).toEqual({ P5: "!" });
    await screen.unmount();
    expect(await draw(E007, "P4")).toEqual({});
    await screen.unmount();
    expect(await draw(E007, "P6")).toEqual({});
  });

  it("RF-065: a window period with 4 X shows «!» and with 5 X it does not", async () => {
    const four = gridWith({
      players: 12,
      format: 8,
      marks: fillPeriods([4, 5, 5, 5, 5, 5], poolOf(12)),
    });
    expect(await draw(four, "P1")).toEqual({ P1: "!" });
    await screen.unmount();
    expect(await draw(four, "P2")).toEqual({});
    await screen.unmount();
    expect(await draw(calmGrid(), "P1")).toEqual({});
  });

  it("RF-061: with nothing to warn about no header has a mark", async () => {
    for (const key of ["P1", "P6", "P8"] as const) {
      expect(await draw(calmGrid(), key)).toEqual({});
      await screen.unmount();
    }
  });

  it("RF-066: a header that is both incomplete and inconsistent shows only «≠», one mark", async () => {
    const column = columnViewOf(E002, "P3");
    expect(column.headerMark).toBe("inconsistent");
    await render(<ColumnHeader column={column} cellWidth={44} height={32} />);
    expect(screen.queryAllByText(/^[!≠]$/)).toHaveLength(1);
  });

  it("RF-065: the mark follows the view alone, so a view marked incomplete shows «!» and one with the mark cleared shows none", async () => {
    const calm = columnViewOf(calmGrid(), "P1");
    await render(
      <ColumnHeader
        column={{ ...calm, headerMark: "incomplete" }}
        cellWidth={44}
        height={32}
      />,
    );
    expect(headerMarks()).toEqual({ P1: "!" });
    await screen.unmount();
    const marked = columnViewOf(E001, "P1");
    await render(
      <ColumnHeader
        column={{ ...marked, headerMark: null }}
        cellWidth={44}
        height={32}
      />,
    );
    expect(headerMarks()).toEqual({});
  });
});
