// fast-check generators of match grids, shared by the property tests of src/domain/ (T020 and, with an
// action generator added here, T021). They live in tests/ because files in src/domain/ that are not tests
// may not import fast-check. Every grid they build respects the only hard limit, 5 X per column (RF-055),
// and is otherwise arbitrary: it may break every rule of the regulations.
import {
  array,
  constantFrom,
  integer,
  oneof,
  tuple,
  type Arbitrary,
} from "fast-check";
import { columnKey, gridColumns, type Column } from "@/domain/column";
import {
  FORMAT_RULES,
  MAX_STARTERS_PER_PERIOD,
  type Format,
} from "@/domain/format";
import {
  cellKey,
  type CallUp,
  type CallUpEntryId,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

export const MAX_PLAYERS = 15; // above the call-up maximum of 12, to cover RF-068
export const MAX_OVERTIMES = 3;
const MAX_COLUMNS = 8 + MAX_OVERTIMES;
const MAX_WINDOW = 6;
const CALL_UP_MAX = 12;

// Ids are not 1..n on purpose: nothing may mistake an entry id for a row position.
export function callUpOf(players: number): CallUp {
  return Array.from({ length: players }, (_, row) => ({
    id: row * 3 + 1,
    playerId: row + 100,
    name: `Player ${row + 1}`,
    number: String(row + 1),
  }));
}

interface Board {
  readonly marks: Partial<Record<CellKey, Mark>>;
  // A starter beyond the fifth of its column becomes `overflow` instead (an empty cell by default).
  put(
    entryId: CallUpEntryId,
    column: Column,
    mark: Mark | undefined,
    overflow?: Mark,
  ): void;
}

function createBoard(): Board {
  const marks: Partial<Record<CellKey, Mark>> = {};
  const starters = new Map<string, number>();
  return {
    marks,
    put(entryId, column, mark, overflow) {
      const key = columnKey(column);
      const used = starters.get(key) ?? 0;
      let final = mark;
      if (mark === "starter" && used >= MAX_STARTERS_PER_PERIOD) {
        final = overflow;
      } else if (mark === "starter") {
        starters.set(key, used + 1);
      }
      if (final !== undefined) marks[cellKey({ entryId, column })] = final;
    },
  };
}

const formatArbitrary = constantFrom<Format>(4, 6, 8);
const overtimesArbitrary = integer({ min: 0, max: MAX_OVERTIMES });
const rolls = (length: number): Arbitrary<number[]> =>
  array(integer({ min: 0, max: 99 }), { minLength: length, maxLength: length });
const cellRolls = rolls(MAX_PLAYERS * MAX_COLUMNS);

function rollAt(all: readonly number[], row: number, col: number): number {
  return all[row * MAX_COLUMNS + col] ?? 0;
}

// Starter below `density`, sub in the top `subShare` rolls, empty in between.
function markOf(roll: number, density: number, subShare: number) {
  if (roll < density) return "starter" as const;
  return roll >= 100 - subShare ? ("sub" as const) : undefined;
}

// Any grid: 0 to 15 players, 0 to 3 overtimes, from empty to as full as the limit allows.
export const randomGridArbitrary: Arbitrary<MatchGrid> = tuple(
  formatArbitrary,
  overtimesArbitrary,
  integer({ min: 0, max: MAX_PLAYERS }),
  integer({ min: 0, max: 100 }),
  integer({ min: 0, max: 40 }),
  cellRolls,
).map(([format, overtimeCount, players, density, subShare, all]) => {
  const callUp = callUpOf(players);
  const columns = gridColumns(format, overtimeCount);
  const board = createBoard();
  callUp.forEach((entry, row) =>
    columns.forEach((column, col) =>
      board.put(
        entry.id,
        column,
        markOf(rollAt(all, row, col), density, subShare),
      ),
    ),
  );
  return { format, overtimeCount, callUp, marks: board.marks };
});

// At least 5 players and exactly 5 X in every column; the other cells are subs or empty.
export const fullColumnsGridArbitrary: Arbitrary<MatchGrid> = tuple(
  formatArbitrary,
  overtimesArbitrary,
  integer({ min: MAX_STARTERS_PER_PERIOD, max: MAX_PLAYERS }),
  array(rolls(MAX_PLAYERS), { minLength: MAX_COLUMNS, maxLength: MAX_COLUMNS }),
  cellRolls,
).map(([format, overtimeCount, players, scores, all]) => {
  const callUp = callUpOf(players);
  const board = createBoard();
  gridColumns(format, overtimeCount).forEach((column, col) => {
    const lowest = callUp
      .map((entry, row) => ({ entry, row, score: scores[col]?.[row] ?? 0 }))
      .sort((a, b) => a.score - b.score || a.row - b.row)
      .slice(0, MAX_STARTERS_PER_PERIOD)
      .map(({ entry }) => entry.id);
    callUp.forEach((entry, row) => {
      const isStarter = lowest.includes(entry.id);
      const sub = rollAt(all, row, col) < 30;
      board.put(
        entry.id,
        column,
        isStarter ? "starter" : sub ? "sub" : undefined,
      );
    });
  });
  return { format, overtimeCount, callUp, marks: board.marks };
});

type Kind = "rests" | "played";

// Players exactly at a minimum of the rule window. A "rests" player has exactly the minimum of empty
// window cells (every other window cell is an X or a sub); a "played" player has exactly the minimum of
// X (every other window cell is empty or a sub). Played-minimum X are laid out round-robin so that no
// column gets more than 5 of them; the cells outside the window are arbitrary.
export const minimumsGridArbitrary: Arbitrary<MatchGrid> = tuple(
  formatArbitrary,
  overtimesArbitrary,
  integer({ min: 1, max: MAX_PLAYERS }),
  array(constantFrom<Kind>("rests", "played"), {
    minLength: MAX_PLAYERS,
    maxLength: MAX_PLAYERS,
  }),
  integer({ min: 0, max: MAX_WINDOW - 1 }),
  array(rolls(MAX_WINDOW), { minLength: MAX_PLAYERS, maxLength: MAX_PLAYERS }),
  cellRolls,
).map(([format, overtimeCount, players, kinds, start, scores, all]) => {
  const { ruleWindow } = FORMAT_RULES[format];
  const { minPlayed, minRested } = ruleWindow;
  const width = ruleWindow.periodCount;
  const columns = gridColumns(format, overtimeCount);
  const callUp = callUpOf(players);
  const board = createBoard();
  const capacity = Math.floor((MAX_STARTERS_PER_PERIOD * width) / minPlayed);
  const played = callUp.filter((_, row) => kinds[row] === "played");
  const playedIds = new Set(played.slice(0, capacity).map((e) => e.id));
  // Pass 1: the played-minimum X, which must all fit. Pass 2: the rest of the window. Pass 3: the free cells.
  played.slice(0, capacity).forEach((entry, order) => {
    for (let k = 0; k < minPlayed; k += 1) {
      const column = columns[(start + order * minPlayed + k) % width];
      if (column) board.put(entry.id, column, "starter");
    }
  });
  callUp.forEach((entry, row) => {
    const own = playedIds.has(entry.id);
    const restSlots = new Set(
      Array.from({ length: width }, (_, col) => col)
        .sort(
          (a, b) => (scores[row]?.[a] ?? 0) - (scores[row]?.[b] ?? 0) || a - b,
        )
        .slice(0, minRested),
    );
    columns.slice(0, width).forEach((column, col) => {
      const roll = rollAt(all, row, col);
      if (own) {
        if (!board.marks[cellKey({ entryId: entry.id, column })] && roll < 30)
          board.put(entry.id, column, "sub");
      } else if (!restSlots.has(col)) {
        board.put(entry.id, column, roll < 50 ? "starter" : "sub", "sub");
      }
    });
  });
  callUp.forEach((entry, row) =>
    columns.slice(width).forEach((column, offset) => {
      const roll = rollAt(all, row, width + offset);
      board.put(entry.id, column, markOf(roll, 40, 20));
    }),
  );
  return { format, overtimeCount, callUp, marks: board.marks };
});

// A complete 8-period window with 10 to 12 players and no sub: 5 X per window period, handed out cyclically
// from a random player, so every player has 2 or 3 X. That leaves each of them more than the 2 possible rests
// of the minimum, so nothing is light red and the grid is a clean one (RF-061). The window of the other
// formats cannot be both complete and clean: someone always ends at the minimum of rests (RF-062).
// Free periods and overtimes stay empty.
export const balancedWindowGridArbitrary: Arbitrary<MatchGrid> = tuple(
  overtimesArbitrary,
  integer({ min: 10, max: CALL_UP_MAX }),
  integer({ min: 0, max: CALL_UP_MAX }),
).map(([overtimeCount, players, start]) => {
  const format: Format = 8;
  const callUp = callUpOf(players);
  const board = createBoard();
  gridColumns(format, overtimeCount)
    .slice(0, FORMAT_RULES[format].ruleWindow.periodCount)
    .forEach((column, period) => {
      for (let slot = 0; slot < MAX_STARTERS_PER_PERIOD; slot += 1) {
        const entry = callUp[(start + period * 5 + slot) % players];
        if (entry) board.put(entry.id, column, "starter");
      }
    });
  return { format, overtimeCount, callUp, marks: board.marks };
});

// Every kind of grid above, for the properties that must hold on all of them.
export const gridArbitrary: Arbitrary<MatchGrid> = oneof(
  randomGridArbitrary,
  randomGridArbitrary,
  fullColumnsGridArbitrary,
  minimumsGridArbitrary,
  balancedWindowGridArbitrary,
);
