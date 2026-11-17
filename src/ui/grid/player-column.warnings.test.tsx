// T059: the player in red (RF-061, RF-063, RF-064, RF-072, E-003, E-004, E-005). Assumed (named in
// tests/support/warning-reading.ts): PlayerColumn keeps its props and its texts; the Text of the
// name of a row with `isInRed` has `color: RED` (from src/ui/theme/warning-colors.ts) and the Text
// of any other name has no such colour. The colour comes only from the view flag.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";

import type { MatchGrid } from "@/domain/grid";
import { PlayerColumn } from "@/ui/grid/player-column";
import { RED } from "@/ui/theme/warning-colors";
import { gridWith, viewOf } from "../../../tests/support/match-view-grid";
import { colourOf } from "../../../tests/support/warning-reading";
import {
  calmGrid,
  E001,
  E003,
  pedroGrid,
} from "../../../tests/support/warning-views";

async function colours(grid: MatchGrid, names: readonly string[]) {
  await render(<PlayerColumn rows={viewOf(grid).rows} rowHeight={44} />);
  return names.map((name) => colourOf(screen.getByText(name)) === RED);
}

describe("player column, red", () => {
  it("RF-063 E-003: Juan with 4 X in the first 5 periods is red and the players around him are not", async () => {
    expect(
      await colours(E003, ["Jugador 1", "Jugador 2", "Jugador 10"]),
    ).toEqual([true, false, false]);
  });

  it("RF-064 E-004: Pedro, one period played short in a complete window, is red; the same red as RF-063", async () => {
    expect(await colours(pedroGrid(5), ["Jugador 1", "Jugador 2"])).toEqual([
      true,
      false,
    ]);
  });

  it("RF-064 E-005: Pedro is not red while the window is incomplete", async () => {
    expect(await colours(pedroGrid(3), ["Jugador 1", "Jugador 2"])).toEqual([
      false,
      false,
    ]);
  });

  it("RF-061 E-001: a light red cell alone colours no player", async () => {
    expect(await colours(E001, ["Jugador 1", "Jugador 2"])).toEqual([
      false,
      false,
    ]);
  });

  it("RF-061: with nothing to warn about no player is red", async () => {
    const names = Array.from({ length: 12 }, (_, i) => `Jugador ${i + 1}`);
    expect(await colours(calmGrid(), names)).toEqual(Array(12).fill(false));
  });

  it("RF-063: the name, number and counter texts stay as they were when the player is in red", async () => {
    await colours(E003, []);
    for (const text of ["Jugador 1", "1", "J 4 · D 2"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it("RF-063: the red follows the view alone, so a row flagged with no warning in its grid is red and an unflagged one is not", async () => {
    const calm = viewOf(gridWith({ players: 2 })).rows;
    const flagged = calm.map((row, i) => ({ ...row, isInRed: i === 0 }));
    await render(<PlayerColumn rows={flagged} rowHeight={44} />);
    expect(colourOf(screen.getByText("Jugador 1"))).toBe(RED);
    expect(colourOf(screen.getByText("Jugador 2"))).not.toBe(RED);
  });
});
