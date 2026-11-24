// Steps of the tests of the format change and the deletion in the match details (T096). This file
// holds no test calls. Assumed screens, on top of those of match-details.ts:
//   - the format picker of the details: choosing the match's own format shows and does nothing;
//     choosing another one opens ONE confirmation dialog (a `Modal` made by `ChoiceDialog` in
//     confirm mode) with `confirm.formatChange.*`, which closes only with its own buttons;
//   - confirming calls the session's `changeFormat(format)`: the picker and the grid under the
//     details show the new format at once; a failed change closes the dialog and the details show
//     `error.saveFailed` inside their scroll container (assumed place, like «Guardar»'s failure);
//   - a button «Borrar partido» (`match.delete`) inside the details' scroll container, after
//     «Guardar», that opens a dialog with `confirm.deleteMatch.*`; its confirm button has the same
//     name as that button, so the dialog's buttons are read inside the dialog's `Modal`;
//   - confirming calls `deleteMatch(matchId)` of `getMatchesStore()` and, once saved, the details
//     and the grid are popped together (`router.dismiss(2)`).
// The data is real, on the in-memory database; failures are SQLite triggers.
import { sql } from "drizzle-orm";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { createSquadStore } from "@/state/squad-store";
import type { MatchSessionStore } from "./match-session-fixtures";
import { writeMark } from "./match-session-fixtures";
import { savedEntryIds } from "./match-session-call-up";
import { pressEdit } from "./match-details";
import type { Seeded } from "./match-details";
import { pressItemOf } from "./match-lists";
import { useMockSquadStore } from "./mock-app-stores";

import { openTeamAlone } from "./team-screen";

// Not a hook: the alias keeps the rules-of-hooks lint from reading it as one.
const giveSquadStore = useMockSquadStore;

export {
  dialog,
  hosts,
  press as pressInDialog,
} from "./match-screen-questions";

export const FORMAT_TITLE = "¿Cambiar la variante?";
export const FORMAT_MESSAGE =
  "Cambiar la variante puede hacer perder información: se borrarán las marcas de los periodos que desaparezcan.";
export const FORMAT_CONFIRM = "Cambiar variante";
export const DELETE_BUTTON = "Borrar partido";
export const DELETE_TITLE = "¿Borrar este partido?";
export const DELETE_MESSAGE =
  "Se borrarán el partido y su cuadrícula. No se puede deshacer.";
export const DELETE_CONFIRM = "Borrar partido";

/** The matches «from → to» that a confirmed format change can make, in every direction (RF-038). */
export const FORMAT_PAIRS = [
  [4, 6],
  [4, 8],
  [6, 4],
  [6, 8],
  [8, 4],
  [8, 6],
] as const;

/** One mark to seed: the call-up row (from 0), the column and its number, and the mark. */
export type MarkSeed = readonly [
  row: number,
  column: "P" | "OT",
  number: number,
  mark: "starter" | "sub",
];

/** Saves marks in the match behind the app's back, before the grid is opened. */
export function seedMarks(seeded: Seeded, marks: readonly MarkSeed[]): void {
  const entries = savedEntryIds(seeded.db, seeded.matchId);
  for (const [row, column, number, mark] of marks) {
    writeMark(seeded.db, entries[row] ?? 0, column, number, mark);
  }
}

/** The headers of a grid of `periods` periods and `overtimes` overtimes: ["P1", …, "PR1", …]. */
export function headers(periods: number, overtimes = 0): string[] {
  return [
    ...Array.from({ length: periods }, (_, index) => `P${index + 1}`),
    ...Array.from({ length: overtimes }, (_, index) => `PR${index + 1}`),
  ];
}

/** Choosing a format in the details' picker. */
export async function pickFormat(periods: number): Promise<void> {
  await fireEvent.press(
    screen.getByRole("radio", { name: `${periods} periodos` }),
  );
}

/** Whether a node lives inside a `Modal` (the dialogs). */
function inModal(node: ReturnType<typeof screen.getByRole>): boolean {
  let parent = node.parent;
  while (parent !== null) {
    if (parent.type === "Modal") return true;
    parent = parent.parent;
  }
  return false;
}

/** The details' own «Borrar partido», not the confirm button of the dialog that has the same name. */
export function deleteButton(): ReturnType<typeof screen.getByRole> {
  const own = screen
    .queryAllByRole("button", { name: DELETE_BUTTON })
    .filter((button) => !inModal(button));
  if (own.length !== 1) {
    throw new Error(`Expected one «${DELETE_BUTTON}», found ${own.length}`);
  }
  return own[0]!;
}

export async function pressDelete(): Promise<void> {
  await fireEvent.press(deleteButton());
}

/** Every update of the matches table fails, as a full device would make it. */
export function failMatchDeletes(db: AppDatabase): void {
  db.run(
    sql.raw(
      "CREATE TRIGGER fail_delete_matches BEFORE DELETE ON matches " +
        "BEGIN SELECT RAISE(ABORT, 'disk full'); END",
    ),
  );
}

export function allowMatchDeletes(db: AppDatabase): void {
  db.run(sql.raw("DROP TRIGGER fail_delete_matches"));
}

/** The ids of the matches in the database. */
export function matchIds(db: AppDatabase): number[] {
  return db
    .all<{ id: number }>(sql`SELECT id FROM matches ORDER BY id`)
    .map((row) => row.id);
}

/** How many call-up entries and marks the database holds for the match. */
export function rowsOf(
  db: AppDatabase,
  matchId: number,
): { entries: number; marks: number } {
  const [entries] = db.all<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM call_up_entries WHERE match_id = ${matchId}`,
  );
  const [marks] = db.all<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM marks WHERE call_up_entry_id IN
      (SELECT id FROM call_up_entries WHERE match_id = ${matchId})`,
  );
  return { entries: entries?.n ?? -1, marks: marks?.n ?? -1 };
}

const DATE_BUTTON = { name: /\d{2}\/\d{2}\/\d{4}/ };

async function reachDetails(date: string): Promise<void> {
  await screen.findAllByRole("button", DATE_BUTTON);
  await pressItemOf(date);
  await pressEdit();
  await screen.findByLabelText("Local");
}

/**
 * The list of every match, the match dated 1 November (the seeded one), its grid and its details.
 * The test has given the screens their matches store (`matchesStoreOn`) first, to keep a spy on it.
 */
export async function openDetailsFromAllMatches(): Promise<void> {
  await renderRouter("./src/app", { initialUrl: "/matches" });
  await reachDetails("01/11/2026");
}

/** The team's screen, its match dated 1 November (the seeded one), its grid and its details. */
export async function openDetailsFromTeam(seeded: Seeded): Promise<void> {
  giveSquadStore(createSquadStore(seeded.db));
  await openTeamAlone(seeded.teamId);
  await reachDetails("01/11/2026");
}

/** Every status the session store takes from now on, to prove the grid of a deleted match never reopens. */
export function recordStatuses(store: MatchSessionStore): {
  seen: string[];
  stop: () => void;
} {
  const seen: string[] = [];
  const stop = store.subscribe((state) => seen.push(state.status));
  return { seen, stop };
}

// The grid under the details is hidden from the default queries (its screen is not the focused one),
// so the tests read it with these, which include hidden elements: they work as well on the grid itself.
const HIDDEN = { includeHiddenElements: true } as const;

/** The column headers the grid draws, in order, wherever the grid is in the stack. */
export function gridHeaders(): string[] {
  return screen
    .queryAllByText(/^PR?\d+$/, HIDDEN)
    .map((node) => String(node.props.children));
}

/** The buttons of the grid's cells, in tree order. */
export function gridCells(): ReturnType<typeof screen.queryAllByRole> {
  return screen.queryAllByRole("button", { name: /, (P|PR)\d+: /, ...HIDDEN });
}

/** The state of a player's cell in a column, read from its accessible label. */
export function gridCellState(
  player: string,
  column: string,
): "empty" | "starter" | "sub" {
  const cell = screen.getByRole("button", {
    name: new RegExp(`^${player}, ${column}: `),
    ...HIDDEN,
  });
  const label = String(cell.props.accessibilityLabel);
  if (label.endsWith("casilla vacía")) return "empty";
  return label.includes("con círculo") ? "sub" : "starter";
}

/** The grid's «Deshacer». */
export function gridUndo(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole("button", { name: "Deshacer", ...HIDDEN });
}
