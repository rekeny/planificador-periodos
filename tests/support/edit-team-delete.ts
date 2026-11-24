// Steps of the tests of «Borrar equipo» in the edit-team form (T077). This file holds no test
// calls. Assumed screens, on top of those of edit-team.ts and team-screen.ts:
//   - the edit-team form (`/teams/<id>/edit`) has, inside its scroll container and after «Guardar»,
//     a button «Borrar equipo» (`team.delete`) that reads the store's `teamContents(teamId)` when it
//     is pressed (never while rendering) and opens ONE confirmation dialog (a `Modal` made by
//     `ChoiceDialog` in confirm mode) with `confirm.deleteTeam.*`; the dialog's confirm button has
//     the same name as the form's button, so the dialog's buttons are read inside the dialog;
//   - confirming calls the store's `deleteTeam(teamId)` and, in the same handler, the app goes back to
//     the list of teams, popping the team screen and the form (`router.dismissAll()`); a failed
//     delete closes the dialog and shows `error.saveFailed` in the form's scroll container.
// The data is real, on the in-memory database; failures are SQLite triggers.
import { sql } from "drizzle-orm";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { createMatch } from "@/data/match-repository";
import { listPlayers } from "@/data/player-repository";
import { createSquadStore } from "@/state/squad-store";
import * as notFoundModule from "@/ui/not-found";
import { entryOf, matchValues } from "../data/match-fixtures";
import { NOT_FOUND, formReady } from "./edit-team";
import { addMatch, matchesStoreOn } from "./match-lists";
import { writeMark } from "./match-session-fixtures";
import { savedEntryIds } from "./match-session-call-up";
import { useMockSquadStore } from "./mock-app-stores";
import { dialog } from "./match-screen-questions";
import { resetMockDatabase } from "./mock-database";
import { ALEVIN, CADETE } from "./squad-fixtures";
import type { SquadStore } from "./squad-fixtures";
import { seedTeam } from "./team-screen";

export { NOT_FOUND };
export { dialog, hosts } from "./match-screen-questions";
export { pressHandlerOf, renderUpdateWarnings } from "./match-details";

export const DELETE_BUTTON = "Borrar equipo";
export const DELETE_CONFIRM = "Borrar equipo";
export const deleteTitle = (name: string): string =>
  `¿Borrar el equipo ${name}?`;

// Not a hook: the alias keeps the rules-of-hooks lint from reading it as one.
const giveSquadStore = useMockSquadStore;

export interface DeletableSeed {
  readonly db: AppDatabase;
  readonly store: SquadStore;
  readonly alevin: number;
  readonly cadete: number;
}

/**
 * «Alevín A» (id 1) with `players` players («Jugador 1»…) and `matches` matches (the first one with
 * a call-up of every player and one mark; dated from 1 November on), and «Cadete B» (id 2) with Bea
 * and one match of 20 November, which a deletion must never touch. A squad store and a matches store
 * on the database are handed out to the screens.
 */
export function seedDeletable(players: number, matches: number): DeletableSeed {
  const db = resetMockDatabase();
  const alevin = seedTeam(
    db,
    ALEVIN,
    Array.from({ length: players }, (_, n) => [`Jugador ${n + 1}`, `${n + 1}`]),
  );
  const cadete = seedTeam(db, CADETE, [["Bea", "7"]]);
  for (let n = 0; n < matches; n += 1) {
    const date = `2026-11-${String(n + 1).padStart(2, "0")}`;
    if (n === 0 && players > 0) {
      const entries = listPlayers(db, alevin).map(entryOf);
      createMatch(db, matchValues(alevin, { date }), entries);
      const [first] = savedEntryIds(db, 1);
      if (first !== undefined) writeMark(db, first, "P", 1, "starter");
    } else {
      addMatch(db, alevin, { date });
    }
  }
  addMatch(db, cadete, { date: "2026-11-20" });
  matchesStoreOn(db);
  const store = createSquadStore(db);
  giveSquadStore(store);
  return { db, store, alevin, cadete };
}

/** How many rows each table holds: what a deletion must change, and only for its own team. */
export function tableCounts(db: AppDatabase): Record<string, number> {
  const tables = ["teams", "players", "matches", "call_up_entries", "marks"];
  return Object.fromEntries(
    tables.map((table) => [
      table,
      db.all<{ n: number }>(sql.raw(`SELECT COUNT(*) AS n FROM ${table}`))[0]
        ?.n ?? -1,
    ]),
  );
}

/** The counts of `seedDeletable(10, 3)`: 10 + 1 players, 3 + 1 matches, 10 call-up entries (match 1) and 1 mark. */
export const BEFORE_10_3 = {
  teams: 2,
  players: 11,
  matches: 4,
  call_up_entries: 10,
  marks: 1,
} as const;

/** The counts that are left once «Alevín A» of `seedDeletable(10, 3)` is gone: only «Cadete B» and its match. */
export const AFTER_10_3 = {
  teams: 1,
  players: 1,
  matches: 1,
  call_up_entries: 0,
  marks: 0,
} as const;

/** The team's row of the list of teams, its screen and «Editar equipo»: the form on top of both. */
export async function openEditFromList(name = "Alevín A"): Promise<void> {
  await fireEvent.press(
    await screen.findByRole("button", { name: new RegExp(name) }),
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Editar equipo" }),
  );
  await formReady();
}

/** The app on the list of teams, then the form of the team as the coach reaches it. */
export async function openFormFromList(name = "Alevín A"): Promise<void> {
  await renderRouter("./src/app");
  await openEditFromList(name);
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

function ownButtons(): ReturnType<typeof screen.queryAllByRole> {
  return screen
    .queryAllByRole("button", { name: DELETE_BUTTON })
    .filter((button) => !inModal(button));
}

/** The form's own «Borrar equipo», not the confirm button of the dialog that has the same name. */
export function deleteButton(): ReturnType<typeof screen.getByRole> {
  const own = ownButtons();
  if (own.length !== 1) {
    throw new Error(`Expected one «${DELETE_BUTTON}», found ${own.length}`);
  }
  return own[0]!;
}

export function hasDeleteButton(): boolean {
  return ownButtons().length > 0;
}

export async function pressDelete(): Promise<void> {
  await fireEvent.press(deleteButton());
}

/** The confirm button of the open dialog. */
export function confirmButton(): ReturnType<typeof screen.getByRole> {
  return dialog().getByRole("button", { name: DELETE_CONFIRM });
}

export async function pressConfirm(): Promise<void> {
  await fireEvent.press(confirmButton());
}

/** Every delete on the table fails, as a full device would make it (RF-085); «teams» makes the team's own delete fail. */
export function failDeletes(
  db: AppDatabase,
  table: "teams" | "players" | "matches" = "teams",
): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_delete_${table} BEFORE DELETE ON ${table} ` +
        "BEGIN SELECT RAISE(ABORT, 'disk full'); END",
    ),
  );
}

export function allowDeletes(
  db: AppDatabase,
  table: "teams" | "players" | "matches" = "teams",
): void {
  db.run(sql.raw(`DROP TRIGGER fail_delete_${table}`));
}

/** The ids of the teams in the database. */
export function teamIds(db: AppDatabase): number[] {
  return db
    .all<{ id: number }>(sql`SELECT id FROM teams ORDER BY id`)
    .map((row) => row.id);
}

/** Adds a player behind the app's back, as a store on another run would. */
export function addPlayerDirectly(db: AppDatabase, teamId: number): void {
  db.run(
    sql`INSERT INTO players (team_id, name, number, is_active)
        VALUES (${teamId}, 'Nuevo', '99', 1)`,
  );
}

/** Counts every render of the not-found screen from now on: the instrument of phase 4 review M-6. */
export function watchNotFound(): jest.SpyInstance {
  return jest.spyOn(notFoundModule, "NotFound");
}

/** Every status the squad store takes from now on: a deleted open team must never report «notFound». */
export function recordStatuses(store: SquadStore): {
  seen: string[];
  stop: () => void;
} {
  const seen: string[] = [];
  const stop = store.subscribe((state) => seen.push(state.status));
  return { seen, stop };
}

/** Whether any screen of the stack, hidden ones too, still draws something of a team's screen or form. */
export function teamScreensMounted(): boolean {
  const hidden = { includeHiddenElements: true } as const;
  return (
    screen.queryByRole("button", { name: "Nuevo jugador", ...hidden }) !==
      null || screen.queryByLabelText("Nombre", hidden) !== null
  );
}

/** Waits for the list of teams to be the screen on top. */
export async function expectOnList(): Promise<void> {
  await waitFor(() => expect(screen).toHavePathname("/"));
}
