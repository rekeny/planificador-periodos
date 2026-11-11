// An independent reference for the grid properties: it recomputes everything from the cells and from the
// regulations written out from the spec (RF-002 to RF-005), without calling or reading any domain code.
import type { Format } from "@/domain/format";
import type { CellKey, CellState, MatchGrid } from "@/domain/grid";

export const RULES: Record<
  Format,
  {
    periods: number;
    window: number;
    minPlayed: number;
    minRested: number;
    callUp: [number, number];
  }
> = {
  4: { periods: 4, window: 3, minPlayed: 1, minRested: 1, callUp: [8, 12] },
  6: { periods: 6, window: 5, minPlayed: 2, minRested: 2, callUp: [9, 12] },
  8: { periods: 8, window: 6, minPlayed: 2, minRested: 2, callUp: [8, 12] },
};

export interface Col {
  key: string;
  inWindow: boolean;
}

export function columnsOf(grid: MatchGrid): Col[] {
  const { periods, window } = RULES[grid.format];
  return [
    ...Array.from({ length: periods }, (_, i) => ({
      key: `P${i + 1}`,
      inWindow: i + 1 <= window,
    })),
    ...Array.from({ length: grid.overtimeCount }, (_, i) => ({
      key: `OT${i + 1}`,
      inWindow: false,
    })),
  ];
}

export function stateAt(grid: MatchGrid, id: number, key: string): CellState {
  return grid.marks[`${id}:${key}` as CellKey] ?? "empty";
}

export function startersIn(grid: MatchGrid, key: string): number {
  return grid.callUp.filter((e) => stateAt(grid, e.id, key) === "starter")
    .length;
}

export function windowStats(grid: MatchGrid, id: number) {
  const states = columnsOf(grid)
    .filter((c) => c.inWindow)
    .map((c) => stateAt(grid, id, c.key));
  return {
    played: states.filter((s) => s === "starter").length,
    possibleRests: states.filter((s) => s === "empty").length,
  };
}

export function isWindowComplete(grid: MatchGrid): boolean {
  return columnsOf(grid)
    .filter((c) => c.inWindow)
    .every((c) => startersIn(grid, c.key) === 5);
}

export function expectedLightRed(grid: MatchGrid): string[] {
  const { minRested } = RULES[grid.format];
  const cells: string[] = [];
  for (const entry of grid.callUp) {
    if (windowStats(grid, entry.id).possibleRests > minRested) continue;
    for (const c of columnsOf(grid).filter((col) => col.inWindow)) {
      if (stateAt(grid, entry.id, c.key) === "empty")
        cells.push(`${entry.id}:${c.key}`);
    }
  }
  return cells.sort();
}

export function expectedInRed(grid: MatchGrid): number[] {
  const { minPlayed, minRested } = RULES[grid.format];
  const complete = isWindowComplete(grid);
  return grid.callUp
    .filter((e) => {
      const s = windowStats(grid, e.id);
      return s.possibleRests < minRested || (complete && s.played < minPlayed);
    })
    .map((e) => e.id);
}

// Everything the window can still give: no filling can beat these bounds.
export function feasibilityBounds(grid: MatchGrid) {
  const { minPlayed, minRested } = RULES[grid.format];
  let lowest = 0;
  let highest = 0;
  let someoneCannot = false;
  for (const entry of grid.callUp) {
    const { played, possibleRests } = windowStats(grid, entry.id);
    const low = Math.max(played, minPlayed);
    const high = played + possibleRests - minRested;
    lowest += low;
    highest += high;
    someoneCannot ||= low > high;
  }
  return { lowest, highest, someoneCannot };
}

export function withoutFreeMarks(grid: MatchGrid): MatchGrid {
  const free = new Set(
    columnsOf(grid)
      .filter((c) => !c.inWindow)
      .map((c) => c.key),
  );
  const marks = Object.fromEntries(
    Object.entries(grid.marks).filter(
      ([key]) => !free.has(key.slice(key.indexOf(":") + 1)),
    ),
  );
  return { ...grid, marks };
}

// The warning of a column, read by its key as text.
export function warningAt(
  periodWarnings: Readonly<Record<string, string | undefined>>,
  key: string,
): string | undefined {
  return periodWarnings[key];
}
