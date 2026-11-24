// Steps of the match details tests (T072). This file holds no test calls. Assumed screens:
//   - the match screen (`/matches/<id>`) has a button «Editar» (`common.edit`) next to «Convocatoria»
//     (in the native header on a tablet or a landscape phone, in the body otherwise) that pushes
//     `/matches/<id>/edit`;
//   - the details route has the form of the new match without the call-up: «Variante» with the
//     radios «4 periodos», «6 periodos» and «8 periodos», the date and time field, the text fields
//     labelled «Local», «Visitante» and «Notas», two score fields that both carry the label
//     «Resultado final» (home first), the buttons «Mi equipo es local» and «Mi equipo es visitante»
//     and a button «Guardar». The same helpers of new-match-form.ts and new-match-save.ts read it;
//   - the route asks `newMatchDetailsDraft(matchId)` of `@/state/app-stores` once per mounted screen
//     (the double of mock-app-stores.ts builds a real draft on the mock database and keeps it in
//     `createdDetailsDrafts()`), and draws only while the match session store is open for its match.
// The data is real, on the in-memory database; failures are SQLite triggers, as in the other files.
import { sql } from "drizzle-orm";
import { renderRouter, screen, fireEvent } from "expo-router/testing-library";

import type { AppDatabase } from "@/data/database-types";
import { createMatch } from "@/data/match-repository";
import type { NewMatchValues } from "@/data/match-repository";
import { createPlayer } from "@/data/player-repository";
import { createTeam } from "@/data/team-repository";
import type { Format } from "@/domain/format";
import { createMatchSessionStore } from "@/state/match-session-store";
import { entryOf, matchValues } from "../data/match-fixtures";
import {
  forgetDetailsDrafts,
  setMockMatchSessionStore,
} from "./mock-app-stores";
import { resetMockDatabase } from "./mock-database";
import { savedMatches } from "./new-match-fixtures";
import {
  awayField,
  homeField,
  notesField,
  scoreFields,
} from "./new-match-form";
import { ALEVIN } from "./squad-fixtures";

export { SAVE_FAILED } from "./call-up-screen";
export { SCORE_INCOMPLETE } from "./new-match-form";

export interface DetailsSeed {
  readonly format?: Format;
  readonly overtimeCount?: number;
  readonly players?: number;
  readonly values?: Partial<NewMatchValues>;
}

/** What the seeded match holds unless a test says otherwise: every optional field filled. */
export const FILLED: Partial<NewMatchValues> = {
  date: "2026-11-01",
  time: "18:30",
  homeName: "Águilas",
  awayName: "Rival",
  homeScore: 72,
  awayScore: 65,
  notes: "Llevar petos",
};

/**
 * «Alevín A» (id 1) with 9 players, called up in match 1 of the given format, and a match session
 * store on the mock database, closed, handed out by `getMatchSessionStore()`.
 */
export function seedDetails(seed: DetailsSeed = {}) {
  const { format = 6, overtimeCount = 0, players = 9, values = FILLED } = seed;
  const db = resetMockDatabase();
  forgetDetailsDrafts();
  const team = createTeam(db, ALEVIN);
  const squad = Array.from({ length: players }, (_, index) =>
    createPlayer(db, {
      teamId: team.id,
      name: `Jugador ${index + 1}`,
      number: String(index + 1),
    }),
  );
  const match = createMatch(
    db,
    matchValues(team.id, { ...values, format }),
    squad.map(entryOf),
  );
  if (overtimeCount > 0) {
    db.run(
      sql`UPDATE matches SET overtime_count = ${overtimeCount} WHERE id = ${match.id}`,
    );
  }
  const store = createMatchSessionStore(db);
  setMockMatchSessionStore(store);
  return { db, store, teamId: team.id, matchId: match.id };
}

export type Seeded = ReturnType<typeof seedDetails>;

/** The grid of the match as the only screen, then «Editar»: the details on top of the grid. */
export async function openDetailsFromGrid(matchId: number): Promise<void> {
  await renderRouter("./src/app", { initialUrl: `/matches/${matchId}` });
  await pressEdit();
  await screen.findByLabelText("Local");
}

/** «Editar» of the match screen. */
export async function pressEdit(): Promise<void> {
  await fireEvent.press(await screen.findByRole("button", { name: "Editar" }));
}

/** The details route as the only screen, with the session already open for the match (a restored stack). */
export async function openDetailsAlone(seeded: Seeded): Promise<void> {
  seeded.store.getState().openMatch(seeded.matchId);
  await renderRouter("./src/app", {
    initialUrl: `/matches/${seeded.matchId}/edit`,
  });
  await screen.findByLabelText("Local");
}

/** What the text fields of the details show now. */
export function shown(): {
  home: unknown;
  away: unknown;
  scores: unknown[];
  notes: unknown;
} {
  return {
    home: homeField().props.value,
    away: awayField().props.value,
    scores: scoreFields().map((field) => field.props.value),
    notes: notesField().props.value,
  };
}

/** The saved row of a match, as the database holds it. */
export function savedMatch(db: AppDatabase, matchId: number) {
  return savedMatches(db).find((match) => match.id === matchId);
}

/** Every update of the matches table fails from now on, as a full device would make it (RF-085). */
export function failMatchUpdates(db: AppDatabase): void {
  db.run(
    sql.raw(
      "CREATE TRIGGER fail_update_matches BEFORE UPDATE ON matches " +
        "BEGIN SELECT RAISE(ABORT, 'disk full'); END",
    ),
  );
}

/** Undoes `failMatchUpdates`: the device has space again. */
export function allowMatchUpdates(db: AppDatabase): void {
  db.run(sql.raw("DROP TRIGGER fail_update_matches"));
}

/** From now on every update of the matches table adds a row to a log, to count the writes. */
export function logMatchUpdates(db: AppDatabase): void {
  db.run(sql.raw("CREATE TABLE update_log (id INTEGER PRIMARY KEY)"));
  db.run(
    sql.raw(
      "CREATE TRIGGER log_update_matches AFTER UPDATE ON matches " +
        "BEGIN INSERT INTO update_log (id) VALUES (NULL); END",
    ),
  );
}

/** How many updates of the matches table `logMatchUpdates` has seen. */
export function loggedUpdates(db: AppDatabase): number {
  const rows = db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM update_log`);
  return rows[0]?.n ?? 0;
}

/** The React warnings about a component updating while another one renders (D3 rule 3). */
export function renderUpdateWarnings(errors: jest.SpyInstance): string[] {
  return errors.mock.calls
    .map((call) => call.map(String).join(" "))
    .filter((message) => /Cannot update a component/.test(message));
}

type PressConfig = {
  testOnly_pressabilityConfig?: () => { onPress?: () => void };
};

/**
 * The `onPress` of a Pressable, read from the hook that React Native leaves on its host view in
 * tests (the one Testing Library uses), to call it twice inside one act.
 */
export function pressHandlerOf(
  element: ReturnType<typeof screen.getByRole>,
): () => void {
  const hook = element.props.onStartShouldSetResponder as PressConfig;
  const onPress = hook.testOnly_pressabilityConfig?.().onPress;
  if (onPress === undefined) throw new Error("The element has no onPress");
  return onPress;
}
